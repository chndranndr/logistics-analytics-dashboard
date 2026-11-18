// One recorded step of an agent run. Pure data: no AI SDK import.
export type TrajectoryKind = "user" | "model" | "tool" | "guard" | "answer";

export type TrajectoryEvent = {
  id: string;
  kind: TrajectoryKind;
  label: string;
  startMs: number; // offset from the start of the run
  durationMs: number;
  payload?: unknown; // what went in
  result?: unknown; // what came out
  error?: boolean;
  inputTokens?: number;
  outputTokens?: number;
};

// Tool outputs can be large (every row of a breakdown). Keep the trace small.
export function summarizeOutput(output: unknown): unknown {
  if (typeof output !== "object" || output === null) return output;
  const o = output as Record<string, unknown>;
  if (o.kind === "query") {
    const rows = Array.isArray(o.rows) ? o.rows : [];
    return {
      kind: o.kind,
      matchedOrders: o.matchedOrders,
      rows: rows.length,
      firstRows: rows.slice(0, 5),
      notes: o.notes,
    };
  }
  if (o.kind === "forecast") {
    return {
      kind: o.kind,
      scopeLabel: o.scopeLabel,
      inventory: o.inventory,
      notes: o.notes,
    };
  }
  return output;
}
