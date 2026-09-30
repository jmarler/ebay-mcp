import { z } from '@/utils/effectSchema.js';
import { MarketplaceId } from '@/types/ebayEnums.js';
import { defineTool } from '@/tools/defineTool.js';
import type { ToolEntry } from '@/tools/registry.js';
import { Effect } from 'effect';

/** Marketplace-scoped shipping metadata request (the endpoints take no filter). */
const shippingMetadataSchema = z.object({
  marketplaceId: z.nativeEnum(MarketplaceId).describe('Marketplace ID, such as EBAY_US'),
});

const REPLACES_GETEBAYDETAILS =
  'Metadata API (shipping:marketplace) — the REST replacement for the deprecated Trading GeteBayDetails call';

/** Metadata `shipping:marketplace` tools, registered in the metadata family. */
export const shippingMetadataEntries: ToolEntry[] = [
  defineTool({
    name: 'ebay_get_shipping_services',
    description:
      'Get the shipping services valid on a marketplace: the shippingService code to use as ' +
      'shippingServiceCode in fulfillment policies (and ShippingService in Trading listings), plus ' +
      'carrier, shippingCategory, domestic vs internationalService, min/max shipping time, ' +
      'shippingCostTypes, packageLimits, and validForSellingFlow (only use services where this is true). ' +
      'Deprecated services are omitted.\n\n' +
      `${REPLACES_GETEBAYDETAILS} (ShippingServiceDetails).`,
    inputSchema: shippingMetadataSchema.shape,
    annotations: { readOnlyHint: true },
    handler: (api, args) => Effect.runPromise(api.shippingMetadata.getShippingServices(args)),
  }),
  defineTool({
    name: 'ebay_get_shipping_carriers',
    description:
      'Get the shipping carriers supported on a marketplace. Use the shippingCarrier string value ' +
      'when providing shipment tracking (there is no numeric carrier ID).\n\n' +
      `${REPLACES_GETEBAYDETAILS} (ShippingCarrierDetails).`,
    inputSchema: shippingMetadataSchema.shape,
    annotations: { readOnlyHint: true },
    handler: (api, args) => Effect.runPromise(api.shippingMetadata.getShippingCarriers(args)),
  }),
  defineTool({
    name: 'ebay_get_handling_times',
    description:
      'Get the handling times (maxHandlingTime in business days, and whether each is extendedHandling) ' +
      'a seller may offer on a marketplace — valid values for a fulfillment policy handlingTime.\n\n' +
      `${REPLACES_GETEBAYDETAILS} (DispatchTimeMaxDetails).`,
    inputSchema: shippingMetadataSchema.shape,
    annotations: { readOnlyHint: true },
    handler: (api, args) => Effect.runPromise(api.shippingMetadata.getHandlingTimes(args)),
  }),
  defineTool({
    name: 'ebay_get_shipping_locations',
    description:
      'Get the ship-to locations (and their descriptions) a seller may offer on a marketplace.\n\n' +
      `${REPLACES_GETEBAYDETAILS} (ShippingLocationDetails).`,
    inputSchema: shippingMetadataSchema.shape,
    annotations: { readOnlyHint: true },
    handler: (api, args) => Effect.runPromise(api.shippingMetadata.getShippingLocations(args)),
  }),
  defineTool({
    name: 'ebay_get_exclude_shipping_locations',
    description:
      'Get the locations and regions a seller may exclude from shipping on a marketplace.\n\n' +
      `${REPLACES_GETEBAYDETAILS} (ExcludeShippingLocationDetails).`,
    inputSchema: shippingMetadataSchema.shape,
    annotations: { readOnlyHint: true },
    handler: (api, args) =>
      Effect.runPromise(api.shippingMetadata.getExcludeShippingLocations(args)),
  }),
];
