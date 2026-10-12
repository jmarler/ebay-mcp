# eBay MCP Server - OAuth Authentication Quick Reference

For every environment variable and the full walkthrough, see the [Configuration Guide](./CONFIGURATION.md).

## OAuth URL Format
`ebay_get_oauth_url` builds the URL for you. Its shape:
```
https://auth.ebay.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_RUNAME&response_type=code&scope=SCOPES_SEPARATED_BY_SPACES
```
- Sandbox uses `https://auth.sandbox.ebay.com` instead.
- `redirect_uri` is your **RuName** (`EBAY_REDIRECT_URI`), never a URL. A URL here makes eBay answer `temporarily_unavailable`.
- Scopes are space-separated: the server encodes the separator as `%20`; `+` also works. Never use `%2B`.

## Scopes
**Where the defaults come from:** with no `scopes` argument and no `EBAY_OAUTH_SCOPES`, the consent URL requests every scope in the environment's table in `src/config/oauthScopes.ts` (`productionScopes` or `sandboxScopes`). The old `docs/auth/*_scopes.json` files no longer exist.

**Override:** set `EBAY_OAUTH_SCOPES` (space- or comma-separated) to the exact scope list your keyset shows in the developer portal. Use this when consent fails with `invalid_scope`, because several published scopes are limited release.

**Optional scopes** (recognized but never requested by default; add them to `EBAY_OAUTH_SCOPES` only if your keyset was granted them, then repeat consent):
- `https://api.ebay.com/oauth/api_scope/sell.finances.earnings.read`: `ebay_get_order_earnings`, `ebay_get_order_earnings_by_id`, `ebay_get_order_earnings_summary`
- `https://api.ebay.com/oauth/api_scope/sell.logistics`: the Logistics tools (`ebay_create_shipping_quote`, `ebay_get_shipment`, `ebay_download_shipping_label_file`, ...)
- `https://api.ebay.com/oauth/api_scope/commerce.post_order.document`: post-order document tools

The tool-to-scope mapping lives in `src/auth/scopeUtils.ts`.

**Fork note:** the production table omits `commerce.feedback.readonly`. eBay grants it only under the client-credentials grant, so requesting it in the authorization-code flow fails the whole consent request with `invalid_scope`.

**Common scopes:**
- Basic (always included): `https://api.ebay.com/oauth/api_scope`
- Inventory: `.../sell.inventory`, `.../sell.inventory.readonly`
- Account: `.../sell.account`, `.../sell.account.readonly`
- Fulfillment: `.../sell.fulfillment`, `.../sell.fulfillment.readonly`
- Marketing: `.../sell.marketing`, `.../sell.marketing.readonly`
- Analytics: `.../sell.analytics.readonly`
- Finances (payouts, transactions, billing activity): `.../sell.finances`

(`...` = `https://api.ebay.com/oauth/api_scope`)

## Authentication Flow

### Step 1: Generate OAuth URL
Use the MCP tool:
```
ebay:ebay_get_oauth_url
```

Optional parameters:
- `scopes`: Array of specific scopes. Scopes eBay does not list for the environment produce warnings but are still requested.
- `state`: CSRF protection token (optional)
- `redirectUri`: Override the default RuName (optional)

### Step 2: User Authorization
1. Open the generated OAuth URL in a browser
2. Log in to your eBay account
3. Authorize the application
4. You'll be redirected to your RuName's Accept URL with the authorization code:
   ```
   https://your-redirect-uri?code=v%5E1.1%23...&expires_in=299
   ```
5. Copy the **FULL URL** (including the `code=` parameter)

### Step 3: Exchange Authorization Code
Use the MCP tool:
```
ebay:ebay_exchange_authorization_code
```

Parameters:
- `code`: The authorization code from the redirect URL (can be URL-encoded)

The tool will automatically:
- Decode URL-encoded codes
- Exchange the code for access & refresh tokens
- Store tokens in memory for immediate use
- Write `EBAY_USER_REFRESH_TOKEN` and `EBAY_USER_ACCESS_TOKEN` to the project `.env` file (see Token Persistence below)
- Refresh the access token automatically when it expires

Alternatively, `npm run setup` runs the same flow as an interactive wizard (paste the code, or auto-capture it on `EBAY_OAUTH_CALLBACK_PORT` behind an HTTPS tunnel).

## Token Management

### Access Tokens
- Valid for **2 hours** (7200 seconds)
- Automatically refreshed when expired
- Used for all API requests

### Refresh Tokens
- Valid for **18 months**
- Stored in `.env` as `EBAY_USER_REFRESH_TOKEN`
- Used to obtain new access tokens
- Can be revoked by:
  - User changing password
  - User revoking application access
  - Token expiration

### Token Persistence
- `DotEnvCredentialStore` (`src/auth/credentialSession.ts`) merges token updates into the `.env` file in the project root on exchange, refresh, and app-token minting.
- **Fork change:** if `.env` exists but is not a regular file (e.g. a 1Password Environments named pipe), the write is skipped and logged; tokens stay in memory and the refresh token is re-read at the next start.

### Checking Token Status
```
ebay:ebay_get_token_status
```
Returns:
- Whether user tokens are available
- Whether app access token is cached
- Current authentication status
- Rate limit tier

### Manual Token Refresh
```
ebay:ebay_refresh_access_token
```
Manually refresh access token using stored refresh token (useful for testing).

### Clearing Tokens
```
ebay:ebay_clear_tokens
```
Clears all tokens from memory (requires re-authentication). `.env` is not changed; remove `EBAY_USER_REFRESH_TOKEN` there to make it stick across restarts.

## Important Notes

### Authorization Code Expiry
- Authorization codes expire in **~5 minutes**
- If you get "invalid or was issued to another client" error, generate a fresh code
- Don't reuse old authorization codes

### Scope Requirements
- Different API endpoints require different scopes
- If you get "Insufficient permissions" errors, you need additional scopes
- Re-run the full OAuth flow with the required scopes included
- Cannot add scopes to existing tokens - must re-authorize

### Production vs Sandbox
- Different scopes available in production vs sandbox environments
- Sandbox adds Buy API and extended Identity scopes; production adds eDelivery, messaging, and shipping scopes
- Set environment via `EBAY_ENVIRONMENT` in `.env` file

### Rate Limits
- **User tokens**: 10,000-50,000 requests/day (depending on scopes)
- **App tokens**: 1,000 requests/day
- Always prefer user tokens for better rate limits

## Troubleshooting

### "Unexpected end of JSON" errors in Claude Desktop
**Cause:** Anything written to stdout corrupts the MCP STDIO protocol.

**Solution:** The server's logger writes every level to stderr (see [Logging](../logging.md)). If you add new code, log through it and never use `console.log`.

### "Invalid scope" errors
- The consent URL named a scope your keyset was not granted (several published scopes are limited release)
- Set `EBAY_OAUTH_SCOPES` to the scope list your keyset shows in the developer portal and re-run consent
- Some scopes are only available in production or sandbox (not both)

### "Invalid authorization code" errors
- Code expired (5 minute limit)
- Code already used (one-time use only)
- Code was issued to different client ID
- Solution: Generate fresh authorization code

### Empty inventory/offers after successful auth
- Authentication can succeed even with 0 items
- Inventory API uses different data model than legacy Trading API
- Legacy listings may not appear in Inventory API; use `ebay_get_active_listings` (Trading API) for those
- Check if you're using the right API for your listing type

### Tokens not persisting between sessions
- Verify `.env` file contains `EBAY_USER_REFRESH_TOKEN`
- Check file permissions on `.env`
- Ensure MCP server has write access to project directory
- A non-regular `.env` (pipe, secrets-manager mount) is never written to; keep the refresh token in the secrets manager instead

## Advanced Usage

### Setting Tokens with Custom Expiry
```
ebay:ebay_set_user_tokens_with_expiry
```
Useful when you already have tokens from another source and want to import them.

### Validating Token Expiry
```
ebay:ebay_validate_token_expiry
```
Check if tokens are expired or expiring soon, get recommendations.

### Display All Credentials
```
ebay:ebay_display_credentials
```
Shows all configuration (masked secrets) for debugging authentication issues.

### Diagnostics
`npm run diagnose` checks configuration, connectivity, authentication, and the scopes on your token; `npm run diagnose -- --export` also writes a JSON report.

## Best Practices

1. **Always use specific scopes**: Only request scopes you actually need
2. **Store refresh tokens securely**: Never commit `.env` to version control
3. **Handle token expiry gracefully**: The server auto-refreshes, but monitor for refresh token expiration
4. **Test in sandbox first**: Use sandbox environment for development
5. **Monitor rate limits**: User tokens provide much better limits than app tokens

## Quick Start Example

For a typical inventory management application:

1. Generate OAuth URL with inventory scopes:
```javascript
// Request scopes for inventory management
scopes: [
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.inventory.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.account.readonly"
]
```

2. User authorizes in browser

3. Exchange code:
```javascript
code: "v^1.1#i^1#r^1#..." // From redirect URL
```

4. Start using inventory APIs - tokens will auto-refresh!

## References

- [Configuration Guide](./CONFIGURATION.md)
- [eBay OAuth Documentation](https://developer.ebay.com/api-docs/static/oauth-tokens.html)
- [eBay OAuth Scopes](https://developer.ebay.com/api-docs/static/oauth-scopes.html)
- [eBay Developer Program](https://developer.ebay.com/)
