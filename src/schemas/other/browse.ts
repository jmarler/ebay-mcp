import { z } from '@/utils/effectSchema.js';

/**
 * Input accepted by the Browse API active-item comps search
 * (`buy/browse/v1/item_summary/search`).
 *
 * The `condition` enum values are the eBay Browse `conditions` field-filter
 * tokens, each verified against the live production API.
 */
export const searchActiveItemsSchema = z.object({
  query: z.string().describe('Keyword search, e.g. "iPad Air 3rd generation 64GB Wi-Fi"'),
  categoryId: z
    .string()
    .optional()
    .describe('Optional eBay leaf category ID to constrain results (maps to category_ids)'),
  condition: z
    .enum([
      'NEW',
      'USED',
      'CERTIFIED_REFURBISHED',
      'SELLER_REFURBISHED',
      'LIKE_NEW',
      'FOR_PARTS_OR_NOT_WORKING',
    ])
    .optional()
    .describe('Optional item condition filter'),
  limit: z
    .number()
    .optional()
    .describe('Maximum results to return (1-200; defaults to 20 to keep the response compact)'),
});
