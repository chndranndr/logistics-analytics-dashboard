"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useTransition, type ReactNode } from "react";

type Patch = Record<string, string | null>;

type FilterNav = {
  /** Set or remove (null/"") URL params in one navigation. */
  setFilters: (patch: Patch) => void;
  clearAll: () => void;
  /** True while the server re-renders after a filter change. */
  pending: boolean;
};

const FilterNavContext = createContext<FilterNav | null>(null);

export function useFilterNav(): FilterNav {
  const ctx = useContext(FilterNavContext);
  if (!ctx) throw new Error("useFilterNav needs <FilterNavProvider>");
  return ctx;
}

export function FilterNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function go(params: URLSearchParams) {
    const qs = params.toString();
    startTransition(() => router.push(qs ? `/?${qs}` : "/"));
  }

  function setFilters(patch: Patch) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    go(params);
  }

  return (
    <FilterNavContext.Provider
      value={{ setFilters, clearAll: () => go(new URLSearchParams()), pending }}
    >
      <div
        className={`transition-opacity ${pending ? "opacity-60" : "opacity-100"}`}
        aria-busy={pending}
      >
        {children}
      </div>
    </FilterNavContext.Provider>
  );
}
