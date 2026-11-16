"use client";

import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { AnswerCard, type ChatEntry } from "@/components/chat/AnswerCard";
import { SuggestionChips } from "@/components/chat/SuggestionChips";

const HISTORY_STORAGE_KEY = "logistics_recent_questions";
const HISTORY_EVENT = "logistics_recent_questions_change";

function subscribeHistory(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(HISTORY_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(HISTORY_EVENT, callback);
  };
}

function getHistorySnapshot(): string {
  try {
    return sessionStorage.getItem(HISTORY_STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function getServerHistorySnapshot(): string {
  return "[]";
}

export function ChatPanel() {
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const historyRaw = useSyncExternalStore(
    subscribeHistory,
    getHistorySnapshot,
    getServerHistorySnapshot,
  );

  const recentQuestions = useMemo<string[]>(() => {
    try {
      const parsed = JSON.parse(historyRaw);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      // ignore malformed storage value
    }
    return [];
  }, [historyRaw]);

  function saveRecentQuestion(question: string) {
    const next = [
      question,
      ...recentQuestions.filter((q) => q !== question),
    ].slice(0, 10);
    try {
      sessionStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(HISTORY_EVENT));
    } catch {
      // ignore storage write errors
    }
  }

  async function submitQuestion(rawQuestion: string) {
    const question = rawQuestion.trim();
    if (!question || loading) return;

    setLoading(true);
    setError(null);
    setInput("");
    saveRecentQuestion(question);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (res.status === 429) {
        setError("Too many questions. Wait one minute.");
        return;
      }

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          payload && typeof payload.error === "string"
            ? payload.error
            : `Request failed with status ${res.status}.`;
        setError(msg);
        return;
      }

      const entry: ChatEntry = {
        id: payload?.trace?.id ?? `${Date.now()}`,
        question,
        text: payload.text,
        result: payload.result ?? null,
        trace: {
          tool: payload?.trace?.tool ?? null,
          toolInput: payload?.trace?.toolInput ?? null,
        },
      };

      setEntries((prev) => [entry, ...prev]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void submitQuestion(input);
  }

  return (
    <section
      aria-label="Ask the data"
      className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs"
    >
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Ask about your orders
        </h2>
        <p className="text-xs text-slate-500">
          Natural-language queries and demand forecasts computed from the 2025
          dataset.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={300}
          disabled={loading}
          placeholder="Ask a question about orders or demand..."
          aria-label="Question"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={loading || input.trim().length === 0}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </form>

      {loading && (
        <div
          role="status"
          className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700"
        >
          Computing answer...
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {error}
        </div>
      )}

      {entries.length === 0 && (
        <SuggestionChips
          onSelect={(q) => void submitQuestion(q)}
          disabled={loading}
        />
      )}

      {recentQuestions.length > 0 && (
        <div className="space-y-1.5 border-t border-slate-100 pt-3">
          <p className="text-xs font-medium text-slate-500">
            Recent questions
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recentQuestions.map((q) => (
              <button
                key={q}
                type="button"
                disabled={loading}
                onClick={() => void submitQuestion(q)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-left text-xs text-slate-600 hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {entries.length > 0 && (
        <div className="space-y-4">
          {entries.map((entry) => (
            <AnswerCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}
