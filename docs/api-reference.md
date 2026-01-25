# API Reference Documentation

## Overview

This document provides comprehensive API reference for the HaloPSA CRM Custom Integration middleware, including endpoints, request/response formats, and authentication methods.

## Base URL
```
https://your-domain.com/api/v1
```

## Authentication

All API requests require authentication using one of the following methods:

### API Key Authentication
```http
Authorization: Bearer your_api_key
```

### OAuth 2.0 (For HaloPSA Integration)
```http
Authorization: Bearer halo_access_token
```

## Core Endpoints

### Health Check
Get service health status and version information.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-25T10:00:00Z",
  "services": {
    "halopsa": "connected",
    "apollo": "connected",
    "database": "connected"
  }
}
```

### Data Synchronization

#### Sync Lead Data
Import lead data from B2B sources into HaloPSA.

**Endpoint:** `POST /sync/leads`

**Request Body:**
```json
{
  "source": "apollo",
  "data": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@company.com",
    "company": "Tech Corp",
    "title": "CTO"
  },
  "options": {
    "deduplication": true,
    "update_existing": false,
    "custom_fields": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "lead_id": 12345,
  "halopsa_ticket_id": 67890,
  "actions_taken": [
    "lead_created",
    "custom_fields_populated",
    "list_assigned"
  ]
}
```

#### Bulk Lead Import
Import multiple leads in a single request.

**Endpoint:** `POST /sync/leads/bulk`

**Request Body:**
```json
{
  "source": "zoominfo",
  "leads": [
    {
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "jane.smith@company.com",
      "company": "Data Inc"
    }
  ],
  "batch_options": {
    "batch_size": 100,
    "rate_limit": 10,
    "continue_on_error": true
  }
}
```

**Response:**
```json
{
  "total_processed": 100,
  "successful": 98,
  "failed": 2,
  "results": [
    {
      "index": 0,
      "success": true,
      "lead_id": 12346
    }
  ],
  "errors": [
    {
      "index": 15,
      "error": "Duplicate email address"
    }
  ]
}
```

### Prospect Management

#### Convert Lead to Prospect
Convert a qualified lead to a prospect.

**Endpoint:** `POST /prospects/convert/{lead_id}`

**Request Body:**
```json
{
  "qualification_data": {
    "pain_points": "Need better data analytics",
    "budget_range": "50000-100000",
    "decision_maker": true,
    "fit_score": 85
  },
  "conversion_options": {
    "create_opportunity": false,
    "notify_team": true
  }
}
```

#### Update Prospect Status
Update prospect lifecycle status.

**Endpoint:** `PUT /prospects/{prospect_id}/status`

**Request Body:**
```json
{
  "status": "qualified",
  "reason": "Meets all qualification criteria",
  "next_action": "Schedule discovery call",
  "next_action_date": "2024-02-01"
}
```

### Opportunity Management

#### Create Opportunity
Create a new opportunity from a qualified prospect.

**Endpoint:** `POST /opportunities`

**Request Body:**
```json
{
  "prospect_id": 12345,
  "opportunity_data": {
    "value": 75000,
    "probability": 60,
    "expected_close_date": "2024-03-15",
    "competitors": "Competitor A, Competitor B"
  }
}
```

#### Update Opportunity
Update opportunity details and progress.

**Endpoint:** `PUT /opportunities/{opportunity_id}`

**Request Body:**
```json
{
  "status": "negotiation",
  "value": 80000,
  "probability": 75,
  "notes": "Customer requested custom terms"
}
```

### Webhook Management

#### Register Webhook
Register a new webhook endpoint.

**Endpoint:** `POST /webhooks`

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks/halopsa",
  "events": ["lead.created", "prospect.qualified", "opportunity.won"],
  "secret": "your_webhook_secret",
  "active": true
}
```

#### List Webhooks
Get all registered webhooks.

**Endpoint:** `GET /webhooks`

**Response:**
```json
{
  "webhooks": [
    {
      "id": "wh_123",
      "url": "https://your-app.com/webhooks/halopsa",
      "events": ["lead.created"],
      "active": true,
      "created_at": "2024-01-20T08:00:00Z"
    }
  ]
}
```

### Data Validation

#### Validate Lead Data
Validate lead data before import.

**Endpoint:** `POST /validate/leads`

**Request Body:**
```json
{
  "data": {
    "first_name": "John",
    "email": "john.doe@company.com"
  },
  "source": "apollo"
}
```

**Response:**
```json
{
  "valid": true,
  "warnings": [],
  "suggestions": [
    "Consider adding phone number for better contact rate"
  ]
}
```

### Configuration Management

#### Get Integration Config
Retrieve current integration configuration.

**Endpoint:** `GET /config`

**Response:**
```json
{
  "halopsa": {
    "base_url": "https://instance.halopsa.com",
    "custom_fields_enabled": true
  },
  "providers": {
    "apollo": {
      "enabled": true,
      "rate_limit": 100
    }
  }
}
```

#### Update Configuration
Update integration settings.

**Endpoint:** `PUT /config`

**Request Body:**
```json
{
  "providers": {
    "apollo": {
      "rate_limit": 150
    }
  }
}
```

### Analytics and Reporting

#### Get Sync Statistics
Get synchronization statistics and metrics.

**Endpoint:** `GET /analytics/sync`

**Query Parameters:**
- `start_date`: Start date for statistics (ISO 8601)
- `end_date`: End date for statistics (ISO 8601)
- `source`: Filter by data source

**Response:**
```json
{
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "totals": {
    "leads_imported": 1250,
    "prospects_created": 340,
    "opportunities_won": 45
  },
  "by_source": {
    "apollo": {
      "leads": 800,
      "success_rate": 0.95
    }
  }
}
```

#### Get Performance Metrics
Get system performance metrics.

**Endpoint:** `GET /analytics/performance`

**Response:**
```json
{
  "response_times": {
    "average": 245,
    "p95": 450,
    "p99": 800
  },
  "error_rates": {
    "total": 0.02,
    "by_endpoint": {
      "/sync/leads": 0.01
    }
  },
  "throughput": {
    "requests_per_minute": 120,
    "data_processed_mb": 50
  }
}
```

### Error Handling

#### Get Error Logs
Retrieve recent error logs.

**Endpoint:** `GET /errors`

**Query Parameters:**
- `limit`: Maximum number of errors to return (default: 50)
- `level`: Error level filter (error, warning, info)
- `start_date`: Start date for error logs

**Response:**
```json
{
  "errors": [
    {
      "id": "err_123",
      "timestamp": "2024-01-25T09:30:00Z",
      "level": "error",
      "message": "Failed to sync lead: Invalid email format",
      "source": "apollo",
      "details": {
        "lead_id": 12345,
        "error_code": "VALIDATION_ERROR"
      }
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50
  }
}
```

## Rate Limiting

API requests are subject to rate limiting:

- **Authenticated requests**: 1000 requests per hour
- **Sync operations**: 100 concurrent operations
- **Bulk imports**: 10 bulk operations per hour

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1643123400
```

## Error Responses

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email address format",
    "details": {
      "field": "email",
      "value": "invalid-email"
    },
    "timestamp": "2024-01-25T10:00:00Z",
    "request_id": "req_12345"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `AUTHENTICATION_ERROR`: Invalid or missing credentials
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `EXTERNAL_API_ERROR`: Error from external service
- `INTERNAL_ERROR`: Unexpected server error

## SDKs and Libraries

### JavaScript/Node.js SDK
```javascript
const { HaloIntegration } = require('@halopsa/integration-sdk');

const client = new HaloIntegration({
  apiKey: 'your_api_key',
  baseUrl: 'https://your-domain.com/api/v1'
});

// Sync a lead
const result = await client.leads.sync({
  first_name: 'John',
  email: 'john.doe@company.com',
  source: 'apollo'
});
```

### Python SDK
```python
from halopsa_integration import HaloIntegration

client = HaloIntegration(
    api_key='your_api_key',
    base_url='https://your-domain.com/api/v1'
)

# Sync a lead
result = client.leads.sync({
    'first_name': 'John',
    'email': 'john.doe@company.com',
    'source': 'apollo'
})
```

## Changelog

### Version 1.0.0
- Initial API release
- Core synchronization endpoints
- Webhook management
- Basic analytics

### Version 1.1.0 (Upcoming)
- Enhanced bulk operations
- Advanced filtering options
- Real-time notifications
- Improved error handling