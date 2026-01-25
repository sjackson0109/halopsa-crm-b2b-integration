# Authentication Flows

## Overview

This document covers authentication patterns for integrating HaloPSA with B2B data sourcing tools, including OAuth 2.0 flows, API key management, and security best practices.

## HaloPSA Authentication

### REST API Authentication
HaloPSA supports OAuth 2.0 for secure API access.

#### OAuth 2.0 Flow
```javascript
// Step 1: Get authorization URL
const authUrl = `https://{tenant}.halopsa.com/auth/authorize?` +
  `response_type=code&` +
  `client_id={client_id}&` +
  `redirect_uri={redirect_uri}&` +
  `scope=all`;

// Step 2: Exchange code for token
const tokenResponse = await fetch(`https://{tenant}.halopsa.com/auth/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: '{client_id}',
    client_secret: '{client_secret}',
    code: '{authorization_code}',
    redirect_uri: '{redirect_uri}'
  })
});

const tokens = await tokenResponse.json();
// Returns: { access_token, refresh_token, token_type, expires_in }
```

#### Token Management
```javascript
class HaloPSAAuth {
  constructor(clientId, clientSecret, tenant) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.tenant = tenant;
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
  }

  async getValidToken() {
    if (this.isTokenExpired()) {
      await this.refreshAccessToken();
    }
    return this.accessToken;
  }

  isTokenExpired() {
    return !this.accessToken || Date.now() >= this.expiresAt;
  }

  async refreshAccessToken() {
    const response = await fetch(`https://${this.tenant}.halopsa.com/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken
      })
    });

    const tokens = await response.json();
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    this.expiresAt = Date.now() + (tokens.expires_in * 1000) - 30000; // 30s buffer
  }

  async makeAuthenticatedRequest(url, options = {}) {
    const token = await this.getValidToken();
    
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }
}
```

### Webhook Authentication
HaloPSA webhooks support signature verification for security.

```javascript
// Webhook signature verification
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

// Express.js webhook handler
app.post('/webhook/halopsa', express.raw({type: 'application/json'}), (req, res) => {
  const signature = req.headers['x-halopsa-signature'];
  const secret = process.env.HALOPSA_WEBHOOK_SECRET;
  
  if (!verifyWebhookSignature(req.body, signature, secret)) {
    return res.status(401).send('Unauthorized');
  }
  
  const payload = JSON.parse(req.body);
  // Process webhook payload
  
  res.status(200).send('OK');
});
```

## B2B Data Source Authentication

### 1. Apollo.io Authentication

Apollo uses API key authentication with rate limiting.

```javascript
class ApolloAuth {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.apollo.io/v1';
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Apollo API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async searchPeople(query) {
    return this.makeRequest('/mixed_people/search', {
      method: 'POST',
      body: JSON.stringify(query)
    });
  }
}
```

### 2. ZoomInfo Authentication

ZoomInfo uses JWT tokens for authentication.

```javascript
class ZoomInfoAuth {
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.baseUrl = 'https://api.zoominfo.com';
    this.accessToken = null;
    this.expiresAt = null;
  }

  async authenticate() {
    const response = await fetch(`${this.baseUrl}/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: this.username,
        password: this.password
      })
    });

    const data = await response.json();
    this.accessToken = data.jwt;
    
    // JWT typically expires in 1 hour
    this.expiresAt = Date.now() + (3600 * 1000) - 30000; // 30s buffer
  }

  async getValidToken() {
    if (!this.accessToken || Date.now() >= this.expiresAt) {
      await this.authenticate();
    }
    return this.accessToken;
  }

  async makeRequest(endpoint, options = {}) {
    const token = await this.getValidToken();
    
    return fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }
}
```

### 3. Hunter.io Authentication

Hunter uses API key authentication with quota tracking.

```javascript
class HunterAuth {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.hunter.io/v2';
    this.requestsUsed = 0;
    this.requestsLimit = null;
  }

  async makeRequest(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('api_key', this.apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url);
    const data = await response.json();

    // Track API usage
    this.requestsUsed = data.meta?.requests?.used || 0;
    this.requestsLimit = data.meta?.requests?.limit || null;

    if (!response.ok) {
      throw new Error(`Hunter API error: ${data.errors?.[0]?.details || response.statusText}`);
    }

    return data;
  }

  getUsageInfo() {
    return {
      used: this.requestsUsed,
      limit: this.requestsLimit,
      remaining: this.requestsLimit - this.requestsUsed
    };
  }
}
```

### 4. UpLead Authentication

UpLead uses API key authentication with credit tracking.

```javascript
class UpLeadAuth {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.uplead.com/v2';
    this.credits = null;
  }

  async makeRequest(endpoint, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    // Track credit usage
    this.credits = data.credits_remaining;

    if (!response.ok) {
      throw new Error(`UpLead API error: ${data.message || response.statusText}`);
    }

    return data;
  }

  getCreditsRemaining() {
    return this.credits;
  }
}
```

## Security Best Practices

### Environment Configuration
```javascript
// Use environment variables for sensitive data
const config = {
  halopsa: {
    tenant: process.env.HALOPSA_TENANT,
    clientId: process.env.HALOPSA_CLIENT_ID,
    clientSecret: process.env.HALOPSA_CLIENT_SECRET
  },
  apollo: {
    apiKey: process.env.APOLLO_API_KEY
  },
  zoominfo: {
    username: process.env.ZOOMINFO_USERNAME,
    password: process.env.ZOOMINFO_PASSWORD
  }
};
```

### Token Storage
```javascript
// Secure token storage using encryption
const crypto = require('crypto');

class TokenStorage {
  constructor(encryptionKey) {
    this.key = encryptionKey;
    this.algorithm = 'aes-256-gcm';
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData) {
    const decipher = crypto.createDecipher(
      this.algorithm, 
      this.key, 
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  storeToken(service, token) {
    const encrypted = this.encrypt(JSON.stringify(token));
    // Store encrypted token in database or secure storage
    return encrypted;
  }

  retrieveToken(service, encryptedData) {
    const decrypted = this.decrypt(encryptedData);
    return JSON.parse(decrypted);
  }
}
```

### Rate Limiting Protection
```javascript
class RateLimiter {
  constructor(requestsPerMinute = 60) {
    this.requests = [];
    this.limit = requestsPerMinute;
  }

  async checkLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old requests
    this.requests = this.requests.filter(time => time > oneMinuteAgo);
    
    if (this.requests.length >= this.limit) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = 60000 - (now - oldestRequest);
      
      throw new Error(`Rate limit exceeded. Wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }
    
    this.requests.push(now);
  }

  async makeRequest(requestFunc) {
    await this.checkLimit();
    return requestFunc();
  }
}
```

### Error Handling for Authentication
```javascript
class AuthenticatedApiClient {
  constructor(authProvider, rateLimiter) {
    this.auth = authProvider;
    this.rateLimiter = rateLimiter;
  }

  async makeRequest(url, options = {}, retries = 3) {
    try {
      await this.rateLimiter.checkLimit();
      
      const response = await this.auth.makeAuthenticatedRequest(url, options);
      
      if (response.status === 401) {
        // Token expired, refresh and retry
        await this.auth.refreshToken();
        return this.makeRequest(url, options, retries - 1);
      }
      
      if (response.status === 429) {
        // Rate limited, wait and retry
        const retryAfter = response.headers.get('Retry-After') || 60;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.makeRequest(url, options, retries - 1);
      }
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
      
    } catch (error) {
      if (retries > 0 && error.message.includes('network')) {
        // Network error, retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
        return this.makeRequest(url, options, retries - 1);
      }
      
      throw error;
    }
  }
}
```

## Next Steps

1. Review [Data Models](../data-models/) for API payload structures
2. See [Webhooks](../webhooks/) for real-time data synchronization
3. Check [Error Handling](../error-handling/) for robust error management