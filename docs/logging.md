# Logging

The server uses [Winston](https://github.com/winstonjs/winston) for structured logging (`src/utils/logger.ts`). Logs are written to **stderr** (so they don't interfere with the MCP protocol on stdout) and, optionally, to files.

## Log levels

Set the level via environment variable:

```bash
EBAY_LOG_LEVEL=debug  # error | warn | info | http | verbose | debug | silly
```

The default level is `info`, which does **not** include outbound eBay traffic.
Every request and response is logged at `http`, so set `EBAY_LOG_LEVEL=http` (or
anything below it) when a tool call looks stuck and you need to see whether the
request reached eBay and what came back. Logged request and response bodies are
cut to about 1,000 characters, and binary bodies (file uploads) are logged by size only.

## Secret redaction

Every message and metadata object passes through `src/utils/logRedaction.ts` before it is written:

- Credentials embedded in URLs (`//user:pass@host`) become `//[REDACTED]@`.
- Any metadata field whose key matches `secret`, `password`, `token`, `authorization`, `cookie`, or `api key` (case-insensitive, at any nesting depth) is replaced with `[REDACTED]`.

Message text itself is only scrubbed for URL credentials, so still review logs before sharing them.

## Request timeouts

Every eBay REST call is bounded by a 30-second deadline that covers the whole
exchange, including reading the response body — a stalled response fails with a
timeout error rather than leaving the tool call hanging. Media and feed file uploads
use a longer 10-minute deadline.

## File logging

Enable persistent logs to disk:

```bash
EBAY_ENABLE_FILE_LOGGING=true
```

Log files are written as JSON lines to `~/.ebay-mcp/logs/` and rotate by size:

| File           | Contents                                            | Rotation       |
| -------------- | --------------------------------------------------- | -------------- |
| `error.log`    | Error-level messages only                           | 5 MB × 5 files |
| `combined.log` | Everything at `EBAY_LOG_LEVEL`                      | 10 MB × 5 files |
| `debug.log`    | Everything at `debug` and above, within `EBAY_LOG_LEVEL` | 10 MB × 3 files |

## Example output

```
[2024-01-15 10:30:45] [INFO] [Server] Starting eBay API MCP Server
[2024-01-15 10:30:45] [INFO] [Auth] Loading tokens from runtime config
[2024-01-15 10:30:46] [INFO] [Auth] Access token refreshed successfully
[2024-01-15 10:30:46] [HTTP] [API] Request: GET https://api.ebay.com/sell/inventory/v1/inventory_item
[2024-01-15 10:30:47] [HTTP] [API] Response: 200 OK
```
