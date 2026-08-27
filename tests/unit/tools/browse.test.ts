import { expect, it, vi } from 'vitest';
import type { EbaySellerApi } from '@/api/index.js';
import { executeTool } from '@/tools/index.js';
import { Effect } from 'effect';

const createBrowseApiMock = (): EbaySellerApi =>
  ({
    browse: {
      searchActiveItems: vi.fn(),
    },
  }) as unknown as EbaySellerApi;

it('passes searchActiveItems args through unchanged', async () => {
  const api = createBrowseApiMock();
  const input = { query: 'iPad Air 3 64GB', condition: 'USED' as const, limit: 15 };

  vi.mocked(api.browse.searchActiveItems).mockReturnValue(
    Effect.succeed({ query: input.query, total: 0, count: 0, note: '', items: [] }),
  );

  await executeTool(api, 'ebay_search_active_items', input);

  expect(api.browse.searchActiveItems).toHaveBeenCalledWith(input);
});

it('accepts a minimal query-only request for searchActiveItems', async () => {
  const api = createBrowseApiMock();
  const input = { query: 'nintendo switch oled' };

  vi.mocked(api.browse.searchActiveItems).mockReturnValue(
    Effect.succeed({ query: input.query, total: 0, count: 0, note: '', items: [] }),
  );

  await executeTool(api, 'ebay_search_active_items', input);

  expect(api.browse.searchActiveItems).toHaveBeenCalledWith(input);
});

it('rejects searchActiveItems without a query', async () => {
  const api = createBrowseApiMock();

  await expect(executeTool(api, 'ebay_search_active_items', {})).rejects.toThrow();

  expect(api.browse.searchActiveItems).not.toHaveBeenCalled();
});
