import { describe, expect, it } from "vitest";
import { buildInsights } from "@/lib/analytics/insights";

describe("buildInsights", () => {
  it("returns three insights with no filters, carrier first", () => {
    const insights = buildInsights({}, { type: "all" });
    expect(insights).toHaveLength(3);
    expect(insights[0]).toMatchObject({
      id: "carrier_delay",
      title: "Highest delay rate: USPS",
      detail: "23.9% of 46 completed orders delayed",
      filter: { carrier: "USPS" },
    });
  });

  it("skips the carrier insight when a carrier filter is set", () => {
    const insights = buildInsights({ carrier: ["USPS"] }, { type: "all" });
    expect(insights.some((i) => i.filter.carrier !== undefined)).toBe(false);
  });

  it("only uses carrier, region, from and to as filter keys", () => {
    for (const insight of buildInsights({}, { type: "all" })) {
      for (const key of Object.keys(insight.filter)) {
        expect(["carrier", "region", "from", "to"]).toContain(key);
      }
    }
  });
});
