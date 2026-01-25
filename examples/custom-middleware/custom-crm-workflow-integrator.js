/**
 * Enhanced HaloPSA Custom CRM Workflow Integration Service
 * Implements Lead → Prospect → Opportunity progression with:
 * - Extended custom fields (CF_101-113) 
 * - Smart update/merge logic preserving manual work
 * - List management and auto-assignment
 * - Bi-directional synchronization
 * - Multi-platform B2B data integration
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class EnhancedCustomCRMWorkflowIntegrator {
  constructor(config) {
    this.b2bConfigs = {
      apollo: config.apollo,
      zoominfo: config.zoominfo,
      hunter: config.hunter
    };
    this.haloConfig = config.halo;
    this.workflowConfig = config.workflow || this.getDefaultWorkflowConfig();
    
    // B2B API clients
    this.apolloClient = axios.create({
      baseURL: this.b2bConfigs.apollo.base_url,
      headers: {
        'X-Api-Key': this.b2bConfigs.apollo.api_key,
        'Content-Type': 'application/json'
      }
    });
    
    this.zoomInfoClient = axios.create({
      baseURL: this.b2bConfigs.zoominfo.base_url,
      headers: {
        'Authorization': `Bearer ${this.b2bConfigs.zoominfo.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    this.hunterClient = axios.create({
      baseURL: this.b2bConfigs.hunter.base_url,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    this.haloClient = null; // Will be set after OAuth
    this.statusMappings = this.initializeStatusMappings();
    this.customFieldMappings = this.initializeCustomFieldMappings();
  }

  /**
   * Enhanced main polling function for Halo Integrator
   */
  async poll() {
    try {
      console.log('[Enhanced CRM] Starting enhanced workflow integration poll...');
      
      // Step 1: Authenticate with HaloPSA
      await this.authenticateHalo();
      
      // Step 2: Multi-platform data collection with deduplication
      const allB2BData = await this.collectMultiPlatformData();
      const deduplicatedLeads = await this.deduplicateB2BData(allB2BData);
      
      // Step 3: Smart lead processing (create new or update existing)
      const leadResults = await this.processLeadsWithSmartUpdate(deduplicatedLeads);
      
      // Step 4: Automatic list assignment based on criteria
      const listAssignments = await this.processListAssignments(leadResults.created);
      
      // Step 5: Process Lead status updates and convert eligible Leads to Prospects
      const prospectConversions = await this.processLeadToProspectConversions();
      
      // Step 6: Process Prospect promotions to Opportunities
      const opportunityPromotions = await this.processProspectToOpportunityPromotions();
      
      // Step 7: Bi-directional sync for DNC and data corrections
      const biDirectionalSync = await this.processBiDirectionalSync();
      
      // Step 8: Update call records and activities
      await this.syncCallRecords();

      return {
        success: true,
        timestamp: new Date().toISOString(),
        metrics: {
          leads_processed: leadResults.processed,
          leads_created: leadResults.created.length,
          leads_updated: leadResults.updated.length,
          leads_preserved: leadResults.preserved.length,
          lists_assigned: listAssignments.total,
          prospects_converted: prospectConversions.length,
          opportunities_promoted: opportunityPromotions.length,
          bi_directional_syncs: biDirectionalSync.length
        },
        data_sources: {
          apollo_records: allB2BData.apollo?.length || 0,
          zoominfo_records: allB2BData.zoominfo?.length || 0,
          hunter_records: allB2BData.hunter?.length || 0
        },
        deduplication: {
          total_before: allB2BData.total,
          total_after: deduplicatedLeads.length,
          duplicates_removed: allB2BData.total - deduplicatedLeads.length
        }
      };
    } catch (error) {
      console.error('[Enhanced CRM] Poll failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Collect data from multiple B2B platforms
   */
  async collectMultiPlatformData() {
    console.log('[Enhanced CRM] Collecting multi-platform B2B data...');
    
    const results = {
      apollo: [],
      zoominfo: [],
      hunter: [],
      total: 0
    };
    
    try {
      // Apollo.io data collection
      const apolloData = await this.fetchApolloData();
      results.apollo = apolloData.map(record => ({
        ...record,
        source: 'Apollo.io',
        source_confidence: record.confidence || 80
      }));
      
      // ZoomInfo data collection
      const zoomInfoData = await this.fetchZoomInfoData();
      results.zoominfo = zoomInfoData.map(record => ({
        ...record,
        source: 'ZoomInfo',
        source_confidence: record.accuracy_score || 85
      }));
      
      // Hunter.io data collection (email verification focused)
      const hunterData = await this.fetchHunterData();
      results.hunter = hunterData.map(record => ({
        ...record,
        source: 'Hunter.io',
        source_confidence: record.confidence || 75
      }));
      
      results.total = results.apollo.length + results.zoominfo.length + results.hunter.length;
      
      console.log(`[Enhanced CRM] Collected ${results.total} records from ${Object.keys(results).filter(k => k !== 'total').length} platforms`);
      return results;
      
    } catch (error) {
      console.error('[Enhanced CRM] Multi-platform collection failed:', error);
      throw error;
    }
  }

  /**
   * Deduplicate leads from multiple sources using enhanced logic
   */
  async deduplicateB2BData(allData) {
    console.log('[Enhanced CRM] Deduplicating cross-platform data...');
    
    const combined = [
      ...allData.apollo,
      ...allData.zoominfo,
      ...allData.hunter
    ];
    
    const deduplicationMap = new Map();
    
    for (const record of combined) {
      const dedupKey = this.generateDeduplicationKey(record);
      
      if (!dedupKey) {
        console.log(`[Enhanced CRM] Skipping record with insufficient data: ${record.email}`);
        continue;
      }
      
      if (deduplicationMap.has(dedupKey)) {
        // Merge with existing record using data precedence
        const existingRecord = deduplicationMap.get(dedupKey);
        const mergedRecord = this.mergeRecordsByPrecedence(existingRecord, record);
        deduplicationMap.set(dedupKey, mergedRecord);
      } else {
        deduplicationMap.set(dedupKey, record);
      }
    }
    
    const deduplicated = Array.from(deduplicationMap.values());
    console.log(`[Enhanced CRM] Deduplicated ${combined.length} to ${deduplicated.length} unique records`);
    
    return deduplicated;
  }

  /**
   * Generate deduplication key from lead data
   */
  generateDeduplicationKey(leadData) {
    const email = leadData.email ? leadData.email.toLowerCase() : '';
    const company = leadData.companyName ? leadData.companyName.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const name = (leadData.firstName + leadData.lastName).toLowerCase().replace(/[^a-z]/g, '');
    
    // Primary key: email
    if (email) return `email:${email}`;
    
    // Secondary key: company + name
    if (company && name) return `company-person:${company}-${name}`;
    
    // Fallback: phone number
    if (leadData.phone) return `phone:${leadData.phone.replace(/[^\d]/g, '')}`;
    
    return null; // Skip record if no deduplication key possible
  }

  /**
   * Merge records by data source precedence
   */
  mergeRecordsByPrecedence(existing, incoming) {
    const precedence = {
      contactInfo: ['ZoomInfo', 'Apollo.io', 'Hunter.io'],
      companyInfo: ['ZoomInfo', 'Apollo.io', 'Hunter.io'],  
      emailVerification: ['Hunter.io', 'ZoomInfo', 'Apollo.io'],
      technographics: ['Apollo.io', 'ZoomInfo']
    };
    
    // Use higher confidence source for each data category
    const merged = { ...existing };
    
    // Contact information precedence
    if (this.getSourcePriority(incoming.source, precedence.contactInfo) > 
        this.getSourcePriority(existing.source, precedence.contactInfo)) {
      merged.firstName = incoming.firstName || existing.firstName;
      merged.lastName = incoming.lastName || existing.lastName;
      merged.jobTitle = incoming.jobTitle || existing.jobTitle;
    }
    
    // Always use highest confidence email
    if (incoming.source_confidence > existing.source_confidence) {
      merged.email = incoming.email || existing.email;
      merged.phone = incoming.phone || existing.phone;
    }
    
    // Merge technology stack data
    if (incoming.technologyStack && existing.technologyStack) {
      merged.technologyStack = [...new Set([
        ...existing.technologyStack.split(', '),
        ...incoming.technologyStack.split(', ')
      ])].join(', ');
    } else {
      merged.technologyStack = incoming.technologyStack || existing.technologyStack;
    }
    
    // Keep track of all sources
    merged.sources = [...new Set([
      ...(existing.sources || [existing.source]),
      incoming.source
    ])];
    
    return merged;
  }

  /**
   * Get source priority from precedence array
   */
  getSourcePriority(source, precedenceArray) {
    const index = precedenceArray.indexOf(source);
    return index === -1 ? 999 : index;
  }

      const summary = {
        success: true,
        timestamp: new Date().toISOString(),
        metrics: {
          apollo_persons_processed: apolloResults?.length || 0,
          leads_created: processedLeads.filter(l => l.action === 'created').length,
          leads_updated: processedLeads.filter(l => l.action === 'updated').length,
          prospects_converted: prospectConversions.length,
          opportunities_promoted: opportunityPromotions.length
        },
        workflow_progression: {
          new_leads: processedLeads.filter(l => l.status === 'new_lead').length,
          engaged_leads: processedLeads.filter(l => l.status === 'engaged').length,
          qualified_prospects: prospectConversions.filter(p => p.status === 'qualified').length,
          active_opportunities: opportunityPromotions.filter(o => o.status === 'progressing').length
        }
      };

      console.log('[Custom CRM] Poll completed:', summary.metrics);
      return summary;
      
    } catch (error) {
      console.error('[Custom CRM] Integration error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Fetch data from Apollo.io
   */
  async fetchApolloData() {
    try {
      const searchParams = {
        q_person_emails_exist: true,
        sort_by_field: 'person_created_at',
        sort_ascending: false,
        page: 1,
        per_page: 50
      };

      const response = await this.apolloClient.post('/mixed_people/search', searchParams);
      console.log(`[Apollo] Fetched ${response.data.people?.length || 0} persons`);
      return response.data.people || [];
    } catch (error) {
      console.error('[Apollo] API error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Fetch ZoomInfo data
   */
  async fetchZoomInfoData() {
    try {
      console.log('[ZoomInfo] Fetching contact data...');
      const searchParams = {
        query: {
          person: {
            hasEmail: true,
            titleIncludesAnyOf: ['CTO', 'IT Director', 'Technology Manager', 'Systems Administrator']
          },
          company: {
            employeeCountMin: this.workflowConfig.filters.min_employees,
            employeeCountMax: this.workflowConfig.filters.max_employees,
            industryIncludesAnyOf: this.workflowConfig.filters.target_industries
          }
        },
        outputFields: ['person.firstName', 'person.lastName', 'person.email', 'person.jobTitle', 'person.phone', 'company.name', 'company.website', 'company.industry', 'company.employees', 'company.revenue']
      };
      
      const response = await this.zoomInfoClient.post('/lookup/person', searchParams);
      console.log(`[ZoomInfo] Fetched ${response.data.results?.length || 0} contacts`);
      return response.data.results || [];
    } catch (error) {
      console.error('[ZoomInfo] API error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Fetch Hunter.io data
   */
  async fetchHunterData() {
    try {
      console.log('[Hunter] Fetching email data...');
      const domains = this.workflowConfig.filters.target_domains || [];
      const results = [];
      
      for (const domain of domains) {
        const response = await this.hunterClient.get('/v2/domain-search', {
          params: {
            domain: domain,
            api_key: this.b2bConfigs.hunter.api_key,
            limit: 50
          }
        });
        
        if (response.data.data && response.data.data.emails) {
          results.push(...response.data.data.emails);
        }
      }
      
      console.log(`[Hunter] Fetched ${results.length} email records`);
      return results;
    } catch (error) {
      console.error('[Hunter] API error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Process leads with smart update logic (create new or update existing)
   */
  async processLeadsWithSmartUpdate(deduplicatedLeads) {
    console.log(`[Enhanced CRM] Processing ${deduplicatedLeads.length} leads with smart update logic...`);
    
    const results = {
      processed: deduplicatedLeads.length,
      created: [],
      updated: [],
      preserved: [],
      errors: []
    };
    
    for (const leadData of deduplicatedLeads) {
      try {
        const result = await this.processLeadImport(leadData);
        
        switch (result.action) {
          case 'created':
            results.created.push(result);
            break;
          case 'updated':
            results.updated.push(result);
            break;
          case 'preserved':
            results.preserved.push(result);
            break;
          default:
            results.errors.push(result);
        }
        
      } catch (error) {
        console.error(`[Enhanced CRM] Failed to process lead ${leadData.email}:`, error);
        results.errors.push({
          email: leadData.email,
          error: error.message
        });
      }
    }
    
    console.log(`[Enhanced CRM] Lead processing complete: ${results.created.length} created, ${results.updated.length} updated, ${results.preserved.length} preserved`);
    return results;
  }

  /**
   * Process Apollo persons into HaloPSA Leads
   */
  async processApolloToLeads(apolloPersons) {
    const results = [];
    
    for (const person of apolloPersons) {
      try {
        // Check if lead already exists (deduplication by email)
        const existingLead = await this.findExistingLead(person.email);
        
        if (existingLead) {
          // Update existing lead with enriched data
          const updatedLead = await this.updateLead(existingLead.id, person);
          results.push({ 
            action: 'updated', 
            lead: updatedLead,
            status: updatedLead.status 
          });
        } else {
          // Create new lead
          const newLead = await this.createLeadFromApollo(person);
          results.push({ 
            action: 'created', 
            lead: newLead,
            status: 'new_lead'
          });
        }
      } catch (error) {
        console.error(`[Lead Creation] Error processing Apollo person ${person.id}:`, error.message);
        results.push({ 
          action: 'error', 
          person: person.id, 
          error: error.message 
        });
      }
    }
    
    return results;
  }

  /**
   * Create HaloPSA Lead from Apollo person data
   */
  async createLeadFromApollo(apolloPerson) {
    const leadData = this.transformApolloToLead(apolloPerson);
    
    // Ensure organization exists
    const clientId = await this.ensureOrganizationExists(apolloPerson.organization);
    
    // Create Lead via HaloPSA Tickets API
    const ticketData = {
      summary: `Lead: ${apolloPerson.first_name} ${apolloPerson.last_name} - ${apolloPerson.organization?.name}`,
      details: this.buildLeadDetails(apolloPerson),
      tickettype_id: this.workflowConfig.lead_ticket_type_id,
      status_id: this.getStatusId('lead', 'new_lead'),
      client_id: clientId,
      priority_id: 4, // Normal priority
      ...leadData.standardFields,
      customfields: leadData.customFields
    };

    const response = await this.haloClient.post('/api/Tickets', {
      tickets: [ticketData]
    });
    
    console.log(`[Lead] Created lead #${response.data.tickets[0].id} for ${apolloPerson.first_name} ${apolloPerson.last_name}`);
    return response.data.tickets[0];
  }

  /**
   * Transform Apollo person data to Lead entity structure
   */
  transformApolloToLead(apolloPerson) {
    const org = apolloPerson.organization || {};
    
    const standardFields = {
      person_name: `${apolloPerson.first_name || ''} ${apolloPerson.last_name || ''}`.trim(),
      job_title: apolloPerson.title || '',
      email: apolloPerson.email,
      phone_numbers: apolloPerson.phone_numbers?.map(p => p.sanitized_number).filter(Boolean) || [],
      company_name: org.name || '',
      website: org.website_url || '',
      industry: org.industry || '',
      headcount: org.estimated_num_employees || 0,
      lead_source: 'apollo_io'
    };

    const customFields = [
      {
        id: 101, // CF_101_lead_source
        name: 'CF_101_lead_source',
        value: 'apollo_io'
      },
      {
        id: 102, // CF_102_services_offered
        name: 'CF_102_services_offered',
        value: org.business_description || ''
      },
      {
        id: 103, // CF_103_growth_signals
        name: 'CF_103_growth_signals',
        value: this.extractGrowthSignals(org)
      },
      {
        id: 104, // CF_104_project_pipelines
        name: 'CF_104_project_pipelines',
        value: this.extractProjectPipelines(apolloPerson)
      },
      {
        id: 105, // CF_105_do_not_contact
        name: 'CF_105_do_not_contact',
        value: apolloPerson.do_not_contact || false
      }
    ];

    return { standardFields, customFields };
  }

  /**
   * Process Lead to Prospect conversions
   */
  async processLeadToProspectConversions() {
    try {
      // Find leads with status "engaged" that haven't been converted
      const engagedLeads = await this.haloClient.get('/api/Tickets', {
        params: {
          tickettype_id: this.workflowConfig.lead_ticket_type_id,
          status_id: this.getStatusId('lead', 'engaged'),
          pageinate: true,
          page_size: 50
        }
      });

      const conversions = [];
      
      for (const lead of engagedLeads.data.tickets || []) {
        try {
          // Check if already converted
          const existingProspect = await this.findProspectByLeadId(lead.id);
          if (!existingProspect) {
            const prospect = await this.convertLeadToProspect(lead);
            conversions.push(prospect);
          }
        } catch (error) {
          console.error(`[Prospect Conversion] Error converting lead ${lead.id}:`, error.message);
        }
      }

      console.log(`[Workflow] Converted ${conversions.length} leads to prospects`);
      return conversions;
    } catch (error) {
      console.error('[Prospect Conversion] Error:', error.message);
      return [];
    }
  }

  /**
   * Convert Lead to Prospect
   */
  async convertLeadToProspect(lead) {
    const leadCustomFields = this.extractCustomFieldValues(lead);
    
    const prospectData = {
      summary: `Prospect: ${leadCustomFields.person_name} - ${leadCustomFields.company_name}`,
      details: `Converted from Lead #${lead.id} on ${new Date().toISOString()}\\n\\n${lead.details}`,
      tickettype_id: this.workflowConfig.prospect_ticket_type_id,
      status_id: this.getStatusId('prospect', 'new_prospect'),
      client_id: lead.client_id,
      priority_id: 3, // Higher priority than leads
      
      // Inherit lead data
      person_name: leadCustomFields.person_name,
      job_title: leadCustomFields.job_title,
      email: leadCustomFields.email,
      company_name: leadCustomFields.company_name,
      
      // Add prospect-specific custom fields
      customfields: [
        ...lead.customfields, // Inherit all lead custom fields
        {
          id: 201,
          name: 'CF_201_pain_points',
          value: '' // To be filled during qualification calls
        },
        {
          id: 202,
          name: 'CF_202_qualified_services',
          value: ''
        },
        {
          id: 203,
          name: 'CF_203_decision_maker',
          value: leadCustomFields.person_name // Default to primary contact
        },
        {
          id: 204,
          name: 'CF_204_budget_range',
          value: ''
        },
        {
          id: 205,
          name: 'CF_205_timeframe',
          value: ''
        },
        {
          id: 206,
          name: 'CF_206_fit_score',
          value: '50' // Default middle score
        },
        {
          id: 207,
          name: 'CF_207_promoted_from_lead',
          value: lead.id.toString()
        }
      ]
    };

    const response = await this.haloClient.post('/api/Tickets', {
      tickets: [prospectData]
    });

    // Update original lead to mark as converted
    await this.haloClient.post(`/api/Tickets/${lead.id}`, {
      status_id: this.getStatusId('lead', 'converted_to_prospect'),
      details: `${lead.details}\\n\\n[CONVERTED] Promoted to Prospect #${response.data.tickets[0].id} on ${new Date().toISOString()}`
    });

    console.log(`[Prospect] Converted lead #${lead.id} to prospect #${response.data.tickets[0].id}`);
    return response.data.tickets[0];
  }

  /**
   * Process Prospect to Opportunity promotions
   */
  async processProspectToOpportunityPromotions() {
    try {
      // Find qualified prospects with high fit scores
      const qualifiedProspects = await this.haloClient.get('/api/Tickets', {
        params: {
          tickettype_id: this.workflowConfig.prospect_ticket_type_id,
          status_id: this.getStatusId('prospect', 'qualified'),
          pageinate: true,
          page_size: 50
        }
      });

      const promotions = [];
      
      for (const prospect of qualifiedProspects.data.tickets || []) {
        try {
          const fitScore = this.getCustomFieldValue(prospect, 'CF_206_fit_score');
          
          // Promote if fit score >= 70 and has required qualification data
          if (parseInt(fitScore) >= 70 && this.hasRequiredQualificationData(prospect)) {
            const existingOpportunity = await this.findOpportunityByProspectId(prospect.id);
            if (!existingOpportunity) {
              const opportunity = await this.promoteProspectToOpportunity(prospect);
              promotions.push(opportunity);
            }
          }
        } catch (error) {
          console.error(`[Opportunity Promotion] Error promoting prospect ${prospect.id}:`, error.message);
        }
      }

      console.log(`[Workflow] Promoted ${promotions.length} prospects to opportunities`);
      return promotions;
    } catch (error) {
      console.error('[Opportunity Promotion] Error:', error.message);
      return [];
    }
  }

  /**
   * Promote Prospect to Opportunity
   */
  async promoteProspectToOpportunity(prospect) {
    const prospectCustomFields = this.extractCustomFieldValues(prospect);
    
    // Calculate initial opportunity value based on company size and industry
    const estimatedValue = this.calculateOpportunityValue(prospect);
    
    const opportunityData = {
      name: `${prospectCustomFields.company_name} - ${prospectCustomFields.qualified_services || 'Services'}`,
      description: `Promoted from Prospect #${prospect.id} on ${new Date().toISOString()}\\n\\nQualification Summary:\\n${prospect.details}`,
      
      // Basic opportunity fields
      opportunity_value: estimatedValue,
      probability_percent: 25, // Starting probability
      expected_close_date: this.calculateExpectedCloseDate(),
      status: 'new_opportunity',
      
      // Client/Contact association
      client_id: prospect.client_id,
      contact_id: prospect.user_id,
      
      // Custom fields for opportunity tracking
      customfields: [
        {
          id: 301,
          name: 'CF_301_products_services',
          value: prospectCustomFields.CF_202_qualified_services || ''
        },
        {
          id: 302,
          name: 'CF_302_quotes_proposals',
          value: ''
        },
        {
          id: 303,
          name: 'CF_303_competitors',
          value: ''
        },
        {
          id: 304,
          name: 'CF_304_win_loss_reason',
          value: ''
        },
        {
          id: 305,
          name: 'CF_305_promoted_from_prospect',
          value: prospect.id.toString()
        }
      ]
    };

    // Create via HaloPSA Opportunities API
    const response = await this.haloClient.post('/api/Opportunities', opportunityData);

    // Update prospect to mark as promoted
    await this.haloClient.post(`/api/Tickets/${prospect.id}`, {
      status_id: this.getStatusId('prospect', 'promoted_to_opportunity'),
      details: `${prospect.details}\\n\\n[PROMOTED] Promoted to Opportunity #${response.data.id} on ${new Date().toISOString()}`
    });

    console.log(`[Opportunity] Promoted prospect #${prospect.id} to opportunity #${response.data.id} (Value: $${estimatedValue})`);
    return response.data;
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  /**
   * Initialize status mappings for workflow progression
   */
  initializeStatusMappings() {
    return {
      lead: {
        'new_lead': 1,
        'researching': 2,
        'contacted': 3,
        'engaged': 4,
        'no_interest': 5,
        'do_not_contact': 6,
        'invalid_data': 7,
        'converted_to_prospect': 8
      },
      prospect: {
        'new_prospect': 10,
        'prospecting': 11,
        'qualified': 12,
        'disqualified': 13,
        'promoted_to_opportunity': 14
      },
      opportunity: {
        'new_opportunity': 20,
        'progressing': 21,
        'negotiation': 22,
        'won': 23,
        'lost': 24
      }
    };
  }

  getStatusId(entityType, statusName) {
    return this.statusMappings[entityType]?.[statusName] || 1;
  }

  getCustomFieldValue(entity, fieldName) {
    const field = entity.customfields?.find(cf => cf.name === fieldName);
    return field?.value || '';
  }

  extractCustomFieldValues(entity) {
    const values = {};
    entity.customfields?.forEach(cf => {
      values[cf.name] = cf.value;
    });
    // Also add standard field access
    values.person_name = entity.summary?.split(' - ')[0]?.replace('Lead: ', '').replace('Prospect: ', '') || '';
    values.company_name = entity.summary?.split(' - ')[1] || '';
    return values;
  }

  buildLeadDetails(apolloPerson) {
    const org = apolloPerson.organization || {};
    return `Apollo.io Lead Import - ${new Date().toISOString()}

CONTACT INFORMATION:
Name: ${apolloPerson.first_name} ${apolloPerson.last_name}
Title: ${apolloPerson.title || 'Not specified'}
Email: ${apolloPerson.email}
Phone: ${apolloPerson.phone_numbers?.[0]?.sanitized_number || 'Not available'}
LinkedIn: ${apolloPerson.linkedin_url || 'Not available'}

COMPANY INFORMATION:
Company: ${org.name || 'Not specified'}
Website: ${org.website_url || 'Not available'}
Industry: ${org.industry || 'Not specified'}
Employees: ${org.estimated_num_employees || 'Not specified'}
Revenue: ${org.annual_revenue || 'Not available'}
Description: ${org.business_description || 'Not available'}

TECHNOLOGY & SIGNALS:
Technologies: ${org.technologies?.join(', ') || 'Not available'}
Funding: ${org.total_funding || 'Not available'}
Recent News: ${apolloPerson.news?.slice(0, 2).map(n => n.title).join('; ') || 'None found'}

LEAD QUALIFICATION STATUS:
✓ Contact information verified
○ Pain points identified (pending qualification)
○ Budget discussed (pending qualification)
○ Timeline established (pending qualification)
○ Decision maker confirmed (pending qualification)`;
  }

  extractGrowthSignals(organization) {
    const signals = [];
    if (organization.annual_revenue) signals.push(`Revenue: ${organization.annual_revenue}`);
    if (organization.funding_events?.length) signals.push(`Recent funding events: ${organization.funding_events.length}`);
    if (organization.employee_growth) signals.push(`Employee growth: ${organization.employee_growth}%`);
    if (organization.technologies?.length) signals.push(`Tech adoption: ${organization.technologies.length} platforms`);
    return signals.join('; ') || 'No growth signals available';
  }

  extractProjectPipelines(apolloPerson) {
    const pipelines = [];
    if (apolloPerson.intent_signals?.length) {
      pipelines.push(`Intent signals: ${apolloPerson.intent_signals.join(', ')}`);
    }
    if (apolloPerson.organization?.recent_funding) {
      pipelines.push(`Recent funding: expansion likely`);
    }
    if (apolloPerson.organization?.technologies?.includes('CRM') || 
        apolloPerson.organization?.technologies?.includes('ERP')) {
      pipelines.push(`Enterprise tech: potential integration projects`);
    }
    return pipelines.join('; ') || 'No project signals detected';
  }

  hasRequiredQualificationData(prospect) {
    const requiredFields = ['CF_201_pain_points', 'CF_204_budget_range', 'CF_205_timeframe'];
    return requiredFields.every(field => {
      const value = this.getCustomFieldValue(prospect, field);
      return value && value.trim().length > 0;
    });
  }

  calculateOpportunityValue(prospect) {
    const companySize = parseInt(this.getCustomFieldValue(prospect, 'CF_206_fit_score')) || 50;
    const baseValue = companySize < 30 ? 10000 : companySize < 70 ? 25000 : 50000;
    
    // Adjust based on services offered
    const services = this.getCustomFieldValue(prospect, 'CF_202_qualified_services').toLowerCase();
    let multiplier = 1;
    if (services.includes('managed') || services.includes('support')) multiplier *= 1.5;
    if (services.includes('cloud') || services.includes('migration')) multiplier *= 1.3;
    if (services.includes('security') || services.includes('compliance')) multiplier *= 1.4;
    
    return Math.round(baseValue * multiplier);
  }

  calculateExpectedCloseDate(timeframe = null) {
    const today = new Date();
    let monthsToAdd = 3; // Default 3 months
    
    if (timeframe) {
      if (timeframe.includes('immediate') || timeframe.includes('urgent')) monthsToAdd = 1;
      else if (timeframe.includes('quarter') || timeframe.includes('Q')) monthsToAdd = 3;
      else if (timeframe.includes('year') || timeframe.includes('annual')) monthsToAdd = 12;
    }
    
    today.setMonth(today.getMonth() + monthsToAdd);
    return today.toISOString().split('T')[0];
  }

  getDefaultWorkflowConfig() {
    return {
      lead_ticket_type_id: 1,      // Configure based on HaloPSA setup
      prospect_ticket_type_id: 2,  // Configure based on HaloPSA setup
      opportunity_ticket_type_id: 3 // Or use Opportunities API
    };
  }

  // Additional methods for finding entities, authentication, etc.
  async findExistingLead(email) {
    // Implementation for finding existing leads by email
    try {
      const response = await this.haloClient.get('/api/Tickets', {
        params: {
          search: email,
          tickettype_id: this.workflowConfig.lead_ticket_type_id
        }
      });
      return response.data.tickets?.[0] || null;
    } catch (error) {
      return null;
    }
  }

  async findProspectByLeadId(leadId) {
    // Implementation for finding prospects converted from specific lead
    try {
      const response = await this.haloClient.get('/api/Tickets', {
        params: {
          search: `Lead #${leadId}`,
          tickettype_id: this.workflowConfig.prospect_ticket_type_id
        }
      });
      return response.data.tickets?.find(t => 
        t.details.includes(`Lead #${leadId}`)
      ) || null;
    } catch (error) {
      return null;
    }
  }

  async findOpportunityByProspectId(prospectId) {
    // Implementation for finding opportunities promoted from specific prospect
    try {
      const response = await this.haloClient.get('/api/Opportunities', {
        params: {
          search: `Prospect #${prospectId}`
        }
      });
      return response.data.opportunities?.find(o => 
        o.description.includes(`Prospect #${prospectId}`)
      ) || null;
    } catch (error) {
      return null;
    }
  }

  async ensureOrganizationExists(apolloOrg) {
    if (!apolloOrg?.name) return null;
    
    // Check if organization exists
    try {
      const existing = await this.haloClient.get('/api/Client', {
        params: { search: apolloOrg.name }
      });
      
      if (existing.data.clients?.length > 0) {
        return existing.data.clients[0].id;
      }
      
      // Create new organization
      const orgData = {
        name: apolloOrg.name,
        website: apolloOrg.website_url,
        industry: apolloOrg.industry,
        employee_count: apolloOrg.estimated_num_employees,
        notes: `Created from Apollo.io import: ${apolloOrg.business_description || ''}`
      };
      
      const created = await this.haloClient.post('/api/Client', {
        clients: [orgData]
      });
      
      return created.data.clients[0].id;
    } catch (error) {
      console.error('[Organization] Error creating organization:', error.message);
      return null;
    }
  }

  async authenticateHalo() {
    // OAuth 2.0 authentication implementation
    // This would implement the full OAuth flow for HaloPSA
    // For now, assume token is obtained and set client
    this.haloClient = axios.create({
      baseURL: this.haloConfig.base_url,
      headers: {
        'Authorization': `Bearer ${this.haloConfig.access_token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async syncCallRecords() {
    // Placeholder for call record synchronization
    // Would sync call data from phone systems or other sources
    console.log('[Call Records] Sync completed (placeholder)');
    return [];
  }
}

module.exports = CustomCRMWorkflowIntegrator;