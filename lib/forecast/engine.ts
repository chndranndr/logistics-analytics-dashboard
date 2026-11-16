import { QueryError } from "@/lib/analytics/engine";
import { getOrders, type Order } from "@/lib/data/orders";
import { bucketKey, listBuckets } from "@/lib/domain/dates";
import {
  linearTrend,
  mae,
  movingAverage,
  rmse,
} from "@/lib/forecast/methods";
import type { ForecastSpec } from "@/lib/forecast/spec";

export type ForecastMethod = "moving_average" | "linear_trend";

export type ForecastResult = {
  kind: "forecast";
  scopeLabel: string;
  history: { month: string; value: number }[];
  forecast: { month: string; value: number; lower: number; upper: number }[];
  method: ForecastMethod;
  backtest: {
    moving_average: { mae: number; rmse: number };
    linear_trend: { mae: number; rmse: number };
  };
  inventory: {
    expectedDemand: number;
    safetyStock: number;
    recommended: number;
  };
  methodology: string;
  notes: string[];
};

const HISTORY_MONTHS = listBuckets("2025-01-01", "2025-12-31", "month");
const SERVICE_LEVEL_Z = 1.65;

const STANDARD_NOTES = [
  "The history has only 12 months. The forecast does not include seasonality.",
  "The data has no stock level and no lead time. The recommendation is the number of units to have available in the forecast period.",
  "The forecast does not include canceled orders.",
] as const;

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function nextMonths(lastMonth: string, count: number): string[] {
  const [startYear, startMonth] = lastMonth.split("-").map(Number);
  const months: string[] = [];
  let y = startYear;
  let m = startMonth;
  for (let i = 0; i < count; i += 1) {
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    months.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return months;
}

function resolveScope(
  scope: ForecastSpec["scope"],
  orders: readonly Order[],
): {
  category: string | null;
  scopeLabel: string;
  extraNotes: string[];
} {
  const categoryLookup = new Map<string, string>();
  const skuToOrder = new Map<string, { sku: string; category: string }>();

  for (const order of orders) {
    const catLower = order.product_category.toLowerCase();
    if (!categoryLookup.has(catLower)) {
      categoryLookup.set(catLower, order.product_category);
    }
    const skuLower = order.sku.toLowerCase();
    if (!skuToOrder.has(skuLower)) {
      skuToOrder.set(skuLower, {
        sku: order.sku,
        category: order.product_category,
      });
    }
  }

  const validCategories = Array.from(categoryLookup.values()).sort();

  if (scope.type === "all") {
    return {
      category: null,
      scopeLabel: "All products",
      extraNotes: [],
    };
  }

  if (scope.type === "category") {
    const canonical = categoryLookup.get(scope.category.trim().toLowerCase());
    if (!canonical) {
      throw new QueryError(
        `Unknown category "${scope.category}". Valid categories: ${validCategories.join(", ")}`,
      );
    }
    return {
      category: canonical,
      scopeLabel: `Category ${canonical}`,
      extraNotes: [],
    };
  }

  const skuEntry = skuToOrder.get(scope.sku.trim().toLowerCase());
  if (!skuEntry) {
    throw new QueryError(
      `Unknown SKU "${scope.sku}". Forecasts are by category; valid categories: ${validCategories.join(", ")}`,
    );
  }

  return {
    category: skuEntry.category,
    scopeLabel: `Category ${skuEntry.category}`,
    extraNotes: [
      `SKU ${skuEntry.sku} belongs to category ${skuEntry.category}; showing the category-level forecast because individual SKUs have at most 3 orders.`,
    ],
  };
}

export function runForecast(
  spec: ForecastSpec,
  orders: readonly Order[] = getOrders(),
): ForecastResult {
  const { category, scopeLabel, extraNotes } = resolveScope(
    spec.scope,
    orders,
  );

  const nonCanceled = orders.filter(
    (order) =>
      order.status !== "canceled" &&
      (category === null || order.product_category === category),
  );

  const monthlyTotals = new Map<string, number>();
  for (const order of nonCanceled) {
    const month = bucketKey(order.order_date, "month");
    monthlyTotals.set(month, (monthlyTotals.get(month) ?? 0) + order.quantity);
  }

  const history = HISTORY_MONTHS.map((month) => ({
    month,
    value: monthlyTotals.get(month) ?? 0,
  }));

  const series = history.map((point) => point.value);
  const train = series.slice(0, 9);
  const actual = series.slice(9, 12);

  const maBacktestPred = movingAverage(train, 3);
  const ltBacktestPred = linearTrend(train, 3);

  const maMaeRaw = mae(maBacktestPred, actual);
  const maRmseRaw = rmse(maBacktestPred, actual);
  const ltMaeRaw = mae(ltBacktestPred, actual);
  const ltRmseRaw = rmse(ltBacktestPred, actual);

  const backtest = {
    moving_average: { mae: round2(maMaeRaw), rmse: round2(maRmseRaw) },
    linear_trend: { mae: round2(ltMaeRaw), rmse: round2(ltRmseRaw) },
  };

  const method: ForecastMethod =
    backtest.moving_average.mae <= backtest.linear_trend.mae
      ? "moving_average"
      : "linear_trend";

  const selectedRmse = method === "moving_average" ? maRmseRaw : ltRmseRaw;

  const rawForecast =
    method === "moving_average"
      ? movingAverage(series, spec.horizonMonths)
      : linearTrend(series, spec.horizonMonths);

  const futureMonths = nextMonths(
    HISTORY_MONTHS[HISTORY_MONTHS.length - 1],
    spec.horizonMonths,
  );

  const forecast = futureMonths.map((month, index) => {
    const k = index + 1;
    const value = Math.round(rawForecast[index]);
    const margin = SERVICE_LEVEL_Z * selectedRmse * Math.sqrt(k);
    return {
      month,
      value,
      lower: Math.max(0, Math.round(value - margin)),
      upper: Math.round(value + margin),
    };
  });

  const expectedDemand = forecast.reduce((acc, pt) => acc + pt.value, 0);
  const safetyStock = Math.ceil(
    SERVICE_LEVEL_Z * selectedRmse * Math.sqrt(spec.horizonMonths),
  );
  const recommended = expectedDemand + safetyStock;

  const methodName =
    method === "moving_average" ? "3-month moving average" : "linear trend";
  const methodology = `Selected ${methodName} via Oct–Dec 2025 backtest (moving average MAE ${backtest.moving_average.mae} / RMSE ${backtest.moving_average.rmse} vs linear trend MAE ${backtest.linear_trend.mae} / RMSE ${backtest.linear_trend.rmse}), refitted on all 12 months of 2025 with ±1.65 × RMSE × √k (~95% service level) uncertainty bands over ${spec.horizonMonths} month(s).`;

  return {
    kind: "forecast",
    scopeLabel,
    history,
    forecast,
    method,
    backtest,
    inventory: {
      expectedDemand,
      safetyStock,
      recommended,
    },
    methodology,
    notes: [...extraNotes, ...STANDARD_NOTES],
  };
}
