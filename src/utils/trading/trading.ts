import { z } from '@/utils/effectSchema.js';

/** Input accepted by getActiveListings. */
export const getActiveListingsSchema = z.object({
  page: z.number().optional().describe('Page number, defaulting to 1'),
  entriesPerPage: z.number().optional().describe('Items per page, defaulting to 50'),
  fields: z
    .array(z.string())
    .optional()
    .describe(
      'Item fields to return per listing. Omit for a compact default (ItemID, SKU, Title, CurrentPrice, Quantity, ListingStatus) — the full response is large (~2 KB/listing). Pass a custom list of Item field names to pick specific fields, or ["all"] for the full untrimmed eBay response.',
    ),
});

/** Input accepted by getListing. */
export const getListingSchema = z.object({
  itemId: z.string().describe('The eBay item ID to retrieve'),
});

/** Input accepted by createListing. */
export const createListingSchema = z.object({
  item: z.record(z.unknown()).describe('Trading API Item payload for AddFixedPriceItem'),
});

/** Input accepted by reviseListing. */
export const reviseListingSchema = z.object({
  itemId: z.string().describe('The eBay item ID to revise'),
  fields: z.record(z.unknown()).describe('Trading API Item fields to update'),
});

/** Input accepted by endListing. */
export const endListingSchema = z.object({
  itemId: z.string().describe('The eBay item ID to end'),
  reason: z
    .enum(['NotAvailable', 'Incorrect', 'LostOrBroken', 'OtherListingError', 'SellToHighBidder'])
    .optional()
    .describe('Trading API ending reason, defaulting to NotAvailable'),
});

/** Input accepted by relistItem. */
export const relistItemSchema = z.object({
  itemId: z.string().describe('The eBay item ID to relist'),
  modifications: z
    .record(z.unknown())
    .optional()
    .describe('Optional Trading API Item fields to change while relisting'),
});
