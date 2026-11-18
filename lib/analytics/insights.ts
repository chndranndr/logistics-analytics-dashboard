import { getOrders, type Order } from "@/lib/data/orders";
import { runQuery, type QueryRow } from "@/lib/analytics/engine";
import type { QuerySpec } from "@/lib/analytics/spec";
import { SMALL_SAMPLE } from "@/lib/domain/metrics";

export type Insight = {
  id: string;
  title: string;
  detail: string;
  filter: { carrier?: string; region?: string; from?: string; to?: string };
  tone: "bad" | "warn";
};

function firstSized(rows: QueryRow[]): QueryRow | undefined {
  return rows.find((row) => row.n >= SMALL_SAMPLE && row.value !== null);
}

export function buildInsights(
  filters: QuerySpec["filters"],
  dateRange: QuerySpec["dateRange"],
  orders: readonly Order[] = getOrders(),
): Insight[] {
  const insights: Insight[] = [];

  if (!filters.carrier?.length) {
    const row = firstSized(
      runQuery(
        { metric: "delay_rate", groupBy: "carrier", filters, dateRange, sort: "value_desc", limit: null },
        orders,
      ).rows,
    );
    if (row) {
      insights.push({
        id: "carrier_delay",
        title: `Highest delay rate: ${row.key}`,
        detail: `${row.value}% of ${row.n} completed orders delayed`,
        filter: { carrier: row.key },
        tone: "bad",
      });
    }
  }

  const month = firstSized(
    runQuery(
      { metric: "delay_rate", groupBy: "month", filters, dateRange, sort: "value_desc", limit: null },
      orders,
    ).rows,
  );
  if (month) {
    const [year, mon] = month.key.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate();
    insights.push({
      id: "worst_month",
      title: `Worst month: ${month.key}`,
      detail: `${month.value}% of ${month.n} completed orders delayed`,
      filter: { from: `${month.key}-01`, to: `${month.key}-${String(lastDay).padStart(2, "0")}` },
      tone: "bad",
    });
  }

  if (!filters.region?.length) {
    const row = firstSized(
      runQuery(
        { metric: "on_time_rate", groupBy: "region", filters, dateRange, sort: "value_asc", limit: null },
        orders,
      ).rows,
    );
    if (row) {
      insights.push({
        id: "region_on_time",
        title: `Lowest on-time rate: ${row.key}`,
        detail: `${row.value}% of ${row.n} completed orders on time`,
        filter: { region: row.key },
        tone: "warn",
      });
    }
  }

  return insights;
}
