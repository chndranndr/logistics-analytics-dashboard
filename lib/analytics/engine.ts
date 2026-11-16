import { getOrders, type Order } from "@/lib/data/orders";
import {
  bucketKey,
  listBuckets,
  resolveDateRange,
  type TimeGrain,
} from "@/lib/domain/dates";
import {
  computeMetric,
  REFERENCE_DATE,
  SMALL_SAMPLE,
  type MetricId,
} from "@/lib/domain/metrics";
import {
  CATEGORY_DIMENSIONS,
  TIME_GRAINS,
  type QuerySpec,
} from "@/lib/analytics/spec";
import { selectChart, type ChartSpec } from "@/lib/chart/select";

export type { ChartSpec };

export class QueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QueryError";
  }
}

export type QueryRow = {
  key: string;
  value: number | null;
  n: number;
};

export type QueryResult = {
  kind: "query";
  metric: MetricId;
  groupBy: string | null;
  rows: QueryRow[];
  resolved: {
    dateFrom: string;
    dateTo: string;
    filters: Record<string, string[] | boolean>;
  };
  matchedOrders: number;
  notes: string[];
  chart: ChartSpec;
};

const STRING_FILTER_FIELDS = [
  "carrier",
  "region",
  "warehouse",
  "product_category",
  "status",
  "destination_city",
] as const;

type StringFilterField = (typeof STRING_FILTER_FIELDS)[number];
type CategoryDimension = (typeof CATEGORY_DIMENSIONS)[number];

const RATE_OR_AVG_METRICS = new Set<MetricId>([
  "on_time_rate",
  "delay_rate",
  "avg_delivery_days",
]);

function isTimeGrain(value: string | null): value is TimeGrain {
  return (
    value !== null && (TIME_GRAINS as readonly string[]).includes(value)
  );
}

function isCategoryDimension(
  value: string | null,
): value is CategoryDimension {
  return (
    value !== null &&
    (CATEGORY_DIMENSIONS as readonly string[]).includes(value)
  );
}

function compareKeys(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function normalizeFilters(
  filters: QuerySpec["filters"],
  orders: readonly Order[],
): {
  stringFilters: Partial<Record<StringFilterField, string[]>>;
  isPromo: boolean | undefined;
  resolvedFilters: Record<string, string[] | boolean>;
} {
  const stringFilters: Partial<Record<StringFilterField, string[]>> = {};
  const resolvedFilters: Record<string, string[] | boolean> = {};

  for (const field of STRING_FILTER_FIELDS) {
    const rawValues = filters[field];
    if (!rawValues || rawValues.length === 0) {
      continue;
    }

    const lookup = new Map<string, string>();
    for (const order of orders) {
      const canonical = order[field];
      const lower = canonical.toLowerCase();
      if (!lookup.has(lower)) {
        lookup.set(lower, canonical);
      }
    }

    const validValues = Array.from(lookup.values()).sort(compareKeys);
    const normalized: string[] = [];

    for (const raw of rawValues) {
      const match = lookup.get(raw.trim().toLowerCase());
      if (!match) {
        throw new QueryError(
          `Invalid ${field} "${raw}". Valid values: ${validValues.join(", ")}`,
        );
      }
      if (!normalized.includes(match)) {
        normalized.push(match);
      }
    }

    stringFilters[field] = normalized;
    resolvedFilters[field] = normalized;
  }

  let isPromo: boolean | undefined;
  if (filters.is_promo !== undefined) {
    isPromo = filters.is_promo;
    resolvedFilters.is_promo = filters.is_promo;
  }

  return { stringFilters, isPromo, resolvedFilters };
}

function getDataBounds(orders: readonly Order[]): {
  dataMin: string;
  dataMax: string;
} {
  if (orders.length === 0) {
    return { dataMin: REFERENCE_DATE, dataMax: REFERENCE_DATE };
  }
  let dataMin = orders[0].order_date;
  let dataMax = orders[0].order_date;
  for (const order of orders) {
    if (order.order_date < dataMin) dataMin = order.order_date;
    if (order.order_date > dataMax) dataMax = order.order_date;
  }
  return { dataMin, dataMax };
}

function sortRows(rows: QueryRow[], sort: QuerySpec["sort"]): QueryRow[] {
  const copy = [...rows];
  if (sort === "natural") {
    return copy.sort((a, b) => compareKeys(a.key, b.key));
  }

  return copy.sort((a, b) => {
    if (a.value === null && b.value === null) {
      return compareKeys(a.key, b.key);
    }
    if (a.value === null) return 1;
    if (b.value === null) return -1;
    const diff = sort === "value_desc" ? b.value - a.value : a.value - b.value;
    return diff !== 0 ? diff : compareKeys(a.key, b.key);
  });
}

export function runQuery(
  spec: QuerySpec,
  orders: readonly Order[] = getOrders(),
): QueryResult {
  const { stringFilters, isPromo, resolvedFilters } = normalizeFilters(
    spec.filters,
    orders,
  );

  const { dataMin, dataMax } = getDataBounds(orders);
  const { from: dateFrom, to: dateTo } = resolveDateRange(
    spec.dateRange,
    REFERENCE_DATE,
    dataMin,
    dataMax,
  );

  const filtered = orders.filter((order) => {
    if (order.order_date < dateFrom || order.order_date > dateTo) {
      return false;
    }
    for (const field of STRING_FILTER_FIELDS) {
      const allowed = stringFilters[field];
      if (allowed && !allowed.includes(order[field])) {
        return false;
      }
    }
    if (isPromo !== undefined && order.is_promo !== isPromo) {
      return false;
    }
    return true;
  });

  const matchedOrders = filtered.length;
  let rows: QueryRow[];

  if (spec.groupBy === null) {
    const metric = computeMetric(spec.metric, filtered);
    rows = [{ key: "all", value: metric.value, n: metric.n }];
  } else if (isTimeGrain(spec.groupBy)) {
    const grain = spec.groupBy;
    const grouped = new Map<string, Order[]>();
    for (const order of filtered) {
      const key = bucketKey(order.order_date, grain);
      const list = grouped.get(key);
      if (list) {
        list.push(order);
      } else {
        grouped.set(key, [order]);
      }
    }
    const bucketFrom = dateFrom > dataMin ? dateFrom : dataMin;
    const bucketTo = dateTo < dataMax ? dateTo : dataMax;
    const keys = listBuckets(bucketFrom, bucketTo, grain);
    rows = keys.map((key) => {
      const metric = computeMetric(spec.metric, grouped.get(key) ?? []);
      return { key, value: metric.value, n: metric.n };
    });
  } else if (isCategoryDimension(spec.groupBy)) {
    const dim = spec.groupBy;
    const grouped = new Map<string, Order[]>();
    for (const order of filtered) {
      const key = order[dim];
      const list = grouped.get(key);
      if (list) {
        list.push(order);
      } else {
        grouped.set(key, [order]);
      }
    }
    rows = Array.from(grouped.entries()).map(([key, groupRows]) => {
      const metric = computeMetric(spec.metric, groupRows);
      return { key, value: metric.value, n: metric.n };
    });
  } else {
    rows = [];
  }

  rows = sortRows(rows, spec.sort);

  if (spec.limit !== null) {
    rows = rows.slice(0, spec.limit);
  }

  const notes: string[] = [];
  if (
    isCategoryDimension(spec.groupBy) &&
    RATE_OR_AVG_METRICS.has(spec.metric)
  ) {
    const smallRows = rows.filter((row) => row.n < SMALL_SAMPLE);
    if (smallRows.length > 3) {
      notes.push(
        `${smallRows.length} of ${rows.length} groups have fewer than ${SMALL_SAMPLE} completed orders`,
      );
    } else {
      for (const row of smallRows) {
        notes.push(`${row.key}: small sample (${row.n} completed orders)`);
      }
    }
  }

  return {
    kind: "query",
    metric: spec.metric,
    groupBy: spec.groupBy,
    rows,
    resolved: {
      dateFrom,
      dateTo,
      filters: resolvedFilters,
    },
    matchedOrders,
    notes,
    chart: selectChart(spec.groupBy, rows.length),
  };
}
