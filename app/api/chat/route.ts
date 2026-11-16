import { NextResponse } from "next/server";
import {
  extractNumbers,
  fallbackText,
  isGrounded,
} from "@/lib/ai/grounding";
import { interpret } from "@/lib/ai/interpret";
import { checkRateLimit } from "@/lib/ai/rateLimit";
import { REFERENCE_DATE } from "@/lib/domain/metrics";

const MAX_QUESTION_LENGTH = 300;
const OUT_OF_SCOPE_FALLBACK =
  "I can answer questions about the orders in this dataset: counts, delays, delivery times, carrier and region breakdowns, and demand forecasts.";

export async function POST(req: Request) {
  const startedAt = Date.now();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 },
    );
  }

  const rawQuestion =
    typeof body === "object" &&
    body !== null &&
    "question" in body &&
    typeof (body as { question: unknown }).question === "string"
      ? (body as { question: string }).question.trim()
      : "";

  if (rawQuestion.length === 0 || rawQuestion.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      {
        error: `Question must be between 1 and ${MAX_QUESTION_LENGTH} characters.`,
      },
      { status: 400 },
    );
  }

  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many questions. Wait one minute." },
      { status: 429 },
    );
  }

  let interpretation;
  try {
    interpretation = await interpret(rawQuestion);
  } catch (err) {
    console.error("AI interpret error:", err);
    return NextResponse.json(
      {
        error: "The AI service is not available. The dashboard still works.",
      },
      { status: 502 },
    );
  }

  let text = interpretation.text;
  let grounded = true;
  const allResults = interpretation.results.map((item) => item.result);

  if (allResults.length === 0) {
    const questionNums = new Set(extractNumbers(rawQuestion));
    const textNums = extractNumbers(text);
    if (textNums.some((n) => !questionNums.has(n))) {
      text = OUT_OF_SCOPE_FALLBACK;
      grounded = false;
    }
  } else if (interpretation.result !== null) {
    if (text.trim().length === 0) {
      text = fallbackText(interpretation.result);
    } else if (!isGrounded(text, allResults, rawQuestion)) {
      text = fallbackText(interpretation.result);
      grounded = false;
    }
  }

  const trace = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    question: rawQuestion,
    referenceDate: REFERENCE_DATE,
    tool: interpretation.tool,
    toolInput: interpretation.toolInput,
    toolCalls: interpretation.results.map((item) => ({
      tool: item.tool,
      toolInput: item.toolInput,
    })),
    resolved:
      interpretation.result?.kind === "query"
        ? interpretation.result.resolved
        : interpretation.result?.kind === "forecast"
          ? { scopeLabel: interpretation.result.scopeLabel }
          : null,
    matchedOrders:
      interpretation.result?.kind === "query"
        ? interpretation.result.matchedOrders
        : null,
    validationErrors: interpretation.validationErrors,
    grounded,
    model: interpretation.model,
    inputTokens: interpretation.usage.inputTokens,
    outputTokens: interpretation.usage.outputTokens,
    durationMs: Date.now() - startedAt,
  };

  console.log(JSON.stringify(trace));

  return NextResponse.json({
    text,
    result: interpretation.result,
    results: interpretation.results,
    trace,
  });
}
