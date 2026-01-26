/**
 * Klue to HaloPSA Integration
 * Conversational intelligence for B2B sales with buyer journey tracking
 */

const axios = require('axios');

class KlueHaloIntegrator {
  constructor(config) {
    this.klueToken = config.authentication.api_token;
    this.klueOrgId = config.authentication.organization_id;
    this.haloBaseUrl = config.halo_base_url;
    this.haloApiKey = config.halo_api_key;
    this.fieldMappings = config.field_mappings;
    this.conversationFilters = config.conversation_filters;
  }

  /**
   * Poll Klue API for new conversation intelligence
   */
  async pollConversations() {
    try {
      const conversations = await this.fetchKlueConversations();
      const results = [];

      for (const conversation of conversations) {
        const result = await this.processConversation(conversation);
        results.push(result);
      }

      return {
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        details: results
      };
    } catch (error) {
      console.error('Error polling Klue conversations:', error);
      throw error;
    }
  }

  /**
   * Process individual conversation data
   */
  async processConversation(conversationData) {
    try {
      // Check if conversation meets filter criteria
      if (!this.meetsConversationFilters(conversationData)) {
        return { success: false, reason: 'filtered_out', conversation_id: conversationData.id };
      }

      // Find or create lead/prospect in HaloPSA
      const haloRecord = await this.findOrCreateHaloRecord(conversationData);

      // Update with conversation intelligence
      await this.updateWithConversationData(haloRecord, conversationData);

      return {
        success: true,
        conversation_id: conversationData.id,
        halo_record_id: haloRecord.id,
        action: haloRecord.action
      };
    } catch (error) {
      console.error(`Error processing conversation ${conversationData.id}:`, error);
      return {
        success: false,
        conversation_id: conversationData.id,
        error: error.message
      };
    }
  }

  /**
   * Check if conversation meets filter criteria
   */
  meetsConversationFilters(conversation) {
    // Check keywords
    if (this.conversationFilters.keywords?.length > 0) {
      const hasKeyword = this.conversationFilters.keywords.some(keyword =>
        conversation.topics?.some(topic =>
          topic.toLowerCase().includes(keyword.toLowerCase())
        )
      );
      if (!hasKeyword) return false;
    }

    // Check industries
    if (this.conversationFilters.industries?.length > 0) {
      if (!this.conversationFilters.industries.includes(conversation.company?.industry)) {
        return false;
      }
    }

    // Check company size
    if (this.conversationFilters.company_sizes?.length > 0) {
      if (!this.conversationFilters.company_sizes.includes(conversation.company?.size)) {
        return false;
      }
    }

    // Check engagement score
    if (conversation.engagement_score < (this.conversationFilters.minimum_engagement_score || 0)) {
      return false;
    }

    return true;
  }

  /**
   * Find existing or create new HaloPSA record
   */
  async findOrCreateHaloRecord(conversation) {
    // Try to find by email first
    if (conversation.contact?.email) {
      const existingContact = await this.findContactByEmail(conversation.contact.email);
      if (existingContact) {
        return { ...existingContact, action: 'updated' };
      }
    }

    // Try to find by company
    if (conversation.company?.name) {
      const existingCompany = await this.findCompanyByName(conversation.company.name);
      if (existingCompany) {
        return { ...existingCompany, action: 'updated' };
      }
    }

    // Create new lead
    const leadData = this.mapConversationToLead(conversation);
    const newLead = await this.createHaloLead(leadData);
    return { ...newLead, action: 'created' };
  }

  /**
   * Update HaloPSA record with conversation data
   */
  async updateWithConversationData(haloRecord, conversation) {
    const updateData = {
      conversation_topics: conversation.topics,
      buyer_stage: conversation.buyerJourney?.stage,
      engagement_score: conversation.engagement_score,
      intent_signals: conversation.intent_signals,
      pain_points: conversation.painPoints,
      last_conversation_update: new Date().toISOString()
    };

    if (haloRecord.type === 'lead') {
      await this.updateHaloLead(haloRecord.id, updateData);
    } else if (haloRecord.type === 'contact') {
      await this.updateHaloContact(haloRecord.id, updateData);
    }
  }

  /**
   * Map Klue conversation to HaloPSA lead
   */
  mapConversationToLead(conversation) {
    return {
      name: conversation.contact ? `${conversation.contact.firstName} ${conversation.contact.lastName}` : 'Unknown Contact',
      email: conversation.contact?.email,
      company: conversation.company?.name,
      job_title: conversation.contact?.jobTitle,
      conversation_topics: conversation.topics,
      buyer_stage: conversation.buyerJourney?.stage,
      engagement_score: conversation.engagement_score,
      source: 'Klue Conversation Intelligence',
      created_date: new Date().toISOString()
    };
  }

  /**
   * Fetch conversations from Klue API
   */
  async fetchKlueConversations() {
    const response = await axios.get('https://api.klue.com/v1/conversations', {
      headers: {
        'Authorization': `Bearer ${this.klueToken}`,
        'X-Organization-ID': this.klueOrgId
      },
      params: {
        since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
        min_engagement_score: this.conversationFilters.minimum_engagement_score || 0
      }
    });

    return response.data.conversations || [];
  }

  /**
   * HaloPSA API helper methods
   */
  async findContactByEmail(email) {
    const response = await axios.get(`${this.haloBaseUrl}/contact`, {
      params: { email },
      headers: { 'Authorization': `Bearer ${this.haloApiKey}` }
    });
    return response.data.length > 0 ? { ...response.data[0], type: 'contact' } : null;
  }

  async findCompanyByName(name) {
    const response = await axios.get(`${this.haloBaseUrl}/company`, {
      params: { search: name },
      headers: { 'Authorization': `Bearer ${this.haloApiKey}` }
    });
    return response.data.length > 0 ? { ...response.data[0], type: 'company' } : null;
  }

  async createHaloLead(leadData) {
    const response = await axios.post(`${this.haloBaseUrl}/lead`, leadData, {
      headers: { 'Authorization': `Bearer ${this.haloApiKey}` }
    });
    return { ...response.data, type: 'lead' };
  }

  async updateHaloLead(leadId, updateData) {
    const response = await axios.put(`${this.haloBaseUrl}/lead/${leadId}`, updateData, {
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
}

module.exports = KlueHaloIntegrator;