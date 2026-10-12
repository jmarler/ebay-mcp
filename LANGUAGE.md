# LANGUAGE.md

The human↔agent vocabulary bridge: **names only** — each term, its definition,
and aliases to avoid. Use these exact words in code, commits, and PRs. Concepts
and flow live in [CONTEXT.md](CONTEXT.md); this file just pins the names.

| Term | Means | Avoid calling it |
| --- | --- | --- |
| **tool** | One MCP-exposed capability (name + input schema + handler). The unit an agent calls. | "endpoint", "command", "function" |
| **family** / **category** | A group of related tools exposed under one `EBAY_MCP_TOOLS` key (connector, token-management, account, finances, inventory, feed, stores, fulfillment, logistics, marketing, analytics, metadata, taxonomy, communication, browse, other, developer, trading). Tools live in `src/tools/categories/`; a family may span files (account = `account.ts` + `accountV2.ts`). | "module", "domain" |
| **`defineTool`** | The factory binding a tool's Zod raw shape to its handler; the shape is the SSOT for both wire schema and arg types, and the handler validates args against it. | "registerTool", "createTool" |
| **`rawTool`** | Variant of `defineTool` that skips re-validating args (the handler validates against its own schema). Currently unused. | — |
| **`ToolSpec`** | The input to `defineTool` (name, description, inputSchema, handler, optional `formatResult` and `ui`). | — |
| **`ToolEntry`** | The output of `defineTool` (definition + handler + resolved ui); what the registry stores. | — |
| **`ToolInputError`** | Tagged error `defineTool` throws when tool args fail the Zod schema; its message lists the failed fields. | "validation exception" |
| **`EndpointInputError`** | Tagged error `decodeEndpointInputEffect` fails with when endpoint input fails its Zod schema. | — |
| **registry** | `src/tools/registry.ts` — assembles all `ToolEntry`s from `categories/` and exposes `executeTool`. | "router" (that's the CLI sense) |
| **gating** | Controlling which tools are exposed via `EBAY_MCP_TOOLS`: **all**, **dynamic** (discovery meta-tools), or a **static** family list. | "filtering", "scoping" |
| **read-only mode** | `EBAY_READ_ONLY=true` — registers only tools classified as reads; composes with any gating mode. | — |
| **connector** | The ChatGPT connector tools (`search` / `fetch`) and the connector metadata (category/version) passed through `_meta`. | — |
| **MCP Apps** | The interactive view layer: React views in `mcp-apps/`, built to `build/ui/*.html`, on by default (`EBAY_MCP_UI=off` disables). | "widgets" |
| **archetype** | A tool's optional MCP Apps view shape: `table`, `card`, `chart`, or `stat`. | "widget", "component" |
| **area** | An eBay API surface implemented as a class under `src/api/<area>/` (e.g. account-management, order-management). | "service" |
| **facade** | `EbaySellerApi` (`src/api/ebaySellerApi.ts`) — the object handlers call (`api.account.…`, `api.fulfillment.…`) that fronts all areas. | — |
| **`EbayApiClient`** | The REST HTTP client for the modern Sell APIs (`src/api/client/ebayApiClient.ts`). | — |
| **`TradingApiClient`** | The legacy Trading **XML** client (`src/api/client/tradingApiClient.ts`, fast-xml-parser). | — |
| **`EbayApiError`** | Tagged error for a failed eBay request; its message names the method, path, and cause. | "try/catch helper" |
| **marketplace** | An eBay site/locale (e.g. `EBAY_US`), `MarketplaceId` enum. | "region", "site" (in code) |
| **scope** | An OAuth permission string granted to a token; lists live in `src/config/oauthScopes.ts`. | "permission" (in code) |
| **sync** | `pnpm sync` — download eBay specs (sources in `src/scripts/specSources.ts`), regenerate `src/types/`, report endpoints not yet exposed as tools. | "codegen" |
