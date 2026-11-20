import { PackageSearch, SearchX } from "lucide-react";
import { Suspense } from "react";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { CarrierDelayChart } from "@/components/dashboard/CarrierDelayChart";
import { DataTable, type TableOrder } from "@/components/dashboard/DataTable";
import { ViewSwitcher } from "@/components/dashboard/ViewSwitcher";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { DeliveryPerformanceChart } from "@/components/dashboard/DeliveryPerformanceChart";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { FilterNavProvider } from "@/components/dashboard/FilterNavProvider";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { KpiCards, type KpiItem } from "@/components/dashboard/KpiCards";
import { OrderVolumeChart } from "@/components/dashboard/OrderVolumeChart";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { buildInsights, type Insight } from "@/lib/analytics/insights";
import { QueryError, runQuery } from "@/lib/analytics/engine";
import type { QuerySpec } from "@/lib/analytics/spec";
import { getOrders } from "@/lib/data/orders";
import {
  previousPeriod,
  resolveDateRange,
  type DateRange,
} from "@/lib/domain/dates";
import { REFERENCE_DATE, type MetricId } from "@/lib/domain/metrics";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const DATA_MIN = "2025-01-01";
const DATA_MAX = "2025-12-30";

const KPI_METRICS: MetricId[] = [
  "order_count",
  "delivered_count",
  "delayed_count",
  "on_time_rate",
  "avg_delivery_days",
];

const PRESET_RANGES: { label: string; range: DateRange }[] = [
  { label: "Last 30 days", range: { type: "relative", unit: "day", count: 30 } },
  { label: "Last 3 months", range: { type: "relative", unit: "month", count: 3 } },
  { label: "Last 6 months", range: { type: "relative", unit: "month", count: 6 } },
];

const PRESETS = [
  ...PRESET_RANGES.map(({ label, range }) => ({
    label,
    ...resolveDateRange(range, REFERENCE_DATE, DATA_MIN, DATA_MAX),
  })),
  { label: "All time", from: "", to: "" },
];

function firstParam(
  value: string | string[] | undefined,
): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && value.length > 0) return value[0].trim();
  return "";
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function DashboardContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const fromParam = firstParam(params.from);
  const toParam = firstParam(params.to);
  const carrierParam = firstParam(params.carrier);
  const regionParam = firstParam(params.region);
  const warehouseParam = firstParam(params.warehouse);
  const categoryParam = firstParam(params.category);

  const orders = getOrders();
  const carriers = Array.from(new Set(orders.map((o) => o.carrier))).sort();
  const regions = Array.from(new Set(orders.map((o) => o.region))).sort();
  const warehouses = Array.from(new Set(orders.map((o) => o.warehouse))).sort();
  const categories = Array.from(
    new Set(orders.map((o) => o.product_category)),
  ).sort();

  const filters: QuerySpec["filters"] = {};
  if (carrierParam) filters.carrier = [carrierParam];
  if (regionParam) filters.region = [regionParam];
  if (warehouseParam) filters.warehouse = [warehouseParam];
  if (categoryParam) filters.product_category = [categoryParam];

  const validFrom = isIsoDate(fromParam) ? fromParam : "";
  const validTo = isIsoDate(toParam) ? toParam : "";
  const dateRange: QuerySpec["dateRange"] =
    validFrom || validTo
      ? {
          type: "absolute",
          from: validFrom || DATA_MIN,
          to: validTo || DATA_MAX,
        }
      : { type: "all" };

  // Raw rows behind the dashboard: same filters and dates as the KPIs and charts.
  const rangeFrom = validFrom || DATA_MIN;
  const rangeTo = validTo || DATA_MAX;
  const tableOrders: TableOrder[] = orders
    .filter(
      (o) =>
        o.order_date >= rangeFrom &&
        o.order_date <= rangeTo &&
        (!carrierParam || o.carrier === carrierParam) &&
        (!regionParam || o.region === regionParam) &&
        (!warehouseParam || o.warehouse === warehouseParam) &&
        (!categoryParam || o.product_category === categoryParam),
    )
    .map((o) => ({
      order_id: o.order_id,
      order_date: o.order_date,
      delivery_date: o.delivery_date,
      carrier: o.carrier,
      origin_city: o.origin_city,
      destination_city: o.destination_city,
      status: o.status,
      sku: o.sku,
      product_category: o.product_category,
      quantity: o.quantity,
      order_value_usd: o.order_value_usd,
      region: o.region,
      warehouse: o.warehouse,
    }));

  const baseSpec: QuerySpec = {
    metric: "order_count",
    groupBy: null,
    filters,
    dateRange,
    sort: "natural",
    limit: null,
  };

  function kpiFor(metric: MetricId): KpiItem {
    const current = runQuery({ ...baseSpec, metric, groupBy: null }, orders);
    const row = current.rows[0] ?? { value: null, n: 0 };
    const spark = runQuery(
      { ...baseSpec, metric, groupBy: "month", sort: "natural" },
      orders,
    ).rows.map((r) => r.value);

    let previous: KpiItem["previous"] = null;
    if (dateRange.type !== "all") {
      const prevRange = previousPeriod(
        current.resolved.dateFrom,
        current.resolved.dateTo,
        DATA_MIN,
      );
      if (prevRange) {
        const prev = runQuery(
          {
            ...baseSpec,
            metric,
            groupBy: null,
            dateRange: { type: "absolute", ...prevRange },
          },
          orders,
        ).rows[0] ?? { value: null, n: 0 };
        previous = { value: prev.value, n: prev.n };
      }
    }

    return { id: metric, value: row.value, n: row.n, spark, previous };
  }

  let filterError: string | null = null;
  let kpis: KpiItem[] = [];
  let insights: Insight[] = [];
  let volumeData: { key: string; value: number | null }[] = [];
  let performanceData: { month: string; delivered: number; delayed: number }[] =
    [];
  let carrierData: { key: string; value: number | null; n: number }[] = [];
  let carrierNotes: string[] = [];

  try {
    kpis = KPI_METRICS.map(kpiFor);
    insights = buildInsights(filters, dateRange, orders);

    const volumeRes = runQuery(
      { ...baseSpec, metric: "order_count", groupBy: "month", sort: "natural" },
      orders,
    );
    volumeData = volumeRes.rows.map((r) => ({ key: r.key, value: r.value }));

    const deliveredRes = runQuery(
      {
        ...baseSpec,
        metric: "delivered_count",
        groupBy: "month",
        sort: "natural",
      },
      orders,
    );
    const delayedRes = runQuery(
      {
        ...baseSpec,
        metric: "delayed_count",
        groupBy: "month",
        sort: "natural",
      },
      orders,
    );
    const delayedByMonth = new Map(
      delayedRes.rows.map((r) => [r.key, r.value ?? 0]),
    );
    performanceData = deliveredRes.rows.map((r) => ({
      month: r.key,
      delivered: r.value ?? 0,
      delayed: delayedByMonth.get(r.key) ?? 0,
    }));

    const carrierRes = runQuery(
      {
        ...baseSpec,
        metric: "delay_rate",
        groupBy: "carrier",
        sort: "value_desc",
      },
      orders,
    );
    carrierData = carrierRes.rows;
    carrierNotes = carrierRes.notes;
  } catch (err) {
    if (err instanceof QueryError) {
      filterError = err.message;
    } else {
      throw err;
    }
  }

  const noOrders = kpis.find((k) => k.id === "order_count")?.n === 0;

  return (
    <FilterNavProvider>
      <div className="space-y-6">
        <FilterBar
          carriers={carriers}
          regions={regions}
          warehouses={warehouses}
          categories={categories}
          from={validFrom}
          to={validTo}
          carrier={carrierParam}
          region={regionParam}
          warehouse={warehouseParam}
          category={categoryParam}
          presets={PRESETS}
        />

        {filterError ? (
          <div className="rounded-lg border border-bad/30 bg-bad/10 p-4 text-sm text-bad">
            {filterError}
          </div>
        ) : noOrders ? (
          <Card className="flex flex-col items-center gap-2 py-10 text-center">
            <SearchX className="size-8 text-muted" aria-hidden="true" />
            <p className="font-semibold text-text">No orders match these filters</p>
            <p className="text-sm text-muted">
              Clear a filter above to see results again.
            </p>
          </Card>
        ) : (
          <>
            <InsightsPanel insights={insights} />

            <KpiCards items={kpis} />

            <ViewSwitcher
              charts={
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <OrderVolumeChart data={volumeData} />
                    <DeliveryPerformanceChart data={performanceData} />
                  </div>

                  <div>
                    <CarrierDelayChart data={carrierData} />
                    {carrierNotes.length > 0 && (
                      <p className="mt-2 text-xs text-warn">
                        Note: {carrierNotes.join("; ")}
                      </p>
                    )}
                  </div>
                </div>
              }
              table={<DataTable orders={tableOrders} />}
            />
          </>
        )}
      </div>
    </FilterNavProvider>
  );
}

export default function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="mx-auto min-h-screen max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <PackageSearch className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">
              Logistics Analytics Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted">
              Data: {DATA_MIN} to {DATA_MAX}. Reference date: {REFERENCE_DATE}.
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <div className="min-w-0 lg:col-span-7 xl:col-span-8">
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardContent searchParams={searchParams} />
          </Suspense>
        </div>

        <aside className="lg:sticky lg:top-6 lg:col-span-5 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto xl:col-span-4">
          <ChatPanel />
        </aside>
      </div>
    </main>
  );
}
