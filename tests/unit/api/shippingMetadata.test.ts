import type { EbayApiClient } from '@/api/client.js';
import { ShippingMetadataApi } from '@/api/listing-metadata/shippingMetadata.js';
import { shippingMetadataEntries } from '@/tools/categories/shippingMetadata.js';
import { Effect } from 'effect';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('ShippingMetadataApi', () => {
  let api: ShippingMetadataApi;
  let mockClient: EbayApiClient;

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as EbayApiClient;

    api = new ShippingMetadataApi(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const cases = [
    ['getShippingServices', 'get_shipping_services', { shippingServices: [] }],
    ['getShippingCarriers', 'get_shipping_carriers', { shippingCarriers: [] }],
    ['getHandlingTimes', 'get_handling_times', { handlingTimes: [] }],
    ['getShippingLocations', 'get_shipping_locations', { shippingLocations: [] }],
    [
      'getExcludeShippingLocations',
      'get_exclude_shipping_locations',
      { excludeShippingLocations: [] },
    ],
  ] as const;

  it.each(cases)('%s calls the shipping:marketplace %s endpoint', async (method, path, body) => {
    vi.mocked(mockClient.get).mockResolvedValue(body);

    const result = await Effect.runPromise(api[method]({ marketplaceId: 'EBAY_US' }));

    expect(mockClient.get).toHaveBeenCalledWith(
      `/sell/metadata/v1/shipping/marketplace/EBAY_US/${path}`,
    );
    expect(result).toEqual(body);
  });

  it('rejects a missing marketplaceId before requesting', async () => {
    const result = await Effect.runPromise(
      Effect.either(api.getShippingServices({} as unknown as { marketplaceId: string })),
    );

    expect(result._tag).toBe('Left');
    expect(mockClient.get).not.toHaveBeenCalled();
  });
});

describe('shippingMetadataEntries', () => {
  it('registers read-only tools that replace GeteBayDetails', () => {
    const names = shippingMetadataEntries.map((entry) => entry.definition.name);

    expect(names).toEqual([
      'ebay_get_shipping_services',
      'ebay_get_shipping_carriers',
      'ebay_get_handling_times',
      'ebay_get_shipping_locations',
      'ebay_get_exclude_shipping_locations',
    ]);
    for (const entry of shippingMetadataEntries) {
      expect(entry.definition.annotations?.readOnlyHint).toBe(true);
      expect(entry.definition.description).toContain('GeteBayDetails');
    }
  });

  it('dispatches ebay_get_shipping_services to the Metadata client', async () => {
    const getShippingServices = vi.fn(() => Effect.succeed({ shippingServices: [] }));
    const entry = shippingMetadataEntries.find(
      (candidate) => candidate.definition.name === 'ebay_get_shipping_services',
    );

    const result = await entry?.handler({ shippingMetadata: { getShippingServices } } as never, {
      marketplaceId: 'EBAY_US',
    });

    expect(getShippingServices).toHaveBeenCalledWith({ marketplaceId: 'EBAY_US' });
    expect(result).toEqual({ shippingServices: [] });
  });
});
