# 0004 — CI workflow architecture

**Status:** Accepted · 2026-07-02 · `ui/` gate follow-up **resolved** by [0006](0006-close-style-backlog.md)

> **Status update (2026-10-12):** The CI Gate shape stands. Changes since:
> `typecheck.yml` runs `typecheck:mcp-apps` (was `typecheck:ui`, renamed in #186);
> `api-sync.yml` keeps only the `sync-check` job (the API-status doc updater was
> deleted in #186); `e2e.yml` exists as a template not wired into `ci.yml`; and
> `release.yml` changed — `.changeset/` was removed by v1.16.0, and a merged PR to
> `main` (unless labelled `no-release`) now takes the bump from its `major`/`minor`
> label (patch otherwise), names the release after the PR title, tags the version
> without a bump commit, and dispatches `publish.yml`.
> Current gate commands: [AGENTS.md](../../../AGENTS.md).

## Context

`.github/workflows/` had grown ad-hoc: `ci.yml` ran **tests only** (no
lint/typecheck/build); `weekly-unit-tests.yml` duplicated that test job under a
misleading name; two near-identical cron workflows (`api-status-sync.yml` @ 08:00,
`weekly-api-sync.yml` @ 09:00) drifted apart. Because CI never ran lint/typecheck,
two latent breakages hid for a long time (an invalid Biome config, a broken `ui/`
typecheck — see [0001](0001-formatter-biome.md)).

## Decision

Adopt a **reusable single-purpose gate** (each leg is `on: workflow_call`):

- `ci.yml` — orchestrator on push/PR to `main`/`dev`; composes the legs and
  exposes one aggregated **`CI Gate`** status check (require it in branch
  protection instead of five separate checks). On a **main** failure it calls
  `report-failure.yml`, which opens/updates a `ci-failure` issue with the failing
  job's captured log tail.
- `biome.yml` — `pnpm run check:ci` (`biome ci .`), single-leg (ubuntu, Node 24) —
  deterministic, no matrix.
- `typecheck.yml` — `pnpm run typecheck` (`tsc --noEmit`, **src only**),
  single-leg.
- `test.yml` — unit + hermetic integration across the matrix; coverage runs once,
  informational and non-blocking.
- `build.yml` — `pnpm run build` across the matrix.

**Matrix:** `test` + `build` run on `[ubuntu, windows, macos] × [20, 22, 24]`
(cross-environment bugs surface here); `biome` + `typecheck` are single-leg.
`package.json` `engines.node` is bumped to `>=20`.

**Crons:** merged into one `api-sync.yml` (single schedule, two independent jobs:
`update-status-doc`, `sync-check`). `publish.yml` (npm OIDC trusted publishing),
`release.yml`, and `weekly-cleanup.yml` are unchanged.

Deleted: `weekly-unit-tests.yml`, `api-status-sync.yml`, `weekly-api-sync.yml`.

## Consequences

- One required check; a red leg blocks merge; main failures are legible from an
  issue, not just the Actions log.
- **`ui/` typecheck** was deliberately out of the gate (uncommitted
  `ui/tsconfig.json`; `ui/*.tsx` failed on `class` vs `className`). **Resolved
  2026-07-04** by [0006](0006-close-style-backlog.md): the config is committed,
  the sources fixed, and `typecheck.yml` now runs `typecheck:ui` alongside `src`.
- Integration is hermetic (`nock`, net-connect disabled), so it's safe on every
  matrix leg.
