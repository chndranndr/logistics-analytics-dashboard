import { openai } from "@ai-sdk/openai";
import { generateText, isStepCount } from "ai";
import type { QueryResult } from "@/lib/analytics/engine";
import type { ForecastResult } from "@/lib/forecast/engine";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { aiTools } from "@/lib/ai/tools";

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

  const response = await generateText({
    model: openai(modelName),
    instructions: buildSystemPrompt(),
    prompt: question,
    tools: aiTools,
    stopWhen: isStepCount(3),
  });

  let tool: "query" | "forecast" | null = null;
  let toolInput: unknown | null = null;
  let result: QueryResult | ForecastResult | null = null;
  const results: ToolExecution[] = [];
  const validationErrors: string[] = [];

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
  };
}
