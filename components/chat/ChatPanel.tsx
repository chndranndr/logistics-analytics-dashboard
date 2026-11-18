"use client";

import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { Loader2, SendHorizontal, Sparkles, Trash2 } from "lucide-react";
import { AnswerCard, type ChatEntry } from "@/components/chat/AnswerCard";
import { SuggestionChips } from "@/components/chat/SuggestionChips";
import { Card } from "@/components/ui/Card";

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
        results: Array.isArray(payload?.results) ? payload.results : undefined,
        trace: {
          tool: payload?.trace?.tool ?? null,
          toolInput: payload?.trace?.toolInput ?? null,
        },
        referenceDate: payload?.trace?.referenceDate ?? null,
        matchedOrders: payload?.trace?.matchedOrders ?? null,
        grounded: payload?.trace?.grounded ?? true,
        trajectory: Array.isArray(payload?.trajectory) ? payload.trajectory : [],
        totalMs: payload?.trace?.durationMs ?? 0,
        model: payload?.trace?.model ?? null,
      };

      setEntries((prev) => [entry, ...prev]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setEntries([]);
    setError(null);
    try {
      sessionStorage.removeItem(HISTORY_STORAGE_KEY);
      window.dispatchEvent(new Event(HISTORY_EVENT));
    } catch {
      // ignore storage errors
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void submitQuestion(input);
  }

  return (
    <section aria-label="Ask the data">
      <Card className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-accent-soft p-2 text-accent">
            <Sparkles size={16} aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold text-text">
              Ask about your orders
            </h2>
            <p className="text-xs text-muted">
              Natural-language queries and demand forecasts computed from the 2025
              dataset.
            </p>
          </div>
          {(entries.length > 0 || recentQuestions.length > 0) && (
            <button
              type="button"
              onClick={clearChat}
              disabled={loading}
              className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-bad hover:text-bad disabled:opacity-50"
            >
              <Trash2 size={12} aria-hidden />
              Clear
            </button>
          )}
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
            className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none disabled:bg-surface-muted"
          />
          <button
            type="submit"
            disabled={loading || input.trim().length === 0}
            aria-label={loading ? "Sending..." : "Send"}
            className="inline-flex shrink-0 items-center justify-center rounded-md bg-accent px-3 py-2 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-900"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" aria-hidden />
            ) : (
              <SendHorizontal size={16} aria-hidden />
            )}
          </button>
        </form>

        {loading && (
          <Card role="status" className="space-y-2.5">
            <p className="flex items-center gap-2 text-xs text-muted">
              <Loader2 size={14} className="animate-spin" aria-hidden />
              Computing answer...
            </p>
            <div className="skeleton h-3 w-11/12 rounded" />
            <div className="skeleton h-3 w-2/3 rounded" />
            <div className="skeleton h-24 w-full rounded-md" />
          </Card>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-md border border-bad/30 bg-bad/10 px-3 py-2 text-xs text-bad"
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
          <div className="space-y-1.5 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted">Recent questions</p>
            <div className="flex flex-wrap gap-1.5">
              {recentQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={loading}
                  onClick={() => void submitQuestion(q)}
                  className="max-w-full rounded-md border border-border bg-surface px-2.5 py-1 text-left text-xs text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
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
      </Card>
    </section>
  );
}
