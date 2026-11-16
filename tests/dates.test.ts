import { describe, expect, it } from "vitest";
import {
  bucketKey,
  listBuckets,
  resolveDateRange,
} from "@/lib/domain/dates";
import { REFERENCE_DATE } from "@/lib/domain/metrics";

describe("dates", () => {
  it("resolves all relative ranges from section 2.2", () => {
    expect(
      resolveDateRange(
        { type: "relative", unit: "month", count: 1 },
        REFERENCE_DATE,
        "2025-01-01",
        "2025-12-30",
      ),
    ).toEqual({ from: "2025-12-01", to: "2025-12-31" });

    expect(
      resolveDateRange(
        { type: "relative", unit: "month", count: 3 },
        REFERENCE_DATE,
        "2025-01-01",
        "2025-12-30",
      ),
    ).toEqual({ from: "2025-10-01", to: "2025-12-31" });

    expect(
      resolveDateRange(
        { type: "relative", unit: "week", count: 1 },
        REFERENCE_DATE,
        "2025-01-01",
        "2025-12-30",
      ),
    ).toEqual({ from: "2025-12-22", to: "2025-12-28" });

    expect(
      resolveDateRange(
        { type: "relative", unit: "week", count: 2 },
        REFERENCE_DATE,
        "2025-01-01",
        "2025-12-30",
      ),
    ).toEqual({ from: "2025-12-15", to: "2025-12-28" });

    expect(
      resolveDateRange(
        { type: "relative", unit: "day", count: 7 },
        REFERENCE_DATE,
        "2025-01-01",
        "2025-12-30",
      ),
    ).toEqual({ from: "2025-12-25", to: "2025-12-31" });
  });

  it("computes bucketKey and listBuckets correctly", () => {
    expect(bucketKey("2025-10-01", "week")).toBe("2025-09-29");
    expect(listBuckets("2025-10-01", "2025-12-31", "week")).toHaveLength(14);
    expect(listBuckets("2025-01-01", "2025-12-30", "month")).toHaveLength(12);
  });
});
