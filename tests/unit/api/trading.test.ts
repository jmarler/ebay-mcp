import { beforeEach, expect, it, vi } from 'vitest';
import type { TradingApiClient } from '@/api/clientTrading.js';
import { TradingApi } from '@/api/trading/trading.js';
import { Effect } from 'effect';

let api: TradingApi;
let mockClient: { execute: ReturnType<typeof vi.fn> };

beforeEach(() => {
  mockClient = { execute: vi.fn() };
  api = new TradingApi(mockClient as unknown as TradingApiClient);
});

const sampleActiveListingsResponse = () => ({
  Ack: 'Success',
  ActiveList: {
    ItemArray: {
      Item: [
        {
          ItemID: '167382780779',
          Title: 'Bambu Lab 0.2mm Nozzle',
          SKU: 'NZ-2MM',
          Quantity: 10,
          QuantityAvailable: 4,
          SellingStatus: { CurrentPrice: { '#text': 12.99 }, ListingStatus: 'Active' },
          WatchCount: 3,
          ListingType: 'FixedPriceItem',
        },
      ],
    },
    PaginationResult: { TotalNumberOfEntries: 1, TotalNumberOfPages: 1 },
  },
});

it('returns the raw active listings payload when fields=["all"]', async () => {
  const activeListingsResponse = sampleActiveListingsResponse();
  mockClient.execute.mockReturnValue(Effect.succeed(activeListingsResponse));

  const result = await Effect.runPromise(api.getActiveListings({ fields: ['all'] }));

  expect(result).toBe(activeListingsResponse);
});

it('projects active listings to a compact default view', async () => {
  mockClient.execute.mockReturnValue(Effect.succeed(sampleActiveListingsResponse()));

  const result = await Effect.runPromise(api.getActiveListings());

  const item = (result as any).ActiveList.ItemArray.Item[0];
  // Compact default hoists CurrentPrice/ListingStatus out of SellingStatus and
  // drops noisy fields like WatchCount/QuantityAvailable/ListingType.
  expect(item).toEqual({
    ItemID: '167382780779',
    SKU: 'NZ-2MM',
    Title: 'Bambu Lab 0.2mm Nozzle',
    CurrentPrice: { '#text': 12.99 },
    Quantity: 10,
    ListingStatus: 'Active',
  });
});

it('projects active listings to an explicit custom field list', async () => {
  mockClient.execute.mockReturnValue(Effect.succeed(sampleActiveListingsResponse()));

  const result = await Effect.runPromise(
    api.getActiveListings({ fields: ['ItemID', 'WatchCount'] }),
  );

  const item = (result as any).ActiveList.ItemArray.Item[0];
  expect(item).toEqual({ ItemID: '167382780779', WatchCount: 3 });
});

it('returns empty active listings payload unchanged', async () => {
  const emptyListingsResponse = {
    Ack: 'Success',
    ActiveList: {
      ItemArray: null,
      PaginationResult: { TotalNumberOfEntries: 0 },
    },
  };
  mockClient.execute.mockReturnValue(Effect.succeed(emptyListingsResponse));

  const result = await Effect.runPromise(api.getActiveListings());

  expect(result).toBe(emptyListingsResponse);
});

it('passes active listing pagination params to execute', async () => {
  mockClient.execute.mockReturnValue(
    Effect.succeed({
      Ack: 'Success',
      ActiveList: {
        ItemArray: null,
        PaginationResult: { TotalNumberOfEntries: 0 },
      },
    }),
  );

  await Effect.runPromise(api.getActiveListings({ page: 2, entriesPerPage: 25 }));

  expect(mockClient.execute).toHaveBeenCalledWith('GetMyeBaySelling', {
    ActiveList: {
      Sort: 'TimeLeft',
      Pagination: { EntriesPerPage: 25, PageNumber: 2 },
    },
  });
});

it('gets one listing by item ID', async () => {
  mockClient.execute.mockReturnValue(
    Effect.succeed({
      Ack: 'Success',
      Item: [{ ItemID: '12345', Title: 'Test', SKU: 'T1', Quantity: 5 }],
    }),
  );

  const result = await Effect.runPromise(api.getListing({ itemId: '12345' }));

  expect(mockClient.execute).toHaveBeenCalledWith('GetItem', {
    ItemID: '12345',
    DetailLevel: 'ReturnAll',
  });
  expect(result.ItemID).toBe('12345');
});

it('fails getListing when itemId is missing', async () => {
  const error = await Effect.runPromise(Effect.flip(api.getListing({ itemId: '' })));

  expect(error._tag).toBe('EndpointInputError');
  expect(error.message).toContain('itemId is required');
});

it('creates a fixed-price listing', async () => {
  mockClient.execute.mockReturnValue(Effect.succeed({ Ack: 'Success', ItemID: '99999' }));

  const item = { Title: 'New Item', SKU: 'NEW', StartPrice: 9.99 };
  const result = await Effect.runPromise(api.createListing({ item }));

  expect(mockClient.execute).toHaveBeenCalledWith('AddFixedPriceItem', {
    Item: item,
  });
  expect(result.ItemID).toBe('99999');
});

it('revises a fixed-price listing', async () => {
  mockClient.execute.mockReturnValue(Effect.succeed({ Ack: 'Success', ItemID: '12345' }));

  const result = await Effect.runPromise(
    api.reviseListing({ itemId: '12345', fields: { Quantity: 10 } }),
  );

  expect(mockClient.execute).toHaveBeenCalledWith('ReviseFixedPriceItem', {
    Item: { ItemID: '12345', Quantity: 10 },
  });
  expect(result.ItemID).toBe('12345');
});

it('fails reviseListing when itemId is missing', async () => {
  const error = await Effect.runPromise(Effect.flip(api.reviseListing({ itemId: '', fields: {} })));

  expect(error._tag).toBe('EndpointInputError');
  expect(error.message).toContain('itemId is required');
});

it('ends a fixed-price listing', async () => {
  mockClient.execute.mockReturnValue(Effect.succeed({ Ack: 'Success' }));

  await Effect.runPromise(api.endListing({ itemId: '12345', reason: 'NotAvailable' }));

  expect(mockClient.execute).toHaveBeenCalledWith('EndFixedPriceItem', {
    ItemID: '12345',
    EndingReason: 'NotAvailable',
  });
});

it('defaults endListing reason to NotAvailable', async () => {
  mockClient.execute.mockReturnValue(Effect.succeed({ Ack: 'Success' }));

  await Effect.runPromise(api.endListing({ itemId: '12345' }));

  expect(mockClient.execute).toHaveBeenCalledWith('EndFixedPriceItem', {
    ItemID: '12345',
    EndingReason: 'NotAvailable',
  });
});

it('fails endListing when itemId is missing', async () => {
  const error = await Effect.runPromise(Effect.flip(api.endListing({ itemId: '' })));

  expect(error._tag).toBe('EndpointInputError');
  expect(error.message).toContain('itemId is required');
});

it('relists an ended listing', async () => {
  mockClient.execute.mockReturnValue(Effect.succeed({ Ack: 'Success', ItemID: '12345' }));

  const result = await Effect.runPromise(api.relistItem({ itemId: '12345' }));

  expect(mockClient.execute).toHaveBeenCalledWith('RelistFixedPriceItem', {
    Item: { ItemID: '12345' },
  });
  expect(result.ItemID).toBe('12345');
});

it('passes relist modifications', async () => {
  mockClient.execute.mockReturnValue(Effect.succeed({ Ack: 'Success', ItemID: '12345' }));

  await Effect.runPromise(
    api.relistItem({ itemId: '12345', modifications: { Quantity: 20, StartPrice: 15.99 } }),
  );

  expect(mockClient.execute).toHaveBeenCalledWith('RelistFixedPriceItem', {
    Item: { ItemID: '12345', Quantity: 20, StartPrice: 15.99 },
  });
});

it('fails relistItem when itemId is missing', async () => {
  const error = await Effect.runPromise(Effect.flip(api.relistItem({ itemId: '' })));

  expect(error._tag).toBe('EndpointInputError');
  expect(error.message).toContain('itemId is required');
});
