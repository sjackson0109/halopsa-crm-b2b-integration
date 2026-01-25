# Enhanced Webhook Integration Patterns - B2B to HaloPSA

## Overview

This document covers comprehensive webhook implementation patterns for real-time data synchronization between B2B data sources and HaloPSA, including bi-directional sync, smart update triggers, list management events, and enhanced security patterns.

## Enhanced HaloPSA Webhook Architecture

### Advanced Webhook Configuration
HaloPSA supports sophisticated webhook patterns for the enhanced Lead → Prospect → Opportunity workflow.

#### Multi-Event Webhook Registration
```javascript
// Enhanced webhook configuration for custom CRM workflow
const enhancedWebhookConfig = {
  "url": "https://your-integration.com/webhook/halopsa-enhanced",
  "events": [
    // Lead lifecycle events
    "tickets.created",
    "tickets.updated",
    "tickets.status_changed",
    
    // Entity progression events
    "tickets.type_changed", // Lead → Prospect conversion
    "opportunities.created", // Prospect → Opportunity promotion
    "opportunities.updated",
    
    // Custom field change events
    "tickets.custom_field_changed",
    "tickets.list_assignment_changed",
    
    // User interaction events
    "actions.created", // Call logs, emails, meetings
    "users.updated", // Contact information changes
    "clients.updated" // Company information changes
  ],
  "filters": {
    "ticket_types": [1, 2], // Only Lead and Prospect types
    "custom_fields": [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 201, 202, 203, 204, 205, 206],
    "status_changes": ["engaged", "qualified", "do_not_contact"]
  },
  "secret": "your-enhanced-webhook-secret",
  "retry_policy": {
    "max_retries": 3,
    "backoff_type": "exponential",
    "initial_interval": 30
  },
  "active": true
};

// Register enhanced webhook
await halopsa.post('/api/webhook', enhancedWebhookConfig);
```

#### Enhanced Webhook Handler with Smart Routing
```javascript
const express = require('express');
const crypto = require('crypto');

class EnhancedWebhookHandler {
  constructor(config) {
    this.app = express();
    this.config = config;
    this.biDirectionalSync = new BiDirectionalSyncManager();
    
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  setupMiddleware() {
    // Enhanced signature verification
    this.app.use('/webhook/*', this.verifyEnhancedSignature.bind(this));
    
    // Request logging and metrics
    this.app.use('/webhook/*', this.logWebhookRequest.bind(this));
    
    // Rate limiting for webhook endpoints
    this.app.use('/webhook/*', this.applyRateLimit.bind(this));
  }
  
  setupRoutes() {
    // Main HaloPSA webhook endpoint
    this.app.post('/webhook/halopsa-enhanced', this.handleHaloPSAWebhook.bind(this));
    
    // B2B platform webhooks
    this.app.post('/webhook/apollo-updates', this.handleApolloWebhook.bind(this));
    this.app.post('/webhook/zoominfo-updates', this.handleZoomInfoWebhook.bind(this));
    this.app.post('/webhook/hunter-updates', this.handleHunterWebhook.bind(this));
    
    // Bi-directional sync endpoints
    this.app.post('/webhook/dnc-sync', this.handleDNCSync.bind(this));
    this.app.post('/webhook/contact-sync', this.handleContactSync.bind(this));
    this.app.post('/webhook/engagement-sync', this.handleEngagementSync.bind(this));
  }
  
  // Enhanced signature verification with multiple secret support
  verifyEnhancedSignature(req, res, next) {
    const signature = req.headers['x-webhook-signature'] || req.headers['x-halopsa-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const source = req.headers['x-webhook-source'] || 'halopsa';
    
    const secret = this.getSecretForSource(source);
    
    // Verify timestamp to prevent replay attacks
    if (timestamp && Math.abs(Date.now() - parseInt(timestamp)) > 300000) { // 5 minutes
      return res.status(401).json({ error: 'Request timestamp too old' });
    }
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(timestamp + req.body, 'utf8')
      .digest('hex');
    
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    req.webhookSource = source;
    next();
  }
  
  // Main HaloPSA webhook handler with smart routing
  async handleHaloPSAWebhook(req, res) {
    try {
      const { event_type, data, changes } = req.body;
      console.log(`[Webhook] Processing ${event_type} event for ${data.entity_type}:${data.entity_id}`);
      
      // Route to appropriate handler based on event type
      switch (event_type) {
        case 'tickets.updated':
          await this.handleTicketUpdated(data, changes);
          break;
          
        case 'tickets.status_changed':
          await this.handleStatusChanged(data, changes);
          break;
          
        case 'tickets.custom_field_changed':
          await this.handleCustomFieldChanged(data, changes);
          break;
          
        case 'tickets.type_changed':
          await this.handleTypeChanged(data, changes);
          break;
          
        case 'opportunities.created':
          await this.handleOpportunityCreated(data, changes);
          break;
          
        case 'actions.created':
          await this.handleActionCreated(data, changes);
          break;
          
        default:
          console.log(`[Webhook] Unhandled event type: ${event_type}`);
      }
      
      res.json({ 
        success: true, 
        processed: event_type,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[Webhook] Processing failed:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
  
  // Handle ticket updates with smart merge detection
  async handleTicketUpdated(data, changes) {
    const { entity_id, entity_type } = data;
    
    // Check if this is a manual update vs automated update
    const isManualUpdate = changes.last_update_user && 
                          !['B2B Integration', 'System', 'API'].includes(changes.last_update_user);
    
    if (isManualUpdate) {
      // Trigger protection flag for smart updates
      await this.flagTicketForProtection(entity_id);
      console.log(`[Webhook] Ticket ${entity_id} flagged for protection due to manual update`);
    }
    
    // Check for DNC flag changes
    const dncChanged = changes.customfields?.some(cf => 
      cf.id === 105 && cf.new_value === true
    );
    
    if (dncChanged) {
      await this.biDirectionalSync.syncDoNotContact(entity_id);
    }
  }
  
  // Handle status changes for workflow progression
  async handleStatusChanged(data, changes) {
    const { entity_id } = data;
    const { status_id } = changes;
    
    // Auto-conversion logic
    if (status_id.new_value === 4) { // Engaged status
      const conversionResult = await this.triggerLeadToProspectConversion(entity_id);
      console.log(`[Webhook] Lead ${entity_id} auto-converted to prospect:`, conversionResult);
    }
    
    // DNC status handling
    if (status_id.new_value === 6) { // Do Not Contact status
      await this.biDirectionalSync.syncDoNotContact(entity_id);
    }
  }
  
  // Handle custom field changes for intelligence updates
  async handleCustomFieldChanged(data, changes) {
    const { entity_id } = data;
    const changedFields = changes.customfields || [];
    
    // Intelligence field updates (CF_106-113)
    const intelligenceFields = changedFields.filter(cf => 
      cf.id >= 106 && cf.id <= 113
    );
    
    if (intelligenceFields.length > 0) {
      // Trigger bi-directional sync for company intelligence
      await this.biDirectionalSync.syncCompanyIntelligence(entity_id, intelligenceFields);
    }
    
    // Qualification field updates (CF_201-206)
    const qualificationFields = changedFields.filter(cf => 
      cf.id >= 201 && cf.id <= 206
    );
    
    if (qualificationFields.length > 0) {
      // Check for opportunity promotion eligibility
      await this.checkOpportunityPromotionEligibility(entity_id);
    }
  }
}
  
  next();
}

app.use('/webhook', express.raw({ type: 'application/json' }));

app.post('/webhook/halopsa', verifyWebhookSignature, async (req, res) => {
  try {
    const payload = JSON.parse(req.body);
    await processHaloPSAWebhook(payload);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

async function processHaloPSAWebhook(payload) {
  const { event, data } = payload;
  
  switch (event) {
    case 'organisation.created':
      await enrichOrganizationData(data);
      break;
    case 'contact.created':
      await enrichContactData(data);
      break;
    case 'prospect.created':
      await scoreAndRouteProspect(data);
      break;
    default:
      console.log(`Unhandled event: ${event}`);
  }
}
```

## B2B Data Source Webhooks

### 1. Apollo.io Webhooks

Apollo supports webhooks for lead enrichment and list updates.

#### Webhook Payload Structure
```json
{
  "event_type": "person_discovered",
  "timestamp": "2026-01-19T10:30:00Z",
  "data": {
    "person": {
      "id": "apollo_person_id",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@company.com",
      "title": "VP of Sales",
      "linkedin_url": "https://linkedin.com/in/johndoe",
      "phone_numbers": [
        {
          "raw_number": "+1-555-123-4567",
          "sanitized_number": "+15551234567",
          "type": "work"
        }
      ],
      "organization": {
        "id": "apollo_org_id",
        "name": "Acme Corporation",
        "website_url": "https://acme.com",
        "industry": "Software",
        "estimated_num_employees": 500
      }
    }
  }
}
```

#### Apollo Webhook Handler
```javascript
app.post('/webhook/apollo', async (req, res) => {
  try {
    const { event_type, data } = req.body;
    
    switch (event_type) {
      case 'person_discovered':
        await processNewApolloContact(data.person);
        break;
      case 'organization_updated':
        await updateOrganizationFromApollo(data.organization);
        break;
      default:
        console.log(`Unhandled Apollo event: ${event_type}`);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Apollo webhook error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

async function processNewApolloContact(apolloPerson) {
  // Transform Apollo data to HaloPSA format
  const haloPSAContact = {
    firstname: apolloPerson.first_name,
    surname: apolloPerson.last_name,
    emailaddress: apolloPerson.email,
    jobtitle: apolloPerson.title,
    phonenumber: apolloPerson.phone_numbers?.[0]?.sanitized_number,
    linkedin_url: apolloPerson.linkedin_url,
    organisation_id: await findOrCreateOrganization(apolloPerson.organization),
    notes: `Enriched from Apollo.io on ${new Date().toISOString()}`,
    customfields: [
      {
        id: 100, // Apollo ID custom field
        value: apolloPerson.id
      }
    ]
  };
  
  // Check for duplicates before creating
  const existingContact = await findExistingContact(apolloPerson.email);
  
  if (existingContact) {
    await updateHaloPSAContact(existingContact.id, haloPSAContact);
  } else {
    await createHaloPSAContact(haloPSAContact);
  }
}
```

### 2. ZoomInfo Webhooks

ZoomInfo provides real-time updates for contact and company changes.

#### Webhook Payload Structure
```json
{
  "eventType": "CONTACT_UPDATED",
  "eventId": "evt_123456789",
  "timestamp": "2026-01-19T15:45:30Z",
  "data": {
    "contact": {
      "personId": "zoom_person_123",
      "firstName": "Jane",
      "lastName": "Smith", 
      "email": "jane.smith@techcorp.com",
      "directPhone": "+1-555-987-6543",
      "title": "Director of Engineering",
      "department": "Engineering",
      "companyId": "zoom_company_456",
      "lastUpdated": "2026-01-19T15:44:00Z"
    },
    "changes": [
      {
        "field": "title",
        "oldValue": "Senior Engineer",
        "newValue": "Director of Engineering"
      }
    ]
  }
}
```

### 2. ZoomInfo Webhook Patterns

ZoomInfo webhooks provide real-time updates when contact or company data changes in their system. Note: ZoomInfo webhook availability depends on subscription tier.

#### ZoomInfo Contact Data Update Webhook
```json
{
  "eventId": "zoom_event_123",
  "eventType": "CONTACT_UPDATED", 
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "contact": {
      "personId": "zoominfo_person_id",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@techcorp.com",
      "jobTitle": "Chief Technology Officer",
      "directPhone": "+1-555-987-6543",
      "linkedInUrl": "https://linkedin.com/in/janesmith",
      "managementLevel": "c-level",
      "department": "information-technology",
      "companyName": "TechCorp Solutions",
      "companyWebsite": "https://techcorp.com",
      "companyPhone": "+1-555-987-6500",
      "industry": "Software Development",
      "employeeCount": 250,
      "revenue": "$50M-$100M",
      "companyId": "zoominfo_company_id"
    },
    "changes": [
      {
        "field": "jobTitle",
        "oldValue": "VP of Technology",
        "newValue": "Chief Technology Officer"
      },
      {
        "field": "email",
        "oldValue": "j.smith@techcorp.com", 
        "newValue": "jane.smith@techcorp.com"
      }
    ]
  }
}
```

#### ZoomInfo Company Update Webhook
```json
{
  "eventId": "zoom_event_124",
  "eventType": "COMPANY_UPDATED",
  "timestamp": "2024-01-15T11:15:00Z",
  "data": {
    "company": {
      "companyId": "zoominfo_company_id",
      "name": "TechCorp Solutions",
      "website": "https://techcorp.com",
      "industry": "Software Development",
      "employeeCount": 275,
      "revenue": "$50M-$100M",
      "foundedYear": 2010,
      "street": "123 Innovation Drive",
      "city": "Austin",
      "state": "TX", 
      "zipCode": "78701",
      "country": "United States",
      "phone": "+1-555-987-6500",
      "technologies": [
        "Salesforce",
        "Microsoft Office 365",
        "AWS",
        "Kubernetes"
      ]
    },
    "changes": [
      {
        "field": "employeeCount",
        "oldValue": 250,
        "newValue": 275
      }
    ]
  }
}
```

#### ZoomInfo Webhook Handler
```javascript
app.post('/webhook/zoominfo', async (req, res) => {
  try {
    const { eventType, data } = req.body;
    
    // Verify ZoomInfo webhook signature
    const signature = req.headers['x-zoominfo-signature'];
    if (!verifyZoomInfoSignature(req.body, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    switch (eventType) {
      case 'CONTACT_UPDATED':
        await processZoomInfoContactUpdate(data);
        break;
      case 'COMPANY_UPDATED':
        await processZoomInfoCompanyUpdate(data);
        break;
      default:
        console.log(`Unhandled ZoomInfo event: ${eventType}`);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('ZoomInfo webhook error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

async function processZoomInfoContactUpdate(data) {
  const { contact, changes } = data;
  
  try {
    // Find existing contact by ZoomInfo ID or email
    const existingContact = await findContactByZoomInfoId(contact.personId) ||
                           await findExistingContact(contact.email);
    
    if (existingContact) {
      // Update existing contact
      const updates = transformZoomInfoToHaloPSAUpdate(contact);
      
      // Add change log to notes
      const changeLog = changes.map(c => 
        `${c.field}: ${c.oldValue} → ${c.newValue}`
      ).join(', ');
      
      updates.notes = `${existingContact.notes}\n\nZoomInfo Update (${new Date().toISOString()}): ${changeLog}`;
      
      await updateHaloPSAContact(existingContact.id, updates);
      console.log(`Updated existing contact: ${contact.email}`);
    } else {
      // Create new lead if contact doesn't exist
      await createHaloPSALeadFromZoomInfo(contact);
      console.log(`Created new lead from ZoomInfo: ${contact.email}`);
    }
  } catch (error) {
    console.error('Error processing ZoomInfo contact update:', error);
    throw error;
  }
}

async function processZoomInfoCompanyUpdate(data) {
  const { company, changes } = data;
  
  try {
    const existingClient = await findClientByWebsite(company.website) ||
                          await findClientByName(company.name);
    
    if (existingClient) {
      const updates = transformZoomInfoCompanyToHaloPSA(company);
      
      const changeLog = changes.map(c => 
        `${c.field}: ${c.oldValue} → ${c.newValue}`
      ).join(', ');
      
      updates.notes = `${existingClient.notes}\n\nZoomInfo Company Update (${new Date().toISOString()}): ${changeLog}`;
      
      await updateHaloPSAClient(existingClient.id, updates);
      console.log(`Updated existing client: ${company.name}`);
    }
  } catch (error) {
    console.error('Error processing ZoomInfo company update:', error);
    throw error;
  }
}

function transformZoomInfoToHaloPSAUpdate(contact) {
  return {
    firstname: contact.firstName,
    surname: contact.lastName,
    emailaddress: contact.email,
    jobtitle: contact.jobTitle,
    phonenumber: contact.directPhone || contact.companyPhone,
    linkedin_url: contact.linkedInUrl,
    customfields: [
      {
        id: 103, // Growth signals
        value: `Revenue: ${contact.revenue} | Employees: ${contact.employeeCount} | Level: ${contact.managementLevel} | Dept: ${contact.department}`
      }
    ]
  };
}
```

### 3. Apollo Webhook Patterns

Apollo.io webhooks notify when contacts are discovered, updated, or when sequences are completed.

#### Apollo Contact Discovery Webhook
```json
{
  "event_type": "person_discovered",
  "timestamp": "2024-01-15T10:30:00Z",
  "webhook_id": "apollo_webhook_123",
  "data": {
    "person": {
    updates.notes = `${existingContact.notes || ''}\nZoomInfo update (${new Date().toISOString()}): ${changeLog}`;
    
    await updateHaloPSAContact(existingContact.id, updates);
  }
}
```

### 3. Hunter.io Webhooks

Hunter provides webhooks for email verification and discovery events.

#### Webhook Payload Structure
```json
{
  "event": "email_verified",
  "webhook_id": "hunter_webhook_123",
  "created_at": "2026-01-19T12:15:00Z",
  "data": {
    "email": "contact@newcompany.com",
    "result": "deliverable",
    "score": 95,
    "regexp": true,
    "gibberish": false,
    "disposable": false,
    "webmail": false,
    "mx_records": true,
    "smtp_server": true,
    "smtp_check": true,
    "accept_all": false,
    "block": false,
    "sources": [
      {
        "domain": "newcompany.com",
        "uri": "https://newcompany.com/team",
        "extracted_on": "2026-01-18",
        "last_seen_on": "2026-01-19",
        "still_on_page": true
      }
    ]
  }
}
```

#### Hunter Webhook Handler
```javascript
app.post('/webhook/hunter', async (req, res) => {
  try {
    const { event, data } = req.body;
    
    switch (event) {
      case 'email_verified':
        await processEmailVerification(data);
        break;
      case 'email_discovered':
        await processNewEmailDiscovery(data);
        break;
      default:
        console.log(`Unhandled Hunter event: ${event}`);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Hunter webhook error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

async function processEmailVerification(data) {
  const { email, result, score } = data;
  
  // Find contact by email
  const contact = await findExistingContact(email);
  
  if (contact) {
    // Update email verification status
    const customFields = [
      {
        id: 101, // Email verification status field
        value: result
      },
      {
        id: 102, // Email score field
        value: score.toString()
      }
    ];
    
    await updateHaloPSAContact(contact.id, { customfields: customFields });
    
    // If email is not deliverable, mark contact for review
    if (result !== 'deliverable') {
      await flagContactForReview(contact.id, `Email verification failed: ${result}`);
    }
  }
}
```

## Webhook Reliability Patterns

### 1. Retry Mechanism
```javascript
class WebhookProcessor {
  constructor(maxRetries = 3) {
    this.maxRetries = maxRetries;
  }

  async processWebhook(payload, processor) {
    let attempt = 0;
    
    while (attempt <= this.maxRetries) {
      try {
        await processor(payload);
        return; // Success, exit retry loop
      } catch (error) {
        attempt++;
        
        if (attempt > this.maxRetries) {
          await this.handleFailedWebhook(payload, error);
          throw error;
        }
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async handleFailedWebhook(payload, error) {
    // Log failed webhook for manual review
    console.error('Webhook processing failed after retries:', {
      payload,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    // Store in dead letter queue or notify administrators
    await this.storeFailedWebhook(payload, error);
  }
}
```

### 2. Idempotency Handling
```javascript
class IdempotentWebhookHandler {
  constructor() {
    this.processedEvents = new Set(); // In production, use Redis or database
  }

  async handleWebhook(payload) {
    const eventId = this.generateEventId(payload);
    
    if (this.processedEvents.has(eventId)) {
      console.log(`Duplicate webhook ignored: ${eventId}`);
      return;
    }
    
    try {
      await this.processWebhookPayload(payload);
      this.processedEvents.add(eventId);
    } catch (error) {
      // Don't add to processed set if processing failed
      throw error;
    }
  }

  generateEventId(payload) {
    // Create unique ID based on payload content
    const content = JSON.stringify(payload);
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
```

### 3. Rate Limiting for Incoming Webhooks
```javascript
const rateLimit = require('express-rate-limit');

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each source to 100 requests per windowMs
  keyGenerator: (req) => {
    // Rate limit per source IP or API key
    return req.headers['x-source-api-key'] || req.ip;
  },
  message: 'Too many webhook requests from this source',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/webhook', webhookLimiter);
```

## Security Considerations

### 1. Webhook Signature Verification
```javascript
function createSignatureVerifier(secret, algorithm = 'sha256') {
  return function verifySignature(payload, signature) {
    const expectedSignature = crypto
      .createHmac(algorithm, secret)
      .update(payload)
      .digest('hex');
    
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature.replace(/^sha256=/, ''), 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  };
}
```

### 2. IP Allowlist Validation
```javascript
function validateWebhookSource(req, res, next) {
  const allowedIPs = [
    '192.168.1.0/24', // Apollo IP range
    '10.0.0.0/8',     // ZoomInfo IP range
    // Add more IP ranges as needed
  ];
  
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (!isIPAllowed(clientIP, allowedIPs)) {
    return res.status(403).json({ error: 'IP not allowed' });
  }
  
  next();
}
```

### 3. Webhook Endpoint Discovery Prevention
```javascript
// Hide webhook endpoints from discovery
app.use('/webhook', (req, res, next) => {
  // Require specific headers or tokens
  const authToken = req.headers['x-webhook-auth'];
  
  if (!authToken || authToken !== process.env.WEBHOOK_AUTH_TOKEN) {
    return res.status(404).send('Not Found'); // Don't reveal existence
  }
  
  next();
});
```

## Monitoring and Alerting

### Webhook Health Monitoring
```javascript
class WebhookMonitor {
  constructor() {
    this.metrics = {
      received: 0,
      processed: 0,
      failed: 0,
      lastProcessed: null
    };
  }

  recordWebhookReceived() {
    this.metrics.received++;
  }

  recordWebhookProcessed() {
    this.metrics.processed++;
    this.metrics.lastProcessed = new Date();
  }

  recordWebhookFailed() {
    this.metrics.failed++;
  }

  getHealthStatus() {
    const failureRate = this.metrics.failed / this.metrics.received;
    const isHealthy = failureRate < 0.05; // Less than 5% failure rate
    
    return {
      healthy: isHealthy,
      metrics: this.metrics,
      failureRate: failureRate.toFixed(4)
    };
  }

  async sendAlertIfUnhealthy() {
    const health = this.getHealthStatus();
    
    if (!health.healthy) {
      await this.sendAlert(`Webhook health degraded: ${health.failureRate * 100}% failure rate`);
    }
  }
}
```

## Next Steps

1. Review [Error Handling](../error-handling/) for robust webhook processing
2. See [Data Models](../data-models/) for payload transformation patterns
3. Check [Middleware](../middleware/) for orchestration strategies