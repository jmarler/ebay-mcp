import { defineTool } from '@/tools/defineTool.js';
import type { ToolEntry } from '@/tools/registry.js';
import {
  createListingSchema,
  endListingSchema,
  getActiveListingsSchema,
  getListingSchema,
  relistItemSchema,
  reviseListingSchema,
} from '@/utils/trading/trading.js';
import { Effect } from 'effect';

/** Trading API tools for fixed-price listing operations. */
export const tradingEntries: ToolEntry[] = [
  defineTool({
    name: 'ebay_get_active_listings',
    description:
      'Get active fixed-price listings. By default returns a COMPACT view per listing (ItemID, SKU, Title, CurrentPrice, Quantity, ListingStatus) because the full response runs ~2 KB per listing. Pass fields=["all"] for the full untrimmed eBay response, or a custom list of Item field names to pick specific fields.\n\nUses the Trading API (GetMyeBaySelling). Returns listings created via any method (UI, Trading API, or REST API).\n\nRequired: User OAuth token.',
    inputSchema: getActiveListingsSchema.shape,
    annotations: { readOnlyHint: true },
    handler: (api, args) => Effect.runPromise(api.trading.getActiveListings(args)),
  }),
  defineTool({
    name: 'ebay_get_listing',
    description:
      'Get full details for a single listing by item ID.\n\nUses the Trading API (GetItem). Returns all listing fields including description, specifics, shipping, and images.\n\nRequired: User OAuth token.',
    inputSchema: getListingSchema.shape,
    annotations: { readOnlyHint: true },
    handler: (api, args) => Effect.runPromise(api.trading.getListing(args)),
  }),
  defineTool({
    name: 'ebay_create_listing',
    description:
      'Create a new fixed-price listing.\n\nUses the Trading API (AddFixedPriceItem). Requires complete item details.\n\nRequired: User OAuth token.',
    inputSchema: createListingSchema.shape,
    annotations: { readOnlyHint: false },
    handler: (api, args) => Effect.runPromise(api.trading.createListing(args)),
  }),
  defineTool({
    name: 'ebay_revise_listing',
    description:
      'Revise an existing fixed-price listing. Update quantity, price, title, description, or any other field.\n\nUses the Trading API (ReviseFixedPriceItem). Only send the fields you want to change.\n\nExamples:\n- Update quantity: { "Quantity": 10 }\n- Update price: { "StartPrice": 14.99 }\n- Update title: { "Title": "New Title" }\n- Multiple fields: { "Quantity": 10, "StartPrice": 14.99 }\n\nRequired: User OAuth token.',
    inputSchema: reviseListingSchema.shape,
    annotations: { readOnlyHint: false },
    handler: (api, args) => Effect.runPromise(api.trading.reviseListing(args)),
  }),
  defineTool({
    name: 'ebay_end_listing',
    description:
      'End/remove an active fixed-price listing.\n\nUses the Trading API (EndFixedPriceItem).\n\nRequired: User OAuth token.',
    inputSchema: endListingSchema.shape,
    annotations: { readOnlyHint: false, destructiveHint: true },
    handler: (api, args) => Effect.runPromise(api.trading.endListing(args)),
  }),
  defineTool({
    name: 'ebay_relist_item',
    description:
      'Relist an ended fixed-price listing, optionally with modifications.\n\nUses the Trading API (RelistFixedPriceItem).\n\nRequired: User OAuth token.',
    inputSchema: relistItemSchema.shape,
    annotations: { readOnlyHint: false },
    handler: (api, args) => Effect.runPromise(api.trading.relistItem(args)),
  }),
];
