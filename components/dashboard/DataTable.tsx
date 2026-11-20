"use client";

import { ChevronLeft, ChevronRight, ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";

export type TableOrder = {
  order_id: string;
  order_date: string;
  delivery_date: string | null;
  carrier: string;
  origin_city: string;
  destination_city: string;
  status: string;
  sku: string;
  product_category: string;
  quantity: number;
  order_value_usd: number;
  region: string;
  warehouse: string;
};

const COLUMNS: { key: keyof TableOrder; label: string; right?: boolean }[] = [
  { key: "order_id", label: "Order" },
  { key: "order_date", label: "Ordered" },
  { key: "delivery_date", label: "Delivered" },
  { key: "carrier", label: "Carrier" },
  { key: "origin_city", label: "Origin" },
  { key: "destination_city", label: "Destination" },
  { key: "status", label: "Status" },
  { key: "sku", label: "SKU" },
  { key: "product_category", label: "Category" },
  { key: "quantity", label: "Qty", right: true },
  { key: "order_value_usd", label: "Value (USD)", right: true },
  { key: "region", label: "Region" },
  { key: "warehouse", label: "Warehouse" },
];

const PAGE_SIZE = 15;

function compare(a: TableOrder[keyof TableOrder], b: TableOrder[keyof TableOrder]) {
  // Missing delivery dates (null) always sort last when ascending.
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}

export function DataTable({ orders }: { orders: TableOrder[] }) {
  const [sortKey, setSortKey] = useState<keyof TableOrder>("order_date");
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(0);

  const sorted = [...orders].sort(
    (x, y) => compare(x[sortKey], y[sortKey]) * (asc ? 1 : -1),
  );
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = sorted.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  function sortBy(key: keyof TableOrder) {
    if (key === sortKey) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(true);
    }
    setPage(0);
  }

  return (
    <Card className="space-y-3">
      <CardHeader
        title="Orders"
        hint={`${orders.length} orders matching the current filters. Click a column to sort.`}
      />
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full whitespace-nowrap text-left text-xs">
          <thead className="bg-surface-muted text-muted">
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  aria-sort={
                    c.key === sortKey ? (asc ? "ascending" : "descending") : "none"
                  }
                  className={`px-3 py-2 font-medium ${c.right ? "text-right" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => sortBy(c.key)}
                    className="inline-flex items-center gap-1 hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    {c.label}
                    {c.key === sortKey &&
                      (asc ? (
                        <ArrowUp size={12} aria-hidden />
                      ) : (
                        <ArrowDown size={12} aria-hidden />
                      ))}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {rows.map((o) => (
              <tr key={o.order_id}>
                {COLUMNS.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-1.5 text-text ${c.right ? "text-right" : ""} ${
                      c.key === "status" && o.status === "delayed"
                        ? "font-medium text-bad"
                        : ""
                    }`}
                  >
                    {c.key === "order_value_usd"
                      ? o.order_value_usd.toLocaleString("en-US", {
                          maximumFractionDigits: 2,
                        })
                      : (o[c.key] ?? "–")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Page {current + 1} of {pageCount}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Previous page"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            className="rounded-md border border-border p-1 hover:text-text disabled:opacity-40"
          >
            <ChevronLeft size={14} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Next page"
            disabled={current >= pageCount - 1}
            onClick={() => setPage(current + 1)}
            className="rounded-md border border-border p-1 hover:text-text disabled:opacity-40"
          >
            <ChevronRight size={14} aria-hidden />
          </button>
        </div>
      </div>
    </Card>
  );
}
