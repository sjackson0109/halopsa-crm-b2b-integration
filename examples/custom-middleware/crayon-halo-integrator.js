/**
 * Crayon to HaloPSA Integration
 * European B2B data platform with intent signals and account-based marketing
 */

const axios = require('axios');
const crypto = require('crypto');

class CrayonHaloIntegrator {
  constructor(config) {
    this.crayonApiKey = config.authentication.api_key;
    this.haloBaseUrl = config.halo_base_url;
    this.haloApiKey = config.halo_api_key;
    this.fieldMappings = config.field_mappings;
    this.webhookSecret = config.webhook_config?.secret;
  }

  /**
   * Process incoming Crayon webhook
   */
  async processWebhook(webhookData, signature) {
    // Verify webhook signature
    if (!this.verifyWebhookSignature(webhookData, signature)) {
      throw new Error('Invalid webhook signature');
    }

    const eventType = webhookData.event_type;

    switch (eventType) {
      case 'intent_signal_detected':
        return await this.processIntentSignal(webhookData.data);
      case 'account_enriched':
        return await this.processAccountEnrichment(webhookData.data);
      case 'contact_updated':
        return await this.processContactUpdate(webhookData.data);
      default:
        console.log(`Unhandled Crayon event: ${eventType}`);
        return { processed: false, reason: 'unhandled_event_type' };
    }
  }

  /**
   * Process intent signal detection
   */
  async processIntentSignal(intentData) {
    try {
      // Check if company already exists in HaloPSA
      const existingCompany = await this.findCompanyInHalo(intentData.company.name);

      if (!existingCompany) {
        // Create new lead in HaloPSA
        const leadData = this.mapIntentToLead(intentData);
        const result = await this.createHaloLead(leadData);

        return {
          processed: true,
          action: 'lead_created',
          halo_lead_id: result.id,
          intent_signals: intentData.intent_signals
        };
      } else {
        // Update existing company with intent data
        const updateData = this.mapIntentToUpdate(intentData);
        await this.updateHaloCompany(existingCompany.id, updateData);

        return {
          processed: true,
          action: 'company_updated',
          halo_company_id: existingCompany.id,
          intent_signals: intentData.intent_signals
        };
      }
    } catch (error) {
      console.error('Error processing Crayon intent signal:', error);
      throw error;
    }
  }

  /**
   * Process account enrichment data
   */
  async processAccountEnrichment(accountData) {
    try {
      const existingCompany = await this.findCompanyInHalo(accountData.name);

      if (existingCompany) {
        const updateData = this.mapAccountToUpdate(accountData);
        await this.updateHaloCompany(existingCompany.id, updateData);

        return {
          processed: true,
          action: 'company_enriched',
          halo_company_id: existingCompany.id
        };
      } else {
        // Create new company record
        const companyData = this.mapAccountToCompany(accountData);
        const result = await this.createHaloCompany(companyData);

        return {
          processed: true,
          action: 'company_created',
          halo_company_id: result.id
        };
      }
    } catch (error) {
      console.error('Error processing Crayon account enrichment:', error);
      throw error;
    }
  }

  /**
   * Process contact update
   */
  async processContactUpdate(contactData) {
    try {
      const existingContact = await this.findContactInHalo(contactData.email);

      if (existingContact) {
        const updateData = this.mapContactToUpdate(contactData);
        await this.updateHaloContact(existingContact.id, updateData);

        return {
          processed: true,
          action: 'contact_updated',
          halo_contact_id: existingContact.id
        };
      } else {
        // Create new contact
        const contactPayload = this.mapContactToCreate(contactData);
        const result = await this.createHaloContact(contactPayload);

        return {
          processed: true,
          action: 'contact_created',
          halo_contact_id: result.id
        };
      }
    } catch (error) {
      console.error('Error processing Crayon contact update:', error);
      throw error;
    }
  }

  /**
   * Map Crayon intent data to HaloPSA lead
   */
  mapIntentToLead(intentData) {
    return {
      name: `${intentData.contact.firstName} ${intentData.contact.lastName}`,
      email: intentData.contact.email,
      phone: intentData.contact.phone,
      company: intentData.company.name,
      job_title: intentData.contact.jobTitle,
      industry: intentData.company.industry,
      employee_count: intentData.company.employeeCount,
      intent_signals: intentData.intent.signals,
      source: 'Crayon Intent Signal',
      created_date: new Date().toISOString()
    };
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    if (!this.webhookSecret) return true; // Skip verification if no secret configured

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * HaloPSA API helper methods
   */
  async findCompanyInHalo(companyName) {
    const response = await axios.get(`${this.haloBaseUrl}/company`, {
      params: { search: companyName },
      headers: { 'Authorization': `Bearer ${this.haloApiKey}` }
    });
    return response.data.length > 0 ? response.data[0] : null;
  }

  async findContactInHalo(email) {
    const response = await axios.get(`${this.haloBaseUrl}/contact`, {
      params: { email: email },
      headers: { 'Authorization': `Bearer ${this.haloApiKey}` }
    });
    return response.data.length > 0 ? response.data[0] : null;
  }

  async createHaloLead(leadData) {
    const response = await axios.post(`${this.haloBaseUrl}/lead`, leadData, {
      headers: { 'Authorization': `Bearer ${this.haloApiKey}` }
    });
    return response.data;
  }

  async updateHaloCompany(companyId, updateData) {
    const response = await axios.put(`${this.haloBaseUrl}/company/${companyId}`, updateData, {
      headers: { 'Authorization': `Bearer ${this.haloApiKey}` }
    });
    return response.data;
  }

  async createHaloCompany(companyData) {
    const response = await axios.post(`${this.haloBaseUrl}/company`, companyData, {
      headers: { 'Authorization': `Bearer ${this.haloApiKey}` }
    });
    return response.data;
  }

  async updateHaloContact(contactId, updateData) {
    const response = await axios.put(`${this.haloBaseUrl}/contact/${contactId}`, updateData, {
      headers: { 'Authorization': `Bearer ${this.haloApiKey}` }
    });
    return response.data;
  }

  async createHaloContact(contactData) {
    const response = await axios.post(`${this.haloBaseUrl}/contact`, contactData, {
      headers: { 'Authorization': `Bearer ${this.haloApiKey}` }
    });
    return response.data;
  }
}

module.exports = CrayonHaloIntegrator;