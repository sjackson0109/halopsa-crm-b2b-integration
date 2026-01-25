# Security Guide

## Overview

This guide outlines security best practices and configurations for the HaloPSA CRM Custom Integration, ensuring secure handling of sensitive data and protection against common threats.

## Security Principles

### Defense in Depth
The integration implements multiple layers of security:
- **Network Security**: Encrypted communications and access controls
- **Application Security**: Input validation and secure coding practices
- **Data Security**: Encryption at rest and in transit
- **Operational Security**: Secure configuration and monitoring

### Data Classification
- **Public Data**: Basic contact information
- **Internal Data**: Business intelligence and analytics
- **Confidential Data**: Financial information and strategic data
- **Restricted Data**: Personal identifiable information (PII)

## Authentication and Authorization

### API Authentication Methods

#### OAuth 2.0 (Recommended)
```json
{
  "security": {
    "authentication": {
      "method": "oauth2",
      "provider": "halopsa",
      "token_endpoint": "https://your-instance.halopsa.com/oauth/token",
      "scopes": ["read", "write", "admin"],
      "token_validation": {
        "issuer": "https://your-instance.halopsa.com",
        "audience": "halopsa-integration",
        "leeway": 30
      }
    }
  }
}
```

#### API Key Authentication
```json
{
  "security": {
    "authentication": {
      "method": "api_key",
      "header_name": "X-API-Key",
      "key_rotation": {
        "enabled": true,
        "interval_days": 90,
        "grace_period_hours": 24
      },
      "rate_limiting": {
        "enabled": true,
        "requests_per_hour": 1000,
        "burst_limit": 100
      }
    }
  }
}
```

### Role-Based Access Control (RBAC)

#### User Roles and Permissions
```json
{
  "security": {
    "authorization": {
      "rbac": {
        "enabled": true,
        "roles": {
          "admin": {
            "permissions": [
              "config.manage",
              "users.manage",
              "data.sync",
              "analytics.view",
              "logs.view"
            ],
            "inherits": ["operator"]
          },
          "operator": {
            "permissions": [
              "data.sync",
              "data.view",
              "analytics.view"
            ],
            "inherits": ["viewer"]
          },
          "viewer": {
            "permissions": [
              "data.view.readonly",
              "analytics.view"
            ]
          }
        }
      }
    }
  }
}
```

### Multi-Factor Authentication (MFA)
```json
{
  "security": {
    "mfa": {
      "enabled": true,
      "required_for": ["admin", "operator"],
      "methods": ["totp", "sms", "email"],
      "grace_period_days": 7
    }
  }
}
```

## Data Protection

### Encryption at Rest

#### Database Encryption
```json
{
  "security": {
    "encryption": {
      "at_rest": {
        "enabled": true,
        "algorithm": "aes-256-gcm",
        "key_management": "aws-kms",
        "encrypted_fields": [
          "email",
          "phone",
          "social_security_number",
          "bank_account_details"
        ]
      }
    }
  }
}
```

#### File System Encryption
```bash
# Enable full disk encryption
cryptsetup luksFormat /dev/sda1
cryptsetup luksOpen /dev/sda1 encrypted_disk

# Mount encrypted filesystem
mount /dev/mapper/encrypted_disk /var/lib/halopsa-integration
```

### Encryption in Transit

#### TLS Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### API Client Configuration
```javascript
const https = require('https');

const agent = new https.Agent({
  rejectUnauthorized: true,
  minVersion: 'TLSv1.2',
  ciphers: 'ECDHE-RSA-AES256-GCM-SHA512'
});
```

### Data Masking and Anonymization

#### PII Masking Rules
```json
{
  "security": {
    "data_masking": {
      "enabled": true,
      "rules": {
        "email": {
          "mask_pattern": "****@****.***",
          "preserve_domain": true
        },
        "phone": {
          "mask_pattern": "***-***-****",
          "preserve_area_code": true
        },
        "ssn": {
          "mask_pattern": "***-**-****"
        }
      },
      "log_masking": {
        "enabled": true,
        "mask_in_logs": ["password", "api_key", "token"]
      }
    }
  }
}
```

## Network Security

### Firewall Configuration

#### Inbound Rules
```bash
# Allow HTTPS traffic only
ufw allow 443/tcp
ufw allow ssh
ufw --force enable

# Block all other inbound traffic
ufw default deny incoming
```

#### Outbound Rules
```bash
# Allow connections to HaloPSA
ufw allow out to your-instance.halopsa.com port 443

# Allow connections to B2B providers
ufw allow out to api.apollo.io port 443
ufw allow out to api.zoominfo.com port 443

# Restrict all other outbound traffic
ufw default deny outgoing
```

### Web Application Firewall (WAF)

#### ModSecurity Configuration
```apache
<IfModule mod_security2.c>
    SecRuleEngine On
    SecRequestBodyAccess On
    SecResponseBodyAccess On

    # Block common attack patterns
    SecRule ARGS "@rx <script>" "deny,status:403,msg:'XSS Attack'"

    # Rate limiting
    SecAction "initcol:ip=%{REMOTE_ADDR},pass,nolog"
    SecAction "setvar:ip.slow_dos_counter=+1,expirevar:ip.slow_dos_counter=60" "nolog"
    SecRule IP:SLOW_DOS_COUNTER "@gt 10" "deny,status:429,msg:'Rate limit exceeded'"
</IfModule>
```

### DDoS Protection

#### Rate Limiting Configuration
```json
{
  "security": {
    "rate_limiting": {
      "enabled": true,
      "rules": {
        "api_endpoints": {
          "requests_per_minute": 100,
          "burst_limit": 20,
          "block_duration_minutes": 15
        },
        "webhooks": {
          "requests_per_minute": 1000,
          "burst_limit": 100
        },
        "auth_endpoints": {
          "requests_per_minute": 10,
          "burst_limit": 5
        }
      },
      "whitelist": {
        "ips": ["192.168.1.0/24"],
        "user_agents": ["HaloPSA-Webhook/1.0"]
      }
    }
  }
}
```

## Secure Coding Practices

### Input Validation

#### Schema-Based Validation
```javascript
const Joi = require('joi');

const leadSchema = Joi.object({
  first_name: Joi.string().min(1).max(50).required(),
  last_name: Joi.string().min(1).max(50).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
  company: Joi.string().min(1).max(100).required()
});

app.post('/api/leads', (req, res) => {
  const { error, value } = leadSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  // Process validated data
});
```

### SQL Injection Prevention

#### Parameterized Queries
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function getLeadById(id) {
  const query = 'SELECT * FROM leads WHERE id = $1';
  const values = [id];
  const result = await pool.query(query, values);
  return result.rows[0];
}
```

### XSS Prevention

#### Content Security Policy
```javascript
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self'"
  );
  next();
});
```

#### Secure Headers
```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## Webhook Security

### Signature Verification

#### HMAC-SHA256 Verification
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

app.post('/webhooks/apollo', (req, res) => {
  const signature = req.headers['x-apollo-signature'];
  const payload = JSON.stringify(req.body);

  if (!verifyWebhookSignature(payload, signature, process.env.APOLLO_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook
});
```

### Webhook Authentication
```json
{
  "security": {
    "webhooks": {
      "authentication": {
        "required": true,
        "methods": ["signature", "api_key"],
        "signature": {
          "algorithm": "hmac-sha256",
          "header": "X-Webhook-Signature",
          "tolerance_seconds": 300
        }
      },
      "validation": {
        "ip_whitelist": ["192.0.2.0/24"],
        "user_agent_check": true,
        "expected_user_agent": "Apollo-Webhook/1.0"
      }
    }
  }
}
```

## Secrets Management

### Environment Variables
```bash
# Generate secure random keys
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Store in environment
export API_SECRET_KEY=your_generated_key
export DB_ENCRYPTION_KEY=your_encryption_key
```

### Secrets Manager Integration

#### AWS Secrets Manager
```javascript
const AWS = require('aws-sdk');

const secretsManager = new AWS.SecretsManager();

async function getSecret(secretName) {
  const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
  return JSON.parse(data.SecretString);
}

// Usage
const secrets = await getSecret('halopsa-integration-secrets');
process.env.HALOPSA_CLIENT_SECRET = secrets.clientSecret;
```

#### HashiCorp Vault
```javascript
const vault = require('node-vault')({
  endpoint: process.env.VAULT_ENDPOINT,
  token: process.env.VAULT_TOKEN
});

async function getSecrets() {
  const { data } = await vault.read('secret/halopsa-integration');
  return data;
}
```

## Monitoring and Auditing

### Security Event Logging

#### Audit Trail Configuration
```json
{
  "security": {
    "auditing": {
      "enabled": true,
      "events": {
        "authentication": {
          "login_attempts": true,
          "failed_logins": true,
          "password_changes": true
        },
        "data_access": {
          "read_operations": true,
          "write_operations": true,
          "export_operations": true
        },
        "configuration_changes": {
          "config_updates": true,
          "user_permissions": true
        }
      },
      "storage": {
        "retention_days": 365,
        "encryption": true,
        "immutable": true
      }
    }
  }
}
```

### Security Monitoring

#### SIEM Integration
```javascript
const winston = require('winston');

// Send security events to SIEM
const siemTransport = new winston.transports.Http({
  host: 'siem.yourcompany.com',
  port: 514,
  path: '/security-events',
  ssl: true
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [siemTransport]
});

// Log security events
logger.info('Authentication failure', {
  event: 'auth_failure',
  user: 'unknown',
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  timestamp: new Date().toISOString()
});
```

### Intrusion Detection

#### File Integrity Monitoring
```bash
# Install and configure AIDE
apt-get install aide
aideinit
cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# Schedule daily checks
echo "0 2 * * * root /usr/bin/aide --check" >> /etc/crontab
```

#### Log Analysis for Threats
```bash
# Monitor for suspicious patterns
tail -f /var/log/auth.log | grep -i "failed\|invalid"

# Check for brute force attempts
grep "Failed password" /var/log/auth.log | awk '{print $11}' | sort | uniq -c | sort -nr
```

## Incident Response

### Incident Response Plan

#### Detection Phase
1. Monitor alerts and logs for security events
2. Verify incident through multiple sources
3. Assess impact and scope

#### Containment Phase
1. Isolate affected systems
2. Disable compromised accounts
3. Preserve evidence for investigation

#### Recovery Phase
1. Restore systems from clean backups
2. Apply security patches
3. Monitor for reoccurrence

#### Lessons Learned Phase
1. Document incident details
2. Update security measures
3. Conduct post-mortem analysis

### Communication Templates

#### Security Incident Notification
```markdown
**Security Incident Report**

**Incident ID:** INC-2024-001
**Date/Time:** 2024-01-25 14:30 UTC
**Severity:** High
**Status:** Investigating

**Description:**
Unauthorized access attempt detected on API endpoints.

**Affected Systems:**
- HaloPSA Integration API
- Database server

**Actions Taken:**
- Blocked suspicious IP addresses
- Enabled enhanced monitoring
- Notified security team

**Next Steps:**
- Forensic analysis in progress
- Password reset for affected accounts
- Security patch deployment

**Contact:**
Security Team - security@yourcompany.com
```

## Compliance Considerations

### GDPR Compliance

#### Data Subject Rights
```json
{
  "compliance": {
    "gdpr": {
      "data_retention": {
        "leads": "7_years",
        "prospects": "7_years",
        "opportunities": "10_years"
      },
      "consent_management": {
        "required": true,
        "consent_types": ["marketing", "profiling", "data_sharing"]
      },
      "data_portability": {
        "enabled": true,
        "formats": ["json", "csv"]
      }
    }
  }
}
```

### SOC 2 Compliance

#### Access Controls
- Implement least privilege access
- Regular access reviews
- Multi-factor authentication for privileged accounts

#### Change Management
- Document all configuration changes
- Test changes in staging environment
- Maintain change logs with approval records

### Industry-Specific Requirements

#### HIPAA (Healthcare)
```json
{
  "compliance": {
    "hipaa": {
      "phi_protection": {
        "encryption": "aes-256-gcm",
        "access_logging": true,
        "data_minimization": true
      },
      "audit_trails": {
        "enabled": true,
        "retention": "6_years"
      }
    }
  }
}
```

## Security Testing

### Vulnerability Scanning

#### Automated Scanning
```bash
# Run OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://your-domain.com \
  -r zap-report.html

# Run dependency vulnerability check
npm audit
npm audit fix
```

#### Penetration Testing
```bash
# Schedule quarterly penetration tests
# Include API endpoints, authentication, and data handling
# Test for common vulnerabilities:
# - SQL injection
# - XSS
# - CSRF
# - Broken authentication
# - Sensitive data exposure
```

### Security Code Review

#### Automated Code Analysis
```json
{
  "security": {
    "code_analysis": {
      "tools": ["eslint-security", "sonarqube", "snyk"],
      "rules": {
        "no_hardcoded_secrets": true,
        "secure_random": true,
        "input_validation": true,
        "sql_injection_prevention": true
      }
    }
  }
}
```

## Security Updates and Patching

### Automated Updates
```bash
# Configure unattended upgrades
cat > /etc/apt/apt.conf.d/50unattended-upgrades << EOF
Unattended-Upgrade::Allowed-Origins {
  "Ubuntu focal-security";
};
Unattended-Upgrade::Package-Blacklist {
};
Unattended-Upgrade::Automatic-Reboot "true";
EOF

# Enable unattended upgrades
systemctl enable unattended-upgrades
systemctl start unattended-upgrades
```

### Dependency Management
```json
{
  "scripts": {
    "security:audit": "npm audit",
    "security:update": "npm update && npm audit fix",
    "security:check": "snyk test && retire"
  }
}
```

## Security Checklist

### Pre-Deployment Checklist
- [ ] All secrets stored securely
- [ ] TLS certificates configured
- [ ] Firewall rules implemented
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Audit logging configured
- [ ] Security headers set
- [ ] Dependencies scanned for vulnerabilities

### Ongoing Security Maintenance
- [ ] Regular security updates applied
- [ ] Security monitoring active
- [ ] Access reviews conducted quarterly
- [ ] Security training completed annually
- [ ] Incident response plan tested
- [ ] Backup security verified
- [ ] Third-party risk assessments completed

## Emergency Contacts

### Security Team
- **Primary:** security@yourcompany.com
- **Secondary:** it-security@yourcompany.com
- **Emergency:** +1-800-SECURITY

### External Resources
- **CERT Coordination Center:** cert@cert.org
- **HaloPSA Security:** security@halopsa.com
- **B2B Provider Security Teams:** Listed in provider documentation

## Security Incident Report Form

**Incident Details:**
- Date/Time of incident:
- Reported by:
- Affected systems/services:
- Description of incident:
- Potential impact:
- Actions taken:
- Evidence collected:
- Contact information:

**Classification:**
- [ ] Breach of confidentiality
- [ ] Breach of integrity
- [ ] Breach of availability
- [ ] Policy violation
- [ ] Attempted incident

**Severity:**
- [ ] Critical
- [ ] High
- [ ] Medium
- [ ] Low
- [ ] Informational