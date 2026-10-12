# ebay-mcp Architecture

The real file map and the pipeline a tool call flows through. Orientation is in
[CONTEXT.md](CONTEXT.md); code idioms are in [CODE-STYLE.md](CODE-STYLE.md).

## Layout

```txt
src/
├── index.ts          # bin entry — routes `setup` / `skills` / `diagnose`, else runs the MCP stdio server
├── serverHttp.ts     # HTTP transport entry point
├── api/              # eBay API area classes — one subfolder per area
│                     #   (account-management, order-management, marketing-and-promotions, …)
│                     #   ebaySellerApi.ts — the EbaySellerApi facade
│                     #   client/ — ebayApiClient.ts (REST), tradingApiClient.ts (Trading XML),
│                     #     ebayClientRequestError.ts, tradingApiFailure.ts, rateLimitTracker.ts
│                     #   shared/ — request/params helpers, decodeEndpointInputEffect, downloads
├── auth/             # OAuth 2.0 flow, token store + write-back, JWT verification, setup callback helper
├── config/           # environment loading, oauthScopes, toolFamilies, mediaAccess (local-media allowlist)
├── mcp/              # runtime.ts, httpTransport.ts, toolGating.ts, readOnlyFilter.ts, uiBridge.ts
├── tools/            # tool wiring: defineTool.ts, registry.ts, contracts.ts, schemas.ts, fileResult.ts,
│                     #   types.ts, categories/ (one file per family), ui/ (archetypes + view-model maps)
├── schemas/          # Zod endpoint input schemas by family (see schemas/README.md)
├── skills/           # agent-skills generator (`ebay-mcp skills`)
├── scripts/          # CLI tooling (setup, skills, diagnostics, devSync + specSources, buildMcpApps, …)
├── types/            # generated OpenAPI types — do NOT hand-edit (`pnpm sync`)
└── utils/            # platform primitives: logging, logRedaction, http, errors, zodIssues, envFile,
                      #   entryModule, version, cliUi, localMedia, trading/ and communication/ helpers
mcp-apps/             # React MCP Apps views (table, card, chart, stat) → build/ui/*.html
tests/                # unit/, integration/ (hermetic, nock), helpers/
```

## Pipeline — a tool call

```txt
src/schemas/<family>/*.ts               # Zod input schema = SSOT
src/tools/categories/<family>.ts
  → defineTool(spec)                     # .shape = wire schema + handler arg types
  → registry (src/tools/registry.ts)     # assembles ToolEntry[] from categories/index.ts

host call → registry.executeTool
  → defineTool handler                   # schema.safeParse(args); failure → ToolInputError
  → EbaySellerApi facade                 # api.<area>.<method>
  → src/api/<area>/*.ts                  # Effect-returning endpoint method
      decodeEndpointInputEffect          # failure → EndpointInputError
      requestGetEffect / requestPostEffect / …   (src/api/shared/request.ts)
  → EbayApiClient (REST)  |  TradingApiClient (XML, fast-xml-parser)
  → eBay                                 # failure → tagged errors (EbayApiError, …)
  ← generated DTO  → optional formatResult / MCP Apps view model
                     (archetype: table | card | chart | stat)  → host
```

Effects run with `Effect.runPromise` only at the boundary (the tool handler, HTTP, or
CLI). Tool exposure is gated by `EBAY_MCP_TOOLS` (`all` | `dynamic` | family list) and
`EBAY_READ_ONLY`, applied in `src/mcp/runtime.ts`. MCP Apps views are on by default
(`EBAY_MCP_UI=off` disables them). Both transports (`index.ts` stdio, `serverHttp.ts`)
wrap the same runtime; **stdout is reserved for the protocol**, so logs go to stderr.

## Family map (MCP key ↔ folders)

Three parallel naming systems on purpose — do **not** mass-rename to force one vocabulary:

| MCP family (`EBAY_MCP_TOOLS`) | `src/tools/categories/` | `src/api/` | `src/schemas/` |
| --- | --- | --- | --- |
| `connector` | `connector.ts` | — (catalogue meta) | — (inline) |
| `token-management` | `tokenManagement.ts` | via `auth/` | — (inline) |
| `account` | `account.ts`, `accountV2.ts` | `account-management/` (`account.ts`, `accountV2.ts`) | `account-management/` |
| `finances` | `finances.ts` | `account-management/finances.ts` | `account-management/finances.ts` |
| `inventory` | `inventory.ts`, `media.ts` | `listing-management/` (inventory, items, offers, locations, media) | `inventory-management/` |
| `feed` | `feed.ts` | `listing-management/` (`feed*.ts`) | `inventory-management/feed.ts` |
| `stores` | `stores.ts` | `listing-management/stores.ts` | `inventory-management/stores.ts` |
| `fulfillment` | `fulfillment.ts` | `order-management/` (fulfillment, dispute) | `fulfillment/orders.ts` |
| `logistics` | `logistics.ts` | `order-management/logistics.ts` | `fulfillment/logistics.ts` |
| `marketing` | `marketing.ts` | `marketing-and-promotions/` (campaigns/ads/promotions/reports + facade) | `marketing/` (same slices + `marketing.ts` barrel) |
| `analytics` | `analytics.ts` | `analytics-and-report/` | `analytics/` |
| `metadata` | `metadata.ts` | `listing-metadata/` (`metadata.ts`, `metadataShipping.ts`) | `metadata/` (`metadata.ts`, `shipping.ts`) |
| `taxonomy` | `taxonomy.ts`, `charity.ts` | `listing-metadata/` (taxonomy, charity) | `taxonomy/` |
| `communication` | `communication.ts` | `communication/` | `communication/` + handler schemas in `utils/communication/` |
| `browse` | `browse.ts` | `other/` (Browse, Finding) | `other/` (`browse.ts`, `finding.ts`) |
| `other` | `other.ts` | `other/` | `other/otherApis.ts` |
| `developer` | `developer.ts` | `developer/` | `developer/` |
| `trading` | `trading.ts` | `trading/` | — (Trading XML shapes in `utils/trading/`) |

`src/config/toolFamilies.ts` holds the family keys and must match `toolCategories` in
`src/tools/categories/index.ts` (unit-tested).

Generated OpenAPI types live under `src/types/sell-apps/` (and
`src/types/application-settings/`). `pnpm sync` downloads each spec listed in
`src/scripts/specSources.ts` into the gitignored `.cache/ebay-specs/<folder>/` and
generates types into the matching `src/types/<folder>/`. Hand-written code should import
those generated paths as-is; do not invent parallel DTOs.

## Schema ownership

| Surface | Owns |
| --- | --- |
| `src/tools/schemas.ts` | Shared primitives reused across families (money, dimensions, enums wrappers, …) |
| `src/schemas/<family>/` | Endpoint/tool **input** (and when needed response) schemas for that family |
| `src/types/**` | Generated eBay DTOs — never hand-edit; regenerate with `pnpm sync` |

The validation layer is Zod only: schemas import `z` from `zod`, `defineTool` and
`decodeEndpointInputEffect` validate with `safeParse`, and `formatZodIssues`
(`src/utils/zodIssues.ts`) turns failures into one readable field list. New endpoint
tools: author the input schema under `src/schemas/…`, pass its `.shape` to `defineTool`,
return generated response types from API methods. Do not add a third schema home. Rules:
[src/schemas/README.md](src/schemas/README.md).

## Build output

`build/` is generated (`tsc` + `tsc-alias` + the MCP Apps bundle from
`src/scripts/buildMcpApps.ts` into `build/ui/`) and gitignored. After renames, wipe
stale artifacts with `rm -rf build && pnpm build`. Do not commit `build/`.

`devSyncReport.json` is generated by `pnpm sync` and is gitignored; CI may upload it as
an artifact.

## Code style (the load-bearing rules)

Full guide: [CODE-STYLE.md](CODE-STYLE.md). In short:

| Rule | Shape |
| --- | --- |
| Imports | `@/` alias except same-dir siblings; keep NodeNext `.js` |
| Files | hand-written source/test/MCP-Apps basenames are camelCase and named after their main export; generated/upstream filenames keep source names |
| Names | domain names, not `data` / `result` / `response` / `item` / `value` / `err` / single letters; declaring `resolve` is banned (tested) |
| Casts | boundary-only; never `as any`; no hand-written source excluded from typecheck |
| Functions | new/migrated exported functions use `export const ... = (...) =>`; named exports only |
| Errors | fallible API/IO returns typed Effects (`Data.TaggedError`); run with `Effect.runPromise` only at MCP/HTTP/CLI boundaries |
| Tools | Zod schema `.shape` is the tool input SSOT; co-locate definition + handler in `categories/` via `defineTool` |
| File size | Biome warns > ~300 lines/file, ~60 lines/function on logic dirs; declarative/generated/table files are warning-exempt |

Enforcement is **Biome** (`biome.json`) + `tsc` + unit-test guards
(`tests/unit/bannedIdentifiers.test.ts`, `tests/unit/advertisedToolCount.test.ts`), run as
`pnpm check:ci`, `pnpm typecheck`, `pnpm typecheck:mcp-apps`, and `pnpm test`. (There is
no `lint:lines` script; size caps are Biome rules.)

Historical deepening notes (mostly implemented): [docs/archive/architecture-deepening-opportunities.md](docs/archive/architecture-deepening-opportunities.md).
