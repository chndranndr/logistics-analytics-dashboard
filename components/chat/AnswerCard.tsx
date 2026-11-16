"use client";

import type { QueryResult } from "@/lib/analytics/engine";
import type { ForecastResult } from "@/lib/forecast/engine";
import { ForecastChart } from "@/components/result/ForecastChart";
import { ResultChart } from "@/components/result/ResultChart";
import { TracePanel, type TraceSummary } from "@/components/result/TracePanel";

export type ChatEntry = {
  id: string;
  question: string;
  text: string;
  result: QueryResult | ForecastResult | null;
  trace: TraceSummary;
};

export function AnswerCard({ entry }: { entry: ChatEntry }) {
  const { question, text, result, trace } = entry;
  const isEmptyMatch =
    result?.kind === "query" && result.matchedOrders === 0;

  return (
    <article className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
      <p className="text-xs font-semibold text-slate-500">{question}</p>

      <p className="text-sm leading-relaxed text-slate-900">
        {isEmptyMatch ? "No orders match this question." : text}
      </p>

      {result?.kind === "query" && !isEmptyMatch && (
        <ResultChart result={result} />
      )}

      {result?.kind === "forecast" && (
        <div className="space-y-3">
          <ForecastChart result={result} />

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
              <p className="text-[11px] font-medium text-slate-500">
                Expected demand
              </p>
              <p className="text-base font-semibold text-slate-900">
                {result.inventory.expectedDemand.toLocaleString("en-US")} units
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
              <p className="text-[11px] font-medium text-slate-500">
                Safety stock
              </p>
              <p className="text-base font-semibold text-slate-900">
                {result.inventory.safetyStock.toLocaleString("en-US")} units
              </p>
            </div>
            <div className="rounded-md border border-blue-200 bg-blue-50 p-2.5">
              <p className="text-[11px] font-medium text-blue-700">
                Recommended
              </p>
              <p className="text-base font-semibold text-blue-900">
                {result.inventory.recommended.toLocaleString("en-US")} units
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600">{result.methodology}</p>

          {result.notes.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-500">
              {result.notes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <TracePanel trace={trace} result={result} />
    </article>
  );
}
