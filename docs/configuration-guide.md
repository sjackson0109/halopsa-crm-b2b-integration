# Configuration Guide

## Overview

This guide covers advanced configuration options for the HaloPSA CRM Custom Integration, including environment variables, provider-specific settings, and performance tuning.

## Environment Variables

### Core Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | Server port | `3000` | No |
| `LOG_LEVEL` | Logging level | `info` | No |
| `LOG_FILE` | Log file path | `./logs/app.log` | No |

### HaloPSA Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `HALOPSA_BASE_URL` | HaloPSA instance URL | Yes |
| `HALOPSA_CLIENT_ID` | OAuth client ID | Yes |
| `HALOPSA_CLIENT_SECRET` | OAuth client secret | Yes |
| `HALOPSA_WEBHOOK_SECRET` | Webhook signature secret | Yes |
| `HALOPSA_RATE_LIMIT` | API rate limit (req/min) | No (default: 60) |
| `HALOPSA_TIMEOUT` | Request timeout (ms) | No (default: 30000) |

### Database Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | Yes (if using DB) |
| `DB_POOL_SIZE` | Connection pool size | `10` | No |
| `DB_SSL` | Enable SSL connections | `true` | No |
| `DB_SCHEMA` | Database schema | `public` | No |

### B2B Provider Configurations

#### Apollo.io

| Variable | Description | Required |
|----------|-------------|----------|
| `APOLLO_API_KEY` | Apollo API key | Yes |
| `APOLLO_WEBHOOK_SECRET` | Webhook secret | Yes |
| `APOLLO_RATE_LIMIT` | Rate limit (req/min) | No (default: 100) |
| `APOLLO_TIMEOUT` | Request timeout (ms) | No (default: 30000) |
| `APOLLO_RETRIES` | Retry attempts | No (default: 3) |

#### ZoomInfo

| Variable | Description | Required |
|----------|-------------|----------|
| `ZOOMINFO_USERNAME` | ZoomInfo username | Yes |
| `ZOOMINFO_PASSWORD` | ZoomInfo password | Yes |
| `ZOOMINFO_API_KEY` | API key (if using) | No |
| `ZOOMINFO_RATE_LIMIT` | Rate limit (req/min) | No (default: 50) |

#### Hunter.io

| Variable | Description | Required |
|----------|-------------|----------|
| `HUNTER_API_KEY` | Hunter API key | Yes |
| `HUNTER_RATE_LIMIT` | Rate limit (req/min) | No (default: 50) |

#### Other Providers

| Provider | Required Variables |
|----------|-------------------|
| UpLead | `UPLEAD_API_KEY` |
| Lusha | `LUSHA_API_KEY`, `LUSHA_USERNAME` |
| Seamless.ai | `SEAMLESS_API_KEY` |
| Lead411 | `LEAD411_API_KEY`, `LEAD411_USERNAME` |
| RocketReach | `ROCKETREACH_API_KEY` |
| BookYourData | `BOOKYOURDATA_API_KEY` |

## Advanced Configuration Files

### Main Configuration File

Create `config/custom.json` for advanced settings:

```json
{
  "integration": {
    "name": "HaloPSA B2B Integration",
    "version": "1.0.0",
    "environment": "production"
  },
  "halopsa": {
    "custom_fields": {
      "enabled": true,
      "prefix": "CF_",
      "ranges": {
        "lead": "101-113",
        "prospect": "201-206",
        "opportunity": "301-304"
      }
    },
    "workflows": {
      "auto_progression": true,
      "qualification_threshold": 70,
      "notification_triggers": ["qualified", "won", "lost"]
    }
  },
  "providers": {
    "apollo": {
      "enabled": true,
      "priority": 1,
      "mapping": "enhanced",
      "webhooks": {
        "enabled": true,
        "events": ["person.created", "person.enriched"]
      }
    },
    "zoominfo": {
      "enabled": true,
      "priority": 2,
      "mapping": "standard"
    }
  },
  "processing": {
    "batch_size": 100,
    "concurrency": 5,
    "retry_policy": {
      "max_attempts": 3,
      "backoff_multiplier": 2,
      "initial_delay": 1000
    }
  },
  "monitoring": {
    "metrics": {
      "enabled": true,
      "interval": 60000
    },
    "alerts": {
      "error_threshold": 10,
      "performance_threshold": 5000
    }
  }
}
```

### Provider-Specific Configurations

#### Apollo.io Enhanced Configuration

```json
{
  "apollo": {
    "api": {
      "base_url": "https://api.apollo.io",
      "version": "v1",
      "rate_limiting": {
        "requests_per_minute": 100,
        "burst_limit": 20
      }
    },
    "data_mapping": {
      "person_fields": {
        "first_name": "first_name",
        "last_name": "last_name",
        "email": "email",
        "title": "title",
        "company": "organization.name"
      },
      "organization_fields": {
        "industry": "organization.industry",
        "size": "organization.estimated_num_employees",
        "revenue": "organization.annual_revenue_printed"
      },
      "custom_mappings": {
        "CF_102": "organization.keywords.join(', ')",
        "CF_103": "organization.funding_events.map(e => e.amount).join('; ')",
        "CF_106": "organization.technologies.map(t => t.name).join(', ')"
      }
    },
    "enrichment": {
      "auto_enrich": true,
      "enrichment_triggers": ["new_lead", "weekly_update"],
      "fields_to_enrich": ["phone", "social_links", "intent_signals"]
    },
    "webhooks": {
      "secret": "your_webhook_secret",
      "tolerance": 300,
      "events": [
        "person.created",
        "person.updated",
        "person.enriched",
        "organization.enriched"
      ]
    }
  }
}
```

#### ZoomInfo Configuration

```json
{
  "zoominfo": {
    "api": {
      "base_url": "https://api.zoominfo.com",
      "auth_type": "basic",
      "rate_limiting": {
        "requests_per_hour": 1000,
        "burst_limit": 50
      }
    },
    "data_mapping": {
      "contact_fields": {
        "first_name": "firstName",
        "last_name": "lastName",
        "email": "email",
        "direct_phone": "directPhone",
        "title": "jobTitle"
      },
      "company_fields": {
        "name": "companyName",
        "industry": "industry",
        "employee_count": "employeeCount",
        "revenue_range": "revenueRange"
      }
    },
    "search": {
      "default_filters": {
        "has_email": true,
        "has_direct_phone": true,
        "seniority": ["director", "vp", "c_suite"]
      },
      "result_limits": {
        "max_results": 100,
        "min_score": 0.7
      }
    }
  }
}
```

### Workflow Configuration

#### Custom CRM Workflow Rules

```json
{
  "workflows": {
    "lead_lifecycle": {
      "stages": [
        {
          "name": "new_lead",
          "auto_assign": true,
          "assignment_rules": {
            "by_region": true,
            "by_industry": false,
            "round_robin": true
          },
          "sla_hours": 24,
          "notifications": ["team_lead"]
        },
        {
          "name": "researching",
          "required_fields": ["CF_101", "CF_102"],
          "auto_progression": {
            "enabled": true,
            "delay_hours": 48
          }
        },
        {
          "name": "contacted",
          "follow_up_required": true,
          "follow_up_days": 7
        },
        {
          "name": "engaged",
          "qualification_check": true,
          "conversion_trigger": "manual_review"
        }
      ],
      "transitions": {
        "researching_to_contacted": {
          "conditions": ["email_sent", "phone_called"],
          "auto_transition": false
        },
        "contacted_to_engaged": {
          "conditions": ["response_received"],
          "time_window": "30_days"
        }
      }
    },
    "prospect_lifecycle": {
      "qualification_criteria": {
        "fit_score_threshold": 70,
        "budget_minimum": 25000,
        "timeline_defined": true,
        "decision_maker_identified": true
      },
      "disqualification_rules": {
        "no_budget": true,
        "wrong_industry": true,
        "competitor_conflict": true
      }
    },
    "opportunity_lifecycle": {
      "stages": ["new", "progressing", "negotiation", "won", "lost"],
      "probability_mapping": {
        "new": 10,
        "progressing": 30,
        "negotiation": 70,
        "won": 100,
        "lost": 0
      }
    }
  }
}
```

### Data Processing Configuration

#### Deduplication Rules

```json
{
  "deduplication": {
    "enabled": true,
    "strategy": "intelligent",
    "rules": {
      "exact_match": {
        "fields": ["email"],
        "case_sensitive": false
      },
      "fuzzy_match": {
        "fields": ["company", "first_name", "last_name"],
        "threshold": 0.85,
        "algorithms": ["levenshtein", "soundex"]
      },
      "domain_match": {
        "enabled": true,
        "exclude_free_providers": true
      }
    },
    "conflict_resolution": {
      "prefer_source": "apollo",
      "update_strategy": "merge",
      "preserve_manual_edits": true
    }
  }
}
```

#### Data Validation Rules

```json
{
  "validation": {
    "strict_mode": true,
    "rules": {
      "email": {
        "required": true,
        "format_validation": true,
        "domain_check": true,
        "disposable_check": true
      },
      "phone": {
        "required": false,
        "format_validation": true,
        "country_code_required": true
      },
      "company": {
        "required": true,
        "minimum_length": 2,
        "domain_consistency": true
      },
      "custom_fields": {
        "CF_101": {
          "required": true,
          "allowed_values": ["apollo", "zoominfo", "hunter", "manual"]
        },
        "CF_206": {
          "type": "number",
          "range": [0, 100]
        }
      }
    },
    "error_handling": {
      "fail_on_validation_error": false,
      "log_warnings": true,
      "auto_correct": {
        "enabled": true,
        "corrections": ["trim_whitespace", "standardize_phone"]
      }
    }
  }
}
```

### Performance Configuration

#### Caching Configuration

```json
{
  "caching": {
    "enabled": true,
    "provider": "redis",
    "redis": {
      "host": "localhost",
      "port": 6379,
      "password": "your_password",
      "db": 0
    },
    "ttl": {
      "halopsa_data": 3600,
      "provider_data": 1800,
      "validation_results": 300
    },
    "strategies": {
      "lead_data": "write_through",
      "lookup_data": "cache_aside",
      "analytics": "time_based"
    }
  }
}
```

#### Queue Configuration

```json
{
  "queue": {
    "enabled": true,
    "provider": "bull",
    "redis": {
      "host": "localhost",
      "port": 6379
    },
    "concurrency": {
      "sync_operations": 5,
      "webhook_processing": 10,
      "bulk_imports": 2
    },
    "retry_policy": {
      "max_attempts": 3,
      "backoff": {
        "type": "exponential",
        "delay": 5000
      }
    },
    "dead_letter_queue": {
      "enabled": true,
      "max_retries": 5
    }
  }
}
```

### Monitoring and Alerting

#### Metrics Configuration

```json
{
  "monitoring": {
    "metrics": {
      "enabled": true,
      "provider": "prometheus",
      "port": 9090,
      "path": "/metrics",
      "collectors": {
        "http_requests": true,
        "database_queries": true,
        "external_api_calls": true,
        "queue_metrics": true,
        "error_rates": true
      }
    },
    "alerts": {
      "enabled": true,
      "provider": "webhook",
      "webhook_url": "https://alerts.yourcompany.com/webhook",
      "rules": {
        "high_error_rate": {
          "threshold": 0.05,
          "window": "5m",
          "severity": "critical"
        },
        "slow_response_time": {
          "threshold": 5000,
          "window": "1m",
          "severity": "warning"
        },
        "queue_backlog": {
          "threshold": 1000,
          "severity": "warning"
        }
      }
    }
  }
}
```

### Security Configuration

#### Authentication and Authorization

```json
{
  "security": {
    "authentication": {
      "methods": ["api_key", "oauth"],
      "api_key": {
        "header_name": "X-API-Key",
        "rate_limiting": true
      },
      "oauth": {
        "provider": "halopsa",
        "scopes": ["read", "write", "admin"]
      }
    },
    "authorization": {
      "rbac": {
        "enabled": true,
        "roles": ["admin", "operator", "viewer"],
        "permissions": {
          "sync_leads": ["admin", "operator"],
          "view_analytics": ["admin", "operator", "viewer"],
          "manage_config": ["admin"]
        }
      }
    },
    "encryption": {
      "sensitive_data": true,
      "algorithm": "aes-256-gcm",
      "key_rotation": {
        "enabled": true,
        "interval_days": 90
      }
    }
  }
}
```

## Configuration Validation

### Validate Configuration
```bash
npm run validate:config
```

### Test Configuration
```bash
npm run test:config
```

### Configuration Hot Reload
The service supports hot reloading of configuration changes without restart:

```json
{
  "hot_reload": {
    "enabled": true,
    "watch_paths": ["config/*.json", ".env"],
    "debounce_ms": 1000
  }
}
```

## Environment-Specific Overrides

### Development Configuration
```json
{
  "development": {
    "logging": {
      "level": "debug",
      "pretty_print": true
    },
    "halopsa": {
      "rate_limit": 1000
    },
    "monitoring": {
      "alerts": {
        "enabled": false
      }
    }
  }
}
```

### Production Configuration
```json
{
  "production": {
    "logging": {
      "level": "warn",
      "structured": true
    },
    "halopsa": {
      "rate_limit": 60
    },
    "caching": {
      "enabled": true
    },
    "queue": {
      "enabled": true
    }
  }
}
```

## Configuration Management

### Configuration as Code
Store configurations in version control and deploy with CI/CD:

```yaml
# .github/workflows/deploy.yml
- name: Deploy Configuration
  run: |
    cp config/production.json config/active.json
    npm run validate:config
    npm run deploy:config
```

### Secrets Management
Use environment variables or a secrets manager for sensitive data:

```bash
# Using AWS Secrets Manager
export HALOPSA_CLIENT_SECRET=$(aws secretsmanager get-secret-value --secret-id halopsa-creds --query SecretString --output text | jq -r .client_secret)
```

### Configuration Backup and Recovery
```json
{
  "backup": {
    "enabled": true,
    "schedule": "0 2 * * *",
    "retention_days": 30,
    "storage": {
      "type": "s3",
      "bucket": "halopsa-config-backups",
      "encryption": true
    }
  }
}
```