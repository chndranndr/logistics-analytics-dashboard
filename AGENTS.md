# AGENTS.md

This file provides guidance to agents when working with code in this repository.

AI-powered logistics analytics dashboard (take-home assessment). This file is a map; `docs/` is the source of truth. Keep it short: put detail in `docs/` and link to it.

## Where things are

| Need | Read |
|---|---|
| Requirements, metric definitions, data pitfalls | `docs/PRD.md` (sections 6 and 7 before touching any number) |
| Architecture, tool schemas, forecast method, evals, file layout | `docs/DESIGN.md` |
| Build tasks in order, with golden test values | `docs/IMPLEMENTATION_PLAN.md` |
| Original brief | `Coding assignment.docx` |
| Dataset (read-only, 400 rows) | `mock_logistics_data.csv` |

If code and docs disagree, fix one of them in the same change.

## Tech stack

Next.js (App Router) + TypeScript, deployed on Vercel. Zod for schemas. Vercel AI SDK with OpenAI (`OPENAI_API_KEY`, `OPENAI_MODEL`). Recharts. Vitest. Data is the CSV loaded into memory: no database, no auth.

## Build and test

Not scaffolded yet. These are the intended commands; correct them once `package.json` exists.

```bash
npm install
npm run dev                          # local server
npm run build                        # production build
npm run lint
npm test                             # all unit tests
npx vitest run <file> -t "<name>"    # one test
npm run eval                         # routing eval; calls the real model, costs money
```

## Invariants

- The model only selects a tool and fills a validated input. Code computes every number. No SQL.
- `lib/analytics` and `lib/forecast` never import the AI SDK. Metric definitions live only in `lib/domain/metrics.ts`.
- Relative dates resolve against the fixed reference date `2026-01-01`, never the system clock.

## Guidelines

1. **Think before coding.** State assumptions. If a request has more than one reading, or something is unclear, ask instead of picking silently. Say so when a simpler approach exists.
2. **Simplicity first.** Minimum code that solves the problem. No unrequested features, no abstractions for single-use code, no handling for cases that cannot happen.
3. **Surgical changes.** Touch only what the task needs and match the existing style. Remove only what your own change made unused; mention unrelated issues instead of fixing them.
4. **Goal-driven execution.** Turn the task into a check that can pass or fail (a test, a golden value from PRD section 6), then loop until it passes. For multi-step work, state each step with its check.
5. exercise abstract thinking
6. 

The user presents and defends this code, so prefer short, explainable code. Repo documents are in English; conversation is in Indonesian.
