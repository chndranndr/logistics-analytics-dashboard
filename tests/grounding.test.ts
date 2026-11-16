import { describe, expect, it } from "vitest";
import { fallbackText, isGrounded } from "@/lib/ai/grounding";
import { runQuery } from "@/lib/analytics/engine";

describe("grounding", () => {
  const totalQuantityResult = runQuery({
    metric: "total_quantity",
    groupBy: null,
    filters: {},
    dateRange: { type: "all" },
    sort: "natural",
    limit: null,
  });

  it("returns true when all numbers in text appear in the result", () => {
    const ok = isGrounded(
      "Across 400 orders, total units ordered is 1310.",
      totalQuantityResult,
      "How many units were ordered?",
    );
    expect(ok).toBe(true);
  });

  it("returns false when text contains a number not in the result or question", () => {
    const ok = isGrounded(
      "Total units ordered is 1310, up from 999.",
      totalQuantityResult,
      "How many units were ordered?",
    );
    expect(ok).toBe(false);
  });

  it("matches numbers formatted with commas such as 1,310 against 1310", () => {
    const ok = isGrounded(
      "We ordered 1,310 units across 400 orders.",
      totalQuantityResult,
      "How many units were ordered?",
    );
    expect(ok).toBe(true);
  });

  it("builds deterministic fallback text", () => {
    expect(fallbackText(totalQuantityResult)).toBe(
      "Units ordered: 1310 units (400 orders in the sample).",
    );
  });

  it("grounds text that uses numbers from two results together", () => {
    const onTimeRateResult = runQuery({
      metric: "on_time_rate",
      groupBy: null,
      filters: {},
      dateRange: { type: "all" },
      sort: "natural",
      limit: null,
    });

    const ok = isGrounded(
      "Total units ordered is 1310 across 400 orders, with an on-time rate of 84.7%.",
      [totalQuantityResult, onTimeRateResult],
      "How are we doing?",
    );
    expect(ok).toBe(true);
  });
});
