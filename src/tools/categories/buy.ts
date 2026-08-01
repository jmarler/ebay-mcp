import { searchActiveItemsSchema } from '@/schemas/buy/browse.js';
import { defineTool } from '@/tools/defineTool.js';
import type { ToolEntry } from '@/tools/registry.js';
import { Effect } from 'effect';

/** Buy API tools for price research from active eBay listings. */
export const buyEntries: ToolEntry[] = [
  defineTool({
    name: 'ebay_search_active_items',
    description:
      'Search ACTIVE eBay listings for price research (comps). Returns title, asking price, condition, and listing format for current fixed-price (Buy It Now) listings matching a keyword query.\n\nIMPORTANT: these are ASKING prices from listings that have NOT sold. They skew HIGHER than actual sold prices — treat them as an upper bound. A listing format of "Buy It Now / Best Offer" means the seller may accept less than the shown price. For true sold/completed prices you need sold comps (eBay Marketplace Insights), which THIS application is not currently approved for — call ebay_search_active_items as the available fallback.\n\nUses the Browse API (buy/browse/v1/item_summary/search). Parameters:\n- query (required): keyword search, e.g. "iPad Air 3 64GB Wi-Fi".\n- categoryId (optional): eBay leaf category ID to narrow results.\n- condition (optional): one of NEW, USED, CERTIFIED_REFURBISHED, SELLER_REFURBISHED, LIKE_NEW, FOR_PARTS_OR_NOT_WORKING.\n- limit (optional): 1-200, default 20.',
    inputSchema: searchActiveItemsSchema.shape,
    annotations: { readOnlyHint: true },
    handler: (api, args) => Effect.runPromise(api.browse.searchActiveItems(args)),
  }),
];
