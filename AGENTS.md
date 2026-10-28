# AGENTS.md

Guidance for coding agents (and humans) working **on** this repo. For using the server, see [README.md](README.md).

## What this is

A local [MCP](https://modelcontextprotocol.io) server exposing 379 tools across 356 endpoints — 100% of the eBay Sell, Commerce and Developer APIs it tracks. TypeScript/Node.js (ESM), built with `@modelcontextprotocol/sdk`, Zod input schemas, Effect for async work and typed errors, and OpenAPI-generated types.

- **Entry points:** `src/index.ts` (STDIO transport — default; also routes the `setup` / `skills` / `diagnose` subcommands) and `src/serverHttp.ts` (HTTP transport).
- **Runtime:** Node.js ≥ 20. Package manager: pnpm (`pnpm@10.14.0`); `npm run <script>` works too.

## Instruction sources

- **Shared agent contract:** this `AGENTS.md`.
- **Claude Code:** [CLAUDE.md](CLAUDE.md) imports `AGENTS.md`; keep Claude-only notes there only when needed.
- **GitHub Copilot:** [.github/copilot-instructions.md](.github/copilot-instructions.md) keeps Copilot-specific reminders and points back here.
- **Code style:** [CODE-STYLE.md](CODE-STYLE.md) owns the full rules; the digest below must stay aligned with it.
- **Schemas:** [src/schemas/README.md](src/schemas/README.md) owns the schema-writing rules (upstream keeps it current).
- **Domain/architecture read order:** [CONTEXT.md](CONTEXT.md), [LANGUAGE.md](LANGUAGE.md), [ARCHITECTURE.md](ARCHITECTURE.md), [PROJECT.md](PROJECT.md), then relevant ADRs in `docs/adr/current/` (historical records — read their status notes).
- **User docs:** [README.md](README.md) is for installing and using the server, not contributor or agent rules. It is upstream's and authoritative for user-facing features; the fork does not edit it.
- **Other agent surfaces:** add `GEMINI.md`, `.cursor/rules`, `.kiro/steering`, or `.roo/rules*` only for genuinely tool-specific or path-scoped behavior.

## Validation commands

Run before opening a PR:

```bash
pnpm check:ci           # biome ci . (lint + format)                     — must pass
pnpm typecheck          # tsc --noEmit (src)                             — must pass
pnpm typecheck:mcp-apps # tsc -p mcp-apps/tsconfig.json --noEmit         — must pass
pnpm test               # vitest run (unit)                              — must pass
pnpm test:integration   # vitest (hermetic integration suite)            — must pass
pnpm build              # tsc + tsc-alias + MCP Apps bundle → build/     — must pass
```

`pnpm verify` chains `check:ci`, both typechecks, `test`, and `build` (everything above
except `test:integration`). `pnpm check` (`npm run check`) is the quick local pass: both
typechecks plus `biome check` over `src/` and `mcp-apps/`.

Since v2.0, lint and typecheck run locally in the `.husky/pre-push` hook (all six commands
above except `test:integration`); `ci.yml` runs only tests and the build on Linux, behind one
**CI Gate** status check, and on pull requests tests only the changed files — see
[docs/adr/current/0004-ci-workflow-architecture.md](docs/adr/current/0004-ci-workflow-architecture.md)
and its status note.

Other useful scripts:

| Command              | Purpose                                                                         |
| -------------------- | ------------------------------------------------------------------------------- |
| `pnpm dev`           | Run the STDIO server from source (tsx)                                          |
| `pnpm fix`           | Auto-fix lint + format (Biome) over `src/` and `mcp-apps/`                      |
| `pnpm test:coverage` | Unit tests with coverage                                                        |
| `pnpm build:mcp-apps` | Rebuild only the MCP Apps views (`mcp-apps/` → `build/ui/*.html`)               |
| `pnpm setup`         | Interactive credential/OAuth/client setup wizard (runs from `build/`)           |
| `pnpm sync`          | Download eBay OpenAPI specs, regenerate `src/types/`, report missing endpoints  |
| `pnpm diagnose`      | Check configuration and connectivity (runs from `build/`)                       |
| `pnpm skills`        | Install AI skills (Codex / Claude Code / Cursor) for using or contributing      |

## Module map (`src/`)

| Path            | Owns                                                                                                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`      | bin entry — routes `setup` / `skills` / `diagnose`, else runs the MCP STDIO server                                                                                                                    |
| `serverHttp.ts` | HTTP transport entry point                                                                                                                                                                           |
| `api/`          | eBay API area classes, one subfolder per area; `ebaySellerApi.ts` (the `EbaySellerApi` facade); `client/` (`ebayApiClient.ts` REST, `tradingApiClient.ts` Trading XML, their errors, rate limits); `shared/` (request/params/download helpers) |
| `auth/`         | OAuth 2.0 flow, token store and write-back (`credentialSession.ts`), JWT verification (`tokenVerifier.ts`, `jose`), setup callback helper (`oauthHelper.ts`)                                          |
| `config/`       | Environment loading, OAuth scope lists (`oauthScopes.ts`), tool families (`toolFamilies.ts`), local-media allowlist (`mediaAccess.ts`)                                                                 |
| `mcp/`          | Server runtime (`runtime.ts`), HTTP transport, tool gating (`toolGating.ts`), read-only filter (`readOnlyFilter.ts`), MCP Apps bridge (`uiBridge.ts`)                                                 |
| `tools/`        | MCP tool wiring — `defineTool.ts`, `registry.ts`, `contracts.ts`, `schemas.ts` (shared primitives), `fileResult.ts`, `categories/` (one file per family; each tool definition co-located with its handler), `ui/` (archetypes + view-model mappers) |
| `schemas/`      | Zod endpoint input (and some response) schemas, one folder per API family — see [src/schemas/README.md](src/schemas/README.md)                                                                        |
| `skills/`       | Agent-skills generator (`ebay-mcp skills`) — renders using/contributing skills for Codex, Claude Code, and Cursor                                                                                     |
| `types/`        | TypeScript types — **auto-generated** from OpenAPI specs by `pnpm sync` (don't hand-edit)                                                                                                            |
| `scripts/`      | CLI tooling: setup/diagnostics, wizards/validators, `devSync.ts` + `specSources.ts`, `skills.ts`, `buildMcpApps.ts`                                                                                   |
| `utils/`        | Platform primitives — logging + `logRedaction.ts`, `http.ts`, `errors.ts`, `zodIssues.ts`, `envFile.ts`, `entryModule.ts`, `cliUi.ts`, `localMedia.ts`, Trading/communication helpers — not setup UX |

Outside `src/`: `mcp-apps/` (React MCP Apps views, built into `build/ui/`), `tests/` (`unit/`, `integration/`, `helpers/`), `scripts/` (fork-only shell helpers).

## Adding a new API endpoint

1. `pnpm sync` — downloads the specs listed in `src/scripts/specSources.ts` (cached in `.cache/ebay-specs/`), regenerates `src/types/`, and reports missing endpoints (full list in `devSyncReport.json`, gitignored).
2. Write the Zod input schema in `src/schemas/<family>/` (`import { z } from 'zod'`, `.describe()` every field) — rules in [src/schemas/README.md](src/schemas/README.md).
3. Add the Effect-returning method, named after the spec's exact `operationId`, to the area class in `src/api/<area>/`, decoding input with `decodeEndpointInputEffect` and calling the request helpers in `src/api/shared/request.ts`. A new area is exposed through `src/api/ebaySellerApi.ts`.
4. Add a `defineTool({ ..., inputSchema: <schema>.shape, handler })` entry in `src/tools/categories/<family>.ts`; the handler runs the endpoint Effect with `Effect.runPromise`. `registry.ts` derives everything from `src/tools/categories/index.ts`; a new family also needs its key in `src/config/toolFamilies.ts` (a unit test keeps the two in sync).
5. Add tests in `tests/`. A new tool changes the advertised count: update it in `package.json`, `README.md`, and `llms.txt` (`tests/unit/advertisedToolCount.test.ts` fails until they match).
6. Run the validation commands above.

## Conventions

<!-- rules digest — full guide in CODE-STYLE.md; edit there -->

- **Imports:** `@/` alias for anything outside the current folder; `./sibling.js` only for same-dir. Keep NodeNext `.js` extensions (not `.ts`).
- **Files:** hand-written source/test/MCP-Apps file basenames are camelCase, never kebab-case or snake_case, and are named after their main export (`ebayApiClient.ts` exports `EbayApiClient`). Generated specs/types keep upstream names.
- **Names:** no generic local or parameter names (`data`, `body`, `result`, `response`, `item`, `value`, `req`/`res`, `e`/`err`, single letters) — use domain names. Declaring an identifier named `resolve` is banned (`tests/unit/bannedIdentifiers.test.ts`).
- **Functions & exports:** new/migrated exported functions use `export const ... = (...) =>`; named exports only (no default exports). Existing API classes may stay classes, with endpoint methods as public arrow properties.
- **Schemas:** Zod only. Schemas import `z` from `zod` directly; there is no schema adapter or barrel to go through, and no compatibility re-export facades. The endpoint input schema is the SSOT: `defineTool` takes its `.shape` as the MCP wire schema and handler arg types, and validates raw args with `safeParse`, throwing `ToolInputError` with a readable field list (`formatZodIssues` in `src/utils/zodIssues.ts`). Endpoint methods decode the same schema with `decodeEndpointInputEffect`, failing with `EndpointInputError`.
- **Effect & errors:** fallible async/API work returns `Effect.Effect<Success, TaggedError, Requirements>` with `Data.TaggedError` errors; run with `Effect.runPromise` only at MCP/HTTP/CLI boundaries. No endpoint/tool `try/catch`. Handlers run one endpoint Effect without response reshaping.
- **Docs:** endpoint-backed API methods require TSDoc with `@param`, `@returns`, a small `@example`, and the official eBay `@see` URL. Exported shared utilities document params/returns; public generated-response aliases include `@see`.
- **Types:** no `as any` — narrow, or use a documented boundary cast; no hand-written source excluded from typecheck. `types/` is generated — model new shapes from the specs, don't hand-edit.
- **Local files:** only the media tools (`src/tools/categories/media.ts`) and the Feed upload tool (`ebay_upload_feed_task_file` in `src/tools/categories/feed.ts`) read the filesystem, and only through `src/utils/localMedia.ts` against the `EBAY_MCP_MEDIA_DIRS` / `EBAY_MCP_MEDIA_ROOT` allowlist (realpath + containment). `ebay_attach_media_to_inventory_item` is the one deliberate multi-endpoint composite besides `ebay_get_offers_by_skus`; do not add others without the same per-item result reporting.
- **Downloads:** binary endpoints use `requestDownloadEffect` (`src/api/shared/download.ts`) and the tool's `formatResult` returns `formatFileResult` (`src/tools/fileResult.ts`, an embedded MCP resource); never write files to disk. Files over `MAX_INLINE_DOWNLOAD_BYTES` (25 MiB) fail with `DownloadTooLargeError`.
- **API params:** endpoint methods pass an allowed-key object to the shared params builder (`buildEndpointParams`). The builder owns omission/normalization; endpoints own wire names.
- **Mapping/UI:** API returns generated eBay DTOs. MCP Apps views map only at the presentation boundary (`ui.map` on the tool, archetypes `table` / `card` / `chart` / `stat`); no one-use `toXRow` helpers and no `?? 'unknown'` display fallbacks. The UI is on by default; `EBAY_MCP_UI=off` disables it.
- **Size:** split by purpose, not line count alone. Biome warns past ~300 lines/file and ~60 lines/function on logic dirs; declarative/generated/table files stay warning-exempt.
- **Logs** go to **stderr** in runtime code (stdout is reserved for the MCP protocol) — see [docs/logging.md](docs/logging.md). Secrets are redacted via `src/utils/logRedaction.ts`. Human CLI commands may print to stdout.
- **CLI:** keep the hand-written router lean. Bare TTY commands may prompt; flags or non-TTY must never hang. Use `isEntryModule()` (`src/utils/entryModule.ts`) for "run when executed directly" checks.
- **Tool exposure** is gated by `EBAY_MCP_TOOLS` (`all` | `dynamic` | family list). The env parsing/validation lives in `src/config/toolFamilies.ts` (kept free of tool-tree imports to avoid a cycle with `src/config/environment.ts`); the dynamic-mode discovery meta-tools and catalogue live in `src/mcp/toolGating.ts`; `src/mcp/runtime.ts` applies the mode, and `EBAY_READ_ONLY` filters to read-only tools on top of it. Family keys must stay in sync with `toolCategories` (a unit test enforces this).
- Commit with [Conventional Commits](https://www.conventionalcommits.org/). Upstream cuts a release when a PR lands on `main` (`.github/workflows/release.yml`): the `major`/`minor` PR label picks the bump (patch otherwise, `no-release` skips), and the squash-merged PR title names the release; there are no changesets.

Full style guide: [CODE-STYLE.md](CODE-STYLE.md). Architecture map: [ARCHITECTURE.md](ARCHITECTURE.md).

## Fork (marlermedia)

This clone is jmarler's fork of `YosefHayim/ebay-mcp` (remotes: `origin` = upstream, `fork` = `jmarler/ebay-mcp`).

- **Branches:** `main` mirrors upstream exactly (fast-forward only — never commit fork work there). `marlermedia` carries the fork's changes on top.
- **Catch-ups:** fast-forward `main` from upstream, then rebase `marlermedia` onto `main`. On every catch-up, refresh these docs against the code (paths, scripts, counts, new API areas) — upstream changes land under them silently.
- **Restored docs:** upstream #186 deleted every root markdown file except `README.md`, plus `docs/`. The fork keeps them; `tests/unit/forkDocs.test.ts` fails when one links to a missing file, names a backticked repo path that no longer exists, or cites a package script that is gone. `CHANGELOG.md`, `docs/archive/`, and the ADRs are historical and exempt.
- **Fork-only behavior** (not upstream):
  - Taxonomy `getItemAspectsForCategory` trims output via `requiredOnly` / `maxValuesPerAspect`.
  - Trading `getActiveListings` returns a compact view by default, with a `fields` param (`["all"]` for the raw response).
  - Analytics traffic-report guidance: `sort` must be a metric, not a dimension.
  - The inventory generated body schema advertises `type: object` so hosts send an object, not a string.
  - Fulfillment-policy guidance points at `ebay_get_shipping_services`; the `getOrders` filter example uses full ISO timestamps.
  - Production scopes in `src/config/oauthScopes.ts` omit `commerce.feedback.readonly` (eBay grants it only to the client-credentials grant; requesting it in the auth-code flow fails with `invalid_scope`).
  - Order table/card MCP Apps views show eBay fees.
  - Token write-back skips a `.env` that is not a regular file (`src/auth/credentialSession.ts`).
  - `Dockerfile` pins pnpm 10.14.0 and defaults `CMD` to STDIO (`build/index.js`).
- **Local Docker container:** `scripts/dockerUp.sh` recreates the `ebay-mcp` HTTP container (`node build/serverHttp.js` on `127.0.0.1:3000`) with credentials resolved from 1Password by `op run` using the references in `scripts/opSecrets.env` (no secrets in the repo). Build the image first with `docker build -t ebay-mcp:latest .`.

## Agent skills

### Issue tracker

Upstream issues and PRDs are tracked in GitHub Issues for `YosefHayim/ebay-mcp`. See [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md).

### Triage labels

The repo uses the default five-label triage vocabulary. See [docs/agents/triage-labels.md](docs/agents/triage-labels.md).

### Domain docs

This is a single-context repo: use root [CONTEXT.md](CONTEXT.md) and `docs/adr/`. See [docs/agents/domain.md](docs/agents/domain.md).
