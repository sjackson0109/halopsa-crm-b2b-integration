# Monitoring and Logging Guide

## Overview

This guide covers comprehensive monitoring and logging strategies for the HaloPSA CRM Custom Integration, including metrics collection, alerting, and log analysis.

## Logging Architecture

### Log Levels and Structure

#### Winston Logger Configuration
```javascript
const winston = require('winston');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      message,
      service: 'halopsa-integration',
      version: process.env.npm_package_version,
      ...meta
    });
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'halopsa-integration' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),

    // File transport for production
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),

    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  next();
});

module.exports = logger;
```

### Structured Logging

#### Request/Response Logging
```javascript
const logger = require('./logger');

function logApiRequest(req, res, next) {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || generateRequestId();

  // Log incoming request
  logger.info('API Request Started', {
    requestId,
    method: req.method,
    url: req.url,
    headers: sanitizeHeaders(req.headers),
    body: sanitizeBody(req.body),
    ip: req.ip
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;

    logger.info('API Request Completed', {
      requestId,
      statusCode: res.statusCode,
      duration,
      responseSize: chunk ? chunk.length : 0
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
}

function sanitizeHeaders(headers) {
  const sensitive = ['authorization', 'x-api-key', 'cookie'];
  const sanitized = { ...headers };

  sensitive.forEach(key => {
    if (sanitized[key]) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
}

function sanitizeBody(body) {
  if (!body) return body;

  const sensitive = ['password', 'token', 'secret', 'key'];
  const sanitized = { ...body };

  sensitive.forEach(key => {
    if (sanitized[key]) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
}
```

#### Business Event Logging
```javascript
const logger = require('./logger');

class BusinessLogger {
  static leadCreated(leadData, source) {
    logger.info('Lead Created', {
      event: 'lead.created',
      leadId: leadData.id,
      source,
      company: leadData.company,
      email: leadData.email,
      timestamp: new Date().toISOString()
    });
  }

  static leadConverted(leadId, prospectId) {
    logger.info('Lead Converted to Prospect', {
      event: 'lead.converted',
      leadId,
      prospectId,
      timestamp: new Date().toISOString()
    });
  }

  static opportunityCreated(opportunityData) {
    logger.info('Opportunity Created', {
      event: 'opportunity.created',
      opportunityId: opportunityData.id,
      value: opportunityData.value,
      probability: opportunityData.probability,
      expectedCloseDate: opportunityData.expected_close_date
    });
  }

  static syncCompleted(source, stats) {
    logger.info('Data Synchronization Completed', {
      event: 'sync.completed',
      source,
      stats: {
        processed: stats.processed,
        successful: stats.successful,
        failed: stats.failed,
        duration: stats.duration
      }
    });
  }

  static errorOccurred(operation, error, context = {}) {
    logger.error('Operation Failed', {
      event: 'operation.error',
      operation,
      error: error.message,
      stack: error.stack,
      ...context
    });
  }
}

module.exports = BusinessLogger;
```

## Metrics Collection

### Application Metrics

#### Prometheus Metrics Setup
```javascript
const promClient = require('prom-client');

// Enable default metrics collection
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

// Custom metrics
const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const leadSyncTotal = new promClient.Counter({
  name: 'lead_sync_total',
  help: 'Total number of lead synchronization operations',
  labelNames: ['source', 'status']
});

const queueSize = new promClient.Gauge({
  name: 'queue_size',
  help: 'Current queue size',
  labelNames: ['queue_name']
});

// Middleware to collect HTTP metrics
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;

    httpRequestTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    });

    httpRequestDuration.observe({
      method: req.method,
      route: req.route?.path || req.path
    }, duration);
  });

  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

### Business Metrics

#### Lead Management Metrics
```javascript
const promClient = require('prom-client');

const leadsCreated = new promClient.Counter({
  name: 'leads_created_total',
  help: 'Total number of leads created',
  labelNames: ['source']
});

const prospectsCreated = new promClient.Counter({
  name: 'prospects_created_total',
  help: 'Total number of prospects created'
});

const opportunitiesCreated = new promClient.Counter({
  name: 'opportunities_created_total',
  help: 'Total number of opportunities created',
  labelNames: ['value_range']
});

const conversionRate = new promClient.Gauge({
  name: 'lead_conversion_rate',
  help: 'Current lead to prospect conversion rate',
  labelNames: ['timeframe']
});

// Update metrics functions
function recordLeadCreated(source) {
  leadsCreated.inc({ source });
}

function recordProspectCreated() {
  prospectsCreated.inc();
}

function recordOpportunityCreated(value) {
  const range = getValueRange(value);
  opportunitiesCreated.inc({ value_range: range });
}

function updateConversionRate(timeframe = '30d') {
  // Calculate conversion rate from database
  const rate = calculateConversionRate(timeframe);
  conversionRate.set({ timeframe }, rate);
}

function getValueRange(value) {
  if (value < 25000) return '0-25k';
  if (value < 50000) return '25k-50k';
  if (value < 100000) return '50k-100k';
  if (value < 250000) return '100k-250k';
  return '250k+';
}
```

### System Metrics

#### Database Connection Metrics
```javascript
const promClient = require('prom-client');

const dbConnectionsActive = new promClient.Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections'
});

const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['query_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
});

const dbErrorsTotal = new promClient.Counter({
  name: 'db_errors_total',
  help: 'Total number of database errors',
  labelNames: ['error_type']
});

// Monitor database pool
setInterval(async () => {
  try {
    const poolStats = await getPoolStats();
    dbConnectionsActive.set(poolStats.active);
  } catch (error) {
    dbErrorsTotal.inc({ error_type: 'pool_monitoring' });
  }
}, 30000);

// Database query monitoring
const originalQuery = pool.query;
pool.query = async function(...args) {
  const start = Date.now();
  try {
    const result = await originalQuery.apply(this, args);
    const duration = (Date.now() - start) / 1000;

    // Extract query type from SQL
    const queryType = extractQueryType(args[0]);
    dbQueryDuration.observe({ query_type: queryType }, duration);

    return result;
  } catch (error) {
    dbErrorsTotal.inc({ error_type: error.message.split(' ')[0] });
    throw error;
  }
};

function extractQueryType(query) {
  const sql = query.toLowerCase();
  if (sql.startsWith('select')) return 'select';
  if (sql.startsWith('insert')) return 'insert';
  if (sql.startsWith('update')) return 'update';
  if (sql.startsWith('delete')) return 'delete';
  return 'other';
}
```

## Alerting Configuration

### Alert Manager Rules

#### Prometheus Alerting Rules
```yaml
groups:
  - name: halopsa_integration
    rules:
      # High error rate alert
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}% over the last 5 minutes"

      # Slow response time alert
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow response times detected"
          description: "95th percentile response time is {{ $value }}s"

      # Database connection pool exhausted
      - alert: DBConnectionPoolExhausted
        expr: db_connections_active / db_connections_max > 0.9
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "Active connections: {{ $value }}"

      # Queue backlog alert
      - alert: QueueBacklog
        expr: queue_size > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Queue backlog detected"
          description: "Queue size is {{ $value }}"

      # Lead sync failures
      - alert: LeadSyncFailures
        expr: rate(lead_sync_total{status="failed"}[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High lead sync failure rate"
          description: "Failed syncs per minute: {{ $value }}"
```

### Alert Channels

#### Slack Integration
```javascript
const axios = require('axios');

class SlackAlert {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  async sendAlert(alert) {
    const payload = {
      text: `🚨 *${alert.title}*`,
      attachments: [{
        color: this.getColorForSeverity(alert.severity),
        fields: [
          {
            title: 'Severity',
            value: alert.severity,
            short: true
          },
          {
            title: 'Description',
            value: alert.description,
            short: false
          },
          {
            title: 'Time',
            value: new Date().toISOString(),
            short: true
          }
        ]
      }]
    };

    await axios.post(this.webhookUrl, payload);
  }

  getColorForSeverity(severity) {
    switch (severity) {
      case 'critical': return 'danger';
      case 'warning': return 'warning';
      case 'info': return 'good';
      default: return '#808080';
    }
  }
}

// Usage
const slack = new SlackAlert(process.env.SLACK_WEBHOOK_URL);

process.on('unhandledRejection', async (reason, promise) => {
  await slack.sendAlert({
    title: 'Unhandled Promise Rejection',
    severity: 'critical',
    description: `Unhandled promise rejection: ${reason}`
  });
});
```

#### Email Alerts
```javascript
const nodemailer = require('nodemailer');

class EmailAlert {
  constructor(config) {
    this.transporter = nodemailer.createTransporter({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password
      }
    });
  }

  async sendAlert(alert) {
    const mailOptions = {
      from: '"HaloPSA Integration Alert" <alerts@yourdomain.com>',
      to: alert.recipients.join(','),
      subject: `🚨 ${alert.title}`,
      html: this.generateHtml(alert)
    };

    await this.transporter.sendMail(mailOptions);
  }

  generateHtml(alert) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${this.getColorForSeverity(alert.severity)};">
          ${alert.title}
        </h2>
        <p><strong>Severity:</strong> ${alert.severity}</p>
        <p><strong>Description:</strong> ${alert.description}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        ${alert.details ? `<pre>${JSON.stringify(alert.details, null, 2)}</pre>` : ''}
      </div>
    `;
  }

  getColorForSeverity(severity) {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'warning': return '#ffc107';
      case 'info': return '#17a2b8';
      default: return '#6c757d';
    }
  }
}
```

## Log Analysis and Visualization

### ELK Stack Integration

#### Elasticsearch Configuration
```javascript
const { Client } = require('@elastic/elasticsearch');

const esClient = new Client({
  node: process.env.ELASTICSEARCH_NODE,
  auth: {
    username: process.env.ES_USERNAME,
    password: process.env.ES_PASSWORD
  }
});

// Custom Elasticsearch transport for Winston
const ElasticsearchTransport = require('winston-elasticsearch');

const esTransport = new ElasticsearchTransport({
  level: 'info',
  indexPrefix: 'halopsa-integration',
  client: esClient,
  transformer: (logData) => {
    return {
      '@timestamp': logData.timestamp,
      level: logData.level,
      message: logData.message,
      service: 'halopsa-integration',
      ...logData.meta
    };
  }
});

logger.add(esTransport);
```

### Kibana Dashboards

#### Error Monitoring Dashboard
```json
{
  "title": "HaloPSA Integration - Error Monitoring",
  "panels": [
    {
      "type": "metric",
      "title": "Error Rate (Last 1h)",
      "query": {
        "bool": {
          "must": [
            { "match": { "level": "ERROR" } },
            { "range": { "@timestamp": { "gte": "now-1h" } } }
          ]
        }
      }
    },
    {
      "type": "line",
      "title": "Error Trend",
      "query": {
        "bool": {
          "must": [
            { "match": { "level": "ERROR" } }
          ]
        }
      },
      "xAxis": "@timestamp",
      "yAxis": "count"
    }
  ]
}
```

#### Performance Dashboard
```json
{
  "title": "HaloPSA Integration - Performance",
  "panels": [
    {
      "type": "metric",
      "title": "Avg Response Time",
      "query": {
        "bool": {
          "must": [
            { "exists": { "field": "duration" } }
          ]
        }
      },
      "aggregation": {
        "avg": { "field": "duration" }
      }
    },
    {
      "type": "histogram",
      "title": "Response Time Distribution",
      "query": {
        "bool": {
          "must": [
            { "exists": { "field": "duration" } }
          ]
        }
      },
      "field": "duration",
      "buckets": [0, 100, 500, 1000, 5000]
    }
  ]
}
```

### Log Aggregation

#### Fluentd Configuration
```xml
<source>
  @type tail
  path /var/log/halopsa-integration/*.log
  pos_file /var/log/td-agent/halopsa-integration.pos
  tag halopsa-integration.*
  <parse>
    @type json
  </parse>
</source>

<match halopsa-integration.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  logstash_format true
  logstash_prefix halopsa-integration
  <buffer>
    @type file
    path /var/log/td-agent/buffer/halopsa
  </buffer>
</match>
```

## Health Checks

### Application Health Checks

#### Comprehensive Health Check Endpoint
```javascript
const express = require('express');
const router = express.Router();

router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    uptime: process.uptime(),
    checks: {}
  };

  try {
    // Database health check
    health.checks.database = await checkDatabaseHealth();

    // External API health checks
    health.checks.halopsa = await checkHaloPSAHealth();
    health.checks.apollo = await checkApolloHealth();
    health.checks.zoominfo = await checkZoomInfoHealth();

    // Queue health check
    health.checks.queue = await checkQueueHealth();

    // Memory and CPU checks
    health.checks.system = checkSystemHealth();

    // Determine overall status
    const unhealthyChecks = Object.values(health.checks).filter(check =>
      check.status === 'unhealthy'
    );

    if (unhealthyChecks.length > 0) {
      health.status = 'unhealthy';
      res.status(503);
    }

  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
    res.status(503);
  }

  res.json(health);
});

async function checkDatabaseHealth() {
  try {
    await pool.query('SELECT 1');
    return { status: 'healthy', response_time: Date.now() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkHaloPSAHealth() {
  try {
    const response = await axios.get(`${process.env.HALOPSA_BASE_URL}/api/me`, {
      headers: { Authorization: `Bearer ${await getValidToken()}` },
      timeout: 5000
    });
    return {
      status: 'healthy',
      response_time: response.config.metadata?.duration || 0
    };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

function checkSystemHealth() {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return {
    status: 'healthy',
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
    },
    cpu: {
      user: cpuUsage.user / 1000,
      system: cpuUsage.system / 1000
    }
  };
}

module.exports = router;
```

### Kubernetes Health Checks

#### Readiness and Liveness Probes
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: halopsa-integration
spec:
  containers:
  - name: app
    image: halopsa-integration:latest
    ports:
    - containerPort: 3000
    livenessProbe:
      httpGet:
        path: /health
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3
    readinessProbe:
      httpGet:
        path: /health
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 5
      timeoutSeconds: 3
      failureThreshold: 3
```

## Log Retention and Rotation

### Log Rotation Configuration

#### Logrotate Configuration
```bash
# /etc/logrotate.d/halopsa-integration
/var/log/halopsa-integration/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 halopsa halopsa
    postrotate
        systemctl reload halopsa-integration
    endscript
}
```

### Log Retention Policies

#### Elasticsearch Index Lifecycle Management
```json
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_age": "1d",
            "max_size": "50gb"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": {
            "number_of_shards": 1
          },
          "forcemerge": {
            "max_num_segments": 1
          }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "freeze": {}
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

## Monitoring Best Practices

### Alert Fatigue Prevention

#### Alert Grouping and Deduplication
```javascript
class AlertManager {
  constructor() {
    this.activeAlerts = new Map();
    this.alertCooldown = 5 * 60 * 1000; // 5 minutes
  }

  async triggerAlert(alertKey, alert) {
    const now = Date.now();
    const lastAlert = this.activeAlerts.get(alertKey);

    // Prevent alert spam
    if (lastAlert && (now - lastAlert.timestamp) < this.alertCooldown) {
      return;
    }

    this.activeAlerts.set(alertKey, {
      ...alert,
      timestamp: now,
      count: (lastAlert?.count || 0) + 1
    });

    await this.sendAlert(alert);
  }

  async resolveAlert(alertKey) {
    const alert = this.activeAlerts.get(alertKey);
    if (alert) {
      await this.sendResolution(alert);
      this.activeAlerts.delete(alertKey);
    }
  }
}
```

### Monitoring Checklist

#### Daily Checks
- [ ] Review error logs for new patterns
- [ ] Check system resource usage
- [ ] Verify backup completion
- [ ] Monitor queue depths
- [ ] Review performance metrics

#### Weekly Reviews
- [ ] Analyze top error types
- [ ] Review performance trends
- [ ] Check log retention compliance
- [ ] Update alert thresholds if needed
- [ ] Review security events

#### Monthly Audits
- [ ] Full log analysis
- [ ] Performance benchmarking
- [ ] Security assessment
- [ ] Compliance verification
- [ ] Capacity planning review

This comprehensive monitoring and logging guide ensures your HaloPSA CRM Custom Integration remains observable, maintainable, and reliable in production environments.