# Contributing Guidelines

## Overview

Welcome to the HaloPSA CRM Custom Integration project! We appreciate your interest in contributing. This document provides guidelines and best practices for contributing to the project.

## Code of Conduct

### Our Standards
- **Respectful Communication**: Be respectful and inclusive in all interactions
- **Constructive Feedback**: Provide constructive feedback and accept it gracefully
- **Collaboration**: Work together to improve the project
- **Professionalism**: Maintain professional standards in all contributions

### Unacceptable Behavior
- Harassment or discriminatory language
- Personal attacks or insults
- Trolling or disruptive comments
- Sharing private information without consent

## Getting Started

### Development Environment Setup

#### Prerequisites
```bash
# Required software
Node.js >= 16.0.0
npm >= 7.0.0
Git >= 2.25.0
Docker >= 20.0.0 (optional, for containerized development)
```

#### Clone and Setup
```bash
# Clone the repository
git clone https://github.com/sjackson0109/halopsa-crm-b2b-integration.git
cd halopsa-crm-b2b-integration

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env

# Run setup script
npm run setup
```

#### Development Workflow
```bash
# Start development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Build for production
npm run build
```

## Contribution Types

### Bug Reports
When reporting bugs, please include:
- **Clear Title**: Describe the issue concisely
- **Steps to Reproduce**: Detailed steps to reproduce the bug
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: OS, Node.js version, browser (if applicable)
- **Logs**: Relevant log excerpts
- **Screenshots**: If the issue is visual

### Feature Requests
For new features, please provide:
- **Use Case**: Describe the problem this feature solves
- **Proposed Solution**: How the feature should work
- **Alternatives**: Other solutions you've considered
- **Impact**: How this affects existing functionality

### Code Contributions
- **Bug Fixes**: Fix existing issues
- **Features**: Implement new functionality
- **Documentation**: Improve documentation
- **Tests**: Add or improve test coverage
- **Performance**: Optimize performance
- **Security**: Address security issues

## Development Workflow

### Branching Strategy

#### Branch Naming Convention
```
feature/{issue-number}-{description}     # New features
bugfix/{issue-number}-{description}      # Bug fixes
hotfix/{issue-number}-{description}      # Critical fixes
docs/{issue-number}-{description}        # Documentation
refactor/{issue-number}-{description}    # Code refactoring
```

#### Example Branches
```
feature/123-add-zoominfo-integration
bugfix/456-fix-webhook-signature-validation
docs/789-update-api-reference
```

### Commit Guidelines

#### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

#### Commit Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

#### Examples
```
feat(api): add bulk lead import endpoint

Add support for importing multiple leads in a single API call.
Implements batch processing with error handling and rollback.

Closes #123
```

```
fix(auth): resolve OAuth token refresh issue

Fixed token refresh logic to handle expired tokens properly.
Added retry mechanism with exponential backoff.

Fixes #456
```

### Pull Request Process

#### Creating a Pull Request
1. **Fork the Repository**: Create your own fork
2. **Create Feature Branch**: Branch from `main`
3. **Make Changes**: Implement your changes
4. **Write Tests**: Add tests for new functionality
5. **Update Documentation**: Update docs if needed
6. **Run Quality Checks**: Ensure all checks pass
7. **Create PR**: Submit pull request with clear description

#### Pull Request Template
```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Security enhancement

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] All tests pass

## Checklist
- [ ] Code follows project style guidelines
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Tests cover new functionality
- [ ] Commit messages follow guidelines

## Related Issues
Closes #123, Fixes #456

## Additional Notes
Any additional information or context.
```

## Code Quality Standards

### Code Style

#### JavaScript/TypeScript Standards
```javascript
// Use ES6+ features
const arrowFunction = (param) => {
  return param * 2;
};

// Use async/await over promises
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}

// Use destructuring
const { firstName, lastName, email } = user;

// Use template literals
const greeting = `Hello, ${firstName} ${lastName}!`;

// Use const over let when possible
const PI = 3.14159;
```

#### Naming Conventions
```javascript
// Variables and functions: camelCase
const userName = 'john_doe';
function getUserData() { }

// Classes: PascalCase
class UserService { }

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';

// Files: kebab-case
// user-service.js, api-client.ts
```

### Testing Requirements

#### Test Coverage
- **Unit Tests**: Minimum 80% coverage
- **Integration Tests**: Cover critical paths
- **End-to-End Tests**: For complete workflows

#### Test Structure
```javascript
// Use descriptive test names
describe('LeadService', () => {
  describe('createLead()', () => {
    it('should create a new lead successfully', async () => {
      // Arrange
      const leadData = { /* ... */ };

      // Act
      const result = await leadService.createLead(leadData);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result.status).toBe('new_lead');
    });

    it('should throw error for invalid email', async () => {
      // Arrange
      const invalidLead = { email: 'invalid-email' };

      // Act & Assert
      await expect(leadService.createLead(invalidLead))
        .rejects.toThrow('Invalid email format');
    });
  });
});
```

### Documentation Standards

#### Code Documentation
```javascript
/**
 * Creates a new lead in the system
 * @param {Object} leadData - The lead information
 * @param {string} leadData.firstName - First name (required)
 * @param {string} leadData.lastName - Last name (required)
 * @param {string} leadData.email - Email address (required)
 * @param {string} leadData.company - Company name
 * @param {string} leadData.source - Data source (apollo, zoominfo, etc.)
 * @returns {Promise<Object>} Created lead object
 * @throws {ValidationError} When lead data is invalid
 * @throws {DuplicateError} When lead already exists
 */
async function createLead(leadData) {
  // Implementation
}
```

#### API Documentation
```javascript
/**
 * @swagger
 * /api/leads:
 *   post:
 *     summary: Create a new lead
 *     tags: [Leads]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       201:
 *         description: Lead created successfully
 *       400:
 *         description: Invalid request data
 */
app.post('/api/leads', createLeadHandler);
```

## Security Considerations

### Secure Coding Practices
- **Input Validation**: Always validate and sanitize inputs
- **Authentication**: Use secure authentication methods
- **Authorization**: Implement proper access controls
- **Data Protection**: Encrypt sensitive data
- **Error Handling**: Don't expose sensitive information in errors

### Security Checklist
- [ ] No hardcoded secrets or credentials
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] CSRF protection where applicable
- [ ] Secure session management
- [ ] Proper error handling without information leakage
- [ ] Dependencies scanned for vulnerabilities

## Review Process

### Code Review Guidelines

#### Reviewer Checklist
- [ ] Code follows project standards
- [ ] Tests are included and pass
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] Error handling is appropriate
- [ ] Code is maintainable and readable

#### Automated Checks
```yaml
# .github/workflows/pr-checks.yml
name: Pull Request Checks

on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '16'
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run test:coverage
      - run: npm run security:audit
```

### Approval Process
1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one maintainer review required
3. **Testing**: All tests pass and coverage maintained
4. **Documentation**: Docs updated if needed
5. **Approval**: Maintainers approve the PR
6. **Merge**: PR merged using squash or rebase

## Release Process

### Versioning
We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped appropriately
- [ ] Release notes written
- [ ] Tag created and pushed
- [ ] Release published on GitHub

## Getting Help

### Communication Channels
- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Pull Request Comments**: For code review discussions

### Asking for Help
When asking for help:
- **Be Specific**: Clearly describe the issue
- **Provide Context**: Include relevant code, logs, and environment
- **Show Research**: Explain what you've tried
- **Use Proper Channels**: Choose the right communication method

## Recognition

### Contributor Recognition
- Contributors listed in repository contributors
- Major contributors acknowledged in release notes
- Special recognition for significant contributions

### Badges and Labels
- **First-time Contributor**: For new contributors
- **Bug Fix**: For bug fixes
- **Enhancement**: For feature additions
- **Documentation**: For documentation improvements
- **Security**: For security-related contributions

## License and Copyright

### Contributor License Agreement
By contributing to this project, you agree that:
- Your contributions will be licensed under the project's license
- You have the right to grant this license
- Your contributions are your original work or properly licensed

### Copyright Notices
- Include copyright notices in new files
- Update copyright years when modifying existing files
- Respect third-party licenses and copyrights

---

Thank you for contributing to the HaloPSA CRM Custom Integration project! Your contributions help make this project better for everyone.