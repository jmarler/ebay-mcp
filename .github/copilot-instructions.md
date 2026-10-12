# GitHub Copilot Instructions

Shared repo guidance lives in [AGENTS.md](../AGENTS.md), and full style rules live in [CODE-STYLE.md](../CODE-STYLE.md). Use this file only for Copilot-specific reminders.

## Core expectations

- This is a TypeScript/Node.js ESM MCP server for eBay APIs. Keep NodeNext `.js` extensions in imports.
- Use `@/` aliases for imports outside the current folder; use `./sibling.js` only for same-directory imports.
- Hand-written source, test, and MCP Apps (`mcp-apps/`) file basenames are camelCase and named after their main export. Generated specs/types keep upstream names.
- Use domain names, not generic ones (`data`, `result`, `response`, `item`, `value`, `err`, single letters). Never declare an identifier named `resolve`.
- New or migrated exports use named `export const ... = (...) =>` functions. Do not add default exports.
- Do not hand-edit files under `src/types/`; they are generated from eBay OpenAPI specs by `pnpm sync`.

## Schema and API patterns

- Tool input schemas are Zod: import `z` from `zod` directly and author them under `src/schemas/<family>/` (rules in [src/schemas/README.md](../src/schemas/README.md)). Do not add compatibility re-export facades.
- Register tools with `defineTool({ inputSchema: <schema>.shape, handler })`; `defineTool` validates args with `safeParse` and throws `ToolInputError`. Endpoint methods decode input with `decodeEndpointInputEffect` (`EndpointInputError`).
- Fallible API work returns `Effect.Effect<Success, TaggedError, Requirements>`. Run Effects at MCP, HTTP, CLI, or test boundaries.
- Do not add endpoint/tool `try/catch` when the work can be represented with Effect.
- Endpoint-backed handlers should run one endpoint Effect and return the generated eBay DTO without response reshaping.

## Documentation and tests

- Endpoint-backed API methods need TSDoc with `@param`, `@returns`, a small `@example`, and the official eBay `@see` URL.
- Exported shared utilities document params and returns. Public aliases based on generated response types include `@see`.
- Prefer focused tests near the changed behavior, then run the relevant validation command before claiming the change is done.

## Validation

Use the same gates as `AGENTS.md`:

```bash
pnpm check:ci
pnpm typecheck
pnpm typecheck:mcp-apps
pnpm test
pnpm test:integration
pnpm build
```

`pnpm verify` runs all of these except `test:integration`.
