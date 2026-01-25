# HaloPSA Data Models - Enhanced B2B Integration

## Overview

This document defines the enhanced data models for HaloPSA entities involved in B2B data sourcing integrations, including the custom Lead → Prospect → Opportunity workflow with comprehensive field mappings and bi-directional synchronization patterns.

## Custom CRM Workflow Entities

### Entity Progression
```
Lead (CF_101-113) → Prospect (CF_201-206) → Opportunity (CF_301-304)
```

### 1. Lead Entity (Ticket Type: Lead)

Leads represent initial contacts from B2B data sources requiring research and qualification.

#### Core Ticket Fields
```json
{
  "tickettype_id": 1,
  "summary": "string - '{firstName} {lastName} - {companyName}'",
  "details": "string - Lead details and import source",
  "status_id": "integer - Lead workflow status (1-7)",
  "priority_id": "integer - Lead priority (1-5)",
  "category_1": "string - 'Lead'",
  "category_2": "string - Source platform name",
  "user_id": "integer - Contact user ID",
  "client_id": "integer - Organization ID",
  "agent_id": "integer - Assigned sales agent",
  "created_date": "datetime - Creation timestamp",
  "last_update": "datetime - Last modification"
}
```

#### Enhanced Custom Fields (CF_101-113)
```json
{
  "CF_101_lead_source": {
    "type": "dropdown",
    "options": ["Apollo.io", "ZoomInfo", "Hunter.io", "UpLead", "Lusha", "Seamless.ai", "Lead411", "RocketReach", "BookYourData"],
    "required": true
  },
  "CF_102_services_offered": {
    "type": "text",
    "description": "Company's primary services/products"
  },
  "CF_103_growth_signals": {
    "type": "text", 
    "description": "Expansion/growth indicators and funding events"
  },
  "CF_104_project_pipelines": {
    "type": "text",
    "description": "Known upcoming projects or initiatives"
  },
  "CF_105_do_not_contact": {
    "type": "boolean",
    "description": "Contact restriction flag for compliance"
  },
  "CF_106_technology_stack": {
    "type": "text",
    "description": "Current technologies and software in use"
  },
  "CF_107_revenue_range": {
    "type": "dropdown",
    "options": ["<$1M", "$1M-$5M", "$5M-$25M", "$25M-$100M", "$100M+"],
    "description": "Annual revenue bracket"
  },
  "CF_108_employee_count_range": {
    "type": "dropdown", 
    "options": ["1-10", "11-50", "51-200", "201-1000", "1001-5000", "5000+"],
    "description": "Company size category"
  },
  "CF_109_management_level": {
    "type": "dropdown",
    "options": ["C-Suite", "VP", "SVP", "Director", "Manager", "Individual Contributor"],
    "description": "Contact's seniority level"
  },
  "CF_110_department_function": {
    "type": "dropdown",
    "options": ["IT", "Finance", "Operations", "HR", "Marketing", "Sales", "Legal", "Procurement"],
    "description": "Contact's department"
  },
  "CF_111_intent_signals": {
    "type": "text",
    "description": "Buying intent indicators and behavioral signals"
  },
  "CF_112_company_founded_year": {
    "type": "integer",
    "description": "Year company was established"
  },
  "CF_113_location_hq": {
    "type": "text",
    "description": "Company headquarters location"
  }
}
```

### 2. Prospect Entity (Ticket Type: Prospect)

Prospects are qualified leads showing genuine interest and meeting qualification criteria.

#### Inherited Data
- All Lead entity data (CF_101-113)
- Contact and company information
- Research and intelligence data

#### Qualification Custom Fields (CF_201-206)
```json
{
  "CF_201_pain_points": {
    "type": "text",
    "required": true,
    "description": "Confirmed business challenges/needs"
  },
  "CF_202_qualified_services": {
    "type": "text",
    "required": true,
    "description": "Services that match prospect's needs"
  },
  "CF_203_decision_maker": {
    "type": "string",
    "required": true,
    "description": "Primary decision maker identification"
  },
  "CF_204_budget_range": {
    "type": "dropdown",
    "options": ["<$10K", "$10K-$50K", "$50K-$100K", "$100K-$500K", "$500K+"],
    "required": true,
    "description": "Estimated budget availability"
  },
  "CF_205_timeframe": {
    "type": "dropdown",
    "options": ["Immediate", "1-3 months", "3-6 months", "6-12 months", "12+ months"],
    "required": true,
    "description": "Expected implementation timeline"
  },
  "CF_206_fit_score": {
    "type": "integer",
    "min": 0,
    "max": 100,
    "required": true,
    "description": "Overall qualification score"
  }
}
```

### 3. Opportunity Entity

Opportunities represent qualified prospects with defined sales potential and active deal progression.

#### Sales Custom Fields (CF_301-304)
```json
{
  "CF_301_products_services": {
    "type": "text",
    "required": true,
    "description": "Solution components being offered"
  },
  "CF_302_quotes_proposals": {
    "type": "text",
    "description": "Proposal and pricing information"
  },
  "CF_303_competitors": {
    "type": "text",
    "description": "Competitive landscape details"
  },
  "CF_304_win_loss_reason": {
    "type": "text",
    "description": "Deal outcome analysis"
  }
}
```

## Core HaloPSA Entities

### 1. Organizations (Companies)

HaloPSA Organizations represent companies/businesses in the CRM.

#### Core Fields
```json
{
  "name": "string (required) - Company name",
  "website": "string - Company website URL",
  "phonenumber": "string - Primary phone number",
  "notes": "string - Additional notes/description",
  "address": "string - Street address",
  "city": "string - City",
  "county": "string - State/Province",
  "postcode": "string - Postal/ZIP code",
  "country": "string - Country name",
  "industry": "string - Industry classification",
  "employee_count": "integer - Number of employees",
  "annual_revenue": "decimal - Annual revenue",
  "client_type": "integer - Organization type ID",
  "status": "integer - Status ID (1=Active, 2=Inactive)",
  "custom_fields": "object - Custom field values"
}
```

#### B2B Tool Field Mappings

| HaloPSA Field | Apollo.io | ZoomInfo | UpLead | Hunter |
|---------------|-----------|----------|---------|--------|
| name | name | companyName | company_name | domain |
| website | website_url | website | website | domain |
| phonenumber | phone | phone | phone | - |
| industry | industry | industry | industry | industry |
| employee_count | employees | employees | employees | - |
| annual_revenue | annual_revenue | revenue | - | - |
| address | street_address | street | address | - |
| city | city | city | city | - |
| county | state | state | state | - |
| postcode | postal_code | zipCode | postal_code | - |
| country | country | country | country | country |

### 2. Contacts

HaloPSA Contacts represent individual people associated with organizations.

#### Core Fields
```json
{
  "name": "string (required) - Full name",
  "firstname": "string - First name",
  "surname": "string - Last name",
  "emailaddress": "string - Primary email",
  "phonenumber": "string - Phone number",
  "mobilenumber": "string - Mobile phone",
  "jobtitle": "string - Job title/position",
  "organisation_id": "integer (required) - Associated organization",
  "notes": "string - Additional notes",
  "linkedin_url": "string - LinkedIn profile URL",
  "twitter_handle": "string - Twitter username",
  "status": "integer - Status ID",
  "custom_fields": "object - Custom field values"
}
```

#### B2B Tool Field Mappings

| HaloPSA Field | Apollo.io | ZoomInfo | UpLead | Lusha |
|---------------|-----------|----------|---------|-------|
| firstname | first_name | firstName | first_name | firstName |
| surname | last_name | lastName | last_name | lastName |
| emailaddress | email | email | email | email |
| phonenumber | direct_phone | directPhone | phone_number | phoneNumbers[0] |
| mobilenumber | mobile_phone | mobilePhone | mobile_phone | phoneNumbers[1] |
| jobtitle | title | title | job_title | position |
| linkedin_url | linkedin_url | linkedinUrl | linkedin_url | linkedinUrl |
| twitter_handle | twitter_handle | twitterUrl | - | - |

### 3. CRM Leads (Leads/Prospects/Opportunities)

HaloPSA Prospects represent potential customers or sales opportunities.

#### Core Fields
```json
{
  "name": "string (required) - Prospect name",
  "contact_name": "string - Contact person name",
  "email": "string - Contact email",
  "phone": "string - Contact phone",
  "company": "string - Company name",
  "website": "string - Company website",
  "job_title": "string - Contact job title",
  "source": "string - Lead source",
  "status": "integer - Prospect status ID",
  "probability": "integer - Close probability %",
  "value": "decimal - Potential value",
  "notes": "string - Additional notes",
  "custom_fields": "object - Custom field values"
}
```

## Data Transformation Patterns

### 1. Name Standardization
```javascript
// Combine first_name + last_name for HaloPSA name field
function buildFullName(firstName, lastName) {
  return `${firstName || ''} ${lastName || ''}`.trim();
}
```

### 2. Phone Number Formatting
```javascript
// Standardize phone numbers to E.164 format
function formatPhoneNumber(phone, countryCode = 'US') {
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Apply country-specific formatting
  if (countryCode === 'US' && digits.length === 10) {
    return `+1${digits}`;
  }
  
  return phone; // Return as-is if can't format
}
```

### 3. Website URL Normalization
```javascript
// Ensure website URLs have proper protocol
function normalizeWebsite(website) {
  if (!website) return '';
  
  if (!website.startsWith('http')) {
    return `https://${website}`;
  }
  
  return website;
}
```

### 4. Industry Classification Mapping
```javascript
// Map B2B tool industries to HaloPSA industry values
const industryMapping = {
  'Information Technology': 'Technology',
  'Computer Software': 'Software',
  'Financial Services': 'Finance',
  'Health Care': 'Healthcare',
  // Add more mappings as needed
};

function mapIndustry(sourceIndustry) {
  return industryMapping[sourceIndustry] || sourceIndustry;
}
```

## Custom Field Handling

### Setting Custom Fields
HaloPSA custom fields can be set using the `customfields` array:

```json
{
  "customfields": [
    {
      "id": 123,
      "value": "Custom Value"
    },
    {
      "id": 456,
      "value": "Another Value"
    }
  ]
}
```

### Common B2B Data Custom Fields
- Lead Score
- Data Source (Apollo, ZoomInfo, etc.)
- Last Enrichment Date
- Confidence Score
- Social Media Profiles
- Company Size Category
- Technology Stack

## Data Validation Rules

### Required Fields Validation
```javascript
function validateOrganization(org) {
  const errors = [];
  
  if (!org.name || org.name.trim() === '') {
    errors.push('Organization name is required');
  }
  
  if (org.website && !isValidUrl(org.website)) {
    errors.push('Invalid website URL format');
  }
  
  if (org.emailaddress && !isValidEmail(org.emailaddress)) {
    errors.push('Invalid email address format');
  }
  
  return errors;
}
```

### Data Quality Checks
```javascript
function validateDataQuality(contact) {
  const quality = {
    score: 0,
    issues: []
  };
  
  // Email validation
  if (contact.emailaddress && isValidEmail(contact.emailaddress)) {
    quality.score += 30;
  } else {
    quality.issues.push('Missing or invalid email');
  }
  
  // Phone validation
  if (contact.phonenumber && isValidPhone(contact.phonenumber)) {
    quality.score += 20;
  }
  
  // Complete name check
  if (contact.firstname && contact.surname) {
    quality.score += 25;
  }
  
  // Job title presence
  if (contact.jobtitle) {
    quality.score += 25;
  }
  
  return quality;
}
```

## Next Steps

1. Review [Authentication](../authentication/) for API access patterns
2. See [Webhooks](../webhooks/) for real-time data sync
3. Check [Error Handling](../error-handling/) for data validation strategies