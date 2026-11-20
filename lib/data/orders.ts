import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { z } from "zod";

export const STATUSES = [
  "delivered",
  "delayed",
  "in_transit",
  "exception",
  "canceled",
] as const;

export type Status = (typeof STATUSES)[number];

const MS_PER_DAY = 86_400_000;

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function parseUtcMs(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

const nonEmptyString = z.string().trim().min(1);

const isoDateSchema = z
  .string()
  .trim()
  .refine(isValidIsoDate, { message: "Expected YYYY-MM-DD date" });

const nullableIsoDateSchema = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || isValidIsoDate(v), {
    message: "Expected YYYY-MM-DD date or empty string",
  });

const numericStringSchema = z
  .string()
  .trim()
  .min(1, "Expected numeric value")
  .transform((v) => Number(v))
  .refine((v) => Number.isFinite(v), { message: "Expected finite number" });

const promoSchema = z
  .string()
  .trim()
  .refine((v) => v === "0" || v === "1", {
    message: "Expected '0' or '1' for is_promo",
  })
  .transform((v) => v === "1");

const CsvRowSchema = z.object({
  client_id: nonEmptyString,
  order_id: nonEmptyString,
  order_date: isoDateSchema,
  delivery_date: nullableIsoDateSchema,
  carrier: nonEmptyString,
  origin_city: nonEmptyString,
  destination_city: nonEmptyString,
  status: z.enum(STATUSES),
  sku: nonEmptyString,
  product_category: nonEmptyString,
  quantity: numericStringSchema,
  unit_price_usd: numericStringSchema,
  order_value_usd: numericStringSchema,
  is_promo: promoSchema,
  promo_discount_pct: numericStringSchema,
  region: nonEmptyString,
  warehouse: nonEmptyString,
});

export type Order = z.infer<typeof CsvRowSchema> & {
  deliveryDays: number | null;
};

let cachedOrders: Order[] | null = null;
let dataVersion = "";

// Short hash of the CSV content. It changes whenever the data changes.
export function getDataVersion(): string {
  getOrders();
  return dataVersion;
}

export function getOrders(): Order[] {
  if (cachedOrders !== null) {
    return cachedOrders;
  }

  const filePath = path.join(process.cwd(), "data", "mock_logistics_data.csv");
  const content = fs.readFileSync(filePath, "utf8");
  dataVersion = createHash("sha256").update(content).digest("hex").slice(0, 12);
  const records = parse(content, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
  }) as Record<string, unknown>[];

  const orders: Order[] = records.map((record, index) => {
    const parsed = CsvRowSchema.safeParse(record);
    if (!parsed.success) {
      throw new Error(
        `Invalid CSV row ${index + 1} (line ${index + 2}): ${parsed.error.message}`,
      );
    }

    const row = parsed.data;
    const deliveryDays =
      row.delivery_date === null
        ? null
        : (parseUtcMs(row.delivery_date) - parseUtcMs(row.order_date)) /
          MS_PER_DAY;

    return {
      ...row,
      deliveryDays,
    };
  });

  cachedOrders = orders;
  return cachedOrders;
}
