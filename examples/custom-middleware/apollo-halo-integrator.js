// Apollo.io Integration Example for Halo Integrator
// This endpoint is designed to be polled by HaloPSA's Halo Integrator service

const express = require('express');
const apolloConfig = require('../schemas/apollo-io-config.json');
const environmentConfig = require('../config/environment.json');

const app = express();
app.use(express.json());

class ApolloHaloIntegrator {
  constructor() {
    this.apollo = new ApolloAPIClient(environmentConfig.b2b_sources.apollo.api_key);
    this.lastSyncTimestamp = null;
  }

  // Main endpoint for Halo Integrator polling
  async handleHaloIntegratorRequest(req, res) {
    try {
      const lastSync = req.query.last_sync || this.getDefaultStartTime();
      const records = await this.fetchAndTransformContacts(lastSync);
      
      // Return data in Halo Integrator format
      const response = {
        status: 'success',
        records: records,
        total_count: records.length,
        last_sync_timestamp: new Date().toISOString(),
        metadata: {
          source: 'apollo.io',
          sync_type: 'incremental',
          api_version: 'v1'
        }
      };

      res.json(response);
      
    } catch (error) {
      console.error('Apollo sync error:', error);
      
      // Return error in format Halo Integrator can handle
      res.status(500).json({
        status: 'error',
        error_code: 'APOLLO_API_ERROR',
        message: error.message,
        retry_after_seconds: 300
      });
    }
  }

  async fetchAndTransformContacts(lastSync) {
    const records = [];
    
    // Use Apollo search template from config
    const searchQuery = {
      ...apolloConfig.query_templates.search_by_domain,
      q_organization_domains: 'target-company.com', // Could be dynamic
      page: 1,
      per_page: 50
    };

    const apolloResponse = await this.apollo.searchPeople(searchQuery);
    
    for (const person of apolloResponse.people || []) {
      // Transform using field mappings from config
      const haloPSAContact = this.transformPersonToContact(person);
      
      // Check if it's a new/updated record since lastSync
      if (this.isNewOrUpdated(person, lastSync)) {
        records.push({
          action: 'upsert',
          entity_type: 'contact',
          external_id: person.id,
          data: haloPSAContact,
          metadata: {
            confidence_score: person.confidence || 0,
            apollo_person_id: person.id,
            last_updated: new Date().toISOString()
          }
        });
      }

      // Also handle organization if needed
      if (person.organization) {
        const haloPSAOrg = this.transformOrganization(person.organization);
        records.push({
          action: 'upsert',
          entity_type: 'organization',
          external_id: person.organization.id,
          data: haloPSAOrg
        });
      }
    }

    return records;
  }

  transformPersonToContact(person) {
    const mapping = apolloConfig.field_mappings.person_to_halopsa_contact;
    
    const contact = {};
    
    // Apply field mappings
    Object.entries(mapping).forEach(([haloPSAField, config]) => {
      if (config.apollo_field) {
        contact[haloPSAField] = this.getNestedValue(person, config.apollo_field);
        
        // Apply transformations if specified
        if (config.transformation) {
          contact[haloPSAField] = this.applyTransformation(
            contact[haloPSAField], 
            config.transformation
          );
        }
      } else if (config.template) {
        contact[haloPSAField] = this.applyTemplate(config.template, person);
      }
    });

    // Add custom fields for Apollo data
    contact.customfields = [
      {
        id: environmentConfig.halopsa.custom_fields.apollo_id,
        value: person.id
      },
      {
        id: environmentConfig.halopsa.custom_fields.data_source,
        value: 'Apollo.io'
      },
      {
        id: environmentConfig.halopsa.custom_fields.enrichment_date,
        value: new Date().toISOString()
      }
    ];

    return contact;
  }

  transformOrganization(org) {
    const mapping = apolloConfig.field_mappings.organization_to_halopsa_org;
    const organization = {};
    
    Object.entries(mapping).forEach(([haloPSAField, config]) => {
      if (config.apollo_field) {
        organization[haloPSAField] = this.getNestedValue(org, config.apollo_field);
        
        if (config.transformation) {
          organization[haloPSAField] = this.applyTransformation(
            organization[haloPSAField], 
            config.transformation
          );
        }
      }
    });

    return organization;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      if (key.includes('[') && key.includes(']')) {
        // Handle array access like 'phone_numbers[0].sanitized_number'
        const [arrayKey, indexStr] = key.split('[');
        const index = parseInt(indexStr.replace(']', ''));
        return current?.[arrayKey]?.[index];
      }
      return current?.[key];
    }, obj);
  }

  applyTransformation(value, transformation) {
    switch (transformation) {
      case 'format_phone':
        return this.formatPhoneNumber(value);
      case 'normalize_url':
        return this.normalizeUrl(value);
      default:
        return value;
    }
  }

  applyTemplate(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (key === 'current_date') {
        return new Date().toISOString();
      }
      return data[key] || match;
    });
  }

  formatPhoneNumber(phone) {
    if (!phone) return '';
    // Remove non-digits and format
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    return phone;
  }

  normalizeUrl(url) {
    if (!url) return '';
    if (!url.startsWith('http')) {
      return `https://${url}`;
    }
    return url;
  }

  isNewOrUpdated(person, lastSync) {
    if (!lastSync) return true;
    
    // Apollo doesn't provide updated_at field in basic search
    // So we consider all records as potentially new/updated
    // In production, you'd want to implement more sophisticated tracking
    return true;
  }

  getDefaultStartTime() {
    // Return timestamp from 24 hours ago for initial sync
    return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  }
}

class ApolloAPIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = apolloConfig.api_config.base_url;
  }

  async searchPeople(query) {
    const endpoint = apolloConfig.api_config.endpoints.search_people;
    const response = await fetch(`${this.baseUrl}${endpoint.path}`, {
      method: endpoint.method,
      headers: {
        ...endpoint.headers,
        [apolloConfig.api_config.authentication.header_name]: this.apiKey
      },
      body: JSON.stringify(query)
    });

    if (!response.ok) {
      throw new Error(`Apollo API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

// Express route setup
const apolloIntegrator = new ApolloHaloIntegrator();

// Halo Integrator endpoint
app.get('/halo-integrator/apollo/contacts', (req, res) => {
  apolloIntegrator.handleHaloIntegratorRequest(req, res);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'apollo-halo-integrator',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Apollo Halo Integrator listening on port ${PORT}`);
  console.log(`Halo Integrator endpoint: http://localhost:${PORT}/halo-integrator/apollo/contacts`);
});

module.exports = { ApolloHaloIntegrator, ApolloAPIClient };