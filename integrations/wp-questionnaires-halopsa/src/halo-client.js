import { requestJson, urlWithQuery } from './http.js';

export class HaloClient {
  constructor(config) {
    this.config = config;
    this.baseUrl = config.baseUrl;
    this.accessToken = null;
    this.accessTokenExpiresAt = 0;
  }

  async getAccessToken() {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt - 30_000) {
      return this.accessToken;
    }

    const url = `${this.baseUrl}${this.config.tokenPath}`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: this.config.scope
    });

    const token = await requestJson(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    this.accessToken = token.access_token;
    const expiresIn = Number.parseInt(token.expires_in || '3600', 10);
    this.accessTokenExpiresAt = Date.now() + expiresIn * 1000;
    return this.accessToken;
  }

  async request(path, { method = 'GET', query, body } = {}) {
    const token = await this.getAccessToken();
    const url = urlWithQuery(`${this.baseUrl}${path}`, query || {});
    return requestJson(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined
    });
  }

  async findClientByName(name) {
    const result = await this.request(this.config.paths.clients, {
      query: { search: name, pageinate: true, page_size: 10, page_no: 1 }
    });
    return firstHaloRecord(result, item => sameText(item.name || item.client_name || item.company_name, name));
  }

  async upsertClient(payload) {
    const existing = await this.findClientByName(payload.name);
    if (existing?.id) {
      return this.request(`${this.config.paths.clients}/${existing.id}`, { method: 'POST', body: { ...existing, ...payload, id: existing.id } });
    }
    return this.request(this.config.paths.clients, { method: 'POST', body: payload });
  }

  async findContactByEmail(email, clientId = null) {
    const result = await this.request(this.config.paths.users, {
      query: { search: email, client_id: clientId || undefined, pageinate: true, page_size: 10, page_no: 1 }
    });
    return firstHaloRecord(result, item => sameText(item.emailaddress || item.email || item.email_address, email));
  }

  async upsertContact(payload) {
    const existing = await this.findContactByEmail(payload.emailaddress || payload.email, payload.client_id);
    if (existing?.id) {
      return this.request(`${this.config.paths.users}/${existing.id}`, { method: 'POST', body: { ...existing, ...payload, id: existing.id } });
    }
    return this.request(this.config.paths.users, { method: 'POST', body: payload });
  }

  async findProspectByExternalRef(externalRef) {
    const result = await this.request(this.config.paths.prospects, {
      query: { search: externalRef, pageinate: true, page_size: 10, page_no: 1 }
    });
    return firstHaloRecord(result, item => {
      const haystack = JSON.stringify(item).toLowerCase();
      return haystack.includes(String(externalRef).toLowerCase());
    });
  }

  async upsertProspect(payload, externalRef) {
    const existing = await this.findProspectByExternalRef(externalRef);
    if (existing?.id) {
      return this.request(`${this.config.paths.prospects}/${existing.id}`, { method: 'POST', body: { ...existing, ...payload, id: existing.id } });
    }
    return this.request(this.config.paths.prospects, { method: 'POST', body: payload });
  }

  async resolveCampaign(questionnaireName) {
    if (this.config.campaign.mode !== 'endpoint' || !this.config.paths.campaignLists) {
      return { id: null, name: questionnaireName, mode: 'custom_field' };
    }

    const existing = await this.request(this.config.paths.campaignLists, {
      query: { search: questionnaireName, pageinate: true, page_size: 10, page_no: 1 }
    });
    const found = firstHaloRecord(existing, item => sameText(item.name || item.list_name, questionnaireName));
    if (found?.id) return { id: found.id, name: questionnaireName, mode: 'endpoint' };

    const created = await this.request(this.config.paths.campaignLists, {
      method: 'POST',
      body: { name: questionnaireName }
    });
    return { id: created?.id || null, name: questionnaireName, mode: 'endpoint' };
  }
}

function sameText(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

function firstHaloRecord(result, predicate) {
  const rows = Array.isArray(result)
    ? result
    : Array.isArray(result?.clients)
      ? result.clients
      : Array.isArray(result?.users)
        ? result.users
        : Array.isArray(result?.opportunities)
          ? result.opportunities
          : Array.isArray(result?.results)
            ? result.results
            : Array.isArray(result?.data)
              ? result.data
              : [];

  return rows.find(predicate) || rows[0] || null;
}
