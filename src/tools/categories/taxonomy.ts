import { z } from '@/utils/effectSchema.js';
import { defineTool } from '@/tools/defineTool.js';
import type { ToolEntry } from '@/tools/registry.js';
import { Effect } from 'effect';

/** Tool input for Taxonomy API getDefaultCategoryTreeId. */
const getDefaultCategoryTreeIdSchema = z.object({
  marketplaceId: z.string().describe('Marketplace ID (e.g., EBAY_US)'),
});

/** Tool input for Taxonomy API getCategoryTree. */
const getCategoryTreeSchema = z.object({
  categoryTreeId: z.string().describe('Category tree ID'),
});

/** Tool input for Taxonomy API getCategorySuggestions. */
const getCategorySuggestionsSchema = z.object({
  categoryTreeId: z.string().describe('Category tree ID'),
  query: z.string().describe('Search query for category suggestions'),
});

/** Tool input for Taxonomy API getItemAspectsForCategory. */
const getItemAspectsForCategorySchema = z.object({
  categoryTreeId: z.string().describe('Category tree ID (US marketplace = "0")'),
  categoryId: z.string().describe('Leaf category ID'),
  requiredOnly: z
    .boolean()
    .optional()
    .describe(
      'When true, return ONLY aspects required for listing (aspectRequired=true). Strongly recommended — the full response can exceed 600 KB. Default false.',
    ),
  maxValuesPerAspect: z
    .number()
    .optional()
    .describe(
      'Cap suggested values returned per aspect (default 10). Some aspects have hundreds of values; lowering this keeps the response small.',
    ),
});

/** Taxonomy API tools for category trees, category suggestions, and compatibility metadata. */
export const taxonomyEntries: ToolEntry[] = [
  defineTool({
    name: 'ebay_get_default_category_tree_id',
    description: 'Get the default category tree ID for a marketplace',
    inputSchema: getDefaultCategoryTreeIdSchema.shape,
    outputSchema: {
      type: 'object',
      properties: {
        categoryTreeId: { type: 'string' },
        categoryTreeVersion: { type: 'string' },
      },
      description: 'Default category tree ID response',
    },
    handler: (api, args) => Effect.runPromise(api.taxonomy.getDefaultCategoryTreeId(args)),
  }),
  defineTool({
    name: 'ebay_get_category_tree',
    description: 'Get category tree by ID',
    inputSchema: getCategoryTreeSchema.shape,
    outputSchema: {
      type: 'object',
      properties: {
        categoryTreeId: { type: 'string' },
        categoryTreeVersion: { type: 'string' },
        rootCategoryNode: { type: 'object' },
      },
      description: 'Category tree details',
    },
    handler: (api, args) => Effect.runPromise(api.taxonomy.getCategoryTree(args)),
  }),
  defineTool({
    name: 'ebay_get_category_suggestions',
    description: 'Get category suggestions based on query',
    inputSchema: getCategorySuggestionsSchema.shape,
    outputSchema: {
      type: 'object',
      properties: {
        categorySuggestions: { type: 'array' },
      },
      description: 'Category suggestions response',
    },
    handler: (api, args) => Effect.runPromise(api.taxonomy.getCategorySuggestions(args)),
  }),
  defineTool({
    name: 'ebay_get_item_aspects_for_category',
    description:
      'Get the item aspects (item specifics) buyers filter on for a category, including which are required to list.\n\nThe full response can be very large (600 KB+ for one category) because some aspects list hundreds of suggested values. Use requiredOnly=true to return only the aspects required for listing, and maxValuesPerAspect (default 10) to cap suggested values per aspect.',
    inputSchema: getItemAspectsForCategorySchema.shape,
    outputSchema: {
      type: 'object',
      properties: {
        aspects: { type: 'array' },
      },
      description: 'Item aspects for category',
    },
    handler: (api, args) => Effect.runPromise(api.taxonomy.getItemAspectsForCategory(args)),
  }),
];
