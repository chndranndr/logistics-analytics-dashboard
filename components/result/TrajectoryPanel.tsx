"use client";

import { useState } from "react";
import { ChevronDown, Search, Workflow } from "lucide-react";
import type { TrajectoryEvent, TrajectoryKind } from "@/lib/ai/trajectory";

const LANES: { id: string; label: string; kinds: TrajectoryKind[] }[] = [
  { id: "input", label: "Input", kinds: ["user", "answer"] },
  { id: "model", label: "Model", kinds: ["model"] },
  { id: "tools", label: "Tools", kinds: ["tool", "guard"] },
];

const BADGE: Record<TrajectoryKind, string> = {
  user: "bg-surface-muted text-muted",
  model: "bg-accent-soft text-accent",
  tool: "bg-warn/15 text-warn",
  guard: "bg-good/15 text-good",
  answer: "bg-surface-muted text-text",
};

const BAR: Record<TrajectoryKind, string> = {
  user: "bg-muted",
  model: "bg-accent",
  tool: "bg-warn",
  guard: "bg-good",
  answer: "bg-muted",
};

const TABS = ["Summary", "Payload", "Result", "Timing"] as const;
type Tab = (typeof TABS)[number];

function json(value: unknown): string {
  if (value === undefined) return "(none)";
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function Detail({ event, total }: { event: TrajectoryEvent; total: number }) {
  const [tab, setTab] = useState<Tab>("Summary");
  const tokens =
    event.inputTokens !== undefined
      ? `${event.inputTokens} in / ${event.outputTokens ?? 0} out`
      : null;

  return (
    <div className="rounded-md border border-border bg-surface">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${BADGE[event.kind]}`}
        >
          {event.kind}
        </span>
        <div className="ml-1 flex gap-0.5">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded px-1.5 py-0.5 text-[11px] ${
                tab === t
                  ? "bg-accent-soft font-medium text-accent"
                  : "text-muted hover:text-text"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-48 overflow-auto p-2.5 text-[11px] text-text">
        {tab === "Summary" && (
          <dl className="space-y-1">
            <div>
              <dt className="inline font-medium text-muted">Step: </dt>
              <dd className="inline">{event.label}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-muted">Duration: </dt>
              <dd className="inline">{event.durationMs} ms</dd>
            </div>
            {tokens && (
              <div>
                <dt className="inline font-medium text-muted">Tokens: </dt>
                <dd className="inline">{tokens}</dd>
              </div>
            )}
            {event.error && (
              <p className="font-medium text-bad">This step reported a problem.</p>
            )}
          </dl>
        )}
        {tab === "Payload" && (
          <pre className="whitespace-pre-wrap break-words">{json(event.payload)}</pre>
        )}
        {tab === "Result" && (
          <pre className="whitespace-pre-wrap break-words">{json(event.result)}</pre>
        )}
        {tab === "Timing" && (
          <dl className="space-y-1">
            <div>
              <dt className="inline font-medium text-muted">Start: </dt>
              <dd className="inline">+{event.startMs} ms</dd>
            </div>
            <div>
              <dt className="inline font-medium text-muted">End: </dt>
              <dd className="inline">+{event.startMs + event.durationMs} ms</dd>
            </div>
            <div>
              <dt className="inline font-medium text-muted">Share of run: </dt>
              <dd className="inline">
                {total > 0 ? Math.round((event.durationMs / total) * 100) : 0}%
              </dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}

export function TrajectoryPanel({
  events,
  totalMs,
  model,
}: {
  events: TrajectoryEvent[];
  totalMs: number;
  model: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const span = Math.max(1, totalMs, ...events.map((e) => e.startMs + e.durationMs));
  const selected = events.find((e) => e.id === selectedId) ?? null;
  const q = query.trim().toLowerCase();
  const visible = events.filter(
    (e) =>
      q === "" ||
      `${e.kind} ${e.label} ${json(e.payload)} ${json(e.result)}`
        .toLowerCase()
        .includes(q),
  );
  const tokens = events.reduce(
    (sum, e) => sum + (e.inputTokens ?? 0) + (e.outputTokens ?? 0),
    0,
  );

  return (
    <details className="group rounded-md border border-border bg-surface-muted text-xs text-text">
      <summary className="flex cursor-pointer select-none items-center gap-1.5 px-3 py-2 font-medium hover:bg-surface">
        <Workflow size={14} aria-hidden />
        Agent trajectory
        <span className="ml-1 font-normal text-muted">
          {events.length} steps · {totalMs} ms
        </span>
        <ChevronDown
          size={14}
          aria-hidden
          className="ml-auto transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="space-y-3 border-t border-border bg-surface p-3">
        <p className="text-muted">
          {model ?? "model"} · {tokens} tokens
        </p>

        <div className="space-y-1.5">
          {LANES.map((lane) => (
            <div key={lane.id} className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-[10px] uppercase text-muted">
                {lane.label}
              </span>
              <div className="relative h-4 flex-1 rounded bg-surface-muted">
                {events
                  .filter((e) => lane.kinds.includes(e.kind))
                  .map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      aria-label={`${e.kind}: ${e.label}`}
                      onClick={() => setSelectedId(e.id)}
                      style={{
                        left: `${(e.startMs / span) * 100}%`,
                        width: `max(${(e.durationMs / span) * 100}%, 6px)`,
                      }}
                      className={`absolute top-0.5 h-3 rounded-sm ${BAR[e.kind]} ${
                        selectedId === e.id ? "ring-2 ring-text" : "opacity-80"
                      }`}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>

        <label className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1">
          <Search size={12} aria-hidden className="text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search steps"
            aria-label="Search steps"
            className="min-w-0 flex-1 bg-transparent text-xs text-text placeholder:text-muted focus:outline-none"
          />
        </label>

        <ul className="divide-y divide-border rounded-md border border-border">
          {visible.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => setSelectedId(e.id)}
                className={`flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-surface-muted ${
                  selectedId === e.id ? "bg-accent-soft" : ""
                }`}
              >
                <span
                  className={`w-14 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-semibold uppercase ${BADGE[e.kind]}`}
                >
                  {e.kind}
                </span>
                <span className="min-w-0 flex-1 truncate">{e.label}</span>
                <span className="shrink-0 text-muted">{e.durationMs} ms</span>
              </button>
            </li>
          ))}
          {visible.length === 0 && (
            <li className="px-2 py-2 text-muted">No steps match.</li>
          )}
        </ul>

        {selected && <Detail key={selected.id} event={selected} total={span} />}
      </div>
    </details>
  );
}
