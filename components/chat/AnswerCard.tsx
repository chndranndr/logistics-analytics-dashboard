"use client";

import { motion } from "motion/react";
import { Info, ShieldAlert } from "lucide-react";
import type { QueryResult } from "@/lib/analytics/engine";
import type { ForecastResult } from "@/lib/forecast/engine";
import { Card } from "@/components/ui/Card";
import { ForecastChart } from "@/components/result/ForecastChart";
import { ResultChart } from "@/components/result/ResultChart";
import { TracePanel, type TraceSummary } from "@/components/result/TracePanel";
import { TrajectoryPanel } from "@/components/result/TrajectoryPanel";
import type { TrajectoryEvent } from "@/lib/ai/trajectory";

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
  referenceDate: string | null;
  matchedOrders: number | null;
  grounded: boolean;
  trajectory: TrajectoryEvent[];
  totalMs: number;
  model: string | null;
  cached?: boolean;
};

export function AnswerCard({ entry }: { entry: ChatEntry }) {
  const { question, text, result, results, trace, referenceDate, matchedOrders, grounded } =
    entry;
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

  const notes = Array.from(
    new Set(items.flatMap((item) => item.result.notes)),
  );

  const meta = [
    referenceDate && `Reference date ${referenceDate}`,
    matchedOrders !== null && `${matchedOrders.toLocaleString("en-US")} orders matched`,
    entry.cached && "Cached answer",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="space-y-3">
        <p className="text-xs font-semibold text-muted">{question}</p>

        <p className="text-sm leading-relaxed text-text">
          {allEmptyQueries ? "No orders match this question." : text}
        </p>

        {!grounded && (
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <ShieldAlert size={14} className="shrink-0 text-warn" aria-hidden />
            Answer replaced by a safe summary (numbers could not be verified).
          </p>
        )}

        {meta && <p className="text-xs text-muted">{meta}</p>}

        {notes.length > 0 && (
          <ul className="space-y-1 text-xs text-muted">
            {notes.map((note) => (
              <li key={note} className="flex gap-1.5">
                <Info size={14} className="mt-px shrink-0 text-warn" aria-hidden />
                {note}
              </li>
            ))}
          </ul>
        )}

        {items.length === 0 ? (
          <TracePanel
            trace={trace}
            result={null}
            referenceDate={referenceDate}
            matchedOrders={matchedOrders}
          />
        ) : (
          <div className="space-y-4">
            {items.map((item, idx) => {
              const isEmptyMatch =
                item.result.kind === "query" && item.result.matchedOrders === 0;

              return (
                <div key={idx} className="space-y-3">
                  {item.result.kind === "query" && !isEmptyMatch && (
                    <ResultChart result={item.result} metric={item.result.metric} />
                  )}

                  {item.result.kind === "query" &&
                    isEmptyMatch &&
                    !allEmptyQueries && (
                      <p className="text-xs text-muted">
                        No orders match this query.
                      </p>
                    )}

                  {item.result.kind === "forecast" && (
                    <div className="space-y-3">
                      <ForecastChart result={item.result} />

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <Card className="space-y-1">
                          <p className="text-[11px] font-medium text-muted">
                            Expected demand
                          </p>
                          <p className="text-base font-semibold text-text">
                            {item.result.inventory.expectedDemand.toLocaleString(
                              "en-US",
                            )}{" "}
                            units
                          </p>
                        </Card>
                        <Card className="space-y-1">
                          <p className="text-[11px] font-medium text-muted">
                            Safety stock
                          </p>
                          <p className="text-base font-semibold text-text">
                            {item.result.inventory.safetyStock.toLocaleString(
                              "en-US",
                            )}{" "}
                            units
                          </p>
                        </Card>
                        <div className="space-y-1 rounded-xl border border-accent/40 bg-accent-soft p-4">
                          <p className="text-[11px] font-medium text-accent">
                            Recommended
                          </p>
                          <p className="text-base font-semibold text-text">
                            {item.result.inventory.recommended.toLocaleString(
                              "en-US",
                            )}{" "}
                            units
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-muted">
                        {item.result.methodology}
                      </p>
                    </div>
                  )}

                  <TracePanel
                    trace={{ tool: item.tool, toolInput: item.toolInput }}
                    result={item.result}
                    referenceDate={referenceDate}
                    matchedOrders={matchedOrders}
                  />
                </div>
              );
            })}
          </div>
        )}

        {entry.trajectory.length > 0 && (
          <TrajectoryPanel
            events={entry.trajectory}
            totalMs={entry.totalMs}
            model={entry.model}
          />
        )}
      </Card>
    </motion.div>
  );
}
