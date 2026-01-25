# Performance Optimization Guide

## Overview

This guide provides comprehensive strategies for optimizing the performance of the HaloPSA CRM Custom Integration, covering database tuning, caching strategies, and system scaling.

## Performance Monitoring

### Key Metrics to Monitor

#### Application Metrics
```json
{
  "metrics": {
    "response_times": {
      "p50": "< 200ms",
      "p95": "< 1000ms",
      "p99": "< 5000ms"
    },
    "throughput": {
      "requests_per_second": "> 100",
      "concurrent_users": "> 50"
    },
    "error_rates": {
      "overall": "< 0.1%",
      "by_endpoint": "< 1%"
    }
  }
}
```

#### System Metrics
- CPU usage: < 70%
- Memory usage: < 80%
- Disk I/O: < 80% utilization
- Network latency: < 50ms

### Monitoring Setup

#### Prometheus Configuration
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'halopsa-integration'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

#### Application Metrics Collection
```javascript
const promClient = require('prom-client');

const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  next();
});
```

## Database Optimization

### Connection Pooling

#### PostgreSQL Pool Configuration
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of connections
  min: 5,  // Minimum number of connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Return error after 2s if no connection
  allowExitOnIdle: true
});

// Connection monitoring
pool.on('connect', (client) => {
  console.log('New client connected to database');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});
```

### Query Optimization

#### Index Strategy
```sql
-- Essential indexes for leads table
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_company ON leads(company);
CREATE INDEX idx_leads_status ON leads(status_id);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_leads_status_created ON leads(status_id, created_at DESC);
CREATE INDEX idx_leads_source_email ON leads(source, email);

-- Partial indexes for active records
CREATE INDEX idx_leads_active ON leads(created_at)
WHERE status_id NOT IN (5, 6, 7); -- Exclude closed statuses

-- Full-text search index
CREATE INDEX idx_leads_search ON leads
USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || company));
```

#### Query Performance Analysis
```sql
-- Find slow queries
SELECT
  query,
  calls,
  total_time / calls as avg_time,
  rows / calls as avg_rows
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- Analyze table bloat
SELECT
  schemaname,
  tablename,
  n_tup_ins,
  n_tup_upd,
  n_tup_del,
  n_live_tup,
  n_dead_tup,
  ROUND(n_dead_tup::numeric / (n_live_tup + n_dead_tup) * 100, 2) as dead_tuple_ratio
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

### Database Maintenance

#### Automated Vacuum and Analyze
```sql
-- Enable autovacuum
ALTER SYSTEM SET autovacuum = on;
ALTER SYSTEM SET autovacuum_max_workers = 3;
ALTER SYSTEM SET autovacuum_naptime = '20s';
ALTER SYSTEM SET autovacuum_vacuum_threshold = 50;
ALTER SYSTEM SET autovacuum_analyze_threshold = 50;

-- Manual maintenance
VACUUM ANALYZE leads;
REINDEX TABLE leads;
```

#### Partitioning Strategy
```sql
-- Partition leads table by month
CREATE TABLE leads_y2024m01 PARTITION OF leads
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Create partitions for future months
CREATE TABLE leads_y2024m02 PARTITION OF leads
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Automatic partition creation
CREATE OR REPLACE FUNCTION create_leads_partition()
RETURNS void AS $$
DECLARE
  next_month date := date_trunc('month', now() + interval '1 month');
  partition_name text := 'leads_y' || to_char(next_month, 'YYYY') || 'm' || to_char(next_month, 'MM');
BEGIN
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF leads FOR VALUES FROM (%L) TO (%L)',
    partition_name, next_month, next_month + interval '1 month');
END;
$$ LANGUAGE plpgsql;
```

## Caching Strategies

### Multi-Level Caching

#### Redis Configuration
```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3
});

// Cache wrapper
class Cache {
  async get(key) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key, value, ttl = 3600) {
    await redis.setex(key, ttl, JSON.stringify(value));
  }

  async del(key) {
    await redis.del(key);
  }
}

const cache = new Cache();
```

#### Application-Level Caching
```javascript
const NodeCache = require('node-cache');

// In-memory cache for frequently accessed data
const localCache = new NodeCache({
  stdTTL: 600, // 10 minutes
  checkperiod: 60, // Check for expired keys every 60 seconds
  maxKeys: 1000
});

// Cache HaloPSA custom fields
async function getCustomFields() {
  const cacheKey = 'halopsa:custom_fields';
  let fields = localCache.get(cacheKey);

  if (!fields) {
    fields = await haloApi.getCustomFields();
    localCache.set(cacheKey, fields, 1800); // Cache for 30 minutes
  }

  return fields;
}
```

### Cache Invalidation Strategy

#### Write-Through Caching
```javascript
async function updateLead(leadId, data) {
  // Update database
  const updatedLead = await db.updateLead(leadId, data);

  // Invalidate related caches
  await cache.del(`lead:${leadId}`);
  await cache.del(`leads:company:${data.company}`);
  await cache.del('leads:recent');

  // Update search index
  await searchIndex.update(leadId, updatedLead);

  return updatedLead;
}
```

#### Cache Warming
```javascript
async function warmCaches() {
  console.log('Starting cache warming...');

  // Warm frequently accessed data
  const [recentLeads, topCompanies, customFields] = await Promise.all([
    db.getRecentLeads(100),
    db.getTopCompanies(50),
    haloApi.getCustomFields()
  ]);

  await Promise.all([
    cache.set('leads:recent', recentLeads, 1800),
    cache.set('companies:top', topCompanies, 3600),
    cache.set('halopsa:custom_fields', customFields, 3600)
  ]);

  console.log('Cache warming completed');
}
```

## API Optimization

### Request Batching

#### Bulk Operations
```javascript
app.post('/api/leads/batch', async (req, res) => {
  const { leads } = req.body;

  if (leads.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 leads per batch' });
  }

  const results = [];
  const errors = [];

  // Process in parallel with concurrency limit
  const batches = chunkArray(leads, 10); // 10 concurrent requests

  for (const batch of batches) {
    const batchPromises = batch.map(async (lead) => {
      try {
        const result = await processLead(lead);
        results.push(result);
      } catch (error) {
        errors.push({ lead, error: error.message });
      }
    });

    await Promise.allSettled(batchPromises);
  }

  res.json({
    processed: results.length,
    errors: errors.length,
    results,
    errors
  });
});

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
```

### Response Compression

#### Gzip Compression
```javascript
const compression = require('compression');

app.use(compression({
  level: 6, // Compression level (1-9)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress responses with this request header
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression by default
    return compression.filter(req, res);
  }
}));
```

### Pagination Optimization

#### Cursor-Based Pagination
```javascript
app.get('/api/leads', async (req, res) => {
  const {
    limit = 50,
    cursor,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = req.query;

  let query = db.select('*').from('leads');

  // Apply cursor-based pagination
  if (cursor) {
    const decodedCursor = decodeCursor(cursor);
    const operator = sortOrder === 'desc' ? '<' : '>';
    query = query.where(sortBy, operator, decodedCursor[sortBy]);
  }

  // Apply sorting
  query = query.orderBy(sortBy, sortOrder).limit(limit + 1);

  const leads = await query;

  // Check if there are more results
  const hasNextPage = leads.length > limit;
  const results = hasNextPage ? leads.slice(0, -1) : leads;

  // Create next cursor
  const nextCursor = hasNextPage
    ? encodeCursor(results[results.length - 1])
    : null;

  res.json({
    data: results,
    pagination: {
      hasNextPage,
      nextCursor,
      limit: parseInt(limit)
    }
  });
});

function encodeCursor(record) {
  return Buffer.from(JSON.stringify({
    created_at: record.created_at,
    id: record.id
  })).toString('base64');
}

function decodeCursor(cursor) {
  return JSON.parse(Buffer.from(cursor, 'base64').toString());
}
```

## Queue Optimization

### Job Queue Configuration

#### Bull Queue Setup
```javascript
const Queue = require('bull');

const leadSyncQueue = new Queue('lead-sync', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  },
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    }
  }
});

// Add concurrency control
leadSyncQueue.process('sync-lead', 5, async (job) => {
  const { leadData, source } = job.data;
  return await syncLeadToHaloPSA(leadData, source);
});

// Monitor queue health
leadSyncQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

leadSyncQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});
```

### Queue Performance Tuning

#### Worker Optimization
```javascript
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork(); // Restart worker
  });
} else {
  // Worker process
  require('./worker.js');
}
```

## System Scaling

### Horizontal Scaling

#### Load Balancer Configuration
```nginx
upstream halopsa_integration {
  least_conn;
  server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
  server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
  server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
}

server {
  listen 80;
  server_name api.yourdomain.com;

  location / {
    proxy_pass http://halopsa_integration;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;

    # Timeout settings
    proxy_connect_timeout 30s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
  }
}
```

### Vertical Scaling

#### Memory Optimization
```javascript
// Monitor memory usage
setInterval(() => {
  const memUsage = process.memoryUsage();
  console.log(`Memory usage: RSS=${Math.round(memUsage.rss / 1024 / 1024)}MB, Heap=${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);

  // Force garbage collection if memory usage is high
  if (global.gc && memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
    global.gc();
    console.log('Forced garbage collection');
  }
}, 30000);

// Optimize memory usage
const v8 = require('v8');
v8.setFlagsFromString('--max-old-space-size=4096'); // 4GB heap limit
```

### Auto-Scaling Configuration

#### Kubernetes HorizontalPodAutoscaler
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: halopsa-integration-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: halopsa-integration
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

## CDN and Static Asset Optimization

### Static File Caching
```javascript
const express = require('express');
const app = express();

// Cache static files for 1 year
app.use(express.static('public', {
  maxAge: '1y',
  etag: true,
  lastModified: true
}));

// Cache API responses
app.use((req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
  }
  next();
});
```

## Performance Testing

### Load Testing Setup

#### Artillery Configuration
```yaml
config:
  target: 'https://api.yourdomain.com'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Load test"
    - duration: 60
      arrivalRate: 100
      name: "Stress test"

scenarios:
  - name: "Lead sync"
    weight: 70
    flow:
      - post:
          url: "/api/sync/leads"
          json:
            source: "apollo"
            data:
              first_name: "Test"
              last_name: "User"
              email: "test{{ $randomInt }}@example.com"
              company: "Test Company"

  - name: "Bulk import"
    weight: 20
    flow:
      - post:
          url: "/api/sync/leads/bulk"
          json:
            source: "zoominfo"
            leads:
              - first_name: "Bulk"
                last_name: "Test1"
                email: "bulk1@example.com"
              - first_name: "Bulk"
                last_name: "Test2"
                email: "bulk2@example.com"

  - name: "Analytics query"
    weight: 10
    flow:
      - get:
          url: "/api/analytics/sync"
```

### Benchmarking Tools

#### Apache Bench
```bash
# Basic load test
ab -n 1000 -c 10 https://api.yourdomain.com/api/health

# With authentication
ab -n 1000 -c 10 -H "Authorization: Bearer $API_TOKEN" \
  https://api.yourdomain.com/api/leads
```

#### Custom Benchmark Script
```javascript
const autocannon = require('autocannon');

const instance = autocannon({
  url: 'https://api.yourdomain.com',
  connections: 100,
  duration: 30,
  requests: [
    {
      method: 'POST',
      path: '/api/sync/leads',
      headers: {
        'Authorization': `Bearer ${process.env.API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'apollo',
        data: {
          first_name: 'Bench',
          last_name: 'Mark',
          email: 'bench@example.com',
          company: 'Benchmark Corp'
        }
      })
    }
  ]
});

autocannon.track(instance, { renderProgressBar: true });
```

## Performance Checklist

### Database Performance
- [ ] Connection pooling configured
- [ ] Proper indexes created
- [ ] Query optimization completed
- [ ] Partitioning implemented for large tables
- [ ] Autovacuum enabled

### Application Performance
- [ ] Caching implemented
- [ ] Response compression enabled
- [ ] Request batching supported
- [ ] Pagination optimized
- [ ] Memory leaks addressed

### Infrastructure Performance
- [ ] Load balancing configured
- [ ] Auto-scaling enabled
- [ ] Monitoring alerts set up
- [ ] CDN implemented for static assets
- [ ] Database read replicas configured

### Testing and Validation
- [ ] Load testing completed
- [ ] Performance benchmarks established
- [ ] Monitoring dashboards created
- [ ] Alert thresholds configured
- [ ] Performance regression tests implemented

## Performance Maintenance

### Regular Tasks
- Weekly: Review slow query logs
- Monthly: Analyze system metrics trends
- Quarterly: Performance testing and optimization
- Annually: Infrastructure capacity planning

### Performance Alerts
```json
{
  "alerts": {
    "response_time": {
      "warning": 1000,
      "critical": 5000
    },
    "error_rate": {
      "warning": 0.01,
      "critical": 0.05
    },
    "cpu_usage": {
      "warning": 70,
      "critical": 90
    },
    "memory_usage": {
      "warning": 80,
      "critical": 95
    }
  }
}
```

### Capacity Planning

#### Growth Projections
```javascript
// Calculate required capacity based on growth
function calculateCapacity(currentUsers, growthRate, timePeriod) {
  const projectedUsers = currentUsers * Math.pow(1 + growthRate, timePeriod);
  const requiredServers = Math.ceil(projectedUsers / 1000); // 1000 users per server
  const requiredDBConnections = projectedUsers * 2; // 2 connections per user

  return {
    projectedUsers,
    requiredServers,
    requiredDBConnections
  };
}

console.log(calculateCapacity(5000, 0.15, 12)); // 15% monthly growth, 12 months
```

This comprehensive performance optimization guide provides the strategies and configurations needed to ensure your HaloPSA CRM Custom Integration performs efficiently at scale.