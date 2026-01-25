# Installation and Setup Guide

## Overview

This guide provides step-by-step instructions for installing and configuring the HaloPSA CRM Custom Integration with B2B data sourcing tools.

## Prerequisites

### System Requirements
- **Node.js**: Version 16.0 or higher
- **npm**: Version 7.0 or higher
- **HaloPSA Instance**: Valid API credentials and admin access
- **B2B Data Source Accounts**: Active subscriptions for desired providers

### Required Permissions
- HaloPSA: API access with custom field creation rights
- B2B Sources: API keys or OAuth credentials
- Server/Network: Outbound HTTPS access to provider APIs

## Installation Steps

### 1. Clone the Repository
```bash
git clone https://github.com/sjackson0109/halopsa-crm-b2b-integration.git
cd halopsa-crm-b2b-integration
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
# HaloPSA Configuration
HALOPSA_BASE_URL=https://your-instance.halopsa.com
HALOPSA_CLIENT_ID=your_client_id
HALOPSA_CLIENT_SECRET=your_client_secret

# Apollo.io Configuration
APOLLO_API_KEY=your_apollo_api_key
APOLLO_WEBHOOK_SECRET=your_webhook_secret

# ZoomInfo Configuration
ZOOMINFO_USERNAME=your_zoominfo_username
ZOOMINFO_PASSWORD=your_zoominfo_password

# Database Configuration (if using local storage)
DATABASE_URL=postgresql://user:password@localhost:5432/halopsa_integration

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/integration.log
```

### 4. Database Setup (Optional)
If using PostgreSQL for data persistence:
```bash
# Create database
createdb halopsa_integration

# Run migrations
npm run migrate
```

### 5. HaloPSA Custom Field Setup
Execute the custom field creation script:
```bash
npm run setup-custom-fields
```

This will create the required custom fields (CF_101-113, CF_201-206, CF_301-304) in your HaloPSA instance.

## Configuration Validation

### Test HaloPSA Connection
```bash
npm run test:halopsa
```

### Test B2B Source Connections
```bash
npm run test:apollo
npm run test:zoominfo
# Add tests for other configured providers
```

### Validate Custom Fields
```bash
npm run validate:fields
```

## Service Startup

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Using PM2 (Recommended for Production)
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Webhook Configuration

### HaloPSA Webhook Setup
1. Navigate to **Configuration → Integrations → Webhooks**
2. Create new webhook with URL: `https://your-domain.com/webhooks/halopsa`
3. Select events: Ticket updates, Status changes
4. Set authentication method and secret

### B2B Provider Webhooks
Configure webhooks in each B2B provider dashboard pointing to:
`https://your-domain.com/webhooks/{provider}`

## Load Balancing and Scaling

### Nginx Configuration
```nginx
upstream halopsa_integration {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://halopsa_integration;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Docker Deployment
```dockerfile
FROM node:16-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

## Monitoring Setup

### Health Check Endpoint
The service provides a health check at `/health`:
```bash
curl https://your-domain.com/health
```

### Prometheus Metrics
Metrics are exposed at `/metrics` for Prometheus scraping.

### Log Aggregation
Configure log shipping to your preferred logging service:
```bash
# Example: Send logs to Elasticsearch
npm install -g @elastic/elasticsearch
```

## Troubleshooting Installation Issues

### Common Issues

#### Connection Refused Errors
- Verify HaloPSA instance URL and credentials
- Check firewall settings for outbound connections
- Ensure API access is enabled in HaloPSA

#### Custom Field Creation Failures
- Confirm admin permissions in HaloPSA
- Check for existing custom fields with conflicting IDs
- Verify API rate limits haven't been exceeded

#### Webhook Signature Validation Errors
- Ensure webhook secrets are correctly configured
- Check timestamp synchronization between servers
- Verify HMAC-SHA256 implementation

### Diagnostic Commands
```bash
# Full system diagnostic
npm run diagnose

# API connectivity test
npm run test:connectivity

# Configuration validation
npm run validate:config
```

## Post-Installation Checklist

- [ ] Environment variables configured
- [ ] Database initialized (if applicable)
- [ ] Custom fields created in HaloPSA
- [ ] All B2B provider connections tested
- [ ] Webhooks configured and verified
- [ ] Service started and health checks passing
- [ ] Monitoring and alerting configured
- [ ] Backup procedures documented

## Next Steps

After successful installation:
1. Review the [Configuration Guide](configuration-guide.md) for advanced settings
2. Set up monitoring and alerting
3. Configure backup procedures
4. Test with sample data
5. Plan for production deployment

## Support

For installation issues:
- Check the [Troubleshooting Guide](troubleshooting.md)
- Review logs in `./logs/` directory
- Contact support with diagnostic output from `npm run diagnose`