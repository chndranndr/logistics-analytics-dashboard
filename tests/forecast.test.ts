import { describe, expect, it } from "vitest";
import { QueryError } from "@/lib/analytics/engine";
import { runForecast } from "@/lib/forecast/engine";
import { linearTrend, mae, movingAverage, rmse } from "@/lib/forecast/methods";

describe("forecast methods", () => {
  it("computes backtest predictions and errors matching section 3.4", () => {
    const allSeries = [233, 86, 147, 55, 115, 64, 126, 98, 94, 79, 113, 93];
    const trainAll = allSeries.slice(0, 9);
    const actualAll = allSeries.slice(9, 12);

    const maPredAll = movingAverage(trainAll, 3);
    expect(maPredAll).toEqual([106, 106, 106]);
    expect(Number(mae(maPredAll, actualAll).toFixed(2))).toBe(15.67);
    expect(Number(rmse(maPredAll, actualAll).toFixed(2))).toBe(17.77);

    const ltPredAll = linearTrend(trainAll, 3);
    expect(ltPredAll.map((v) => Number(v.toFixed(2)))).toEqual([
      67.03, 57.81, 48.59,
    ]);
    expect(Number(mae(ltPredAll, actualAll).toFixed(2))).toBe(37.19);
    expect(Number(rmse(ltPredAll, actualAll).toFixed(2))).toBe(41.48);

    const crayonSeries = [60, 12, 33, 11, 3, 22, 5, 25, 23, 14, 4, 16];
    const trainCrayon = crayonSeries.slice(0, 9);
    const actualCrayon = crayonSeries.slice(9, 12);

    const maPredCrayon = movingAverage(trainCrayon, 3);
    expect(maPredCrayon.map((v) => Number(v.toFixed(2)))).toEqual([
      17.67, 17.67, 17.67,
    ]);
    expect(Number(mae(maPredCrayon, actualCrayon).toFixed(2))).toBe(6.33);
    expect(Number(rmse(maPredCrayon, actualCrayon).toFixed(2))).toBe(8.23);

    const ltPredCrayon = linearTrend(trainCrayon, 3);
    expect(ltPredCrayon.map((v) => Number(v.toFixed(2)))).toEqual([
      8.72, 6.16, 3.59,
    ]);
    expect(Number(mae(ltPredCrayon, actualCrayon).toFixed(2))).toBe(6.61);
    expect(Number(rmse(ltPredCrayon, actualCrayon).toFixed(2))).toBe(7.89);
  });
});

describe("runForecast", () => {
  it("matches all golden values for All products (section 3.4)", () => {
    const res = runForecast({ scope: { type: "all" }, horizonMonths: 4 });

    expect(res.scopeLabel).toBe("All products");
    expect(res.history.map((p) => p.value)).toEqual([
      233, 86, 147, 55, 115, 64, 126, 98, 94, 79, 113, 93,
    ]);
    expect(res.history.reduce((a, b) => a + b.value, 0)).toBe(1303);
    expect(res.backtest).toEqual({
      moving_average: { mae: 15.67, rmse: 17.77 },
      linear_trend: { mae: 37.19, rmse: 41.48 },
    });
    expect(res.method).toBe("moving_average");
    expect(res.forecast.map((p) => p.value)).toEqual([95, 95, 95, 95]);
    expect(res.forecast[0].lower).toBe(66);
    expect(res.forecast[0].upper).toBe(124);
    expect(res.inventory).toEqual({
      expectedDemand: 380,
      safetyStock: 59,
      recommended: 439,
    });
    expect(res.notes).toHaveLength(3);
  });

  it("matches all golden values for Category CRAYON case-insensitively (section 3.4)", () => {
    const res = runForecast({
      scope: { type: "category", category: "crayon" },
      horizonMonths: 4,
    });

    expect(res.scopeLabel).toBe("Category CRAYON");
    expect(res.history.map((p) => p.value)).toEqual([
      60, 12, 33, 11, 3, 22, 5, 25, 23, 14, 4, 16,
    ]);
    expect(res.backtest).toEqual({
      moving_average: { mae: 6.33, rmse: 8.23 },
      linear_trend: { mae: 6.61, rmse: 7.89 },
    });
    expect(res.method).toBe("moving_average");
    expect(res.forecast.map((p) => p.value)).toEqual([11, 11, 11, 11]);
    expect(res.inventory).toEqual({
      expectedDemand: 44,
      safetyStock: 28,
      recommended: 72,
    });
  });

  it("resolves SKU CRAYON-0008 to Category CRAYON with an explicit note", () => {
    const res = runForecast({
      scope: { type: "sku", sku: "CRAYON-0008" },
      horizonMonths: 4,
    });

    expect(res.scopeLabel).toBe("Category CRAYON");
    expect(res.inventory).toEqual({
      expectedDemand: 44,
      safetyStock: 28,
      recommended: 72,
    });
    expect(res.notes.some((n) => n.includes("CRAYON"))).toBe(true);
    expect(res.notes).toHaveLength(4);
  });

  it("learns only from the last 10 months when historyMonths is 10", () => {
    const res = runForecast({
      scope: { type: "all" },
      horizonMonths: 3,
      historyMonths: 10,
    });

    expect(res.history).toHaveLength(10);
    expect(res.history[0].month).toBe("2025-03");
    expect(res.backtest).toEqual({
      moving_average: { mae: 15.67, rmse: 17.77 },
      linear_trend: { mae: 14.21, rmse: 16.04 },
    });
    // The window changes the winner: linear trend now beats the moving average.
    expect(res.method).toBe("linear_trend");
    expect(res.forecast.map((p) => p.value)).toEqual([92, 91, 89]);
    expect(res.inventory).toEqual({
      expectedDemand: 272,
      safetyStock: 46,
      recommended: 318,
    });
    expect(res.methodology).toContain("2025-03 to 2025-12");
    expect(res.notes.some((n) => n.includes("last 10 of 12 months"))).toBe(true);
  });

  it("uses the requested backtest length", () => {
    const res = runForecast({
      scope: { type: "all" },
      horizonMonths: 2,
      historyMonths: 10,
      backtestMonths: 2,
    });

    expect(res.backtest).toEqual({
      moving_average: { mae: 12.67, rmse: 16.14 },
      linear_trend: { mae: 21.82, rmse: 23.38 },
    });
    expect(res.method).toBe("moving_average");
    expect(res.methodology).toContain("2-month backtest (2025-11 to 2025-12");
  });

  it("rejects windows that leave fewer than 3 months to learn from", () => {
    expect(() =>
      runForecast({
        scope: { type: "all" },
        horizonMonths: 3,
        historyMonths: 5,
        backtestMonths: 3,
      }),
    ).toThrow(QueryError);
  });

  it("throws QueryError for unknown category or SKU", () => {
    expect(() =>
      runForecast({
        scope: { type: "category", category: "UNKNOWN" },
        horizonMonths: 4,
      }),
    ).toThrow(QueryError);

    expect(() =>
      runForecast({
        scope: { type: "sku", sku: "NO-SUCH-SKU" },
        horizonMonths: 4,
      }),
    ).toThrow(QueryError);
  });
});
