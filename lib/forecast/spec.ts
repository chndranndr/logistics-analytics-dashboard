import { z } from "zod";

export const ForecastScopeSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("all"),
    }),
    z.object({
      type: z.literal("category"),
      category: z
        .string()
        .min(1)
        .describe("Product category name to forecast."),
    }),
    z.object({
      type: z.literal("sku"),
      sku: z
        .string()
        .min(1)
        .describe("SKU identifier, resolved to its product category."),
    }),
  ])
  .describe("Scope of the demand forecast: all products, a category, or a SKU.");

export const ForecastSpecSchema = z.object({
  scope: ForecastScopeSchema,
  horizonMonths: z
    .number()
    .int()
    .min(1)
    .max(6)
    .describe("Number of future months to forecast (1 to 6)."),
  historyMonths: z
    .number()
    .int()
    .min(4)
    .max(12)
    .optional()
    .describe(
      "Only when the user names a base period, such as 'based on the last 10 months': how many of the most recent months to learn from (4 to 12). Omit to use all 12.",
    ),
  backtestMonths: z
    .number()
    .int()
    .min(1)
    .max(6)
    .optional()
    .describe(
      "Only when the user names a backtest length: how many of the most recent months are held out to compare the methods. Omit to use 3.",
    ),
});

export type ForecastSpec = z.infer<typeof ForecastSpecSchema>;
