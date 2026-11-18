export const REFERENCE_DATE = "2026-01-01";

export const COMPLETED_STATUSES = ["delivered", "delayed"] as const;

export const SMALL_SAMPLE = 10;

/** Metrics whose value is a rate or mean, so a small `n` makes them unreliable. */
export const RATE_OR_AVG_METRICS: ReadonlySet<MetricId> = new Set<MetricId>([
  "on_time_rate",
  "delay_rate",
  "avg_delivery_days",
]);

export const METRIC_IDS = [
  "order_count",
  "delivered_count",
  "delayed_count",
  "on_time_rate",
  "delay_rate",
  "avg_delivery_days",
  "total_quantity",
  "total_order_value",
] as const;

export type MetricId = (typeof METRIC_IDS)[number];

export type MetricDefinition = {
  label: string;
  unit: string;
  definition: string;
  higherIsBetter: boolean | null;
};

export const METRICS: Record<MetricId, MetricDefinition> = {
  order_count: {
    label: "Orders",
    unit: "orders",
    definition: "Total number of orders across all statuses.",
    higherIsBetter: null,
  },
  delivered_count: {
    label: "Delivered (on time)",
    unit: "orders",
    definition: "Number of orders with status delivered (arrived on time).",
    higherIsBetter: true,
  },
  delayed_count: {
    label: "Delayed",
    unit: "orders",
    definition: "Number of orders with status delayed (arrived late).",
    higherIsBetter: false,
  },
  on_time_rate: {
    label: "On-time delivery rate",
    unit: "%",
    definition:
      "Percentage of completed orders (delivered or delayed) that arrived on time.",
    higherIsBetter: true,
  },
  delay_rate: {
    label: "Delay rate",
    unit: "%",
    definition:
      "Percentage of completed orders (delivered or delayed) that arrived late.",
    higherIsBetter: false,
  },
  avg_delivery_days: {
    label: "Average delivery time",
    unit: "days",
    definition:
      "Mean delivery time in days from order date to delivery date across completed orders.",
    higherIsBetter: false,
  },
  total_quantity: {
    label: "Units ordered",
    unit: "units",
    definition: "Sum of ordered units across all orders.",
    higherIsBetter: null,
  },
  total_order_value: {
    label: "Order value (gross)",
    unit: "USD",
    definition:
      "Gross sum of order values in USD without deducting promo discounts.",
    higherIsBetter: null,
  },
};

export type MetricRow = {
  status: string;
  deliveryDays: number | null;
  quantity: number;
  order_value_usd: number;
};

export type MetricResult = {
  value: number | null;
  n: number;
};

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function isCompleted(status: string): boolean {
  return (COMPLETED_STATUSES as readonly string[]).includes(status);
}

export function computeMetric(
  metric: MetricId,
  rows: readonly MetricRow[],
): MetricResult {
  const total = rows.length;

  switch (metric) {
    case "order_count":
      return { value: total, n: total };

    case "delivered_count": {
      const count = rows.filter((r) => r.status === "delivered").length;
      return { value: count, n: total };
    }

    case "delayed_count": {
      const count = rows.filter((r) => r.status === "delayed").length;
      return { value: count, n: total };
    }

    case "on_time_rate": {
      const completed = rows.filter((r) => isCompleted(r.status));
      if (completed.length === 0) return { value: null, n: 0 };
      const delivered = completed.filter((r) => r.status === "delivered").length;
      return {
        value: roundTo((100 * delivered) / completed.length, 1),
        n: completed.length,
      };
    }

    case "delay_rate": {
      const completed = rows.filter((r) => isCompleted(r.status));
      if (completed.length === 0) return { value: null, n: 0 };
      const delayed = completed.filter((r) => r.status === "delayed").length;
      return {
        value: roundTo((100 * delayed) / completed.length, 1),
        n: completed.length,
      };
    }

    case "avg_delivery_days": {
      const completed = rows.filter(
        (r) => isCompleted(r.status) && r.deliveryDays !== null,
      );
      if (completed.length === 0) return { value: null, n: 0 };
      const sum = completed.reduce((acc, r) => acc + (r.deliveryDays ?? 0), 0);
      return {
        value: roundTo(sum / completed.length, 2),
        n: completed.length,
      };
    }

    case "total_quantity": {
      const sum = rows.reduce((acc, r) => acc + r.quantity, 0);
      return { value: Math.round(sum), n: total };
    }

    case "total_order_value": {
      const sum = rows.reduce((acc, r) => acc + r.order_value_usd, 0);
      return { value: roundTo(sum, 2), n: total };
    }
  }
}
