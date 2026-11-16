import { tool } from "ai";
import { QueryError, runQuery } from "@/lib/analytics/engine";
import { QuerySpecSchema } from "@/lib/analytics/spec";
import { runForecast } from "@/lib/forecast/engine";
import { ForecastSpecSchema } from "@/lib/forecast/spec";

export const aiTools = {
  query: tool({
    description:
      "Compute counts, rates, averages, or breakdowns across the 2025 logistics orders dataset.",
    inputSchema: QuerySpecSchema,
    execute: async (spec) => {
      try {
        return runQuery(spec);
      } catch (err) {
        if (err instanceof QueryError) {
          return { error: err.message };
        }
        throw err;
      }
    },
  }),
  forecast: tool({
    description:
      "Forecast monthly demand in units for 1 to 6 months ahead and calculate inventory recommendations for all products, a product category, or a SKU.",
    inputSchema: ForecastSpecSchema,
    execute: async (spec) => {
      try {
        return runForecast(spec);
      } catch (err) {
        if (err instanceof QueryError) {
          return { error: err.message };
        }
        throw err;
      }
    },
  }),
};
