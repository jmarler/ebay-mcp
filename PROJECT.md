# PROJECT.md

Purpose & direction for **ebay-mcp**. Orientation is in [CONTEXT.md](CONTEXT.md);
how to work here is [AGENTS.md](AGENTS.md).

## Problem

AI assistants can reason about selling on eBay but can't _act_ on it: eBay's Sell
APIs are broad (inventory, fulfilment, finances, marketing, analytics, metadata,
developer), split across modern REST and a legacy XML Trading API, and gated
behind OAuth. Wiring that up per-agent is repetitive and error-prone.

## Purpose

Give any MCP-capable assistant a **complete, typed, authenticated** interface to
eBay's Sell APIs through one local server — so an agent can list, fulfil, market,
and analyse on eBay without bespoke integration code.

## Users

- **Developers** embedding eBay actions into an agent (Claude, Cursor, Cline, or
  any MCP host).
- **Sellers/ops** driving eBay workflows through an assistant.
- **Contributors** extending coverage as eBay's APIs evolve.

## What it does

- Exposes **384 tools across 360 endpoints** (100% of the Sell surface) over MCP,
  including the Finances, Feed, Stores, Logistics, Account v2, and Metadata
  shipping APIs added in v1.18.
- Handles **OAuth** (setup wizard, refresh-token flow, JWT verification).
- Speaks both **STDIO** and **HTTP** transports.
- Lets operators **gate** the exposed tool set (`EBAY_MCP_TOOLS`: all / dynamic /
  family list, plus `EBAY_READ_ONLY`) to control an agent's context budget and
  blast radius.
- Ships an interactive **setup**, **skills** installer, and **diagnose** tooling.

## What it is not

- Not a hosted/multi-tenant service — it runs locally, per user.
- Not a UI product — the tool surface _is_ the product (a small MCP Apps view
  layer aside).
- Not a general eBay Buy client — the focus is the **Sell** side; the `browse`
  family covers only pricing comps (active and completed listings).

## Direction

- **Stay at 100% Sell coverage** as eBay ships/changes endpoints — the `sync`
  workflow (and the scheduled `api-sync.yml` run, which opens an issue listing
  unexposed endpoints) exists to catch drift.
- **Keep agent context lean** — dynamic tool gating is the lever; grow it rather
  than exposing all 384 tools by default.
- **Keep the contributor gate honest** — one CI Gate (Biome + typecheck of `src/`
  and `mcp-apps/` + unit/integration tests + build across an OS×Node matrix), with
  readable Zod validation errors so agents can fix their own bad input.
- **Keep the CLI hand-router lean** — a framework (commander) was evaluated and
  dropped as unused; add one only when a real need justifies the dependency
  (ADR 0002 → 0006).

## Constraints

- **Node ≥ 20**, ESM (`Node16` module resolution), pnpm. TypeScript strict;
  `src/types/` is generated (never hand-edited). Zod is the only schema library.
- **stdout is the MCP channel** — all logging goes to stderr.
- Upstream releases are cut automatically when a PR merges to `main`: the bump
  comes from the PR's `major`/`minor` label (patch otherwise; `no-release` skips),
  the PR title names the release, and the version lives in the git tag
  (`release.yml`), then `publish.yml` publishes to npm via OIDC trusted
  publishing.
- This clone is the `marlermedia` fork; see the fork section of
  [AGENTS.md](AGENTS.md#fork-marlermedia) for what it carries beyond upstream.
