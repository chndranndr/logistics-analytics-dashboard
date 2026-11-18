import { describe, expect, it } from "vitest";
import { QueryError, runQuery } from "@/lib/analytics/engine";
import type { QuerySpec } from "@/lib/analytics/spec";

const baseSpec: QuerySpec = {
  metric: "order_count",
  groupBy: null,
  filters: {},
  dateRange: { type: "all" },
  sort: "natural",
  limit: null,
};

describe("runQuery", () => {
  it("computes order_count by status (section 3.2)", () => {
    const res = runQuery({ ...baseSpec, groupBy: "status" });
    expect(res.rows).toEqual([
      { key: "canceled", value: 3, n: 3 },
      { key: "delayed", value: 55, n: 55 },
      { key: "delivered", value: 304, n: 304 },
      { key: "exception", value: 11, n: 11 },
      { key: "in_transit", value: 27, n: 27 },
    ]);
  });

  it("computes order_count and on_time_rate by region (section 3.2)", () => {
    const counts = runQuery({ ...baseSpec, groupBy: "region" });
    expect(counts.rows).toEqual([
      { key: "EU", value: 81, n: 81 },
      { key: "UK", value: 54, n: 54 },
      { key: "US-C", value: 78, n: 78 },
      { key: "US-E", value: 95, n: 95 },
      { key: "US-W", value: 92, n: 92 },
    ]);

    const rates = runQuery({
      ...baseSpec,
      metric: "on_time_rate",
      groupBy: "region",
    });
    expect(rates.rows).toEqual([
      { key: "EU", value: 84.3, n: 70 },
      { key: "UK", value: 83.3, n: 48 },
      { key: "US-C", value: 85.3, n: 68 },
      { key: "US-E", value: 82.6, n: 86 },
      { key: "US-W", value: 87.4, n: 87 },
    ]);
  });

  it("computes delay_rate by carrier sorted desc with GLS first and small-sample note (section 3.2)", () => {
    const res = runQuery({
      ...baseSpec,
      metric: "delay_rate",
      groupBy: "carrier",
      sort: "value_desc",
    });

    expect(res.rows).toEqual([
      { key: "GLS", value: 28.6, n: 7 },
      { key: "USPS", value: 23.9, n: 46 },
      { key: "UPS", value: 22.4, n: 76 },
      { key: "Royal Mail", value: 20.8, n: 24 },
      { key: "OnTrac", value: 16.0, n: 25 },
      { key: "FedEx", value: 13.1, n: 84 },
      { key: "LaserShip", value: 8.3, n: 24 },
      { key: "DHL", value: 5.3, n: 57 },
      { key: "DPD", value: 0.0, n: 16 },
    ]);
    expect(res.rows[0].key).toBe("GLS");
    expect(res.notes).toHaveLength(2);
    expect(res.notes[0]).toContain("GLS");
    expect(res.notes[1]).toContain("USPS");
  });

  it("computes monthly counts for 2025-01 to 2025-12 (section 3.2)", () => {
    const orderCounts = runQuery({
      ...baseSpec,
      metric: "order_count",
      groupBy: "month",
    });
    expect(orderCounts.rows.map((r) => r.value)).toEqual([
      75, 36, 46, 25, 29, 21, 42, 34, 18, 26, 24, 24,
    ]);

    const deliveredCounts = runQuery({
      ...baseSpec,
      metric: "delivered_count",
      groupBy: "month",
    });
    expect(deliveredCounts.rows.map((r) => r.value)).toEqual([
      57, 28, 34, 22, 17, 16, 32, 26, 16, 20, 16, 20,
    ]);

    const delayedCounts = runQuery({
      ...baseSpec,
      metric: "delayed_count",
      groupBy: "month",
    });
    expect(delayedCounts.rows.map((r) => r.value)).toEqual([
      12, 4, 5, 0, 7, 4, 7, 4, 2, 3, 4, 3,
    ]);
  });

  it("computes date ranges and case-insensitive filters (section 3.3)", () => {
    expect(
      runQuery({
        ...baseSpec,
        metric: "order_count",
        dateRange: { type: "relative", unit: "month", count: 1 },
      }).rows[0].value,
    ).toBe(24);

    expect(
      runQuery({
        ...baseSpec,
        metric: "delayed_count",
        dateRange: { type: "relative", unit: "month", count: 1 },
      }).rows[0].value,
    ).toBe(3);

    expect(
      runQuery({
        ...baseSpec,
        metric: "order_count",
        dateRange: { type: "relative", unit: "month", count: 3 },
      }).rows[0].value,
    ).toBe(74);

    expect(
      runQuery({
        ...baseSpec,
        metric: "delayed_count",
        dateRange: { type: "relative", unit: "month", count: 3 },
      }).rows[0].value,
    ).toBe(10);

    expect(
      runQuery({
        ...baseSpec,
        metric: "order_count",
        dateRange: { type: "relative", unit: "week", count: 1 },
      }).rows[0].value,
    ).toBe(6);

    expect(
      runQuery({
        ...baseSpec,
        filters: { carrier: ["FedEx"] },
      }).rows[0].value,
    ).toBe(89);

    expect(
      runQuery({
        ...baseSpec,
        filters: { carrier: ["fedex"] },
      }).rows[0].value,
    ).toBe(89);
  });

  it("computes delayed_count by week for relative month 3 (section 3.3)", () => {
    const res = runQuery({
      ...baseSpec,
      metric: "delayed_count",
      groupBy: "week",
      dateRange: { type: "relative", unit: "month", count: 3 },
    });

    expect(res.rows).toHaveLength(14);
    expect(res.rows.map((r) => [r.key, r.value])).toEqual([
      ["2025-09-29", 1],
      ["2025-10-06", 2],
      ["2025-10-13", 0],
      ["2025-10-20", 0],
      ["2025-10-27", 1],
      ["2025-11-03", 0],
      ["2025-11-10", 2],
      ["2025-11-17", 0],
      ["2025-11-24", 1],
      ["2025-12-01", 1],
      ["2025-12-08", 2],
      ["2025-12-15", 0],
      ["2025-12-22", 0],
      ["2025-12-29", 0],
    ]);
  });

  it("throws QueryError for unknown carrier", () => {
    expect(() =>
      runQuery({
        ...baseSpec,
        filters: { carrier: ["UnknownCarrier"] },
      }),
    ).toThrow(QueryError);
  });

  it("returns matchedOrders 0 and does not throw when no rows match", () => {
    const res = runQuery({
      ...baseSpec,
      dateRange: {
        type: "absolute",
        from: "2024-01-01",
        to: "2024-01-31",
      },
    });
    expect(res.matchedOrders).toBe(0);
    expect(res.rows).toEqual([{ key: "all", value: 0, n: 0 }]);
  });

  it("clamps time buckets to data bounds while preserving resolved range", () => {
    const res = runQuery({
      ...baseSpec,
      metric: "order_count",
      groupBy: "day",
      dateRange: {
        type: "absolute",
        from: "1000-01-01",
        to: "9999-12-31",
      },
    });
    expect(res.rows.length).toBeLessThanOrEqual(364);
    expect(res.resolved.dateFrom).toBe("1000-01-01");
    expect(res.resolved.dateTo).toBe("9999-12-31");
  });

  it("summarizes small-sample notes when more than 3 groups have small samples", () => {
    const cityRes = runQuery({
      ...baseSpec,
      metric: "on_time_rate",
      groupBy: "destination_city",
    });
    expect(cityRes.notes).toHaveLength(1);
    expect(cityRes.notes[0]).toContain("fewer than 10 completed orders");

    const carrierRes = runQuery({
      ...baseSpec,
      metric: "delay_rate",
      groupBy: "carrier",
      sort: "value_desc",
    });
    expect(carrierRes.notes).toHaveLength(2);
    expect(carrierRes.notes[0]).toContain("GLS");
    expect(carrierRes.notes[1]).toBe(
      "Highest with at least 10 completed orders: USPS (23.9, n=46)",
    );
  });

  it("notes the lowest carrier with enough completed orders for value_asc", () => {
    const res = runQuery({
      ...baseSpec,
      metric: "on_time_rate",
      groupBy: "carrier",
      sort: "value_asc",
    });
    expect(res.rows[0].key).toBe("GLS");
    expect(res.notes).toContain(
      "Lowest with at least 10 completed orders: USPS (76.1, n=46)",
    );
  });
});
