# CONTEXT.md

Orientation for anyone (human or agent) landing in this repo. _What it is, who
talks to it, and the shape data moves through_ — not a glossary (that's
[LANGUAGE.md](LANGUAGE.md)) and not the file map (that's
[ARCHITECTURE.md](ARCHITECTURE.md)).

## What it is

A **local [MCP](https://modelcontextprotocol.io) server** that exposes eBay's
Sell, Commerce and Developer APIs — 379 tools across 356 endpoints — to AI assistants. It runs on the
developer's machine (or a container), speaks the Model Context Protocol over
**STDIO** (default) or **HTTP**, holds the eBay OAuth tokens, and turns each tool
call into an authenticated eBay API request.

Coverage spans Account (v1 and v2), Finances, Inventory (with Media, Feed, and
Stores), Fulfillment and Logistics, Marketing, Analytics, Metadata (including
shipping services/carriers), Taxonomy, Communication, Developer, the legacy
Trading API, and a small Browse/Finding family for pricing comps.

It is **not** a hosted service. The product is the tool surface and the
auth/plumbing behind it; a small MCP Apps view layer (`mcp-apps/`) renders
selected results for hosts that support it.

## Actors

```
┌────────────────────┐   MCP (stdio/http)   ┌──────────────────┐   HTTPS   ┌────────────────┐
│  MCP host           │ ───────────────────► │  ebay-mcp server │ ────────► │  eBay APIs     │
│  Claude / Cursor /  │ ◄─────────────────── │  (this repo)     │ ◄──────── │  Sell + Trading│
│  Cline / agent      │     tool results     │                  │           └────────────────┘
└────────────────────┘                       └──────────────────┘
                                                     │
                                              OAuth token store
                                              (refresh-token flow)
```

- **MCP host** — the agent runtime that discovers and calls tools.
- **ebay-mcp server** — validates input against the tool's Zod schema, routes to
  the right eBay area, authenticates, and returns eBay's response.
- **eBay APIs** — the modern **Sell** REST APIs and the legacy **Trading** XML
  API, depending on the area.
- **OAuth** — user/app tokens obtained via `ebay-mcp setup`, refreshed
  automatically and written back to `.env`; scopes listed in
  `src/config/oauthScopes.ts`; JWTs verified with `jose`.

## Shape — a tool call, end to end

```
host calls "ebay_get_kyc"
  → registry looks up the ToolEntry
  → defineTool handler validates args against the Zod shape (safeParse → ToolInputError)
  → EbaySellerApi facade  (api.account.getKyc)
  → area API class        (src/api/account-management/account.ts)
      decodeEndpointInputEffect → request helper → Effect
  → EbayApiClient (REST)  or  TradingApiClient (XML, fast-xml-parser)
      failures surface as tagged errors (EbayApiError, …)  → eBay
  ← generated eBay DTO  → (optional) MCP Apps view model  → host
```

Cross-cutting concerns that shape the surface:

- **Tool gating** (`EBAY_MCP_TOOLS`): `all` exposes everything; `dynamic` exposes
  discovery meta-tools that reveal families on demand (to keep an agent's context
  small); a family list exposes just those. `EBAY_READ_ONLY` additionally drops
  write tools. Applied in `src/mcp/runtime.ts`.
- **MCP Apps UI**: on by default for hosts that advertise support; `EBAY_MCP_UI=off`
  disables it (`src/mcp/uiBridge.ts`).
- **Transports**: `src/index.ts` (STDIO) and `src/serverHttp.ts` (HTTP) wrap the
  same runtime; **stdout is reserved for the protocol**, so all logs go to stderr.

## Where to look first

- Using the server → [README.md](README.md)
- Working on the code → [AGENTS.md](AGENTS.md) + [CODE-STYLE.md](CODE-STYLE.md)
- The file map → [ARCHITECTURE.md](ARCHITECTURE.md)
- Vocabulary → [LANGUAGE.md](LANGUAGE.md)
- Schemas → [src/schemas/README.md](src/schemas/README.md)
- Why a decision was made → [docs/adr/current/](docs/adr/current/)
