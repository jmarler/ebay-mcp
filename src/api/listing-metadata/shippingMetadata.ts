import type { EbayApiClient } from '@/api/client.js';
import {
  type EbayApiError,
  type EndpointInputError,
  requestGetEffect,
  requireObjectEffect,
  requireStringEffect,
} from '@/api/shared/request.js';
import type { components } from '@/types/sell-apps/listing-metadata/sellMetadataV1Oas3.js';
import { Effect } from 'effect';

/** Input accepted by the Metadata `shipping:marketplace` endpoints. */
export interface ShippingMetadataInput {
  /** eBay marketplace identifier, such as EBAY_US. */
  readonly marketplaceId: string;
}

/**
 * Response returned by getShippingServices.
 *
 * @see https://developer.ebay.com/api-docs/sell/metadata/resources/shipping:marketplace/methods/getShippingServices
 */
export type ShippingServicesResponse = components['schemas']['ShippingServiceResponse'];

/**
 * Response returned by getShippingCarriers.
 *
 * @see https://developer.ebay.com/api-docs/sell/metadata/resources/shipping:marketplace/methods/getShippingCarriers
 */
export type ShippingCarriersResponse = components['schemas']['ShippingCarrierResponse'];

/**
 * Response returned by getHandlingTimes.
 *
 * @see https://developer.ebay.com/api-docs/sell/metadata/resources/shipping:marketplace/methods/getHandlingTimes
 */
export type HandlingTimesResponse = components['schemas']['ShippingHandlingTimeResponse'];

/**
 * Response returned by getShippingLocations.
 *
 * @see https://developer.ebay.com/api-docs/sell/metadata/resources/shipping:marketplace/methods/getShippingLocations
 */
export type ShippingLocationsResponse = components['schemas']['ShippingLocationResponse'];

/**
 * Response returned by getExcludeShippingLocations.
 *
 * @see https://developer.ebay.com/api-docs/sell/metadata/resources/shipping:marketplace/methods/getExcludeShippingLocations
 */
export type ExcludeShippingLocationsResponse =
  components['schemas']['ShippingExcludeLocationResponse'];

/**
 * Metadata API `shipping:marketplace` resource — the REST replacement for the
 * shipping containers of the deprecated Trading `GeteBayDetails` call
 * (ShippingServiceDetails, ShippingCarrierDetails, DispatchTimeMaxDetails,
 * ShippingLocationDetails, ExcludeShippingLocationDetails).
 */
export class ShippingMetadataApi {
  private readonly basePath = '/sell/metadata/v1/shipping/marketplace';

  public constructor(private readonly client: EbayApiClient) {}

  /**
   * Retrieves the shipping services supported on a marketplace, with shipping
   * times, cost types, and package limits.
   *
   * @param input - Marketplace identifier.
   * @returns An Effect that succeeds with eBay's ShippingServiceResponse.
   *
   * @example
   * ```ts
   * const { shippingServices } = await Effect.runPromise(
   *   shippingMetadataApi.getShippingServices({ marketplaceId: 'EBAY_US' }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/metadata/resources/shipping:marketplace/methods/getShippingServices
   */
  public getShippingServices = (
    input: ShippingMetadataInput,
  ): Effect.Effect<ShippingServicesResponse, EbayApiError | EndpointInputError> =>
    this.getResource(input, 'get_shipping_services', 'getShippingServices');

  /**
   * Retrieves the shipping carriers supported on a marketplace.
   *
   * @param input - Marketplace identifier.
   * @returns An Effect that succeeds with eBay's ShippingCarrierResponse.
   *
   * @example
   * ```ts
   * const { shippingCarriers } = await Effect.runPromise(
   *   shippingMetadataApi.getShippingCarriers({ marketplaceId: 'EBAY_US' }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/metadata/resources/shipping:marketplace/methods/getShippingCarriers
   */
  public getShippingCarriers = (
    input: ShippingMetadataInput,
  ): Effect.Effect<ShippingCarriersResponse, EbayApiError | EndpointInputError> =>
    this.getResource(input, 'get_shipping_carriers', 'getShippingCarriers');

  /**
   * Retrieves the handling times a seller may offer on a marketplace.
   *
   * @param input - Marketplace identifier.
   * @returns An Effect that succeeds with eBay's ShippingHandlingTimeResponse.
   *
   * @example
   * ```ts
   * const { handlingTimes } = await Effect.runPromise(
   *   shippingMetadataApi.getHandlingTimes({ marketplaceId: 'EBAY_US' }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/metadata/resources/shipping:marketplace/methods/getHandlingTimes
   */
  public getHandlingTimes = (
    input: ShippingMetadataInput,
  ): Effect.Effect<HandlingTimesResponse, EbayApiError | EndpointInputError> =>
    this.getResource(input, 'get_handling_times', 'getHandlingTimes');

  /**
   * Retrieves the locations a seller may ship to from a marketplace.
   *
   * @param input - Marketplace identifier.
   * @returns An Effect that succeeds with eBay's ShippingLocationResponse.
   *
   * @example
   * ```ts
   * const { shippingLocations } = await Effect.runPromise(
   *   shippingMetadataApi.getShippingLocations({ marketplaceId: 'EBAY_US' }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/metadata/resources/shipping:marketplace/methods/getShippingLocations
   */
  public getShippingLocations = (
    input: ShippingMetadataInput,
  ): Effect.Effect<ShippingLocationsResponse, EbayApiError | EndpointInputError> =>
    this.getResource(input, 'get_shipping_locations', 'getShippingLocations');

  /**
   * Retrieves the locations and regions a seller may exclude from shipping on a marketplace.
   *
   * @param input - Marketplace identifier.
   * @returns An Effect that succeeds with eBay's ShippingExcludeLocationResponse.
   *
   * @example
   * ```ts
   * const { excludeShippingLocations } = await Effect.runPromise(
   *   shippingMetadataApi.getExcludeShippingLocations({ marketplaceId: 'EBAY_US' }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/metadata/resources/shipping:marketplace/methods/getExcludeShippingLocations
   */
  public getExcludeShippingLocations = (
    input: ShippingMetadataInput,
  ): Effect.Effect<ExcludeShippingLocationsResponse, EbayApiError | EndpointInputError> =>
    this.getResource(input, 'get_exclude_shipping_locations', 'getExcludeShippingLocations');

  private getResource = <Response>(
    input: ShippingMetadataInput,
    endpoint: string,
    operationName: string,
  ): Effect.Effect<Response, EbayApiError | EndpointInputError> => {
    const client = this.client;
    const basePath = this.basePath;

    return Effect.gen(function* () {
      const validatedInput = yield* requireObjectEffect<ShippingMetadataInput>(input, 'input');
      const marketplaceId = yield* requireStringEffect(
        validatedInput.marketplaceId,
        'marketplaceId',
      );

      return yield* requestGetEffect<Response>(client, `${basePath}/${marketplaceId}/${endpoint}`);
    }).pipe(Effect.withSpan(`metadata.${operationName}`));
  };
}
