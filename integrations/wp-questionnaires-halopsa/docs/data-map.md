# WP Questionnaires to HaloPSA Data Map

## Source object

The source object is a completed WP Questionnaires submission returned by:

```text
GET /wp-json/wpq/v1/api/submissions/pending
GET /wp-json/wpq/v1/api/submissions/{id}
```

## Target model

The integration writes to three HaloPSA record types:

1. Client / organisation.
2. Contact / user.
3. CRM prospect record.

The prospect record is the working object for sales follow-up. It should be assigned to the HaloPSA CRM state used for `Prospect - Interested` or the tenant equivalent.

## Campaign/list model

The campaign name is derived from the questionnaire name.

Fallback order:

1. `questionnaire_name`.
2. `questionnaire_ref`.
3. `WP Questionnaire`.

Default behaviour stores the campaign name as a custom field. If the HaloPSA tenant exposes a campaign/list endpoint, set:

```text
HALO_CAMPAIGN_MODE=endpoint
HALO_CAMPAIGN_LISTS_PATH=/api/<tenant-specific-path>
```

This is deliberately configurable because campaign/list endpoint shape is tenant-dependent and must be verified against the live HaloPSA tenant API documentation.

## Field mapping

| WPQ field | HaloPSA target | Notes |
|---|---|---|
| `contact_company` | Client name | Used for client lookup and upsert. |
| `contact_name` | Contact name | Split into first name and surname where practical. |
| `contact_email` | Contact email | Primary de-duplication key for contact. |
| `contact_phone` | Contact phone | Stored when present. |
| `submission_ref` | Prospect custom field and detail body | Used as idempotency key. |
| `questionnaire_name` | Campaign/list name | Customer-facing campaign name. |
| `questionnaire_ref` | Prospect custom field | Stable questionnaire reference. |
| `overall_score` | Prospect custom field | Numeric score. |
| `grade_label` | Prospect custom field | Human-readable result. |
| `domain_scores` | Prospect custom memo field | JSON encoded. |
| `answers_json` | Prospect custom memo field | JSON encoded. |
| `findings` / `recommendations` / `top_actions` | Prospect custom memo field and detail body | Requires WPQ API support. |
| `utm_source` | Prospect custom field | Attribution. |
| `utm_medium` | Prospect custom field | Attribution. |
| `utm_campaign` | Prospect custom field | Attribution. |
| `landing_page` | Prospect custom field | Attribution. |
| `referrer_url` | Prospect custom field | Attribution. |
| `completed_at` | Prospect custom field | Completion timestamp. |

## Idempotency

The integration uses `submission_ref` as the external reference. This value is searched in HaloPSA before creating a new prospect.

The integration should not acknowledge the WordPress submission until HaloPSA returns a usable prospect ID.

## Error handling

When a submission fails:

1. The error is logged locally.
2. The WordPress submission is marked as failed or retry pending.
3. Retry decision is based on `MAX_RETRIES` and `halopsa_retry_count`.

## Required WPQ enhancement

The current WPQ HaloPSA API detail response should be extended to expose recommendations. Add at least one of:

```json
{
  "findings": [],
  "top_actions": [],
  "recommendations": []
}
```

Recommended source in WPQ:

```text
wpq_submissions.findings_json
```

The integration already checks for `findings`, `recommendations`, and `top_actions` in that order.
