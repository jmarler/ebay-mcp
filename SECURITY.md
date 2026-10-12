# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          | End of Support |
| ------- | ------------------ | -------------- |
| 1.1.x   | :white_check_mark: | Current        |
| 1.0.x   | :white_check_mark: | 2025-06-01     |
| < 1.0   | :x:                | Unsupported    |

## Reporting a Vulnerability

We take the security of ebay-mcp seriously. If you discover a security vulnerability, please report it responsibly:

### Reporting Process

1. **DO NOT** open a public GitHub issue for security vulnerabilities
2. Report via GitHub Security Advisory: https://github.com/YosefHayim/ebay-mcp/security/advisories/new
3. Or email security reports to: **yosefisabag@gmail.com**
4. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
   - Your contact information

### What to Expect

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days with assessment and timeline
- **Fix Timeline**: Critical vulnerabilities patched within 14 days
- **Disclosure**: Coordinated disclosure after patch is available

### Scope

Security vulnerabilities we consider in-scope:

- Authentication bypass
- Token exposure or theft
- OAuth flow vulnerabilities
- Injection attacks (SQL, Command, etc.)
- Sensitive data exposure
- Access control issues
- Cryptographic vulnerabilities

## Security Best Practices

### Token Security

#### `.env` File

`.env` holds the app credentials and OAuth tokens (`EBAY_USER_REFRESH_TOKEN`, and the server writes refreshed tokens back to it) and **MUST** be protected:

```bash
# Set restrictive permissions (Unix/Linux/macOS)
chmod 600 .env

# Verify permissions
ls -l .env
# Should show: -rw------- (owner read/write only)
```

**Security Checklist**:
- ✅ File is in `.gitignore` (`.env` and `.env.*` are ignored; only `.env.example` is tracked)
- ✅ Restrictive file permissions (600)
- ✅ Not committed to version control
- ✅ Not shared in plain text (email, chat, etc.)
- ✅ Backed up securely (encrypted backups only)
- ✅ Token file located outside of web-accessible directories

#### Environment Variables

Never hardcode credentials in source code:

```bash
# ❌ WRONG - Don't do this
export EBAY_CLIENT_ID="your_app_id_here"

# ✅ CORRECT - Use secure env var management
# Option 1: .env file (add to .gitignore)
# Option 2: System keychain/secrets manager
# Option 3: CI/CD secrets (GitHub Secrets, etc.)
```

**This fork's local Docker setup** keeps credentials in 1Password: `scripts/opSecrets.env` holds only `op://` references, and `scripts/dockerUp.sh` resolves them with `op run` when it starts the container, so no secret is written to disk or committed. Never commit a `.env` file.

#### Token Rotation

- **Access tokens**: Auto-refresh every ~2 hours (eBay default)
- **Refresh tokens**: Rotate every 6-12 months (manual re-authentication)
- **App credentials**: Rotate annually or immediately if compromised

### HTTP Server Security (When Using HTTP Transport)

#### OAuth 2.1 Configuration

```bash
# Always use HTTPS in production
OAUTH_AUTH_SERVER_URL=https://auth.example.com  # NOT http://

# Strong client secrets (32+ chars, random)
OAUTH_CLIENT_SECRET="$(openssl rand -base64 32)"

# Require JWT validation or introspection
OAUTH_USE_INTROSPECTION=true

# Enforce required scopes
OAUTH_REQUIRED_SCOPES="mcp:tools"

# Or, for a simple private deployment: a static bearer token (skips the OAuth verifier)
MCP_AUTH_TOKEN="$(openssl rand -base64 32)"
```

#### Network Security

**Production Deployment**:
- ✅ Use HTTPS/TLS 1.2+ only
- ✅ Enable CORS with specific origins (not `*`)
- ✅ Implement rate limiting
- ✅ Use secure session management
- ✅ Enable security headers (HSTS, CSP, etc.)

The HTTP transport (`src/mcp/httpTransport.ts`) already applies `helmet` security headers and restricts CORS to loopback origins by default. To allow a browser client, list its exact origins:

```bash
MCP_CORS_ORIGINS=https://trusted-client.com  # comma-separated; never '*'
```

### Dependency Security

#### Regular Updates

```bash
# Check for vulnerabilities
pnpm audit

# Update to latest secure versions (review changes first!)
pnpm update

# Check for outdated packages
pnpm outdated
```

#### GitHub Security Features

- ✅ Enable Dependabot alerts (automatically enabled)
- ✅ Enable Dependabot security updates
- ✅ Enable code scanning (CodeQL)
- ✅ Review dependency graph regularly

### Sandbox vs Production

#### Use Sandbox for Development

```bash
# Development/testing
EBAY_ENVIRONMENT=sandbox
EBAY_CLIENT_ID="sandbox_app_id"

# Production (only after thorough testing)
EBAY_ENVIRONMENT=production
EBAY_CLIENT_ID="production_app_id"
```

**Never**:
- ❌ Use production credentials in development
- ❌ Test with real user data
- ❌ Share production tokens across environments

### Rate Limiting & Abuse Prevention

**User Token Limits** (per eBay account):
- Free tier: 10,000 req/day
- Business tier: 50,000 req/day

**App Token Limits**:
- All tiers: 1,000 req/day

**Client-side rate limiting** (this MCP server, `src/api/client/rateLimitTracker.ts`):
- 5,000 req/min sliding window (conservative limit)
- Automatic backoff on 429 responses
- Exponential retry on 5xx errors

### Logging & Monitoring

#### What to Log

```bash
# ✅ DO log
- API request counts
- Error rates
- Authentication attempts (success/failure counts)
- Token refresh attempts
- Rate limit hits

# ❌ DO NOT log
- Access tokens
- Refresh tokens
- User credentials
- Personal identifiable information (PII)
- Full request/response bodies (may contain tokens)
```

#### Verbose Logging Security

```bash
# http and lower levels log request/response bodies (truncated, with secret-named
# fields redacted) - they can still contain buyer PII. Avoid in production.
EBAY_LOG_LEVEL=http

# Production
EBAY_LOG_LEVEL=info  # Default, recommended
```

See [docs/logging.md](docs/logging.md) for what redaction covers.

## Security Disclosure Policy

### Coordinated Disclosure

1. **Reporter notifies maintainers privately**
2. **Maintainers confirm and assess severity**
3. **Patch developed and tested**
4. **Security advisory published** (GitHub Security Advisories)
5. **Patch released with CVE** (if applicable)
6. **Public disclosure** (30 days after patch or coordinated date)

### Credit

Security researchers who responsibly disclose vulnerabilities will be credited in:
- GitHub Security Advisory
- Release notes

## Security Tools & Resources

### Static Analysis

```bash
# Biome lint and format checks
pnpm lint

# Type checking (prevents many issues)
pnpm typecheck

# Dependency audit
pnpm audit
```

### Runtime Protection

**Automatic**:
- ✅ Zod input validation (all MCP tools)
- ✅ TypeScript type safety
- ✅ OAuth token validation (HTTP mode)
- ✅ Rate limiting (client-side)
- ✅ Automatic token refresh

**Manual** (configure as needed):
- JWT signature verification (HTTP mode)
- Token introspection (HTTP mode)
- Request/response logging (`EBAY_LOG_LEVEL=http` or lower)

### Additional Resources

- [eBay Security Center](https://www.ebay.com/help/policies/member-behaviour-policies/user-privacy-notice-privacy-policy)
- [OAuth 2.1 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [MCP Security Guidelines](https://modelcontextprotocol.io/docs/security)

## License

This security policy is part of the ebay-mcp project and is licensed under the MIT License.
