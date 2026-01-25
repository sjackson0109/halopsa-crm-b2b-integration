# Error Handling & Deduplication Strategies

## Overview

This document provides comprehensive error handling patterns and deduplication strategies for HaloPSA B2B data integration, ensuring robust and reliable data synchronization across all integration methods.

## Error Handling Patterns

### 1. API Error Handling

#### HaloPSA API Errors
```javascript
class HaloPSAErrorHandler {
  constructor() {
    this.errorCodes = {
      400: 'Bad Request - Invalid data format',
      401: 'Unauthorized - Token expired or invalid',
      403: 'Forbidden - Insufficient permissions',
      404: 'Not Found - Entity does not exist',
      409: 'Conflict - Duplicate record',
      429: 'Rate Limited - Too many requests',
      500: 'Internal Server Error - HaloPSA issue'
    };
  }

  async handleAPIError(error, operation, retries = 3) {
    const { status, data, config } = error.response || {};
    
    console.error('HaloPSA API Error:', {
      status,
      operation,
      url: config?.url,
      data: data,
      timestamp: new Date().toISOString()
    });

    switch (status) {
      case 401:
        // Token expired - refresh and retry
        await this.refreshToken();
        if (retries > 0) {
          return this.retryOperation(operation, retries - 1);
        }
        break;
        
      case 429:
        // Rate limited - exponential backoff
        const retryAfter = error.response.headers['retry-after'] || 60;
        await this.delay(retryAfter * 1000);
        if (retries > 0) {
          return this.retryOperation(operation, retries - 1);
        }
        break;
        
      case 409:
        // Duplicate - attempt update instead
        return this.handleDuplicateRecord(data, operation);
        
      case 500:
      case 502:
      case 503:
        // Server errors - retry with backoff
        if (retries > 0) {
          await this.delay(Math.pow(2, 4 - retries) * 1000);
          return this.retryOperation(operation, retries - 1);
        }
        break;
        
      default:
        // Log and bubble up
        throw new Error(`HaloPSA API Error ${status}: ${this.errorCodes[status] || 'Unknown error'}`);
    }
  }

  async handleDuplicateRecord(errorData, operation) {
    // Extract duplicate record info from error response
    const duplicateId = errorData.duplicate_id || errorData.existing_id;
    
    if (duplicateId && operation.type === 'create') {
      // Convert create to update operation
      operation.type = 'update';
      operation.id = duplicateId;
      return this.executeOperation(operation);
    }
    
    throw new Error('Duplicate record could not be resolved');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### B2B Data Source Error Handling
```javascript
class B2BSourceErrorHandler {
  constructor() {
    this.sourceHandlers = {
      'apollo': this.handleApolloError.bind(this),
      'zoominfo': this.handleZoomInfoError.bind(this),
      'hunter': this.handleHunterError.bind(this),
      'uplead': this.handleUpLeadError.bind(this)
    };
  }

  async handleSourceError(source, error, operation) {
    const handler = this.sourceHandlers[source];
    if (handler) {
      return handler(error, operation);
    }
    
    // Generic error handling
    return this.handleGenericError(error, operation, source);
  }

  async handleApolloError(error, operation) {
    const { status, data } = error.response || {};
    
    switch (status) {
      case 429:
        // Apollo rate limit - check credits
        const resetTime = data?.reset_time || 3600;
        await this.scheduleRetry(operation, resetTime * 1000);
        break;
        
      case 402:
        // Payment required - credits exhausted
        await this.notifyCreditsExhausted('apollo');
        throw new Error('Apollo credits exhausted');
        
      case 422:
        // Invalid query - skip and log
        this.logSkippedRecord(operation, 'Invalid Apollo query');
        return null;
        
      default:
        throw error;
    }
  }

  async handleZoomInfoError(error, operation) {
    const { status, data } = error.response || {};
    
    switch (status) {
      case 401:
        // JWT expired - re-authenticate
        await this.reAuthenticateZoomInfo();
        return this.retryOperation(operation);
        
      case 429:
        // Rate limited
        await this.delay(60000); // Wait 1 minute
        return this.retryOperation(operation);
        
      default:
        throw error;
    }
  }
}
```

### 2. Data Validation Errors

#### Field Validation
```javascript
class DataValidator {
  constructor() {
    this.validationRules = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^[\+]?[\d\s\-\(\)]{10,}$/,
      website: /^https?:\/\/.+\..+/
    };
  }

  validateContact(contact) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!contact.firstname && !contact.surname) {
      errors.push('Either firstname or surname is required');
    }

    if (!contact.emailaddress) {
      errors.push('Email address is required');
    }

    // Format validation
    if (contact.emailaddress && !this.validationRules.email.test(contact.emailaddress)) {
      errors.push('Invalid email format');
    }

    if (contact.phonenumber && !this.validationRules.phone.test(contact.phonenumber)) {
      warnings.push('Phone number format may be invalid');
    }

    // Data quality checks
    if (!contact.jobtitle) {
      warnings.push('Missing job title - consider enrichment');
    }

    if (!contact.organisation_id && !contact.organisation_name) {
      warnings.push('No organization association');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      quality_score: this.calculateQualityScore(contact, warnings)
    };
  }

  calculateQualityScore(contact, warnings) {
    let score = 100;
    
    // Deduct points for missing data
    if (!contact.emailaddress) score -= 30;
    if (!contact.phonenumber) score -= 20;
    if (!contact.jobtitle) score -= 15;
    if (!contact.linkedin_url) score -= 10;
    
    // Deduct for warnings
    score -= warnings.length * 5;
    
    return Math.max(0, score);
  }

  async processValidationResult(contact, validation, source) {
    if (!validation.isValid) {
      // Log invalid record
      await this.logInvalidRecord(contact, validation.errors, source);
      return null; // Skip record
    }

    if (validation.warnings.length > 0) {
      // Add warnings to contact notes
      contact.notes = `${contact.notes || ''}\nData Quality Warnings: ${validation.warnings.join(', ')}`;
    }

    // Add quality score as custom field
    contact.customfields = contact.customfields || [];
    contact.customfields.push({
      id: 105, // Data quality score field
      value: validation.quality_score.toString()
    });

    return contact;
  }
}
```

### 3. Network Error Handling

#### Connection and Timeout Errors
```javascript
class NetworkErrorHandler {
  constructor() {
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second
  }

  async executeWithRetry(operation, operationName) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (this.isRetryableError(error) && attempt < this.maxRetries) {
          const delay = this.calculateBackoffDelay(attempt);
          console.warn(`${operationName} failed (attempt ${attempt + 1}), retrying in ${delay}ms:`, error.message);
          await this.delay(delay);
          continue;
        }
        
        // Not retryable or max retries reached
        break;
      }
    }
    
    throw new Error(`${operationName} failed after ${this.maxRetries + 1} attempts: ${lastError.message}`);
  }

  isRetryableError(error) {
    const retryableErrors = [
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EAI_AGAIN'
    ];
    
    return retryableErrors.includes(error.code) ||
           error.message.includes('timeout') ||
           error.message.includes('network') ||
           (error.response && [502, 503, 504].includes(error.response.status));
  }

  calculateBackoffDelay(attempt) {
    // Exponential backoff with jitter
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000; // Add randomness to prevent thundering herd
    return exponentialDelay + jitter;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Deduplication Strategies

### 1. Contact Deduplication

#### Fuzzy Matching Algorithm
```javascript
const levenshtein = require('fast-levenshtein');

class ContactDeduplicator {
  constructor() {
    this.thresholds = {
      email: 0.95,      // Exact match required
      name: 0.85,       // Allow slight variations
      phone: 0.90,      // Allow formatting differences
      company: 0.80     // Allow abbreviations
    };
  }

  async findDuplicateContacts(newContact, existingContacts) {
    const duplicates = [];
    
    for (const existing of existingContacts) {
      const similarity = this.calculateSimilarity(newContact, existing);
      
      if (similarity.score >= 0.8) { // 80% overall similarity threshold
        duplicates.push({
          contact: existing,
          similarity,
          confidence: similarity.score
        });
      }
    }
    
    // Sort by confidence descending
    return duplicates.sort((a, b) => b.confidence - a.confidence);
  }

  calculateSimilarity(contact1, contact2) {
    const scores = {
      email: this.compareEmails(contact1.emailaddress, contact2.emailaddress),
      name: this.compareNames(contact1, contact2),
      phone: this.comparePhones(contact1.phonenumber, contact2.phonenumber),
      company: this.compareCompanies(contact1.organisation_name, contact2.organisation_name)
    };

    // Weighted average (email is most important)
    const weights = { email: 0.4, name: 0.3, phone: 0.2, company: 0.1 };
    const weightedScore = Object.entries(scores).reduce((sum, [key, score]) => {
      return sum + (score * weights[key]);
    }, 0);

    return {
      score: weightedScore,
      breakdown: scores
    };
  }

  compareEmails(email1, email2) {
    if (!email1 || !email2) return 0;
    
    // Normalize emails (lowercase, remove dots from Gmail)
    const normalize = (email) => {
      email = email.toLowerCase().trim();
      if (email.includes('@gmail.com')) {
        const [local, domain] = email.split('@');
        return local.replace(/\./g, '') + '@' + domain;
      }
      return email;
    };
    
    return normalize(email1) === normalize(email2) ? 1 : 0;
  }

  compareNames(contact1, contact2) {
    const name1 = `${contact1.firstname || ''} ${contact1.surname || ''}`.trim().toLowerCase();
    const name2 = `${contact2.firstname || ''} ${contact2.surname || ''}`.trim().toLowerCase();
    
    if (!name1 || !name2) return 0;
    
    // Calculate Levenshtein distance
    const distance = levenshtein.get(name1, name2);
    const maxLength = Math.max(name1.length, name2.length);
    
    return 1 - (distance / maxLength);
  }

  comparePhones(phone1, phone2) {
    if (!phone1 || !phone2) return 0;
    
    // Normalize phone numbers (remove all non-digits)
    const normalize = (phone) => phone.replace(/\D/g, '');
    
    const normalized1 = normalize(phone1);
    const normalized2 = normalize(phone2);
    
    // Check if one is subset of the other (country codes)
    if (normalized1.length !== normalized2.length) {
      const shorter = normalized1.length < normalized2.length ? normalized1 : normalized2;
      const longer = normalized1.length < normalized2.length ? normalized2 : normalized1;
      
      return longer.endsWith(shorter) ? 0.9 : 0;
    }
    
    return normalized1 === normalized2 ? 1 : 0;
  }

  async handleDuplicateContact(newContact, duplicates) {
    if (duplicates.length === 0) {
      return { action: 'create', contact: newContact };
    }

    const bestMatch = duplicates[0];
    
    if (bestMatch.confidence > 0.95) {
      // High confidence duplicate - merge data
      const mergedContact = this.mergeContactData(bestMatch.contact, newContact);
      return {
        action: 'update',
        contact: mergedContact,
        id: bestMatch.contact.id
      };
    } else if (bestMatch.confidence > 0.8) {
      // Possible duplicate - flag for manual review
      newContact.notes = `${newContact.notes || ''}\nPossible duplicate of contact ID ${bestMatch.contact.id} (${Math.round(bestMatch.confidence * 100)}% confidence)`;
      return { action: 'create_flagged', contact: newContact };
    }
    
    // Not a duplicate
    return { action: 'create', contact: newContact };
  }

  mergeContactData(existing, incoming) {
    const merged = { ...existing };
    
    // Update fields if incoming has better/newer data
    Object.entries(incoming).forEach(([key, value]) => {
      if (value && (!existing[key] || this.isNewerData(existing[key], value))) {
        merged[key] = value;
      }
    });

    // Merge custom fields
    if (incoming.customfields) {
      merged.customfields = this.mergeCustomFields(existing.customfields, incoming.customfields);
    }

    // Add merge history
    merged.notes = `${existing.notes || ''}\nData merged from ${incoming.source || 'external source'} on ${new Date().toISOString()}`;

    return merged;
  }
}
```

### 2. Organization Deduplication

```javascript
class OrganizationDeduplicator {
  constructor() {
    this.domainExtractor = /https?:\/\/(?:www\.)?([^\/]+)/;
  }

  async findDuplicateOrganizations(newOrg, existingOrgs) {
    const duplicates = [];
    
    for (const existing of existingOrgs) {
      const similarity = this.calculateOrgSimilarity(newOrg, existing);
      
      if (similarity.score >= 0.75) {
        duplicates.push({
          organization: existing,
          similarity,
          confidence: similarity.score
        });
      }
    }
    
    return duplicates.sort((a, b) => b.confidence - a.confidence);
  }

  calculateOrgSimilarity(org1, org2) {
    const scores = {
      domain: this.compareDomains(org1.website, org2.website),
      name: this.compareOrgNames(org1.name, org2.name),
      address: this.compareAddresses(org1, org2),
      phone: this.comparePhones(org1.phonenumber, org2.phonenumber)
    };

    // Weighted average (domain is most reliable)
    const weights = { domain: 0.5, name: 0.3, address: 0.15, phone: 0.05 };
    const weightedScore = Object.entries(scores).reduce((sum, [key, score]) => {
      return sum + (score * weights[key]);
    }, 0);

    return {
      score: weightedScore,
      breakdown: scores
    };
  }

  compareDomains(website1, website2) {
    if (!website1 || !website2) return 0;
    
    const extractDomain = (url) => {
      const match = url.match(this.domainExtractor);
      return match ? match[1].toLowerCase() : url.toLowerCase();
    };
    
    const domain1 = extractDomain(website1);
    const domain2 = extractDomain(website2);
    
    return domain1 === domain2 ? 1 : 0;
  }

  compareOrgNames(name1, name2) {
    if (!name1 || !name2) return 0;
    
    // Normalize organization names
    const normalize = (name) => {
      return name.toLowerCase()
        .replace(/\b(inc|corp|corporation|llc|ltd|limited|co)\b/g, '')
        .replace(/[^\w\s]/g, '')
        .trim();
    };
    
    const norm1 = normalize(name1);
    const norm2 = normalize(name2);
    
    if (norm1 === norm2) return 1;
    
    // Check if one name contains the other
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      return 0.8;
    }
    
    // Fuzzy match
    const distance = levenshtein.get(norm1, norm2);
    const maxLength = Math.max(norm1.length, norm2.length);
    
    return Math.max(0, 1 - (distance / maxLength));
  }

  compareAddresses(org1, org2) {
    const address1 = `${org1.address || ''} ${org1.city || ''} ${org1.county || ''} ${org1.postcode || ''}`.trim();
    const address2 = `${org2.address || ''} ${org2.city || ''} ${org2.county || ''} ${org2.postcode || ''}`.trim();
    
    if (!address1 || !address2) return 0;
    
    // Exact postcode match is strong indicator
    if (org1.postcode && org2.postcode && org1.postcode === org2.postcode) {
      return 0.9;
    }
    
    // City and state match
    if (org1.city && org2.city && org1.county && org2.county) {
      if (org1.city.toLowerCase() === org2.city.toLowerCase() && 
          org1.county.toLowerCase() === org2.county.toLowerCase()) {
        return 0.7;
      }
    }
    
    return 0;
  }
}
```

### 3. Batch Deduplication Process

```javascript
class BatchDeduplicator {
  constructor() {
    this.batchSize = 100;
    this.contactDeduplicator = new ContactDeduplicator();
    this.orgDeduplicator = new OrganizationDeduplicator();
  }

  async deduplicateContactBatch(contacts) {
    const results = {
      created: [],
      updated: [],
      duplicates: [],
      errors: []
    };

    // Sort by data quality score (process highest quality first)
    contacts.sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0));

    for (let i = 0; i < contacts.length; i += this.batchSize) {
      const batch = contacts.slice(i, i + this.batchSize);
      
      for (const contact of batch) {
        try {
          // Find existing contacts with similar email domain or company
          const existingContacts = await this.findSimilarContacts(contact);
          const duplicates = await this.contactDeduplicator.findDuplicateContacts(contact, existingContacts);
          
          const result = await this.contactDeduplicator.handleDuplicateContact(contact, duplicates);
          
          switch (result.action) {
            case 'create':
              results.created.push(result.contact);
              break;
            case 'update':
              results.updated.push(result);
              break;
            case 'create_flagged':
              results.duplicates.push(result.contact);
              break;
          }
          
        } catch (error) {
          results.errors.push({
            contact: contact,
            error: error.message
          });
        }
      }
    }

    return results;
  }

  async findSimilarContacts(contact) {
    const searchCriteria = [];
    
    if (contact.emailaddress) {
      const domain = contact.emailaddress.split('@')[1];
      searchCriteria.push(`emailaddress.endswith("@${domain}")`);
    }
    
    if (contact.organisation_name) {
      searchCriteria.push(`organisation_name.contains("${contact.organisation_name}")`);
    }
    
    // Search HaloPSA for similar contacts
    return await this.searchHaloPSAContacts(searchCriteria);
  }
}
```

## Error Recovery and Monitoring

### Dead Letter Queue Implementation
```javascript
class DeadLetterQueue {
  constructor() {
    this.failedRecords = [];
    this.maxRetries = 3;
  }

  async processFailedRecord(record, error, source) {
    const failedItem = {
      id: crypto.randomUUID(),
      record,
      error: error.message,
      source,
      failed_at: new Date().toISOString(),
      retry_count: 0,
      next_retry: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
    };

    this.failedRecords.push(failedItem);
    await this.persistFailedRecord(failedItem);
  }

  async retryFailedRecords() {
    const now = new Date().toISOString();
    const recordsToRetry = this.failedRecords.filter(item => 
      item.next_retry <= now && item.retry_count < this.maxRetries
    );

    for (const item of recordsToRetry) {
      try {
        await this.processRecord(item.record, item.source);
        await this.removeFailedRecord(item.id);
      } catch (error) {
        item.retry_count++;
        item.next_retry = new Date(Date.now() + Math.pow(2, item.retry_count) * 60 * 1000).toISOString();
        await this.updateFailedRecord(item);
      }
    }
  }
}
```

### Integration Health Monitoring
```javascript
class IntegrationHealthMonitor {
  constructor() {
    this.metrics = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      duplicates: 0,
      lastProcessed: null
    };
  }

  recordSuccess(recordType) {
    this.metrics.totalProcessed++;
    this.metrics.successful++;
    this.metrics.lastProcessed = new Date();
    this.updateHealthStatus();
  }

  recordFailure(recordType, error) {
    this.metrics.totalProcessed++;
    this.metrics.failed++;
    this.updateHealthStatus();
  }

  recordDuplicate(recordType) {
    this.metrics.duplicates++;
    this.updateHealthStatus();
  }

  updateHealthStatus() {
    const failureRate = this.metrics.failed / this.metrics.totalProcessed;
    const duplicateRate = this.metrics.duplicates / this.metrics.totalProcessed;
    
    const status = {
      healthy: failureRate < 0.05 && duplicateRate < 0.3,
      metrics: this.metrics,
      rates: {
        success: (this.metrics.successful / this.metrics.totalProcessed).toFixed(3),
        failure: failureRate.toFixed(3),
        duplicate: duplicateRate.toFixed(3)
      }
    };

    if (!status.healthy) {
      this.sendHealthAlert(status);
    }

    return status;
  }
}
```

## Next Steps

1. Review [Authentication](../authentication/) for secure error handling
2. See [Middleware](../middleware/) for implementation patterns
3. Check [Examples](../../examples/) for complete implementations
4. Consider monitoring and alerting strategies for production deployments