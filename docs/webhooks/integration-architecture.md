# Middleware Integration Architecture

## Overview

This document outlines various middleware approaches for integrating HaloPSA with B2B data sourcing tools, with a focus on HaloPSA's native **Halo Integrator** service and other integration patterns.

## HaloPSA Native Integration Options

### 1. Halo Integrator Service

**Halo Integrator** is HaloPSA's native polling service designed specifically for running and polling custom integration API endpoints. It provides a robust, scalable solution for automated data synchronization without requiring external infrastructure.

#### Key Features
- **Native Polling Engine**: Built-in service that polls custom API endpoints at configurable intervals
- **Automatic Retries**: Built-in error handling and retry logic
- **Monitoring & Logging**: Native monitoring within HaloPSA interface
- **No External Infrastructure**: Runs within HaloPSA environment
- **Configuration-Driven**: Setup through HaloPSA admin interface

#### Configuration Example
```json
{
  "name": "Apollo.io Contact Sync",
  "endpoint_url": "https://your-integration-api.com/sync/apollo/contacts",
  "method": "GET",
  "poll_interval_minutes": 15,
  "timeout_seconds": 30,
  "headers": {
    "Authorization": "Bearer {api_token}",
    "Content-Type": "application/json"
  },
  "retry_attempts": 3,
  "retry_delay_seconds": 60,
  "active": true
}
```

#### Custom API Endpoint Design for Halo Integrator

Your custom endpoint should return data in a format that Halo Integrator can process:

```javascript
// Example endpoint: GET /sync/apollo/contacts
app.get('/sync/apollo/contacts', async (req, res) => {
  try {
    // Get last sync timestamp from query params
    const lastSync = req.query.last_sync || new Date(Date.now() - 24*60*60*1000).toISOString();
    
    // Fetch new/updated contacts from Apollo.io
    const apolloContacts = await apollo.searchPeople({
      updated_since: lastSync,
      per_page: 100
    });
    
    // Transform to HaloPSA format
    const haloPSAContacts = apolloContacts.people.map(person => ({
      action: 'upsert', // create or update
      entity_type: 'contact',
      external_id: person.id,
      data: {
        firstname: person.first_name,
        surname: person.last_name,
        emailaddress: person.email,
        jobtitle: person.title,
        phonenumber: person.phone_numbers?.[0]?.sanitized_number,
        organisation_name: person.organization?.name,
        notes: `Synced from Apollo.io on ${new Date().toISOString()}`,
        customfields: [
          {
            id: 100, // Apollo ID field
            value: person.id
          }
        ]
      }
    }));
    
    res.json({
      status: 'success',
      records: haloPSAContacts,
      total_count: haloPSAContacts.length,
      last_sync_timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});
```

#### Halo Integrator Response Format

```json
{
  "status": "success|error",
  "records": [
    {
      "action": "create|update|upsert|delete",
      "entity_type": "organization|contact|prospect",
      "external_id": "unique_identifier_from_source",
      "data": {
        "field1": "value1",
        "field2": "value2"
      }
    }
  ],
  "total_count": 25,
  "last_sync_timestamp": "2026-01-19T15:30:00Z",
  "metadata": {
    "source": "apollo.io",
    "sync_type": "incremental"
  }
}
```

#### Error Handling for Halo Integrator

```javascript
// Error response format that Halo Integrator can handle
function handleSyncError(error, req, res) {
  const errorResponse = {
    status: 'error',
    error_code: error.code || 'SYNC_ERROR',
    message: error.message,
    retry_after_seconds: error.retryAfter || 300,
    timestamp: new Date().toISOString()
  };
  
  // Log error for debugging
  console.error('Halo Integrator sync error:', {
    endpoint: req.path,
    query: req.query,
    error: error.message,
    stack: error.stack
  });
  
  // Return appropriate HTTP status
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json(errorResponse);
}
```

### 2. HaloPSA Custom Integrations

Direct API integrations using HaloPSA's REST API and authentication.

```javascript
class HaloPSACustomIntegration {
  constructor(tenant, clientId, clientSecret) {
    this.tenant = tenant;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessToken = null;
    this.refreshToken = null;
  }

  async syncFromApollo() {
    // Get contacts from Apollo
    const apolloContacts = await this.fetchFromApollo();
    
    // Transform and sync to HaloPSA
    for (const contact of apolloContacts) {
      const haloPSAContact = this.transformContact(contact);
      await this.upsertContact(haloPSAContact);
    }
  }

  async upsertContact(contactData) {
    const existingContact = await this.findContactByEmail(contactData.emailaddress);
    
    if (existingContact) {
      await this.updateContact(existingContact.id, contactData);
    } else {
      await this.createContact(contactData);
    }
  }
}
```

### 3. HaloPSA Runbooks

Automation workflows within HaloPSA for triggered actions.

```javascript
// Example Runbook configuration for new organization enrichment
const runbookConfig = {
  "trigger": {
    "event": "organization.created",
    "conditions": [
      {
        "field": "website",
        "operator": "not_empty"
      }
    ]
  },
  "actions": [
    {
      "type": "webhook",
      "url": "https://your-api.com/enrich/organization",
      "method": "POST",
      "payload": {
        "organization_id": "{{organization.id}}",
        "website": "{{organization.website}}",
        "name": "{{organization.name}}"
      }
    }
  ]
};
```

## Third-Party iPaaS Solutions

### 1. n8n Workflow Automation

n8n provides visual workflow automation with pre-built nodes for many B2B data sources.

#### Apollo.io to HaloPSA n8n Workflow
```json
{
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.cron",
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "cronExpression",
              "expression": "0 */15 * * * *"
            }
          ]
        }
      }
    },
    {
      "name": "Apollo.io",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://api.apollo.io/v1/mixed_people/search",
        "headers": {
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
          "X-Api-Key": "={{$env.APOLLO_API_KEY}}"
        },
        "body": {
          "q_organization_domains": "target-domain.com",
          "page": 1,
          "per_page": 25
        }
      }
    },
    {
      "name": "Transform Data",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "const transformedContacts = items.map(item => {\n  const person = item.json.person;\n  return {\n    firstname: person.first_name,\n    surname: person.last_name,\n    emailaddress: person.email,\n    jobtitle: person.title,\n    phonenumber: person.phone_numbers?.[0]?.sanitized_number,\n    organisation_name: person.organization?.name\n  };\n});\n\nreturn transformedContacts;"
      }
    },
    {
      "name": "HaloPSA",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://{{$env.HALOPSA_TENANT}}.halopsa.com/api/Contact",
        "headers": {
          "Authorization": "Bearer {{$env.HALOPSA_ACCESS_TOKEN}}",
          "Content-Type": "application/json"
        }
      }
    }
  ]
}
```

### 2. Make (Integromat) Scenarios

Make provides drag-and-drop integration scenarios with robust error handling.

#### Scenario Configuration
```javascript
// Make scenario for ZoomInfo to HaloPSA sync
const makeScenario = {
  "trigger": {
    "module": "scheduler",
    "interval": 15,
    "unit": "minutes"
  },
  "modules": [
    {
      "name": "ZoomInfo Search",
      "module": "http",
      "method": "POST",
      "url": "https://api.zoominfo.com/search/contact",
      "headers": {
        "Authorization": "Bearer {{zoominfo.jwt_token}}"
      }
    },
    {
      "name": "Transform Contact",
      "module": "transformer",
      "mapping": [
        {
          "source": "firstName",
          "target": "firstname"
        },
        {
          "source": "lastName", 
          "target": "surname"
        },
        {
          "source": "email",
          "target": "emailaddress"
        }
      ]
    },
    {
      "name": "Create HaloPSA Contact",
      "module": "http",
      "method": "POST",
      "url": "https://{{halopsa.tenant}}.halopsa.com/api/Contact"
    }
  ]
};
```

### 3. Zapier Integration

Zapier provides simple trigger-action automation between thousands of apps.

```javascript
// Zapier Trigger: New Apollo.io Contact
// Action: Create HaloPSA Contact

const zapierAction = {
  "trigger": "apollo_new_contact",
  "action": "halopsa_create_contact",
  "field_mapping": {
    "first_name": "firstname",
    "last_name": "surname",
    "email": "emailaddress",
    "title": "jobtitle",
    "company_name": "organisation_name"
  },
  "filters": [
    {
      "field": "email",
      "condition": "not_empty"
    }
  ]
};
```

## Custom Middleware Services

### Node.js Integration Service

```javascript
const express = require('express');
const cron = require('node-cron');

class B2BIntegrationService {
  constructor() {
    this.app = express();
    this.setupRoutes();
    this.setupScheduledJobs();
  }

  setupRoutes() {
    // Endpoint for Halo Integrator polling
    this.app.get('/sync/contacts', async (req, res) => {
      try {
        const lastSync = req.query.last_sync;
        const contacts = await this.syncContactsFromAllSources(lastSync);
        
        res.json({
          status: 'success',
          records: contacts,
          last_sync_timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: error.message
        });
      }
    });

    // Webhook endpoints
    this.app.post('/webhook/apollo', this.handleApolloWebhook.bind(this));
    this.app.post('/webhook/zoominfo', this.handleZoomInfoWebhook.bind(this));
  }

  setupScheduledJobs() {
    // Run every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
      await this.fullDataSync();
    });
  }

  async syncContactsFromAllSources(lastSync) {
    const sources = ['apollo', 'zoominfo', 'uplead'];
    const allContacts = [];

    for (const source of sources) {
      try {
        const contacts = await this.syncFromSource(source, lastSync);
        allContacts.push(...contacts);
      } catch (error) {
        console.error(`Error syncing from ${source}:`, error);
      }
    }

    return this.deduplicateContacts(allContacts);
  }
}
```

### Python Integration Service

```python
from fastapi import FastAPI, BackgroundTasks
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio

class B2BIntegrationAPI:
    def __init__(self):
        self.app = FastAPI()
        self.scheduler = AsyncIOScheduler()
        self.setup_routes()
        self.setup_scheduled_jobs()
    
    def setup_routes(self):
        @self.app.get("/sync/contacts")
        async def sync_contacts(last_sync: str = None):
            try:
                contacts = await self.sync_contacts_from_sources(last_sync)
                return {
                    "status": "success",
                    "records": contacts,
                    "last_sync_timestamp": datetime.utcnow().isoformat()
                }
            except Exception as e:
                return {
                    "status": "error",
                    "message": str(e)
                }
    
    def setup_scheduled_jobs(self):
        self.scheduler.add_job(
            self.full_data_sync,
            'interval',
            minutes=30,
            id='full_sync'
        )
        self.scheduler.start()
```

## Architecture Decision Matrix

| Integration Method | Setup Complexity | Maintenance | Real-time | Cost | Best For |
|-------------------|------------------|-------------|-----------|------|----------|
| **Halo Integrator** | Low | Low | Near real-time | Included | Simple polling integrations |
| **Custom Integration** | Medium | Medium | Real-time | Development time | Complex transformations |
| **HaloPSA Webhooks** | Low | Low | Real-time | Included | Event-driven updates |
| **n8n** | Low | Low | Real-time | Low/Free | Visual workflow design |
| **Make** | Low | Low | Real-time | Subscription | Robust error handling |
| **Zapier** | Very Low | Very Low | Near real-time | Subscription | Simple trigger-action |
| **Custom Service** | High | High | Real-time | Infrastructure | Enterprise-grade control |

## Implementation Recommendations

### For Small to Medium Businesses
1. **Start with Halo Integrator** for simple data polling
2. **Add HaloPSA Webhooks** for real-time updates
3. **Use Zapier/Make** for complex multi-step workflows

### For Enterprise Implementations
1. **Halo Integrator** for reliable baseline data sync
2. **Custom Service** for complex business logic
3. **HaloPSA Webhooks** for real-time event processing
4. **n8n** for workflow orchestration

### Hybrid Approach
```javascript
// Combined approach: Halo Integrator + Custom Service + Webhooks
class HybridIntegrationArchitecture {
  constructor() {
    // Halo Integrator polls this endpoint every 15 minutes
    this.setupHaloIntegratorEndpoint();
    
    // Real-time webhooks for immediate updates
    this.setupWebhookHandlers();
    
    // Background processes for data quality
    this.setupDataQualityJobs();
  }
  
  setupHaloIntegratorEndpoint() {
    // Returns incremental updates for Halo Integrator
    this.app.get('/halo-integrator/sync', async (req, res) => {
      const incrementalData = await this.getIncrementalUpdates(req.query.last_sync);
      res.json({
        status: 'success',
        records: incrementalData
      });
    });
  }
  
  setupWebhookHandlers() {
    // Handle real-time updates from B2B sources
    this.app.post('/webhook/:source', this.processWebhook);
  }
  
  setupDataQualityJobs() {
    // Background enrichment and validation
    cron.schedule('0 2 * * *', this.runDataQualityCheck);
  }
}
```

## Next Steps

1. Review [Error Handling](../error-handling/) for robust integration patterns
2. See [Authentication](../authentication/) for secure API access
3. Check [Examples](../../examples/) for implementation samples
4. Consider [Monitoring Strategies](./monitoring.md) for production deployments