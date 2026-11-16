"use client";

import type { QueryResult } from "@/lib/analytics/engine";
import type { ForecastResult } from "@/lib/forecast/engine";
import { ForecastChart } from "@/components/result/ForecastChart";
import { ResultChart } from "@/components/result/ResultChart";
import { TracePanel, type TraceSummary } from "@/components/result/TracePanel";

export type AnswerResultItem = {
  tool: "query" | "forecast";
  toolInput: unknown;
  result: QueryResult | ForecastResult;
};

export type ChatEntry = {
  id: string;
  question: string;
  text: string;
  result: QueryResult | ForecastResult | null;
  results?: AnswerResultItem[];
  trace: TraceSummary;
};

export function AnswerCard({ entry }: { entry: ChatEntry }) {
  const { question, text, result, results, trace } = entry;
  const items: AnswerResultItem[] =
    results && results.length > 0
      ? results
      : result
        ? [
            {
              tool:
                trace.tool ??
                (result.kind === "forecast" ? "forecast" : "query"),
              toolInput: trace.toolInput,
              result,
            },
          ]
        : [];

  const allEmptyQueries =
    items.length > 0 &&
    items.every(
      (item) =>
        item.result.kind === "query" && item.result.matchedOrders === 0,
    );

  return (
    <article className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
      <p className="text-xs font-semibold text-slate-500">{question}</p>

      <p className="text-sm leading-relaxed text-slate-900">
        {allEmptyQueries ? "No orders match this question." : text}
      </p>

      {items.length === 0 ? (
        <TracePanel trace={trace} result={null} />
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => {
            const isEmptyMatch =
              item.result.kind === "query" && item.result.matchedOrders === 0;

            return (
              <div key={idx} className="space-y-3">
                {item.result.kind === "query" && !isEmptyMatch && (
                  <ResultChart result={item.result} />
                )}

                {item.result.kind === "query" &&
                  isEmptyMatch &&
                  !allEmptyQueries && (
                    <p className="text-xs text-slate-500">
                      No orders match this query.
                    </p>
                  )}

                {item.result.kind === "forecast" && (
                  <div className="space-y-3">
                    <ForecastChart result={item.result} />

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
                        <p className="text-[11px] font-medium text-slate-500">
                          Expected demand
                        </p>
                        <p className="text-base font-semibold text-slate-900">
                          {item.result.inventory.expectedDemand.toLocaleString(
                            "en-US",
                          )}{" "}
                          units
                        </p>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
                        <p className="text-[11px] font-medium text-slate-500">
                          Safety stock
                        </p>
                        <p className="text-base font-semibold text-slate-900">
                          {item.result.inventory.safetyStock.toLocaleString(
                            "en-US",
                          )}{" "}
                          units
                        </p>
                      </div>
                      <div className="rounded-md border border-blue-200 bg-blue-50 p-2.5">
                        <p className="text-[11px] font-medium text-blue-700">
                          Recommended
                        </p>
                        <p className="text-base font-semibold text-blue-900">
                          {item.result.inventory.recommended.toLocaleString(
                            "en-US",
                          )}{" "}
                          units
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600">
                      {item.result.methodology}
                    </p>

                    {item.result.notes.length > 0 && (
                      <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-500">
                        {item.result.notes.map((note, noteIdx) => (
                          <li key={noteIdx}>{note}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <TracePanel
                  trace={{ tool: item.tool, toolInput: item.toolInput }}
                  result={item.result}
                />
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}
