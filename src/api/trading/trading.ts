import type { TradingApiClient } from '@/api/clientTrading.js';
import {
  type EbayApiError,
  type EndpointInputError,
  optionalPositiveNumberEffect,
  optionalStringEffect,
  requireObjectEffect,
  requireStringEffect,
} from '@/api/shared/request.js';
import type {
  createListingSchema,
  endListingSchema,
  getActiveListingsSchema,
  getListingSchema,
  relistItemSchema,
  reviseListingSchema,
} from '@/utils/trading/trading.js';
import { isRecord } from '@/utils/typeGuards.js';
import { Effect } from 'effect';
import type { InferEffectSchema } from '@/utils/effectSchemaTypes.js';

/** Input accepted by getActiveListings. */
type GetActiveListingsInput = InferEffectSchema<typeof getActiveListingsSchema>;
/** Input accepted by getListing. */
type GetListingInput = InferEffectSchema<typeof getListingSchema>;
/** Input accepted by createListing. */
type CreateListingInput = InferEffectSchema<typeof createListingSchema>;
/** Input accepted by reviseListing. */
type ReviseListingInput = InferEffectSchema<typeof reviseListingSchema>;
/** Input accepted by endListing. */
type EndListingInput = InferEffectSchema<typeof endListingSchema>;
/** Input accepted by relistItem. */
type RelistItemInput = InferEffectSchema<typeof relistItemSchema>;

const asRecordArray = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord);
};

/**
 * Parsed Trading API object payload returned unchanged from XML calls.
 *
 * @see https://developer.ebay.com/devzone/xml/docs/reference/ebay/index.html
 */
export type TradingRecordResponse = Record<string, unknown>;

/** Compact projection for getActiveListings when no explicit `fields` are given. */
const DEFAULT_ACTIVE_LISTING_FIELDS = [
  'ItemID',
  'SKU',
  'Title',
  'CurrentPrice',
  'Quantity',
  'ListingStatus',
] as const;

/** Compact fields that live nested inside a parsed GetMyeBaySelling Item. */
const ACTIVE_LISTING_FIELD_PATHS: Record<string, readonly string[]> = {
  CurrentPrice: ['SellingStatus', 'CurrentPrice'],
  ListingStatus: ['SellingStatus', 'ListingStatus'],
};

/** Read a nested value by path, returning undefined if any segment is missing. */
const readPath = (obj: Record<string, unknown>, path: readonly string[]): unknown => {
  let current: unknown = obj;
  for (const key of path) {
    if (!isRecord(current)) {
      return;
    }
    current = current[key];
  }
  return current;
};

/** Project one parsed Item down to the requested fields, omitting absent ones. */
const projectActiveListingItem = (
  item: unknown,
  fields: readonly string[],
): Record<string, unknown> => {
  if (!isRecord(item)) {
    return {};
  }
  const projected: Record<string, unknown> = {};
  for (const field of fields) {
    const path = ACTIVE_LISTING_FIELD_PATHS[field];
    const value = path ? readPath(item, path) : item[field];
    if (value !== undefined) {
      projected[field] = value;
    }
  }
  return projected;
};

/**
 * Trim a parsed GetMyeBaySelling response to the requested Item fields. Returns
 * the response untouched when `fields` contains "all"; otherwise projects each
 * Item under ActiveList.ItemArray to the chosen (or default compact) fields. The
 * full response runs ~2 KB per listing, which is unusable for large stores.
 */
const trimActiveListings = (
  response: TradingRecordResponse,
  fields: readonly string[],
): TradingRecordResponse => {
  if (fields.some((field) => field.toLowerCase() === 'all')) {
    return response;
  }
  const selected = fields.length > 0 ? fields : DEFAULT_ACTIVE_LISTING_FIELDS;
  if (!(isRecord(response) && isRecord(response.ActiveList))) {
    return response;
  }
  const activeList = response.ActiveList;
  const itemArray = activeList.ItemArray;
  if (!(isRecord(itemArray) && Array.isArray(itemArray.Item))) {
    return response;
  }
  const items = itemArray.Item.map((item) => projectActiveListingItem(item, selected));
  return {
    ...response,
    ActiveList: { ...activeList, ItemArray: { ...itemArray, Item: items } },
  };
};

/**
 * High-level wrapper for seller listing operations backed by eBay Trading API calls.
 */
export class TradingApi {
  private readonly client: TradingApiClient;

  constructor(client: TradingApiClient) {
    this.client = client;
  }

  /**
   * Fetches active seller listings with Trading API pagination metadata.
   *
   * @param input - Optional page number and entries-per-page values.
   * @returns An Effect that succeeds with the parsed GetMyeBaySelling response payload.
   *
   * @example
   * ```ts
   * const response = await Effect.runPromise(
   *   tradingApi.getActiveListings({ page: 2, entriesPerPage: 25 }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/devzone/xml/docs/reference/ebay/getmyebayselling.html
   */
  getActiveListings = (
    input: GetActiveListingsInput = {},
  ): Effect.Effect<TradingRecordResponse, EbayApiError | EndpointInputError> => {
    const tradingClient = this.client;

    return Effect.gen(function* () {
      const request = yield* requireObjectEffect<GetActiveListingsInput>(input, 'input');
      const inputPage = yield* optionalPositiveNumberEffect(request.page, 'page');
      const inputEntriesPerPage = yield* optionalPositiveNumberEffect(
        request.entriesPerPage,
        'entriesPerPage',
      );
      const page = inputPage === undefined ? 1 : inputPage;
      const entriesPerPage = inputEntriesPerPage === undefined ? 50 : inputEntriesPerPage;
      const fields = Array.isArray(request.fields)
        ? request.fields.filter((field): field is string => typeof field === 'string')
        : [];

      const result = yield* tradingClient.execute('GetMyeBaySelling', {
        ActiveList: {
          Sort: 'TimeLeft',
          Pagination: {
            EntriesPerPage: entriesPerPage,
            PageNumber: page,
          },
        },
      });

      return trimActiveListings(result, fields);
    });
  };

  /**
   * Fetches a single listing by eBay item ID with full Trading API detail.
   *
   * @param input - eBay item identifier.
   * @returns An Effect that succeeds with the parsed Trading API item payload.
   *
   * @example
   * ```ts
   * const listing = await Effect.runPromise(tradingApi.getListing({ itemId: '12345' }));
   * ```
   *
   * @see https://developer.ebay.com/devzone/xml/docs/reference/ebay/getitem.html
   */
  getListing = (
    input: GetListingInput,
  ): Effect.Effect<TradingRecordResponse, EbayApiError | EndpointInputError> => {
    const tradingClient = this.client;

    return Effect.gen(function* () {
      const request = yield* requireObjectEffect<GetListingInput>(input, 'input');
      const itemId = yield* requireStringEffect(request.itemId, 'itemId');
      const result = yield* tradingClient.execute('GetItem', {
        ItemID: itemId,
        DetailLevel: 'ReturnAll',
      });
      const items = asRecordArray(result.Item);

      return items.length > 0 ? items[0] : result;
    });
  };

  /**
   * Creates a fixed-price listing using the supplied Trading API item payload.
   *
   * @param input - Trading API Item payload nested under `item`.
   * @returns An Effect that succeeds with the parsed AddFixedPriceItem response.
   *
   * @example
   * ```ts
   * const listing = await Effect.runPromise(
   *   tradingApi.createListing({ item: { Title: 'New item', StartPrice: 9.99 } }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/devzone/xml/docs/reference/ebay/AddFixedPriceItem.html
   */
  createListing = (
    input: CreateListingInput,
  ): Effect.Effect<TradingRecordResponse, EbayApiError | EndpointInputError> => {
    const tradingClient = this.client;

    return Effect.gen(function* () {
      const request = yield* requireObjectEffect<CreateListingInput>(input, 'input');
      const item = yield* requireObjectEffect<Record<string, unknown>>(request.item, 'item');

      return yield* tradingClient.execute('AddFixedPriceItem', { Item: item });
    });
  };

  /**
   * Revises a fixed-price listing by merging changes with the eBay item ID.
   *
   * @param input - eBay item identifier plus Trading API Item fields to update.
   * @returns An Effect that succeeds with the parsed ReviseFixedPriceItem response.
   *
   * @example
   * ```ts
   * const listing = await Effect.runPromise(
   *   tradingApi.reviseListing({ itemId: '12345', fields: { Quantity: 10 } }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/devzone/xml/docs/reference/ebay/ReviseFixedPriceItem.html
   */
  reviseListing = (
    input: ReviseListingInput,
  ): Effect.Effect<TradingRecordResponse, EbayApiError | EndpointInputError> => {
    const tradingClient = this.client;

    return Effect.gen(function* () {
      const request = yield* requireObjectEffect<ReviseListingInput>(input, 'input');
      const itemId = yield* requireStringEffect(request.itemId, 'itemId');
      const fields = yield* requireObjectEffect<Record<string, unknown>>(request.fields, 'fields');

      return yield* tradingClient.execute('ReviseFixedPriceItem', {
        Item: { ...fields, ItemID: itemId },
      });
    });
  };

  /**
   * Ends a fixed-price listing with the provided Trading API ending reason.
   *
   * @param input - eBay item identifier plus optional Trading API ending reason.
   * @returns An Effect that succeeds with the parsed EndFixedPriceItem response.
   *
   * @example
   * ```ts
   * await Effect.runPromise(
   *   tradingApi.endListing({ itemId: '12345', reason: 'NotAvailable' }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/devzone/xml/docs/reference/ebay/endfixedpriceitem.html
   */
  endListing = (
    input: EndListingInput,
  ): Effect.Effect<TradingRecordResponse, EbayApiError | EndpointInputError> => {
    const tradingClient = this.client;

    return Effect.gen(function* () {
      const request = yield* requireObjectEffect<EndListingInput>(input, 'input');
      const itemId = yield* requireStringEffect(request.itemId, 'itemId');
      const inputReason = yield* optionalStringEffect(request.reason, 'reason');
      const reason = inputReason === undefined ? 'NotAvailable' : inputReason;

      return yield* tradingClient.execute('EndFixedPriceItem', {
        ItemID: itemId,
        EndingReason: reason,
      });
    });
  };

  /**
   * Relists an ended fixed-price item with optional listing modifications.
   *
   * @param input - eBay item identifier plus optional Trading API Item modifications.
   * @returns An Effect that succeeds with the parsed RelistFixedPriceItem response.
   *
   * @example
   * ```ts
   * const listing = await Effect.runPromise(
   *   tradingApi.relistItem({ itemId: '12345', modifications: { Quantity: 20 } }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/devzone/xml/docs/reference/ebay/relistfixedpriceitem.html
   */
  relistItem = (
    input: RelistItemInput,
  ): Effect.Effect<TradingRecordResponse, EbayApiError | EndpointInputError> => {
    const tradingClient = this.client;

    return Effect.gen(function* () {
      const request = yield* requireObjectEffect<RelistItemInput>(input, 'input');
      const itemId = yield* requireStringEffect(request.itemId, 'itemId');
      let modifications: Record<string, unknown> = {};

      if (request.modifications !== undefined) {
        modifications = yield* requireObjectEffect<Record<string, unknown>>(
          request.modifications,
          'modifications',
        );
      }

      return yield* tradingClient.execute('RelistFixedPriceItem', {
        Item: { ...modifications, ItemID: itemId },
      });
    });
  };
}
