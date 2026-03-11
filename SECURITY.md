# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Vibe Coding App seriously. If you discover a security vulnerability, please follow these steps:

### Do NOT

- Open a public GitHub issue
- Disclose the vulnerability publicly before it's fixed
- Exploit the vulnerability for malicious purposes

### Do

1. **Report privately** by emailing security concerns to the maintainers
2. **Provide details** including:
   - Type of vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes
3. **Allow time** for us to investigate and patch the issue

### What to Expect

- **Acknowledgment**: We will acknowledge receipt within 48 hours
- **Investigation**: We will investigate and keep you updated
- **Fix Timeline**: We aim to fix critical vulnerabilities within 7 days
- **Credit**: We will credit reporters in our security advisories (unless you prefer anonymity)

## Security Best Practices for Contributors

### Environment Variables

- Never commit `.env` files or secrets
- Use `.env.example` for documentation
- Use environment variable validation

### Authentication

- Use secure session handling (Better Auth)
- Validate all user inputs
- Implement proper access controls

### API Security

- Use tRPC's built-in validation
- Implement rate limiting where needed
- Sanitize all inputs

### Dependencies

- Keep dependencies updated
- Review security advisories regularly
- Use `pnpm audit` to check for vulnerabilities

### Code Review

- All PRs require review before merging
- Security-sensitive changes require additional scrutiny
- Use automated security scanning in CI

## Security Features

### Current Implementation

- **Authentication**: Better Auth with OAuth support
- **API Protection**: tRPC with Zod validation
- **Database**: Parameterized queries via Drizzle ORM
- **Sandboxing**: E2B isolated execution environment

### Planned Improvements

- Rate limiting on API endpoints
- Enhanced audit logging
- Content Security Policy headers
- CORS configuration review

## Third-Party Services

We use the following third-party services:

| Service          | Purpose         | Security Notes                 |
| ---------------- | --------------- | ------------------------------ |
| E2B              | Code sandboxing | Isolated execution environment |
| Vercel           | Hosting         | SOC 2 compliant                |
| Anthropic/OpenAI | AI models       | API key protected              |
| Inngest          | Background jobs | Encrypted job data             |

Thank you for helping keep Vibe Coding App secure!
