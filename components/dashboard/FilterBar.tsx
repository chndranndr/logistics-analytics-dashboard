"use client";

import { Loader2, X } from "lucide-react";
import { useFilterNav } from "@/components/dashboard/FilterNavProvider";

export type Preset = { label: string; from: string; to: string };

type FilterBarProps = {
  carriers: string[];
  regions: string[];
  warehouses: string[];
  categories: string[];
  from: string;
  to: string;
  carrier: string;
  region: string;
  warehouse: string;
  category: string;
  presets: Preset[];
};

const CONTROL =
  "rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-text focus-visible:outline-2 focus-visible:outline-accent";
const LABEL = "text-xs font-medium text-muted";

export function FilterBar({
  carriers,
  regions,
  warehouses,
  categories,
  from,
  to,
  carrier,
  region,
  warehouse,
  category,
  presets,
}: FilterBarProps) {
  const { setFilters, clearAll, pending } = useFilterNav();

  const chips = [
    { key: "from", label: "From", value: from },
    { key: "to", label: "To", value: to },
    { key: "carrier", label: "Carrier", value: carrier },
    { key: "region", label: "Region", value: region },
    { key: "warehouse", label: "Warehouse", value: warehouse },
    { key: "category", label: "Category", value: category },
  ].filter((chip) => chip.value);

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-from" className={LABEL}>
            From
          </label>
          <input
            id="filter-from"
            type="date"
            value={from}
            min="2025-01-01"
            max="2025-12-30"
            onChange={(e) => setFilters({ from: e.target.value || null })}
            className={CONTROL}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-to" className={LABEL}>
            To
          </label>
          <input
            id="filter-to"
            type="date"
            value={to}
            min="2025-01-01"
            max="2025-12-30"
            onChange={(e) => setFilters({ to: e.target.value || null })}
            className={CONTROL}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-carrier" className={LABEL}>
            Carrier
          </label>
          <select
            id="filter-carrier"
            value={carrier}
            onChange={(e) => setFilters({ carrier: e.target.value || null })}
            className={CONTROL}
          >
            <option value="">All carriers</option>
            {carriers.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-region" className={LABEL}>
            Region
          </label>
          <select
            id="filter-region"
            value={region}
            onChange={(e) => setFilters({ region: e.target.value || null })}
            className={CONTROL}
          >
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-warehouse" className={LABEL}>
            Warehouse
          </label>
          <select
            id="filter-warehouse"
            value={warehouse}
            onChange={(e) => setFilters({ warehouse: e.target.value || null })}
            className={CONTROL}
          >
            <option value="">All warehouses</option>
            {warehouses.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-category" className={LABEL}>
            Category
          </label>
          <select
            id="filter-category"
            value={category}
            onChange={(e) => setFilters({ category: e.target.value || null })}
            className={CONTROL}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {pending && (
          <Loader2
            className="mb-2 size-4 animate-spin text-muted"
            aria-label="Updating"
          />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const active = preset.from === from && preset.to === to;
          return (
            <button
              key={preset.label}
              type="button"
              aria-pressed={active}
              onClick={() =>
                setFilters({ from: preset.from || null, to: preset.to || null })
              }
              className={`rounded-full border px-3 py-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-accent ${
                active
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-text hover:bg-surface-muted"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className={LABEL}>Active filters:</span>
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted py-0.5 pl-2.5 pr-1 text-xs text-text"
            >
              {chip.label}: {chip.value}
              <button
                type="button"
                onClick={() => setFilters({ [chip.key]: null })}
                aria-label={`Remove ${chip.label} filter`}
                className="rounded-full p-0.5 text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
