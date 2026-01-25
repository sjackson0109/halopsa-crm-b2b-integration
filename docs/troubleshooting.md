# Troubleshooting Guide

## Overview

This guide provides solutions to common issues encountered when deploying and operating the HaloPSA CRM Custom Integration.

## Quick Diagnostics

### Run System Diagnostics
```bash
npm run diagnose
```

This command will check:
- Configuration validity
- Service connectivity
- Database connections
- External API access
- Custom field setup

### Check Service Health
```bash
curl https://your-domain.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "services": {
    "halopsa": "connected",
    "apollo": "connected",
    "database": "connected"
  }
}
```

## Common Issues and Solutions

### 1. Connection Issues

#### HaloPSA Connection Failed
**Symptoms:**
- "Connection refused" errors
- Authentication failures
- Timeout errors

**Solutions:**
1. Verify HaloPSA instance URL:
   ```bash
   curl -I https://your-instance.halopsa.com
   ```

2. Check credentials:
   ```bash
   npm run test:halopsa-auth
   ```

3. Verify API permissions in HaloPSA admin panel

4. Check firewall settings for outbound connections to HaloPSA

#### B2B Provider Connection Issues
**Symptoms:**
- API rate limit exceeded
- Invalid API key errors
- Service unavailable responses

**Solutions:**
1. Verify API credentials in provider dashboard
2. Check rate limiting:
   ```bash
   npm run check:rate-limits
   ```
3. Review provider status pages for outages
4. Adjust rate limiting configuration if needed

### 2. Data Synchronization Issues

#### Leads Not Appearing in HaloPSA
**Symptoms:**
- Sync operations complete but no data in HaloPSA
- "Validation failed" errors

**Solutions:**
1. Check custom field setup:
   ```bash
   npm run validate:custom-fields
   ```

2. Verify data mapping configuration

3. Check for duplicate prevention rules

4. Review sync logs:
   ```bash
   tail -f logs/sync.log | grep ERROR
   ```

#### Duplicate Lead Creation
**Symptoms:**
- Multiple entries for same contact
- Deduplication not working

**Solutions:**
1. Review deduplication configuration
2. Check matching rules in config
3. Verify email normalization
4. Update conflict resolution strategy

### 3. Webhook Issues

#### Webhook Signatures Invalid
**Symptoms:**
- Webhook events rejected
- Signature verification failures

**Solutions:**
1. Verify webhook secrets match between provider and config
2. Check timestamp synchronization
3. Ensure proper HMAC-SHA256 implementation
4. Test webhook endpoint manually:
   ```bash
   curl -X POST https://your-domain.com/webhooks/test \
     -H "Content-Type: application/json" \
     -H "X-Webhook-Signature: test_signature" \
     -d '{"test": "data"}'
   ```

#### Webhook Events Not Processing
**Symptoms:**
- Webhooks received but not processed
- Queue backlog growing

**Solutions:**
1. Check queue status:
   ```bash
   npm run queue:status
   ```

2. Verify webhook event handlers are registered

3. Check for processing errors in logs

4. Monitor queue performance metrics

### 4. Performance Issues

#### Slow Response Times
**Symptoms:**
- API response times > 5 seconds
- High CPU/memory usage

**Solutions:**
1. Enable caching:
   ```json
   {
     "caching": {
       "enabled": true,
       "ttl": 3600
     }
   }
   ```

2. Optimize database queries

3. Implement connection pooling

4. Add request batching for bulk operations

#### Memory Leaks
**Symptoms:**
- Gradual memory increase over time
- Out of memory errors

**Solutions:**
1. Monitor memory usage:
   ```bash
   npm run monitor:memory
   ```

2. Check for unclosed database connections

3. Implement proper error handling

4. Add garbage collection monitoring

### 5. Configuration Issues

#### Invalid Configuration
**Symptoms:**
- Service fails to start
- Configuration validation errors

**Solutions:**
1. Validate configuration:
   ```bash
   npm run validate:config
   ```

2. Check for syntax errors in JSON files

3. Verify environment variables are set

4. Compare with example configurations

#### Environment Variable Issues
**Symptoms:**
- Service starts but features don't work
- "Undefined variable" errors

**Solutions:**
1. List all environment variables:
   ```bash
   env | grep HALOPSA
   ```

2. Check .env file syntax

3. Verify variable loading order

4. Use configuration debugging:
   ```bash
   DEBUG=config:* npm start
   ```

### 6. Database Issues

#### Connection Pool Exhausted
**Symptoms:**
- "Pool exhausted" errors
- Database connection timeouts

**Solutions:**
1. Increase pool size in configuration

2. Implement connection retry logic

3. Check for connection leaks

4. Monitor database performance

#### Migration Failures
**Symptoms:**
- Database schema errors
- Migration script failures

**Solutions:**
1. Check database permissions

2. Verify migration order

3. Backup before migrations

4. Rollback failed migrations:
   ```bash
   npm run migrate:rollback
   ```

### 7. Security Issues

#### Authentication Failures
**Symptoms:**
- 401 Unauthorized errors
- Token expiration issues

**Solutions:**
1. Verify token format and validity

2. Check token refresh logic

3. Update authentication configuration

4. Implement proper token storage

#### Data Exposure
**Symptoms:**
- Sensitive data in logs
- Unencrypted data transmission

**Solutions:**
1. Enable data encryption

2. Configure secure logging

3. Use HTTPS for all communications

4. Implement data masking

## Advanced Troubleshooting

### Log Analysis

#### Enable Debug Logging
```bash
export LOG_LEVEL=debug
npm start
```

#### Search Logs for Patterns
```bash
# Find all errors in last hour
grep "ERROR" logs/app.log | grep "$(date -d '1 hour ago' '+%Y-%m-%d %H')"

# Find specific error patterns
grep "rate.limit.exceeded" logs/app.log

# Count errors by type
grep "ERROR" logs/app.log | sed 's/.*ERROR //' | sort | uniq -c | sort -nr
```

### Performance Profiling

#### CPU Profiling
```bash
npm run profile:cpu
```

#### Memory Profiling
```bash
npm run profile:memory
```

#### Database Query Analysis
```bash
npm run analyze:queries
```

### Network Diagnostics

#### Test External Connectivity
```bash
# Test HaloPSA connectivity
curl -v https://your-instance.halopsa.com/api/v1/me

# Test provider APIs
curl -H "Authorization: Bearer $APOLLO_API_KEY" https://api.apollo.io/v1/auth/health
```

#### Check DNS Resolution
```bash
nslookup your-instance.halopsa.com
dig api.apollo.io
```

#### Network Latency Testing
```bash
ping your-instance.halopsa.com
traceroute your-instance.halopsa.com
```

### Database Diagnostics

#### Check Connection Health
```bash
npm run db:health
```

#### Analyze Slow Queries
```sql
-- Enable query logging
SET log_statement = 'all';
SET log_duration = 'on';

-- Find slow queries
SELECT * FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '1 second';
```

#### Check Table Statistics
```sql
ANALYZE VERBOSE;
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del
FROM pg_stat_user_tables;
```

## Monitoring and Alerting

### Set Up Monitoring
```json
{
  "monitoring": {
    "alerts": {
      "error_rate_threshold": 0.05,
      "response_time_threshold": 5000,
      "queue_backlog_threshold": 100
    }
  }
}
```

### Key Metrics to Monitor
- Error rates by endpoint
- Response time percentiles
- Queue depth and processing rates
- Database connection pool usage
- External API rate limit usage
- Memory and CPU usage

### Alert Conditions
- Error rate > 5% for 5 minutes
- Response time > 5 seconds for 1 minute
- Queue backlog > 1000 items
- Database connections > 90% of pool
- Memory usage > 85%

## Emergency Procedures

### Service Unavailable
1. Check service status:
   ```bash
   systemctl status halopsa-integration
   ```

2. Restart service:
   ```bash
   systemctl restart halopsa-integration
   ```

3. Check logs for startup errors

4. Verify dependencies are running

### Data Corruption
1. Stop all sync operations

2. Create database backup

3. Run data integrity checks:
   ```bash
   npm run check:data-integrity
   ```

4. Restore from backup if needed

5. Resume operations with reduced concurrency

### Security Incident
1. Rotate all API keys and secrets

2. Review access logs for suspicious activity

3. Update security configurations

4. Notify affected parties

5. Conduct post-incident review

## Support Resources

### Internal Resources
- [API Reference](api-reference.md)
- [Configuration Guide](configuration-guide.md)
- [Error Code Reference](error-codes.md)

### External Resources
- HaloPSA API Documentation
- B2B Provider API Documentation
- Node.js Troubleshooting Guide
- PostgreSQL Performance Tuning

### Getting Help
1. Check existing issues in the repository
2. Review documentation for your specific issue
3. Create a detailed bug report with:
   - Error messages and stack traces
   - Configuration (redacted)
   - Steps to reproduce
   - Environment details
   - Log excerpts

## Prevention Best Practices

### Regular Maintenance
- Weekly configuration backups
- Monthly dependency updates
- Quarterly security audits
- Daily log rotation

### Monitoring Setup
- Implement comprehensive alerting
- Set up automated health checks
- Monitor key performance indicators
- Regular capacity planning

### Documentation Updates
- Keep runbooks current
- Document all configuration changes
- Maintain incident response procedures
- Update troubleshooting guides based on new issues