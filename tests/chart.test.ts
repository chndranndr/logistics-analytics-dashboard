import { describe, expect, it } from "vitest";
import { selectChart } from "@/lib/chart/select";

describe("selectChart", () => {
  it("returns figure when groupBy is null", () => {
    expect(selectChart(null, 1)).toEqual({ type: "figure" });
  });

  it("returns line when groupBy is a time grain", () => {
    expect(selectChart("day", 30)).toEqual({ type: "line" });
    expect(selectChart("week", 14)).toEqual({ type: "line" });
    expect(selectChart("month", 12)).toEqual({ type: "line" });
  });

  it("returns bar when groupBy is a category with 12 or fewer rows", () => {
    expect(selectChart("carrier", 9)).toEqual({ type: "bar" });
    expect(selectChart("destination_city", 12)).toEqual({ type: "bar" });
  });

  it("returns bar_horizontal when groupBy is a category with more than 12 rows", () => {
    expect(selectChart("destination_city", 13)).toEqual({
      type: "bar_horizontal",
    });
  });
});
