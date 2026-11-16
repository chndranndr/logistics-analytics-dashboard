"use client";

import { useRouter, useSearchParams } from "next/navigation";

type FilterBarProps = {
  carriers: string[];
  regions: string[];
  from: string;
  to: string;
  carrier: string;
  region: string;
};

export function FilterBar({
  carriers,
  regions,
  from,
  to,
  carrier,
  region,
}: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  function handleReset() {
    router.push("/");
  }

  const hasFilters = Boolean(from || to || carrier || region);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-from"
          className="text-xs font-medium text-slate-600"
        >
          From
        </label>
        <input
          id="filter-from"
          type="date"
          value={from}
          min="2025-01-01"
          max="2025-12-30"
          onChange={(e) => updateParam("from", e.target.value)}
          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-to"
          className="text-xs font-medium text-slate-600"
        >
          To
        </label>
        <input
          id="filter-to"
          type="date"
          value={to}
          min="2025-01-01"
          max="2025-12-30"
          onChange={(e) => updateParam("to", e.target.value)}
          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-carrier"
          className="text-xs font-medium text-slate-600"
        >
          Carrier
        </label>
        <select
          id="filter-carrier"
          value={carrier}
          onChange={(e) => updateParam("carrier", e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900"
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
        <label
          htmlFor="filter-region"
          className="text-xs font-medium text-slate-600"
        >
          Region
        </label>
        <select
          id="filter-region"
          value={region}
          onChange={(e) => updateParam("region", e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900"
        >
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
