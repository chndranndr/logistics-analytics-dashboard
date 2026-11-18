const DATA_END = "2025-12-30";
const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "YYYY-MM" -> first and last day of that month, clamped to the dataset end. */
export function monthRange(key: string): { from: string; to: string } {
  const [year, month] = key.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = `${key}-${String(lastDay).padStart(2, "0")}`;
  return { from: `${key}-01`, to: to > DATA_END ? DATA_END : to };
}

/** "YYYY-MM" -> "Jan", "Feb", ... */
export function monthLabel(key: string): string {
  return SHORT_MONTHS[Number(key.slice(5, 7)) - 1] ?? key;
}
