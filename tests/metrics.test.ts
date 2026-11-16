import { describe, expect, it } from "vitest";
import { getOrders } from "@/lib/data/orders";
import { computeMetric } from "@/lib/domain/metrics";

describe("computeMetric", () => {
  const orders = getOrders();

  it("matches all golden values for unfiltered dataset (section 3.1)", () => {
    expect(computeMetric("order_count", orders)).toEqual({ value: 400, n: 400 });
    expect(computeMetric("delivered_count", orders)).toEqual({
      value: 304,
      n: 400,
    });
    expect(computeMetric("delayed_count", orders)).toEqual({
      value: 55,
      n: 400,
    });
    expect(computeMetric("on_time_rate", orders)).toEqual({
      value: 84.7,
      n: 359,
    });
    expect(computeMetric("delay_rate", orders)).toEqual({
      value: 15.3,
      n: 359,
    });
    expect(computeMetric("avg_delivery_days", orders)).toEqual({
      value: 3.69,
      n: 359,
    });
    expect(computeMetric("total_quantity", orders)).toEqual({
      value: 1310,
      n: 400,
    });
    expect(computeMetric("total_order_value", orders)).toEqual({
      value: 13695.87,
      n: 400,
    });
  });

  it("returns null value and n 0 for empty rows on rate/avg metrics", () => {
    expect(computeMetric("on_time_rate", [])).toEqual({ value: null, n: 0 });
    expect(computeMetric("delay_rate", [])).toEqual({ value: null, n: 0 });
    expect(computeMetric("avg_delivery_days", [])).toEqual({
      value: null,
      n: 0,
    });
  });
});
