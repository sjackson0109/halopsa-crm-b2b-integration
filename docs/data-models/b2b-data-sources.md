# B2B Data Source Models

## Overview

This document provides detailed data models and API specifications for major B2B data sourcing tools, enabling effective integration planning and field mapping.

## 1. Apollo.io

### Company Data Model
```json
{
  "id": "string - Unique Apollo company ID",
  "name": "string - Company name",
  "website_url": "string - Company website",
  "linkedin_url": "string - LinkedIn company page",
  "twitter_url": "string - Twitter profile",
  "facebook_url": "string - Facebook page",
  "industry": "string - Industry classification",
  "keywords": ["string"] - Industry keywords,
  "estimated_num_employees": "integer - Employee count estimate",
  "retail_location_count": "integer - Number of locations",
  "stage": "string - Funding stage",
  "short_description": "string - Company description",
  "annual_revenue": "string - Revenue range",
  "phone": "string - Company phone",
  "street_address": "string - Street address",
  "city": "string - City",
  "state": "string - State/Province",
  "postal_code": "string - ZIP/Postal code",
  "country": "string - Country"
}
```

### Person Data Model
```json
{
  "id": "string - Unique Apollo person ID",
  "first_name": "string - First name",
  "last_name": "string - Last name",
  "name": "string - Full name",
  "email": "string - Email address",
  "title": "string - Job title",
  "linkedin_url": "string - LinkedIn profile",
  "twitter_url": "string - Twitter profile",
  "github_url": "string - GitHub profile",
  "facebook_url": "string - Facebook profile",
  "phone_numbers": [
    {
      "raw_number": "string",
      "sanitized_number": "string",
      "type": "string", // mobile, work, etc.
      "position": "integer"
    }
  ],
  "employment_history": [
    {
      "organization_name": "string",
      "title": "string",
      "start_date": "string",
      "end_date": "string"
    }
  ],
  "organization": "object - Company details"
}
```

### API Rate Limits
- **Free Plan**: 50 credits/month
- **Basic Plan**: 1,000 searches/month
- **Professional**: 5,000 searches/month
- Rate limit: 100 requests/minute

## 2. ZoomInfo

### Company Data Model
```json
{
  "companyId": "string - Unique ZoomInfo company ID",
  "companyName": "string - Company name",
  "website": "string - Company website",
  "description": "string - Company description",
  "industry": "string - Industry category",
  "subIndustry": "string - Sub-industry",
  "employees": "integer - Employee count",
  "revenue": "string - Revenue range",
  "foundedYear": "integer - Year founded",
  "phone": "string - Main phone number",
  "fax": "string - Fax number",
  "street": "string - Street address",
  "city": "string - City",
  "state": "string - State",
  "zipCode": "string - ZIP code",
  "country": "string - Country",
  "logoUrl": "string - Company logo URL",
  "linkedinUrl": "string - LinkedIn company page",
  "twitterUrl": "string - Twitter handle",
  "facebookUrl": "string - Facebook page"
}
```

### Contact Data Model
```json
{
  "personId": "string - Unique ZoomInfo person ID",
  "firstName": "string - First name",
  "lastName": "string - Last name",
  "middleName": "string - Middle name",
  "email": "string - Email address",
  "directPhone": "string - Direct phone number",
  "mobilePhone": "string - Mobile phone",
  "title": "string - Job title",
  "department": "string - Department",
  "managementLevel": "string - Management level",
  "linkedinUrl": "string - LinkedIn profile",
  "twitterUrl": "string - Twitter profile",
  "companyId": "string - Associated company ID",
  "lastUpdated": "string - Last update timestamp"
}
```

### API Rate Limits
- Enterprise pricing model
- Rate limits vary by contract
- Typical: 1,000-10,000 requests/hour

## 3. UpLead

### Company Data Model
```json
{
  "company_id": "string - Unique UpLead company ID",
  "company_name": "string - Company name",
  "website": "string - Website URL",
  "industry": "string - Industry",
  "employees": "string - Employee range",
  "revenue": "string - Revenue range",
  "address": "string - Full address",
  "city": "string - City",
  "state": "string - State",
  "postal_code": "string - ZIP code",
  "country": "string - Country",
  "phone": "string - Phone number",
  "founded_year": "integer - Founded year",
  "description": "string - Company description",
  "linkedin_url": "string - LinkedIn URL",
  "technologies": ["string"] - Tech stack
}
```

### Contact Data Model
```json
{
  "contact_id": "string - Unique contact ID",
  "first_name": "string - First name",
  "last_name": "string - Last name",
  "email": "string - Email address",
  "phone_number": "string - Phone number",
  "mobile_phone": "string - Mobile number",
  "job_title": "string - Job title",
  "seniority": "string - Seniority level",
  "department": "string - Department",
  "linkedin_url": "string - LinkedIn profile",
  "company_name": "string - Company name",
  "company_id": "string - Company ID"
}
```

### API Rate Limits
- **Free Plan**: 5 credits/month
- **Essentials**: 170 credits/month
- **Plus**: 400 credits/month
- Rate limit: 10 requests/minute

## 4. Hunter.io

### Email Data Model
```json
{
  "value": "string - Email address",
  "type": "string - Email type (personal, generic)",
  "confidence": "integer - Confidence score (0-100)",
  "sources": [
    {
      "domain": "string - Source domain",
      "uri": "string - Source URI",
      "extracted_on": "string - Discovery date",
      "last_seen_on": "string - Last seen date",
      "still_on_page": "boolean - Still available"
    }
  ],
  "first_name": "string - First name",
  "last_name": "string - Last name",
  "position": "string - Job position",
  "seniority": "string - Seniority level",
  "department": "string - Department",
  "linkedin": "string - LinkedIn URL",
  "twitter": "string - Twitter handle",
  "phone_number": "string - Phone number"
}
```

### Domain Data Model
```json
{
  "domain": "string - Domain name",
  "disposable": "boolean - Is disposable email",
  "webmail": "boolean - Is webmail provider",
  "pattern": "string - Email pattern",
  "organization": "string - Company name",
  "description": "string - Company description",
  "industry": "string - Industry",
  "twitter": "string - Twitter handle",
  "facebook": "string - Facebook URL",
  "linkedin": "string - LinkedIn URL",
  "instagram": "string - Instagram URL",
  "youtube": "string - YouTube URL"
}
```

### API Rate Limits
- **Free Plan**: 25 searches/month
- **Starter**: 1,000 searches/month
- **Growth**: 5,000 searches/month
- Rate limit: 10 requests/second

## 5. Lusha

### Contact Data Model
```json
{
  "id": "string - Unique Lusha ID",
  "firstName": "string - First name",
  "lastName": "string - Last name",
  "email": "string - Email address",
  "phoneNumbers": [
    {
      "number": "string - Phone number",
      "type": "string - Phone type",
      "countryCode": "string - Country code"
    }
  ],
  "position": "string - Job position",
  "company": {
    "name": "string - Company name",
    "website": "string - Website",
    "industry": "string - Industry",
    "size": "string - Company size",
    "linkedinUrl": "string - LinkedIn URL"
  },
  "linkedinUrl": "string - Personal LinkedIn",
  "twitterUrl": "string - Twitter URL",
  "location": {
    "country": "string - Country",
    "region": "string - State/Region",
    "city": "string - City"
  }
}
```

### API Rate Limits
- **Pro**: 480 credits/month
- **Premium**: 1,440 credits/month
- **Scale**: Custom limits
- Rate limit: 120 requests/minute

## 6. Seamless.ai

### Contact Data Model
```json
{
  "id": "string - Unique contact ID",
  "firstName": "string - First name",
  "lastName": "string - Last name",
  "email": "string - Email address",
  "phone": "string - Phone number",
  "title": "string - Job title",
  "companyName": "string - Company name",
  "companyWebsite": "string - Company website",
  "companyIndustry": "string - Industry",
  "companySize": "string - Employee count",
  "linkedinUrl": "string - LinkedIn profile",
  "location": {
    "city": "string - City",
    "state": "string - State",
    "country": "string - Country"
  }
}
```

### API Rate Limits
- **Basic**: 250 exports/month
- **Pro**: 1,000 exports/month
- **Enterprise**: Custom limits
- Rate limit: 50 requests/minute

## Data Quality Considerations

### Confidence Scoring
Different platforms use varying confidence metrics:

| Platform | Score Range | High Confidence Threshold |
|----------|-------------|---------------------------|
| Apollo.io | 1-100 | 80+ |
| Hunter.io | 0-100 | 70+ |
| UpLead | 90-99% | 95+ |
| Lusha | A-F grades | A, B grades |

### Common Data Issues
1. **Email Deliverability**: Some emails may be outdated
2. **Phone Number Format**: Inconsistent formatting across providers
3. **Job Title Variations**: Different naming conventions
4. **Company Name Mismatches**: Subsidiaries vs parent companies
5. **Geographic Data**: Address completeness varies

### Best Practices for Data Integration

1. **Multi-source Validation**: Cross-reference data from multiple providers
2. **Confidence Filtering**: Only import high-confidence records
3. **Periodic Re-enrichment**: Update data regularly to maintain accuracy
4. **Deduplication Logic**: Implement robust matching algorithms
5. **Data Retention Policies**: Comply with GDPR and other regulations

## 4. UpLead

### Company Data Model
```json
{
  "company_name": "string - Company name",
  "company_domain": "string - Company website domain",
  "company_phone": "string - Company phone number",
  "industry": "string - Industry classification",
  "company_size": "string - Employee range (1-10, 11-50, etc.)",
  "founded_year": "integer - Year company founded",
  "company_revenue": "string - Revenue estimate",
  "company_address": {
    "street": "string - Street address",
    "city": "string - City",
    "state": "string - State",
    "country": "string - Country",
    "postal_code": "string - ZIP/Postal code"
  },
  "social_profiles": {
    "linkedin": "string - LinkedIn company URL",
    "twitter": "string - Twitter handle",
    "facebook": "string - Facebook page"
  }
}
```

### Person Data Model
```json
{
  "first_name": "string - First name",
  "last_name": "string - Last name",
  "email": "string - Email address",
  "email_verification_status": "string - verified/unverified/invalid",
  "phone_number": "string - Phone number",
  "mobile_phone": "string - Mobile phone",
  "job_title": "string - Current position",
  "seniority_level": "string - Junior/Mid/Senior/Executive",
  "linkedin_url": "string - Personal LinkedIn profile",
  "company": "object - Company information",
  "verification_confidence": "integer - 0-100 confidence score"
}
```

### API Rate Limits
- **Starter Plan**: 170 credits/month
- **Professional**: 1,000 credits/month
- **Advanced**: 5,000 credits/month
- Rate limit: 10 requests/minute

## 5. Outreach.io

### Prospect Data Model
```json
{
  "id": "string - Unique prospect ID",
  "attributes": {
    "firstName": "string - First name",
    "lastName": "string - Last name",
    "emails": [
      {
        "email": "string - Email address",
        "emailType": "string - work/personal",
        "status": "string - verified/bounced/opted_out"
      }
    ],
    "title": "string - Job title",
    "company": "string - Company name",
    "phoneNumbers": [
      {
        "number": "string - Phone number",
        "type": "string - work/mobile/home"
      }
    ],
    "linkedInUrl": "string - LinkedIn profile",
    "personalNote1": "string - Custom notes",
    "tags": ["string"] - Tagged categories
  },
  "relationships": {
    "account": "object - Associated account",
    "owner": "object - Assigned owner"
  }
}
```

### Sequence Data Model
```json
{
  "id": "string - Sequence ID",
  "name": "string - Sequence name",
  "steps": [
    {
      "stepNumber": "integer - Step order",
      "type": "string - email/call/task",
      "interval": "integer - Days delay",
      "template": "string - Message template"
    }
  ],
  "enrollmentRules": {
    "criteria": "object - Auto-enrollment criteria",
    "schedule": "string - Enrollment timing"
  }
}
```

### API Rate Limits
- Rate limit: 10,000 requests/hour
- Burst limit: 100 requests/minute

## 6. LinkedIn Sales Navigator

### Profile Data Model
```json
{
  "profileId": "string - LinkedIn profile ID",
  "firstName": "string - First name",
  "lastName": "string - Last name",
  "publicProfileUrl": "string - Public LinkedIn URL",
  "emailAddress": "string - Email (limited access)",
  "currentPositions": [
    {
      "title": "string - Job title",
      "companyName": "string - Company name",
      "companyUrn": "string - Company identifier",
      "startDate": "string - Position start date",
      "companySize": "string - A-I size codes"
    }
  ],
  "pastPositions": "array - Previous positions",
  "industry": "string - Primary industry",
  "geoLocation": "string - Geographic location",
  "numConnections": "integer - Connection count",
  "distance": "string - Connection degree (1st, 2nd, 3rd)",
  "profileStrength": "string - Profile completeness",
  "recentActivity": "array - Recent LinkedIn activity"
}
```

### Company Search Model
```json
{
  "companyId": "string - LinkedIn company ID",
  "name": "string - Company name",
  "universalName": "string - LinkedIn handle",
  "website": "string - Company website",
  "industry": "string - Industry classification",
  "companySize": "string - Employee size range",
  "headquarters": {
    "city": "string - HQ city",
    "country": "string - HQ country"
  },
  "description": "string - Company description",
  "foundedYear": "integer - Year founded",
  "specialties": ["string"] - Company specialties
}
```

### API Rate Limits
- **Sales Navigator Professional**: 5,000 requests/day
- **Sales Navigator Team**: 10,000 requests/day
- Search requests: 1,000/month
- Rate limit: 200 requests/minute

## 7. Clearbit

### Person Enrichment Model
```json
{
  "id": "string - Clearbit person ID",
  "name": {
    "fullName": "string - Full name",
    "givenName": "string - First name",
    "familyName": "string - Last name"
  },
  "email": "string - Email address",
  "phone": "string - Phone number",
  "employment": {
    "domain": "string - Company domain",
    "name": "string - Company name",
    "title": "string - Job title",
    "role": "string - Job function",
    "seniority": "string - Seniority level"
  },
  "geo": {
    "city": "string - City",
    "state": "string - State",
    "country": "string - Country"
  },
  "linkedin": {
    "handle": "string - LinkedIn profile"
  },
  "confidence": "integer - Data confidence score"
}
```

### Company Enrichment Model
```json
{
  "id": "string - Clearbit company ID",
  "name": "string - Company name",
  "legalName": "string - Legal business name",
  "domain": "string - Primary domain",
  "description": "string - Company description",
  "category": {
    "sector": "string - Business sector",
    "industry": "string - Industry classification",
    "subIndustry": "string - Sub-industry"
  },
  "metrics": {
    "employees": "integer - Employee count",
    "employeesRange": "string - Employee range",
    "estimatedAnnualRevenue": "string - Revenue estimate",
    "raised": "string - Total funding raised"
  },
  "tech": ["string"] - Technology stack,
  "geo": {
    "city": "string - HQ city",
    "state": "string - HQ state",
    "country": "string - HQ country"
  }
}
```

### API Rate Limits
- **Free Plan**: 20 requests/month
- **Professional**: 5,000 requests/month
- Rate limit: 600 requests/hour

## 8. Clay.com

### Enrichment Workflow Model
```json
{
  "input": {
    "company_domain": "string - Target domain",
    "company_name": "string - Company name",
    "linkedin_company_url": "string - LinkedIn URL"
  },
  "enrichment_layers": [
    {
      "layer": "basic_company_data",
      "providers": ["Clearbit", "ZoomInfo"],
      "data_types": ["company_size", "industry", "location"]
    },
    {
      "layer": "technology_stack",
      "providers": ["Clearbit", "BuiltWith"],
      "data_types": ["technologies", "integrations"]
    }
  ],
  "waterfall_result": {
    "primary_data": "object - Best available data",
    "source_attribution": "object - Data source tracking",
    "confidence_scores": "object - Data quality metrics",
    "cost_breakdown": "object - Usage costs per source"
  }
}
```

### Multi-Source Data Model
```json
{
  "person_data": {
    "best_available": {
      "email": "string - Highest confidence email",
      "phone": "string - Best phone number",
      "linkedin": "string - Most complete profile"
    },
    "source_attribution": {
      "email_source": "string - Apollo/ZoomInfo/Clearbit",
      "phone_source": "string - Data provider",
      "confidence_score": "integer - 0-100"
    }
  },
  "enrichment_cost": {
    "total_credits": "integer - Credits consumed",
    "source_breakdown": "object - Cost per provider",
    "roi_score": "integer - Return on investment"
  }
}
```

### API Rate Limits
- Credits based on data source usage
- Rate limit: 1,000 requests/hour
- Concurrent enrichments: 50 max

## 9. Lusha

### Contact Data Model
```json
{
  "first_name": "string - First name",
  "last_name": "string - Last name",
  "job_title": "string - Current position",
  "email": "string - Email address",
  "direct_phone": "string - Direct dial number",
  "mobile_phone": "string - Mobile number",
  "office_phone": "string - Office number",
  "company_name": "string - Company name",
  "company_website": "string - Company domain",
  "company_phone": "string - Main company number",
  "linkedin_url": "string - LinkedIn profile",
  "confidence_score": "integer - Data confidence 0-100",
  "verification_status": {
    "email": "string - verified/unverified",
    "phone": "string - verified/unverified"
  }
}
```

### Company Data Model
```json
{
  "company_name": "string - Company name",
  "domain": "string - Website domain",
  "industry": "string - Industry classification",
  "company_size": "string - Employee range",
  "headquarters": {
    "city": "string - HQ city",
    "country": "string - HQ country"
  },
  "social_profiles": {
    "linkedin": "string - Company LinkedIn",
    "twitter": "string - Twitter handle"
  },
  "phone_numbers": [
    {
      "number": "string - Phone number",
      "type": "string - main/support/sales"
    }
  ]
}
```

### API Rate Limits
- **Free Plan**: 5 credits/month
- **Professional**: 480 credits/month
- **Premium**: 1,200 credits/month
- Rate limit: 120 requests/minute

## 10. Seamless.ai

### Real-Time Search Model
```json
{
  "search_results": [
    {
      "person_id": "string - Seamless person ID",
      "first_name": "string - First name",
      "last_name": "string - Last name",
      "email": "string - Email address",
      "phone": "string - Phone number",
      "job_title": "string - Current position",
      "company": {
        "name": "string - Company name",
        "domain": "string - Website",
        "size": "string - Employee count range",
        "industry": "string - Industry type"
      },
      "linkedin_url": "string - LinkedIn profile",
      "location": "string - Geographic location",
      "verification_confidence": "integer - 0-100 score",
      "last_updated": "string - Data freshness timestamp"
    }
  ],
  "search_metadata": {
    "total_results": "integer - Total matches",
    "page": "integer - Current page",
    "credits_used": "integer - Search cost"
  }
}
```

### Chrome Extension Integration
```json
{
  "browser_capture": {
    "source_url": "string - Webpage where data captured",
    "capture_method": "string - manual/auto",
    "data_fields": "object - Captured contact data",
    "validation_status": "string - real-time verification",
    "sync_to_crm": "boolean - Auto-sync enabled"
  },
  "real_time_scoring": {
    "lead_quality": "integer - 1-10 score",
    "buying_intent": "string - High/Medium/Low",
    "fit_score": "integer - ICP matching score"
  }
}
```

### API Rate Limits
- **Basic Plan**: 250 searches/month
- **Professional**: 1,000 searches/month
- **Enterprise**: 5,000 searches/month
- Rate limit: 60 requests/minute

## 11. ConnectWise Sell (MSP CRM)

### Company Data Model
```json
{
  "id": "integer - Company ID",
  "identifier": "string - Company identifier",
  "name": "string - Company name",
  "status": "object - Company status",
  "addressLine1": "string - Address",
  "city": "string - City",
  "state": "string - State",
  "zip": "string - ZIP code",
  "country": "object - Country info",
  "phoneNumber": "string - Phone",
  "website": "string - Website URL",
  "accountNumber": "string - Account number",
  "market": "object - Market classification",
  "territory": "object - Territory assignment",
  "types": ["object"] - Company types,
  "customFields": "object - Custom field values"
}
```

### Contact Data Model
```json
{
  "id": "integer - Contact ID",
  "firstName": "string - First name",
  "lastName": "string - Last name",
  "title": "string - Job title",
  "company": "object - Associated company",
  "communicationItems": [
    {
      "id": "integer - Communication ID",
      "type": "object - Email/Phone",
      "value": "string - Contact value",
      "defaultFlag": "boolean - Primary contact"
    }
  ],
  "defaultBillingFlag": "boolean - Billing contact",
  "defaultFlag": "boolean - Primary contact",
  "inactiveFlag": "boolean - Active status",
  "customFields": "object - Custom field values"
}
```

### Opportunity Data Model
```json
{
  "id": "integer - Opportunity ID",
  "name": "string - Opportunity name",
  "expectedCloseDate": "string - Expected close",
  "type": "object - Opportunity type",
  "stage": "object - Sales stage",
  "source": "string - Lead source",
  "probability": "object - Win probability",
  "rating": "string - Priority rating",
  "primarySalesRep": "object - Assigned rep",
  "locationId": "integer - Location ID",
  "businessUnitId": "integer - Business unit",
  "customFields": "object - MSP-specific fields"
}
```

### MSP Service Integration
```json
{
  "msp_services": {
    "monitoring_management": {
      "products": ["RMM", "Network Monitoring", "Patch Management"],
      "pricing_model": "per_device",
      "typical_margin": "60-80%"
    },
    "security_services": {
      "products": ["EDR", "Email Security", "Backup"],
      "pricing_model": "per_user_per_month",
      "typical_margin": "40-70%"
    },
    "cloud_services": {
      "products": ["Office 365", "Azure", "AWS Management"],
      "pricing_model": "percentage_markup",
      "typical_margin": "20-40%"
    }
  }
}
```

### API Rate Limits
- Rate limit: 1,000 requests/hour
- Concurrent requests: 10 maximum
- Authentication: API key or OAuth2

## Integration Best Practices

### 1. Data Quality Management
- **Email Verification**: Use multiple verification sources (UpLead, Hunter, Lusha)
- **Phone Verification**: Prioritize Lusha for phone number accuracy
- **Social Validation**: Cross-reference LinkedIn data with other sources

### 2. Cost Optimization
- **Clay Waterfall**: Use for cost-effective multi-source enrichment
- **Credit Management**: Monitor usage across all platforms
- **ROI Tracking**: Measure conversion rates by data source

### 3. Compliance Considerations
- **GDPR Compliance**: Implement consent tracking (LinkedIn, all EU prospects)
- **Data Retention**: Define retention policies per source
- **Opt-out Management**: Sync do-not-contact across all platforms

### 4. Deduplication Logic
- **Cross-Platform Matching**: Implement robust matching algorithms
- **Data Freshness**: Prioritize most recently updated records
- **Confidence Scoring**: Weight data by source reliability

### 5. Real-Time vs Batch Processing
- **Real-Time**: Seamless.ai, LinkedIn Sales Navigator for immediate needs
- **Batch Processing**: Clay.com, UpLead for large-scale enrichment
- **Hybrid Approach**: Combine both for optimal efficiency

## 10. Crayon

### Company Data Model
```json
{
  "id": "string - Unique Crayon company ID",
  "name": "string - Company name",
  "domain": "string - Company website domain",
  "industry": "string - Industry classification",
  "employeeCount": "integer - Number of employees",
  "revenueRange": "string - Annual revenue range",
  "location": {
    "country": "string - Country code",
    "city": "string - City",
    "state": "string - State/Province"
  },
  "technologies": ["string"] - Technology stack,
  "funding": {
    "stage": "string - Funding stage",
    "amount": "string - Funding amount"
  }
}
```

### Person Data Model
```json
{
  "id": "string - Unique Crayon person ID",
  "firstName": "string - First name",
  "lastName": "string - Last name",
  "email": "string - Email address",
  "phone": "string - Phone number",
  "jobTitle": "string - Current job title",
  "seniority": "string - Seniority level",
  "department": "string - Department"
}
```

### Intent Signals Data Model
```json
{
  "companyId": "string - Associated company ID",
  "signals": [
    {
      "type": "string - Signal type (website_visit, content_download, etc.)",
      "timestamp": "string - ISO 8601 timestamp",
      "source": "string - Signal source",
      "strength": "number - Signal strength (0-1)",
      "metadata": "object - Additional signal data"
    }
  ],
  "lastActivityDate": "string - ISO 8601 timestamp",
  "engagementScore": "number - Overall engagement score"
}
```

## 11. Klue

### Conversation Data Model
```json
{
  "id": "string - Unique conversation ID",
  "participants": [
    {
      "name": "string - Participant name",
      "email": "string - Participant email",
      "company": "string - Company name",
      "title": "string - Job title"
    }
  ],
  "topics": ["string"] - Conversation topics,
  "sentiment": "string - Overall sentiment (positive, negative, neutral)",
  "engagement_score": "number - Engagement level (0-100)",
  "duration": "integer - Conversation duration in seconds",
  "channel": "string - Communication channel (email, chat, call)",
  "buyerJourney": {
    "stage": "string - Current stage (awareness, consideration, decision)",
    "progress": "number - Progress percentage",
    "nextSteps": ["string"] - Recommended next steps
  }
}
```

### Intent Data Model
```json
{
  "conversationId": "string - Associated conversation ID",
  "signals": [
    {
      "type": "string - Intent type",
      "confidence": "number - Confidence score (0-1)",
      "keywords": ["string"] - Trigger keywords,
      "timestamp": "string - Detection timestamp"
    }
  ],
  "painPoints": ["string"] - Identified pain points,
  "timeline": "string - Urgency indicators",
  "budget": "string - Budget mentions"
}
```

## 12. MadKudu

### Lead Score Data Model
```json
{
  "person": {
    "email": "string - Email address",
    "first_name": "string - First name",
    "last_name": "string - Last name",
    "title": "string - Job title",
    "seniority": "string - Seniority level"
  },
  "company": {
    "name": "string - Company name",
    "domain": "string - Website domain",
    "industry": "string - Industry",
    "employee_count": "integer - Employee count"
  },
  "fit_score": "number - Company fit score (0-100)",
  "intent_score": "number - Intent score (0-100)",
  "qualification": {
    "status": "string - Qualification status",
    "reason": "string - Qualification reasoning",
    "confidence": "number - Confidence level"
  },
  "recommendation": {
    "action": "string - Recommended action",
    "priority": "string - Priority level",
    "timeline": "string - Suggested timeline"
  }
}
```

## 13. LeadIQ

### Contact Data Model
```json
{
  "id": "string - Unique LeadIQ contact ID",
  "firstName": "string - First name",
  "lastName": "string - Last name",
  "email": "string - Email address",
  "phone": "string - Phone number",
  "jobTitle": "string - Current job title",
  "seniorityLevel": "string - Seniority level",
  "yearsExperience": "integer - Years of experience",
  "linkedinUrl": "string - LinkedIn profile URL",
  "company": {
    "name": "string - Company name",
    "domain": "string - Website domain",
    "industry": "string - Industry",
    "employeeCount": "integer - Employee count",
    "revenue": "string - Revenue range"
  },
  "skills": ["string"] - Professional skills,
  "education": [
    {
      "school": "string - School name",
      "degree": "string - Degree",
      "field": "string - Field of study"
    }
  ],
  "lastUpdated": "string - ISO 8601 last update timestamp"
}
```

## 14. HG Data

### Contact Data Model
```json
{
  "id": "string - Unique HG Data contact ID",
  "firstName": "string - First name",
  "lastName": "string - Last name",
  "email": "string - Email address",
  "phone": "string - Phone number",
  "directPhone": "string - Direct phone number",
  "mobilePhone": "string - Mobile phone number",
  "jobTitle": "string - Job title",
  "seniority": "string - Seniority level",
  "department": "string - Department",
  "company": {
    "name": "string - Company name",
    "website": "string - Company website",
    "industry": "string - Industry",
    "employeeCount": "string - Employee count range",
    "turnover": "string - Revenue range"
  },
  "location": {
    "street": "string - Street address",
    "city": "string - City",
    "postalCode": "string - Postal code",
    "country": "string - Country"
  },
  "socialProfiles": {
    "linkedin": "string - LinkedIn URL",
    "twitter": "string - Twitter handle",
    "facebook": "string - Facebook URL"
  }
}
```

## 15. DiscoverOrg

### Company Data Model
```json
{
  "id": "string - Unique DiscoverOrg company ID",
  "name": "string - Company name",
  "domain": "string - Website domain",
  "industry": "string - Industry classification",
  "employeeCount": "integer - Employee count",
  "revenue": "string - Revenue range",
  "location": {
    "address": "string - Street address",
    "city": "string - City",
    "state": "string - State",
    "country": "string - Country",
    "postalCode": "string - Postal code"
  },
  "technographics": {
    "crm": ["string"] - CRM systems used,
    "marketing": ["string"] - Marketing tools,
    "sales": ["string"] - Sales platforms,
    "other": ["string"] - Other technologies
  },
  "funding": {
    "stage": "string - Funding stage",
    "amount": "string - Total funding",
    "lastRound": "string - Last funding round"
  }
}
```

### Intent Data Model
```json
{
  "companyId": "string - Associated company ID",
  "signals": [
    {
      "type": "string - Signal type",
      "timestamp": "string - ISO 8601 timestamp",
      "source": "string - Signal source",
      "strength": "number - Signal strength (0-1)",
      "content": "string - Content that triggered signal"
    }
  ],
  "accountScore": "number - Account-based score",
  "engagementLevel": "string - Engagement classification",
  "lastIntentDate": "string - Last intent activity date"
}
```

## 16. Bombora

### Company Surge Data Model
```json
{
  "companyId": "string - Unique Bombora company ID",
  "companyName": "string - Company name",
  "domain": "string - Website domain",
  "industry": "string - Industry",
  "employeeCount": "string - Employee count range",
  "surge": {
    "intensity": "number - Surge intensity (0-100)",
    "startDate": "string - Surge start date",
    "peakDate": "string - Surge peak date",
    "topics": ["string"] - Topics driving surge,
    "contentTypes": ["string"] - Content types consumed
  },
  "baseline": {
    "averageActivity": "number - Baseline activity level",
    "typicalTopics": ["string"] - Typical topics of interest
  }
}
```

### Topic Engagement Data Model
```json
{
  "topic": "string - Topic name",
  "companyId": "string - Associated company ID",
  "engagement": {
    "score": "number - Engagement score (0-100)",
    "trend": "string - Trend direction (increasing, decreasing, stable)",
    "velocity": "number - Rate of change",
    "duration": "integer - Days of sustained interest"
  },
  "content": {
    "types": ["string"] - Content types engaged with,
    "sources": ["string"] - Content sources,
    "frequency": "string - Engagement frequency"
  },
  "lastActivity": "string - ISO 8601 last activity timestamp"
}
```

## 17. EverString

### Predictive Score Data Model
```json
{
  "contact": {
    "email": "string - Email address",
    "firstName": "string - First name",
    "lastName": "string - Last name",
    "title": "string - Job title",
    "company": "string - Company name"
  },
  "predictiveScore": "number - Overall predictive score (0-100)",
  "confidence": "number - Model confidence (0-1)",
  "qualification": {
    "status": "string - Qualification status",
    "reason": "string - Qualification reasoning",
    "threshold": "number - Score threshold used"
  },
  "scoreFactors": [
    {
      "factor": "string - Scoring factor name",
      "weight": "number - Factor weight",
      "value": "number - Factor value",
      "contribution": "number - Score contribution"
    }
  ],
  "recommendation": {
    "action": "string - Recommended action",
    "priority": "string - Action priority",
    "timeline": "string - Suggested timeline"
  },
  "modelMetadata": {
    "version": "string - Model version",
    "lastTrained": "string - ISO 8601 training date",
    "dataPoints": "integer - Training data points used"
  }
}
```

## Next Steps

1. Review [Field Mapping Strategies](./field-mapping.md) for transformation patterns
2. See [Authentication](../authentication/) for API access setup  
3. Check [Error Handling](../error-handling/) for data quality management
4. Implement [Multi-Source Workflows](../workflows/) for optimal data sourcing