import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAnswerCache,
  getCachedAnswer,
  normalizeQuestion,
  setCachedAnswer,
} from "@/lib/ai/answerCache";
import { getDataVersion } from "@/lib/data/orders";

describe("answer cache", () => {
  beforeEach(() => clearAnswerCache());

  it("treats case, spacing and trailing punctuation as the same question", () => {
    expect(normalizeQuestion("  Which carrier has the  HIGHEST delay rate?  ")).toBe(
      "which carrier has the highest delay rate",
    );
  });

  it("returns a stored answer for the same question and data version", () => {
    setCachedAnswer("How many orders?", "v1", { text: "400" });
    expect(getCachedAnswer("how many orders", "v1")).toEqual({ text: "400" });
  });

  it("misses when the data version changes", () => {
    setCachedAnswer("How many orders?", "v1", { text: "400" });
    expect(getCachedAnswer("How many orders?", "v2")).toBeUndefined();
  });

  it("evicts the oldest entry after 200 answers", () => {
    for (let i = 0; i <= 200; i++) setCachedAnswer(`q${i}`, "v1", i);
    expect(getCachedAnswer("q0", "v1")).toBeUndefined();
    expect(getCachedAnswer("q200", "v1")).toBe(200);
  });

  it("derives a stable data version from the CSV", () => {
    expect(getDataVersion()).toMatch(/^[0-9a-f]{12}$/);
    expect(getDataVersion()).toBe(getDataVersion());
  });
});
