import type { EbayApiClient } from '@/api/client.js';
import {
  buildEndpointParams,
  type EbayApiError,
  type EndpointInputError,
  optionalPositiveNumberEffect,
  optionalStringEffect,
  requestGetEffect,
  requireObjectEffect,
  requireStringEffect,
} from '@/api/shared/request.js';
import { Effect } from 'effect';

/** Input accepted by {@link BrowseApi.searchActiveItems}. */
export interface SearchActiveItemsInput {
  /** Keyword search terms. */
  readonly query: string;
  /** Optional eBay leaf category ID (Browse `category_ids`). */
  readonly categoryId?: string;
  /** Optional Browse `conditions` filter token (e.g. NEW, USED). */
  readonly condition?: string;
  /** Optional result cap (1-200); defaults to {@link DEFAULT_LIMIT}. */
  readonly limit?: number;
}

/** One active-listing comparable (asking price, not a sold price). */
export interface ActiveItemComp {
  /** Listing title. */
  readonly title?: string;
  /** Asking price formatted as `"<CURRENCY> <value>"`, e.g. `"USD 99.85"`. */
  readonly price?: string;
  /** Item condition label, e.g. `"Used"`. */
  readonly condition?: string;
  /** Human listing format, e.g. `"Buy It Now"` or `"Buy It Now / Best Offer"`. */
  readonly listingFormat?: string;
  /** Public eBay listing URL. */
  readonly itemWebUrl?: string;
  /** Browse item ID (RESTful `v1|<legacyId>|<variationId>`). */
  readonly itemId?: string;
}

/** Compact active-listing comps result returned by {@link BrowseApi.searchActiveItems}. */
export interface SearchActiveItemsResult {
  /** Echoed keyword query. */
  readonly query: string;
  /** Total matching active listings eBay reports (may exceed the returned count). */
  readonly total: number;
  /** Number of comparables returned in {@link items}. */
  readonly count: number;
  /** Caveat reminding callers these are asking prices, not sold prices. */
  readonly note: string;
  /** Compact comparables. */
  readonly items: ActiveItemComp[];
}

/** Minimal view of a Browse `itemSummary` — only the fields this tool surfaces. */
interface RawBrowseItemSummary {
  readonly itemId?: string;
  readonly title?: string;
  readonly price?: { readonly value?: string; readonly currency?: string };
  readonly condition?: string;
  readonly buyingOptions?: string[];
  readonly itemWebUrl?: string;
}

/** Minimal view of the Browse `item_summary/search` response. */
interface RawBrowseSearchResponse {
  readonly total?: number;
  readonly itemSummaries?: RawBrowseItemSummary[];
}

/** Default result cap, kept small so the tool output stays consumable. */
const DEFAULT_LIMIT = 20;

/** Map eBay `buyingOptions` tokens to human listing-format labels. */
const BUYING_OPTION_LABELS: Record<string, string> = {
  FIXED_PRICE: 'Buy It Now',
  AUCTION: 'Auction',
  BEST_OFFER: 'Best Offer',
  CLASSIFIED_AD: 'Classified Ad',
};

const formatListingFormat = (buyingOptions?: string[]): string | undefined => {
  if (!buyingOptions || buyingOptions.length === 0) {
    return;
  }
  return buyingOptions.map((option) => BUYING_OPTION_LABELS[option] ?? option).join(' / ');
};

const formatPrice = (price?: { value?: string; currency?: string }): string | undefined => {
  if (!price || price.value === undefined) {
    return;
  }
  return price.currency ? `${price.currency} ${price.value}` : price.value;
};

/** Project a raw Browse summary down to the compact comp shape, omitting absent fields. */
const toComp = (item: RawBrowseItemSummary): ActiveItemComp => {
  const price = formatPrice(item.price);
  const listingFormat = formatListingFormat(item.buyingOptions);
  return {
    ...(item.title === undefined ? {} : { title: item.title }),
    ...(price === undefined ? {} : { price }),
    ...(item.condition === undefined ? {} : { condition: item.condition }),
    ...(listingFormat === undefined ? {} : { listingFormat }),
    ...(item.itemWebUrl === undefined ? {} : { itemWebUrl: item.itemWebUrl }),
    ...(item.itemId === undefined ? {} : { itemId: item.itemId }),
  };
};

const ASKING_PRICE_NOTE =
  'Asking prices from ACTIVE (unsold) listings — they skew high; treat as an upper bound, not a sold value. A "Best Offer" format means the seller may accept less.';

/**
 * eBay Buy Browse API — keyword search over active listings, used here for
 * price-research comps. Runs on an application access token with the base
 * `api_scope` (already granted), so no additional OAuth setup is required.
 *
 * @see https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search
 */
export class BrowseApi {
  private readonly basePath = '/buy/browse/v1';

  public constructor(private readonly client: EbayApiClient) {}

  /**
   * Searches active eBay listings and returns compact asking-price comparables.
   *
   * @param input - Keyword query plus optional category, condition, and limit.
   * @returns An Effect that succeeds with a compact {@link SearchActiveItemsResult}.
   *
   * @example
   * ```ts
   * const comps = await Effect.runPromise(
   *   browseApi.searchActiveItems({ query: 'iPad Air 3 64GB', condition: 'USED', limit: 15 }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search
   */
  public searchActiveItems = (
    input: SearchActiveItemsInput,
  ): Effect.Effect<SearchActiveItemsResult, EbayApiError | EndpointInputError> => {
    const client = this.client;
    const basePath = this.basePath;

    return Effect.gen(function* () {
      const validated = yield* requireObjectEffect<SearchActiveItemsInput>(input, 'input');
      const query = yield* requireStringEffect(validated.query, 'query');
      const categoryId = yield* optionalStringEffect(validated.categoryId, 'categoryId');
      const condition = yield* optionalStringEffect(validated.condition, 'condition');
      const limit = yield* optionalPositiveNumberEffect(validated.limit, 'limit');

      // Browse defaults to fixed-price (Buy It Now) listings, which are the clean
      // asking-price comps we want; the listing format is still surfaced so a
      // "Best Offer" option (a signal that the true price is lower) is visible.
      const filter = condition === undefined ? undefined : `conditions:{${condition}}`;

      const params = buildEndpointParams({
        q: { wireName: 'q', value: query },
        categoryIds: { wireName: 'category_ids', value: categoryId },
        filter: { wireName: 'filter', value: filter },
        limit: { wireName: 'limit', value: limit ?? DEFAULT_LIMIT },
      });

      const response = yield* requestGetEffect<RawBrowseSearchResponse>(
        client,
        `${basePath}/item_summary/search`,
        params,
      );

      const summaries = Array.isArray(response.itemSummaries) ? response.itemSummaries : [];
      const items = summaries.map(toComp);

      return {
        query,
        total: typeof response.total === 'number' ? response.total : items.length,
        count: items.length,
        note: ASKING_PRICE_NOTE,
        items,
      };
    });
  };
}
