# HaloPSA Custom Integration Research Notes

## Current evidence base

This package was prepared from the repository's existing HaloPSA integration model and the current WP Questionnaires API implementation.

The existing repository already documents these HaloPSA integration patterns:

- REST API with OAuth / client ID and secret.
- Webhooks.
- Halo Integrator polling.
- Runbooks.
- iPaaS tooling.
- Custom middleware.

The existing repository also models these HaloPSA endpoints:

- `/api/Client` for organisations / clients.
- `/api/Users` for contacts.
- `/api/Opportunities` for prospects or opportunity-style CRM records.
- `/api/CustomFields` for custom-field lookup.

The WP Questionnaires plugin exposes a pull API designed for HaloPSA:

- `GET /wp-json/wpq/v1/api/submissions`.
- `GET /wp-json/wpq/v1/api/submissions/pending`.
- `GET /wp-json/wpq/v1/api/submissions/{id}`.
- `POST /wp-json/wpq/v1/api/submissions/{id}/start`.
- `POST /wp-json/wpq/v1/api/submissions/{id}/acknowledge`.
- `POST /wp-json/wpq/v1/api/submissions/{id}/fail`.

## Integration strategy

Use custom middleware rather than embedding HaloPSA credentials in WordPress.

Rationale:

1. WordPress remains a source system only.
2. HaloPSA secrets stay outside WordPress.
3. Failed syncs can be retried without exposing public endpoints.
4. Mapping can change without redeploying the WordPress plugin.
5. Additional integrations can reuse the same repository pattern.

## Recommended HaloPSA target structure

### Client

Create or update one client record per company name.

Minimum data:

- Company name.
- Source marker: `WP Questionnaires`.
- Campaign/list name.

### Contact

Create or update one contact record per email address.

Minimum data:

- Full name.
- Email address.
- Phone number where present.
- Linked client ID.
- Source marker.
- Submission reference.

### Prospect

Create or update one CRM prospect record per WPQ submission.

Minimum data:

- Summary: `<questionnaire> assessment - <company>`.
- Client ID.
- Contact ID.
- Prospect status: tenant-specific `Prospect - Interested` equivalent.
- Campaign/list name.
- Submission reference.
- Score and grade.
- Domain scores.
- Answers.
- Recommendations / findings.
- Attribution fields.

## Campaign/list handling

The requirement is to link each prospect to a campaign/list using the questionnaire name.

This package supports two modes:

1. `custom_field`: write the questionnaire name into a HaloPSA campaign custom field.
2. `endpoint`: query/create a campaign/list through a tenant-specific endpoint.

Use `custom_field` until the exact HaloPSA campaign/list endpoint has been verified in the live tenant.

## Tenant-specific values to verify

Before production use, confirm these values in HaloPSA:

- OAuth token path.
- Client endpoint path.
- Contact endpoint path.
- CRM prospect/opportunity endpoint path.
- Whether prospects are stored as Opportunities, Tickets, a CRM-specific object, or a tenant-specific type.
- Prospect type ID.
- Prospect interested status ID.
- Campaign/list endpoint and payload shape.
- Custom field IDs or names.
- Required fields for client, contact, and prospect creation.
- Rate limits.

## WPQ source gap

The WPQ HaloPSA API currently returns:

- Contact details.
- Questionnaire reference and name.
- Score and grade.
- Domain scores.
- Answers JSON.
- Attribution.
- Sync status.

It should also return the recommendations/findings stored in `findings_json`. Without that API extension, HaloPSA will receive answers and scoring, but not the full recommendation list.

## Production hardening backlog

- Add a persistent local sync ledger if running as a long-lived service.
- Add structured logs in JSON format.
- Add OpenTelemetry-compatible instrumentation.
- Add tests with mocked WordPress and HaloPSA APIs.
- Add Dockerfile and deployment manifest.
- Add GitHub Actions lint and smoke test.
- Add dead-letter handling for permanently failed submissions.
- Add explicit PII handling and retention documentation.
