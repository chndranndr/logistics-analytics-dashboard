import { describe, expect, it } from "vitest";
import { getOrders } from "@/lib/data/orders";

describe("getOrders", () => {
  it("loads 400 orders", () => {
    const orders = getOrders();
    expect(orders).toHaveLength(400);
  });

  it("has 30 orders with deliveryDays === null", () => {
    const orders = getOrders();
    const missingDelivery = orders.filter((o) => o.deliveryDays === null);
    expect(missingDelivery).toHaveLength(30);
  });

  it("has min order_date 2025-01-01 and max order_date 2025-12-30", () => {
    const orders = getOrders();
    const dates = orders.map((o) => o.order_date).sort();
    expect(dates[0]).toBe("2025-01-01");
    expect(dates[dates.length - 1]).toBe("2025-12-30");
  });
});
