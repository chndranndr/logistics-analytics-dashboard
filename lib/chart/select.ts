export type ChartSpec = {
  type: "figure" | "line" | "bar" | "bar_horizontal";
};

const TIME_GRAINS = new Set(["day", "week", "month"]);

export function selectChart(
  groupBy: string | null,
  rowCount: number,
): ChartSpec {
  if (groupBy === null) {
    return { type: "figure" };
  }
  if (TIME_GRAINS.has(groupBy)) {
    return { type: "line" };
  }
  return rowCount <= 12 ? { type: "bar" } : { type: "bar_horizontal" };
}
