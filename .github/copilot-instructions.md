<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# HaloPSA CRM Custom Integration - B2B Data Sourcing Tools

This workspace contains production-ready integration architecture documentation for connecting HaloPSA with B2B data sourcing tools including Apollo.io, ZoomInfo, UpLead, Hunter, Lusha, Seamless.ai, Lead411, RocketReach, and BookYourData/LeadsBlue.

## Project Context
- **Target Audience**: Developers, technical architects, MSPs building maintainable integrations
- **Integration Methods**: REST API, Webhooks, Runbooks, Third-party iPaaS tools
- **Data Flow**: B2B tool → Data transformation → HaloPSA (Prospects/Leads/Organizations/Contacts)

## Development Guidelines
- Focus on production-ready, maintainable solutions
- Include comprehensive error handling and deduplication logic
- Provide clear authentication flows and security considerations
- Document field mappings and data transformation patterns
- Consider scalability and rate limiting requirements
- Include monitoring and logging strategies

## Workspace Structure
The documentation covers:
- Data models and field mappings
- Authentication flows (OAuth, API keys)
- Webhook payload specifications
- Error handling patterns
- Middleware recommendations
- Integration testing approaches
- Deployment and monitoring strategies