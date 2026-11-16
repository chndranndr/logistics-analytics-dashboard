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
});

export type ForecastSpec = z.infer<typeof ForecastSpecSchema>;
