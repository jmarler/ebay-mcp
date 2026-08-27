import { searchActiveItemsSchema } from '@/schemas/other/browse.js';
import { findCompletedItemsInputSchema } from '@/schemas/other/finding.js';
import { defineTool } from '@/tools/defineTool.js';
import type { ToolEntry } from '@/tools/registry.js';
import { Effect } from 'effect';

/**
 * Browse / Finding tools for public marketplace search data.
 *
 * Gated as family `browse` via `EBAY_MCP_TOOLS=browse`.
 */
export const browseEntries: ToolEntry[] = [
  defineTool({
    name: 'ebay_find_completed_items',
    description:
      'Search eBay sold/completed listings for pricing research (sold comps). Uses the Finding API findCompletedItems operation with app credentials (SECURITY-APPNAME / EBAY_CLIENT_ID). Returns cleaned sold items: itemId, title, price, shippingCost, soldDate, condition, and listingUrl. Useful for market price research before listing or repricing. App credentials are sufficient for this public search data when OAuth is available.',
    inputSchema: findCompletedItemsInputSchema.shape,
    annotations: { readOnlyHint: true },
    handler: (api, args) => Effect.runPromise(api.finding.findCompletedItems(args)),
  }),
  defineTool({
    name: 'ebay_search_active_items',
    description:
      'Search ACTIVE eBay listings for price research (comps). Returns title, asking price, condition, and listing format for current fixed-price (Buy It Now) listings matching a keyword query.\n\nIMPORTANT: these are ASKING prices from listings that have NOT sold. They skew HIGHER than actual sold prices — treat them as an upper bound. A listing format of "Buy It Now / Best Offer" means the seller may accept less than the shown price. For sold/completed prices use ebay_find_completed_items (Finding API sold comps).\n\nUses the Buy Browse API (buy/browse/v1/item_summary/search). Parameters:\n- query (required): keyword search, e.g. "iPad Air 3 64GB Wi-Fi".\n- categoryId (optional): eBay leaf category ID to narrow results.\n- condition (optional): one of NEW, USED, CERTIFIED_REFURBISHED, SELLER_REFURBISHED, LIKE_NEW, FOR_PARTS_OR_NOT_WORKING.\n- limit (optional): 1-200, default 20.',
    inputSchema: searchActiveItemsSchema.shape,
    annotations: { readOnlyHint: true },
    handler: (api, args) => Effect.runPromise(api.browse.searchActiveItems(args)),
  }),
];
