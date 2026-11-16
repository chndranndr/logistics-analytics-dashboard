import fs from "fs";
import path from "path";
import { interpret } from "@/lib/ai/interpret";

type EvalCase = {
  question: string;
  tool: "query" | "forecast" | "none";
  expect: Record<string, unknown>;
};

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envPath);
  }
}

function compareExpected(
  expected: unknown,
  actual: unknown,
  fieldPath: string,
  diffs: string[],
): void {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      diffs.push(
        `${fieldPath}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      );
      return;
    }
    const actualLower = actual.map((v) => String(v).toLowerCase());
    for (const item of expected) {
      if (!actualLower.includes(String(item).toLowerCase())) {
        diffs.push(
          `${fieldPath}: expected to contain ${JSON.stringify(item)}, got ${JSON.stringify(actual)}`,
        );
      }
    }
    return;
  }

  if (expected !== null && typeof expected === "object") {
    if (actual === null || typeof actual !== "object" || Array.isArray(actual)) {
      diffs.push(
        `${fieldPath}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      );
      return;
    }
    for (const [key, val] of Object.entries(expected)) {
      compareExpected(
        val,
        (actual as Record<string, unknown>)[key],
        fieldPath ? `${fieldPath}.${key}` : key,
        diffs,
      );
    }
    return;
  }

  if (typeof expected === "string" && typeof actual === "string") {
    if (expected.toLowerCase() !== actual.toLowerCase()) {
      diffs.push(
        `${fieldPath}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      );
    }
    return;
  }

  if (expected !== actual) {
    diffs.push(
      `${fieldPath}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

async function main() {
  loadEnvLocal();

  const filePath = path.join(process.cwd(), "evals", "routing.jsonl");
  const lines = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const cases = lines.map((line) => JSON.parse(line) as EvalCase);
  let passed = 0;

  for (let i = 0; i < cases.length; i += 1) {
    const testCase = cases[i];
    const num = i + 1;
    const expectedTool = testCase.tool === "none" ? null : testCase.tool;

    try {
      const res = await interpret(testCase.question);
      const diffs: string[] = [];

      if (res.tool !== expectedTool) {
        diffs.push(
          `tool: expected ${String(expectedTool)}, got ${String(res.tool)}`,
        );
      } else if (expectedTool !== null) {
        compareExpected(testCase.expect, res.toolInput, "", diffs);
      }

      if (diffs.length === 0) {
        passed += 1;
        console.log(`${num}. PASS - ${testCase.question}`);
      } else {
        console.log(`${num}. FAIL - ${testCase.question} (${diffs.join("; ")})`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`${num}. FAIL - ${testCase.question} (error: ${msg})`);
    }
  }

  console.log(`\nTotal: ${passed} / ${cases.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
