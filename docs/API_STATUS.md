# eBay API Status and Coverage

This page used to hold a committed snapshot of the eBay API Status RSS feed, written by a docs-sync script that no longer exists. Status and coverage are now reported live instead of committed.

## eBay platform status (outages, incidents)

- Ask the server: the `ebay_get_api_status` tool fetches the [eBay API Status RSS feed](https://developer.ebay.com/rss/api-status) on demand (`src/utils/apiStatusFeed.ts`, registered in `src/tools/categories/developer.ts`). It needs no eBay credentials.
- Or check [developer.ebay.com/support/api-status](https://developer.ebay.com/support/api-status) directly.

## Endpoint coverage

The server exposes **379 tools across 356 endpoints** (see the `package.json` description; `tests/unit/advertisedToolCount.test.ts` pins the advertised count to the tool registry).

Coverage against eBay's OpenAPI specs comes from `pnpm sync` (`src/scripts/devSync.ts`):

```bash
pnpm sync              # download specs, regenerate types, report endpoints with no tool
pnpm sync --report     # report only, from the cached specs
```

It downloads the specs listed in `src/scripts/specSources.ts` into `.cache/ebay-specs/` (git-ignored), regenerates the types under `src/types/`, prints the endpoints that have no tool yet, and writes `devSyncReport.json` (git-ignored) with `endpointsInSpecs`, `toolsImplemented`, and `missingEndpoints`. If no spec downloads succeed, it warns that the numbers reflect the cached specs, not eBay's live APIs.

`.github/workflows/api-sync.yml` runs `pnpm sync` on the 1st and 22nd of each month, uploads the report as a workflow artifact, and opens an `api-sync` issue when endpoints are missing.

## APIs covered

REST APIs with OpenAPI specs (tracked by `pnpm sync`, see [sell-apps/README.md](sell-apps/README.md) for the spec URLs):

- **Application settings (Developer):** Analytics, Key Management, Client Registration
- **Listing management:** Inventory, Feed, Media, Stores
- **Listing metadata:** Metadata, Taxonomy, Charity
- **Account management:** Account v1, Account v2, Finances
- **Communication:** Message, Notification, Negotiation, Feedback
- **Order management:** Fulfillment, Logistics
- **Marketing and promotions:** Marketing, Recommendation
- **Analytics:** Analytics
- **Other:** Translation, Identity, eDelivery International Shipping, VeRO

Also exposed, outside the spec sync: the Trading API (XML) and Browse (`trading` and `browse` tool families in `src/config/toolFamilies.ts`).
