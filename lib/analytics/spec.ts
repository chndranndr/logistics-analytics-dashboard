import { z } from "zod";
import { STATUSES } from "@/lib/data/orders";
import { METRIC_IDS } from "@/lib/domain/metrics";

export const TIME_GRAINS = ["day", "week", "month"] as const;

export const CATEGORY_DIMENSIONS = [
  "carrier",
  "region",
  "warehouse",
  "product_category",
  "destination_city",
  "origin_city",
  "status",
  "client_id",
] as const;

export const GROUP_BY_OPTIONS = [
  ...TIME_GRAINS,
  ...CATEGORY_DIMENSIONS,
] as const;

export type GroupByOption = (typeof GROUP_BY_OPTIONS)[number];

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const QuerySpecSchema = z.object({
  metric: z
    .enum(METRIC_IDS)
    .describe("The metric to compute across matching orders."),
  groupBy: z
    .enum(GROUP_BY_OPTIONS)
    .nullable()
    .describe(
      "Optional dimension to group results by: a time grain (day, week, month) or a category column, or null for a single overall value.",
    ),
  filters: z
    .object({
      carrier: z
        .array(z.string())
        .optional()
        .describe("Filter to orders shipped by one or more carriers."),
      region: z
        .array(z.string())
        .optional()
        .describe("Filter to orders in one or more regions."),
      warehouse: z
        .array(z.string())
        .optional()
        .describe("Filter to orders from one or more warehouses."),
      product_category: z
        .array(z.string())
        .optional()
        .describe("Filter to orders in one or more product categories."),
      status: z
        .array(z.enum(STATUSES))
        .optional()
        .describe("Filter to orders with one or more statuses."),
      destination_city: z
        .array(z.string())
        .optional()
        .describe("Filter to orders going to one or more destination cities."),
      is_promo: z
        .boolean()
        .optional()
        .describe("Filter to promo (true) or non-promo (false) orders."),
    })
    .describe("Optional field filters applied before aggregation."),
  dateRange: z
    .discriminatedUnion("type", [
      z.object({
        type: z.literal("all"),
      }),
      z.object({
        type: z.literal("relative"),
        unit: z
          .enum(TIME_GRAINS)
          .describe("Calendar unit for the relative range: day, week, or month."),
        count: z
          .number()
          .int()
          .min(1)
          .max(24)
          .describe("Number of complete calendar units before the reference date."),
      }),
      z.object({
        type: z.literal("absolute"),
        from: z
          .string()
          .regex(isoDateRegex)
          .describe("Inclusive start order_date in YYYY-MM-DD format."),
        to: z
          .string()
          .regex(isoDateRegex)
          .describe("Inclusive end order_date in YYYY-MM-DD format."),
      }),
    ])
    .describe("Date range filter evaluated against order_date."),
  sort: z
    .enum(["value_desc", "value_asc", "natural"])
    .describe(
      "Row ordering: value_desc, value_asc, or natural (key ascending).",
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .nullable()
    .describe("Maximum number of rows to return, or null for all rows."),
});

export type QuerySpec = z.infer<typeof QuerySpecSchema>;
