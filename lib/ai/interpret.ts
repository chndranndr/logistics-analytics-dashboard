import { openai } from "@ai-sdk/openai";
import { generateText, isStepCount } from "ai";
import type { QueryResult } from "@/lib/analytics/engine";
import type { ForecastResult } from "@/lib/forecast/engine";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { aiTools } from "@/lib/ai/tools";
import { summarizeOutput, type TrajectoryEvent } from "@/lib/ai/trajectory";

export type ToolExecution = {
  tool: "query" | "forecast";
  toolInput: unknown;
  result: QueryResult | ForecastResult;
};

export type Interpretation = {
  tool: "query" | "forecast" | null;
  toolInput: unknown | null;
  result: QueryResult | ForecastResult | null;
  results: ToolExecution[];
  text: string;
  validationErrors: string[];
  usage: { inputTokens: number; outputTokens: number };
  model: string;
  trajectory: TrajectoryEvent[];
  elapsedMs: number;
};

function isErrorOutput(output: unknown): output is { error: string } {
  return (
    typeof output === "object" &&
    output !== null &&
    "error" in output &&
    typeof (output as { error: unknown }).error === "string"
  );
}

function isEngineResult(
  output: unknown,
): output is QueryResult | ForecastResult {
  if (typeof output !== "object" || output === null || !("kind" in output)) {
    return false;
  }
  const kind = (output as { kind: unknown }).kind;
  return kind === "query" || kind === "forecast";
}

export async function interpret(question: string): Promise<Interpretation> {
  const modelName = process.env.OPENAI_MODEL?.trim();
  if (!modelName) {
    throw new Error("OPENAI_MODEL is not configured");
  }

  // Timestamps for the trajectory, as offsets from the start of this call.
  const t0 = Date.now();
  const now = () => Date.now() - t0;
  const stepStarts: number[] = [];
  const stepEnds: number[] = [];
  const toolTimes = new Map<string, { start: number; end: number }>();

  const response = await generateText({
    model: openai(modelName),
    instructions: buildSystemPrompt(),
    prompt: question,
    tools: aiTools,
    stopWhen: isStepCount(3),
    onStepStart: () => void stepStarts.push(now()),
    onStepEnd: () => void stepEnds.push(now()),
    onToolExecutionStart: (e) => {
      toolTimes.set(e.toolCall.toolCallId, { start: now(), end: now() });
    },
    onToolExecutionEnd: (e) => {
      const t = toolTimes.get(e.toolCall.toolCallId);
      if (t) t.end = now();
    },
  });

  const trajectory: TrajectoryEvent[] = [];

  let tool: "query" | "forecast" | null = null;
  let toolInput: unknown | null = null;
  let result: QueryResult | ForecastResult | null = null;
  const results: ToolExecution[] = [];
  const validationErrors: string[] = [];

  response.steps.forEach((step, i) => {
    const calls = step.content.filter((p) => p.type === "tool-call");
    const start = stepStarts[i] ?? 0;
    const firstToolStart = Math.min(
      ...calls.map((c) => toolTimes.get(c.toolCallId)?.start ?? Infinity),
    );
    // The model call ends where its first tool starts, or where the step ends.
    const modelEnd = Number.isFinite(firstToolStart)
      ? firstToolStart
      : (stepEnds[i] ?? start);
    trajectory.push({
      id: `model-${i}`,
      kind: "model",
      label:
        calls.length > 0
          ? `Chose ${calls.map((c) => c.toolName).join(", ")}`
          : "Wrote the answer",
      startMs: start,
      durationMs: Math.max(0, modelEnd - start),
      payload: calls.map((c) => ({ tool: c.toolName, input: c.input })),
      result: step.text || undefined,
      inputTokens: step.usage.inputTokens ?? 0,
      outputTokens: step.usage.outputTokens ?? 0,
    });

    for (const c of calls) {
      const time = toolTimes.get(c.toolCallId) ?? { start: modelEnd, end: modelEnd };
      const res = step.content.find(
        (p) =>
          (p.type === "tool-result" || p.type === "tool-error") &&
          p.toolCallId === c.toolCallId,
      );
      const output =
        res?.type === "tool-result"
          ? res.output
          : res?.type === "tool-error"
            ? { error: String(res.error) }
            : undefined;
      trajectory.push({
        id: `tool-${c.toolCallId}`,
        kind: "tool",
        label: c.toolName,
        startMs: time.start,
        durationMs: time.end - time.start,
        payload: c.input,
        result: summarizeOutput(output),
        error: res?.type === "tool-error" || isErrorOutput(output),
      });
    }
  });

  for (const step of response.steps) {
    for (const part of step.content) {
      if (part.type === "tool-error") {
        validationErrors.push(
          part.error instanceof Error ? part.error.message : String(part.error),
        );
      }
    }

    for (const tr of step.toolResults) {
      if (isErrorOutput(tr.output)) {
        validationErrors.push(tr.output.error);
        continue;
      }
      if (
        (tr.toolName === "query" || tr.toolName === "forecast") &&
        isEngineResult(tr.output)
      ) {
        tool = tr.toolName;
        toolInput = tr.input;
        result = tr.output;
        results.push({
          tool: tr.toolName,
          toolInput: tr.input,
          result: tr.output,
        });
      }
    }
  }

  return {
    tool,
    toolInput,
    result,
    results,
    text: response.text,
    validationErrors,
    usage: {
      inputTokens: response.usage.inputTokens ?? 0,
      outputTokens: response.usage.outputTokens ?? 0,
    },
    model: modelName,
    trajectory,
    elapsedMs: now(),
  };
}
