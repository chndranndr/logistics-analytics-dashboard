import type { QueryRow } from "@/lib/analytics/engine";

function formatCellValue(value: number | null, unit?: string): string {
  if (value === null) return "n/a";
  const formatted = Number.isInteger(value)
    ? value.toLocaleString("en-US")
    : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return unit ? `${formatted} ${unit}` : formatted;
}

export function ResultTable({
  rows,
  unit,
}: {
  rows: QueryRow[];
  unit?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-xs text-slate-500">No rows in result table.</p>
    );
  }

  return (
    <div className="max-h-64 overflow-auto rounded-md border border-slate-200">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-slate-50 text-slate-600">
          <tr>
            <th className="px-3 py-2 font-medium">Key</th>
            <th className="px-3 py-2 text-right font-medium">Value</th>
            <th className="px-3 py-2 text-right font-medium">n</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="px-3 py-1.5 font-medium text-slate-800">
                {row.key}
              </td>
              <td className="px-3 py-1.5 text-right text-slate-700">
                {formatCellValue(row.value, unit)}
              </td>
              <td className="px-3 py-1.5 text-right text-slate-500">
                {row.n}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
