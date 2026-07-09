import { basicAuth, requestJson, urlWithQuery } from './http.js';

export class WpqClient {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.authHeader = basicAuth(config.username, config.applicationPassword);
  }

  async listPending({ page = 1, perPage = 25 } = {}) {
    const url = urlWithQuery(`${this.baseUrl}/wp-json/wpq/v1/api/submissions/pending`, {
      page,
      per_page: perPage
    });
    return requestJson(url, {
      method: 'GET',
      headers: { Authorization: this.authHeader }
    });
  }

  async getSubmission(id) {
    return requestJson(`${this.baseUrl}/wp-json/wpq/v1/api/submissions/${id}`, {
      method: 'GET',
      headers: { Authorization: this.authHeader }
    });
  }

  async start(id) {
    return requestJson(`${this.baseUrl}/wp-json/wpq/v1/api/submissions/${id}/start`, {
      method: 'POST',
      headers: { Authorization: this.authHeader }
    });
  }

  async acknowledge(id, halopsaLeadId) {
    return requestJson(`${this.baseUrl}/wp-json/wpq/v1/api/submissions/${id}/acknowledge`, {
      method: 'POST',
      headers: { Authorization: this.authHeader },
      body: JSON.stringify({ halopsa_lead_id: String(halopsaLeadId) })
    });
  }

  async fail(id, errorMessage, retry = true) {
    return requestJson(`${this.baseUrl}/wp-json/wpq/v1/api/submissions/${id}/fail`, {
      method: 'POST',
      headers: { Authorization: this.authHeader },
      body: JSON.stringify({ error_message: String(errorMessage).slice(0, 1000), retry })
    });
  }
}
