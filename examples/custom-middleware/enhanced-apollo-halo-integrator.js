/**
 * Enhanced Apollo.io to HaloPSA Integration Middleware
 * Production-ready integration with smart updates, bi-directional sync, and comprehensive data management
 * 
 * Features:
 * - Apollo.io webhook processing with enhanced data fields
 * - Smart deduplication and data merging
 * - Bi-directional synchronization (DNC, engagement, corrections)
 * - Intent signal processing and lead scoring
 * - Comprehensive error handling and logging
 * 
 * @version 2.0.0
 * @author HaloPSA Integration Team
 */

const axios = require('axios');
const crypto = require('crypto');
const winston = require('winston');

class EnhancedApolloHaloIntegrator {
    constructor(config) {
        this.config = config;
        this.logger = this.setupLogger();
        this.rateLimiter = this.setupRateLimiter();
        this.cache = new Map();
        
        // Initialize API clients
        this.apolloClient = axios.create({
            baseURL: 'https://api.apollo.io/v1',
            headers: {
                'X-Api-Key': config.apollo.apiKey,
                'Content-Type': 'application/json'
            }
        });

        this.haloClient = axios.create({
            baseURL: config.halopsa.baseUrl,
            headers: {
                'Authorization': `Bearer ${config.halopsa.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
    }

    setupLogger() {
        return winston.createLogger({
            level: this.config.logLevel || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'apollo-halo-integration.log' }),
                new winston.transports.Console()
            ]
        });
    }

    setupRateLimiter() {
        // Simple rate limiter implementation
        return {
            apollo: { requests: 0, resetTime: Date.now() + 60000 },
            halo: { requests: 0, resetTime: Date.now() + 60000 }
        };
    }

    /**
     * Process Apollo webhook with enhanced person enrichment data
     */
    async processApolloWebhook(req, res) {
        try {
            // Verify webhook signature
            if (!this.verifyWebhookSignature(req)) {
                return res.status(401).json({ error: 'Invalid signature' });
            }

            const { event_type, data } = req.body;
            
            this.logger.info('Processing Apollo webhook', { 
                event_type, 
                person_id: data.person?.id,
                organization: data.organization?.name 
            });

            switch (event_type) {
                case 'person_enriched':
                    await this.handlePersonEnriched(data);
                    break;
                case 'engagement_updated':
                    await this.handleEngagementUpdated(data);
                    break;
                case 'intent_signals_detected':
                    await this.handleIntentSignals(data);
                    break;
                default:
                    this.logger.warn('Unhandled event type', { event_type });
            }

            res.status(200).json({ status: 'processed' });
        } catch (error) {
            this.logger.error('Webhook processing failed', error);
            res.status(500).json({ error: 'Processing failed' });
        }
    }

    /**
     * Handle enriched person data with comprehensive field mapping
     */
    async handlePersonEnriched(data) {
        const { person, organization } = data;
        
        // Check for existing lead to avoid duplicates
        const existingLead = await this.findExistingLead(person.email);
        
        if (existingLead && !this.shouldUpdateExistingLead(existingLead)) {
            this.logger.info('Skipping update for manually worked lead', { 
                lead_id: existingLead.id,
                email: person.email 
            });
            return;
        }

        const leadData = await this.mapApolloToHaloLead(person, organization);
        
        if (existingLead) {
            await this.updateHaloLead(existingLead.id, leadData);
        } else {
            const newLead = await this.createHaloLead(leadData);
            await this.assignToList(newLead.id, leadData);
        }
    }

    /**
     * Map Apollo enriched data to HaloPSA custom fields
     */
    async mapApolloToHaloLead(person, organization) {
        // Calculate lead fit score based on multiple factors
        const fitScore = this.calculateLeadFitScore(person, organization);
        
        // Calculate engagement score from Apollo metrics
        const engagementScore = this.calculateEngagementScore(person.engagement_metrics || {});

        return {
            summary: `${person.first_name} ${person.last_name} - ${organization?.name || 'Unknown Company'}`,
            details: this.generateLeadDescription(person, organization),
            user_email: person.email,
            user_name: `${person.first_name} ${person.last_name}`,
            ticket_type_id: 1, // Lead type
            status_id: this.config.halopsa.defaultLeadStatus,
            customfields: [
                { id: 101, value: 'Apollo.io' }, // CF_101_source_platform
                { id: 102, value: person.confidence_score || 0 }, // CF_102_confidence_score
                { id: 103, value: organization?.estimated_num_employees || 'Unknown' }, // CF_103_company_size
                { id: 104, value: organization?.industry || 'Unknown' }, // CF_104_industry
                { id: 105, value: false }, // CF_105_do_not_contact
                { id: 106, value: person.seniority || 'Unknown' }, // CF_106_contact_seniority
                { id: 107, value: JSON.stringify(organization?.technologies || []) }, // CF_107_technologies_used
                { id: 108, value: this.getFundingStatus(organization?.funding_events) }, // CF_108_funding_status
                { id: 109, value: organization?.intent_strength || 'Unknown' }, // CF_109_intent_strength
                { id: 110, value: fitScore }, // CF_110_lead_fit_score
                { id: 111, value: engagementScore }, // CF_111_engagement_score
                { id: 112, value: new Date().toISOString().split('T')[0] }, // CF_112_data_freshness
                { id: 113, value: this.getContactReachability(person) } // CF_113_contact_reachability
            ]
        };
    }

    /**
     * Calculate lead fit score based on ICP criteria
     */
    calculateLeadFitScore(person, organization) {
        let score = 0;
        const weights = this.config.scoring.weights;

        // Company size scoring
        if (organization?.estimated_num_employees) {
            const size = organization.estimated_num_employees;
            if (size >= 50 && size <= 1000) score += weights.company_size * 30;
            else if (size > 1000) score += weights.company_size * 20;
            else score += weights.company_size * 10;
        }

        // Industry scoring
        if (organization?.industry) {
            const targetIndustries = this.config.scoring.target_industries || [];
            if (targetIndustries.includes(organization.industry)) {
                score += weights.industry * 25;
            }
        }

        // Seniority scoring
        if (person.seniority) {
            const targetSeniorities = ['senior', 'director', 'vp', 'c-level'];
            if (targetSeniorities.includes(person.seniority.toLowerCase())) {
                score += weights.seniority * 20;
            }
        }

        // Intent signals scoring
        if (organization?.intent_strength) {
            switch (organization.intent_strength.toLowerCase()) {
                case 'high': score += weights.intent * 25; break;
                case 'medium': score += weights.intent * 15; break;
                case 'low': score += weights.intent * 5; break;
            }
        }

        return Math.min(score, 100);
    }

    /**
     * Calculate engagement score from Apollo metrics
     */
    calculateEngagementScore(metrics) {
        let score = 0;
        
        score += (metrics.emails_opened || 0) * 2;
        score += (metrics.emails_clicked || 0) * 5;
        score += (metrics.emails_replied || 0) * 10;
        score += (metrics.calls_connected || 0) * 15;
        score += (metrics.meetings_scheduled || 0) * 25;
        
        return Math.min(score, 100);
    }

    /**
     * Generate comprehensive lead description
     */
    generateLeadDescription(person, organization) {
        let description = `Lead Source: Apollo.io\n\n`;
        
        description += `Contact Information:\n`;
        description += `- Name: ${person.first_name} ${person.last_name}\n`;
        description += `- Title: ${person.title || 'Not specified'}\n`;
        description += `- Email: ${person.email}\n`;
        
        if (person.phone_numbers?.length > 0) {
            description += `- Phone: ${person.phone_numbers[0].sanitized_number}\n`;
        }
        
        if (person.linkedin_url) {
            description += `- LinkedIn: ${person.linkedin_url}\n`;
        }

        if (organization) {
            description += `\nCompany Information:\n`;
            description += `- Company: ${organization.name}\n`;
            description += `- Industry: ${organization.industry || 'Not specified'}\n`;
            description += `- Size: ${organization.estimated_num_employees || 'Unknown'} employees\n`;
            description += `- Website: ${organization.website_url || 'Not specified'}\n`;
            
            if (organization.headquarters_address) {
                description += `- Location: ${organization.headquarters_address}\n`;
            }

            if (organization.technologies?.length > 0) {
                description += `- Technologies: ${organization.technologies.slice(0, 5).map(t => t.name).join(', ')}\n`;
            }
        }

        return description;
    }

    /**
     * Handle engagement updates from Apollo
     */
    async handleEngagementUpdated(data) {
        const existingLead = await this.findExistingLead(data.email);
        
        if (!existingLead) {
            this.logger.warn('Engagement update for non-existent lead', { email: data.email });
            return;
        }

        const engagementScore = this.calculateEngagementScore(data.engagement_metrics);
        
        await this.updateCustomField(existingLead.id, 111, engagementScore);
        
        // Check if lead should be promoted to prospect
        if (engagementScore >= 50 && existingLead.ticket_type_id === 1) {
            await this.promoteLeadToProspect(existingLead.id, engagementScore);
        }
    }

    /**
     * Handle intent signals from Apollo
     */
    async handleIntentSignals(data) {
        const { company_id, intent_topics, intent_strength } = data;
        
        // Find all leads/prospects for this company
        const companyLeads = await this.findLeadsByCompany(company_id);
        
        for (const lead of companyLeads) {
            await this.updateCustomField(lead.id, 109, intent_strength);
            
            // Recalculate fit score with new intent data
            const newFitScore = await this.recalculateLeadFitScore(lead.id);
            await this.updateCustomField(lead.id, 110, newFitScore);
        }
    }

    /**
     * Bi-directional sync: Send DNC flag to Apollo
     */
    async syncDNCToApollo(leadId, email, reason) {
        try {
            await this.apolloClient.post('/contacts/suppress', {
                email: email,
                reason: reason,
                source: 'halopsa_integration'
            });

            this.logger.info('DNC synced to Apollo', { leadId, email, reason });
        } catch (error) {
            this.logger.error('Failed to sync DNC to Apollo', { leadId, email, error: error.message });
            throw error;
        }
    }

    /**
     * Bi-directional sync: Send engagement feedback to Apollo
     */
    async sendEngagementFeedbackToApollo(contactData, outcome) {
        try {
            await this.apolloClient.post('/feedback/engagement', {
                contact_id: contactData.apollo_id,
                outcome: outcome, // 'responded', 'meeting_booked', 'qualified', etc.
                source: 'halopsa_integration',
                metadata: {
                    halo_lead_id: contactData.halo_lead_id,
                    conversion_date: new Date().toISOString()
                }
            });

            this.logger.info('Engagement feedback sent to Apollo', { 
                apollo_id: contactData.apollo_id,
                outcome 
            });
        } catch (error) {
            this.logger.error('Failed to send engagement feedback', error);
        }
    }

    /**
     * Find existing lead by email with deduplication check
     */
    async findExistingLead(email) {
        try {
            const response = await this.haloClient.get('/tickets', {
                params: {
                    search: email,
                    ticket_type: 1, // Leads only
                    pageinate: false
                }
            });

            const leads = response.data.tickets || [];
            return leads.find(lead => 
                lead.user_email?.toLowerCase() === email.toLowerCase()
            );
        } catch (error) {
            this.logger.error('Failed to find existing lead', { email, error: error.message });
            return null;
        }
    }

    /**
     * Check if existing lead should be updated (preserve manual work)
     */
    shouldUpdateExistingLead(lead) {
        // Don't update if manually worked (status changed from default)
        if (lead.status_id !== this.config.halopsa.defaultLeadStatus) {
            return false;
        }

        // Don't update if DNC flag is set
        const dncField = lead.customfields?.find(cf => cf.id === 105);
        if (dncField?.value === true) {
            return false;
        }

        // Don't update if last update was by human user (not automation)
        if (lead.lastactionbyuser && !this.config.halopsa.automationUsers.includes(lead.lastactionbyuser)) {
            return false;
        }

        return true;
    }

    /**
     * Create new HaloPSA lead
     */
    async createHaloLead(leadData) {
        try {
            const response = await this.haloClient.post('/tickets', leadData);
            this.logger.info('Created new lead', { id: response.data.id, email: leadData.user_email });
            return response.data;
        } catch (error) {
            this.logger.error('Failed to create lead', { leadData, error: error.message });
            throw error;
        }
    }

    /**
     * Update existing HaloPSA lead with smart merging
     */
    async updateHaloLead(leadId, leadData) {
        try {
            // Only update fields that should be refreshed
            const updateData = {
                customfields: leadData.customfields.filter(cf => 
                    this.config.halopsa.refreshableFields.includes(cf.id)
                )
            };

            const response = await this.haloClient.post(`/tickets/${leadId}`, updateData);
            this.logger.info('Updated existing lead', { id: leadId });
            return response.data;
        } catch (error) {
            this.logger.error('Failed to update lead', { leadId, error: error.message });
            throw error;
        }
    }

    /**
     * Assign lead to appropriate list based on criteria
     */
    async assignToList(leadId, leadData) {
        try {
            const listId = this.determineListAssignment(leadData);
            
            if (listId) {
                await this.haloClient.post(`/tickets/${leadId}/lists`, {
                    list_id: listId,
                    reason: 'Auto-assigned based on lead criteria'
                });

                this.logger.info('Lead assigned to list', { leadId, listId });
            }
        } catch (error) {
            this.logger.error('Failed to assign lead to list', { leadId, error: error.message });
        }
    }

    /**
     * Determine appropriate list assignment
     */
    determineListAssignment(leadData) {
        const customFields = leadData.customfields;
        const companySize = customFields.find(cf => cf.id === 103)?.value;
        const industry = customFields.find(cf => cf.id === 104)?.value;
        const fitScore = customFields.find(cf => cf.id === 110)?.value;

        // Enterprise list for large companies with high fit scores
        if (this.isLargeCompany(companySize) && fitScore >= 80) {
            return this.config.halopsa.lists.enterprise;
        }

        // SMB list for smaller companies
        if (this.isMediumCompany(companySize)) {
            return this.config.halopsa.lists.smb;
        }

        // Industry-specific lists
        const industryListMap = this.config.halopsa.lists.industry;
        if (industry && industryListMap[industry]) {
            return industryListMap[industry];
        }

        // Default list
        return this.config.halopsa.lists.default;
    }

    /**
     * Verify Apollo webhook signature
     */
    verifyWebhookSignature(req) {
        if (!this.config.apollo.webhookSecret) {
            return true; // Skip verification if no secret configured
        }

        const signature = req.headers['x-apollo-signature'];
        const payload = JSON.stringify(req.body);
        
        const expectedSignature = crypto
            .createHmac('sha256', this.config.apollo.webhookSecret)
            .update(payload)
            .digest('hex');

        return signature === expectedSignature;
    }

    /**
     * Utility functions
     */
    isLargeCompany(size) {
        return typeof size === 'number' && size >= 1000;
    }

    isMediumCompany(size) {
        return typeof size === 'number' && size >= 50 && size < 1000;
    }

    getFundingStatus(fundingEvents) {
        if (!fundingEvents || fundingEvents.length === 0) return 'Unknown';
        
        const latest = fundingEvents.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        return `${latest.type} - ${latest.amount}`;
    }

    getContactReachability(person) {
        let reachability = [];
        
        if (person.email) reachability.push('Email');
        if (person.phone_numbers?.length > 0) reachability.push('Phone');
        if (person.linkedin_url) reachability.push('LinkedIn');
        
        return reachability.join(', ') || 'Limited';
    }
}

module.exports = EnhancedApolloHaloIntegrator;