import { Effect } from 'effect';
import {
  findSellerStandardsProfilesInputSchema,
  getCustomerServiceMetricInputSchema,
  getSellerStandardsProfileInputSchema,
  getTrafficReportInputSchema,
} from '@/schemas/analytics/analytics.js';
import { defineTool } from '@/tools/defineTool.js';
import type { ToolEntry } from '@/tools/registry.js';
import {
  mapCustomerServiceMetricToChart,
  mapStandardsProfileToCard,
  mapTrafficReportToChart,
} from '@/tools/ui/maps.js';

/** Analytics API tools for seller traffic and performance reporting. */
export const analyticsEntries: ToolEntry[] = [
  defineTool({
    name: 'ebay_get_traffic_report',
    description:
      'Get a listings traffic report (impressions, click-through rate, sales conversion).\n\nREQUIRED params: dimension (DAY or LISTING), filter (must include marketplace_ids and date_range, e.g. "marketplace_ids:{EBAY_US},date_range:[20260701..20260731]"), and metric (comma-delimited, e.g. "LISTING_IMPRESSION_TOTAL,CLICK_THROUGH_RATE").\n\nThe optional `sort` must be one of the METRIC names (optionally prefixed with "-" for descending) — NOT a dimension. For example sort:"DAY" is invalid; use sort:"LISTING_IMPRESSION_TOTAL".\n\nRequired: User OAuth token.',
    inputSchema: getTrafficReportInputSchema.shape,
    outputSchema: {
      type: 'object',
      properties: {
        records: { type: 'array' },
        warnings: { type: 'array' },
      },
      description: 'Traffic report data',
    },
    handler: (api, args) => Effect.runPromise(api.analytics.getTrafficReport(args)),
    ui: { archetype: 'chart', map: mapTrafficReportToChart },
  }),
  defineTool({
    name: 'ebay_find_seller_standards_profiles',
    description: 'Find all seller standards profiles',
    inputSchema: findSellerStandardsProfilesInputSchema.shape,
    outputSchema: {
      type: 'object',
      properties: {
        standards: { type: 'array' },
      },
      description: 'Seller standards profiles',
    },
    handler: (api, args) => Effect.runPromise(api.analytics.findSellerStandardsProfiles(args)),
  }),
  defineTool({
    name: 'ebay_get_seller_standards_profile',
    description: 'Get a specific seller standards profile',
    inputSchema: getSellerStandardsProfileInputSchema.shape,
    outputSchema: {
      type: 'object',
      properties: {
        program: { type: 'string' },
        cycle: { type: 'object' },
        metrics: { type: 'array' },
      },
      description: 'Seller standards profile data',
    },
    handler: (api, args) => Effect.runPromise(api.analytics.getSellerStandardsProfile(args)),
    ui: { archetype: 'card', map: mapStandardsProfileToCard },
  }),
  defineTool({
    name: 'ebay_get_customer_service_metric',
    description: 'Get customer service metrics',
    inputSchema: getCustomerServiceMetricInputSchema.shape,
    outputSchema: {
      type: 'object',
      properties: {
        metrics: { type: 'array' },
      },
      description: 'Customer service metric data',
    },
    handler: (api, args) => Effect.runPromise(api.analytics.getCustomerServiceMetric(args)),
    ui: { archetype: 'chart', map: mapCustomerServiceMetricToChart },
  }),
];
