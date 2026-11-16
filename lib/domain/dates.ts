export type TimeGrain = "day" | "week" | "month";

export type DateRange =
  | { type: "all" }
  | { type: "relative"; unit: TimeGrain; count: number }
  | { type: "absolute"; from: string; to: string };

function parseUtcDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatUtcDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days),
  );
}

function mondayOfWeek(date: Date): Date {
  const offset = (date.getUTCDay() + 6) % 7;
  return addUtcDays(date, -offset);
}

export function resolveDateRange(
  range: DateRange,
  referenceDate: string,
  dataMin: string,
  dataMax: string,
): { from: string; to: string } {
  if (range.type === "all") {
    return { from: dataMin, to: dataMax };
  }

  if (range.type === "absolute") {
    return { from: range.from, to: range.to };
  }

  const ref = parseUtcDate(referenceDate);

  if (range.unit === "day") {
    const from = addUtcDays(ref, -range.count);
    const to = addUtcDays(ref, -1);
    return { from: formatUtcDate(from), to: formatUtcDate(to) };
  }

  if (range.unit === "week") {
    const refMonday = mondayOfWeek(ref);
    const from = addUtcDays(refMonday, -7 * range.count);
    const to = addUtcDays(refMonday, -1);
    return { from: formatUtcDate(from), to: formatUtcDate(to) };
  }

  // month: complete calendar months before referenceDate's month
  const refMonthStart = new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1),
  );
  const from = new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - range.count, 1),
  );
  const to = addUtcDays(refMonthStart, -1);
  return { from: formatUtcDate(from), to: formatUtcDate(to) };
}

export function bucketKey(date: string, grain: TimeGrain): string {
  if (grain === "day") {
    return date;
  }
  if (grain === "month") {
    return date.slice(0, 7);
  }
  return formatUtcDate(mondayOfWeek(parseUtcDate(date)));
}

export function listBuckets(
  from: string,
  to: string,
  grain: TimeGrain,
): string[] {
  if (from > to) {
    return [];
  }

  const keys: string[] = [];

  if (grain === "day") {
    let cursor = parseUtcDate(from);
    const end = parseUtcDate(to);
    while (cursor.getTime() <= end.getTime()) {
      keys.push(formatUtcDate(cursor));
      cursor = addUtcDays(cursor, 1);
    }
    return keys;
  }

  if (grain === "week") {
    let cursor = mondayOfWeek(parseUtcDate(from));
    const end = mondayOfWeek(parseUtcDate(to));
    while (cursor.getTime() <= end.getTime()) {
      keys.push(formatUtcDate(cursor));
      cursor = addUtcDays(cursor, 7);
    }
    return keys;
  }

  // month
  const [fromYear, fromMonth] = from.slice(0, 7).split("-").map(Number);
  const [toYear, toMonth] = to.slice(0, 7).split("-").map(Number);
  let y = fromYear;
  let m = fromMonth;
  while (y < toYear || (y === toYear && m <= toMonth)) {
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return keys;
}
