# AI-Powered Logistics Analytics Dashboard

## 1. Overview

An AI-powered logistics analytics dashboard and natural-language query interface over a 400-order dataset (`2025-01-01` to `2025-12-30`). Every number is computed deterministically by TypeScript engines; the language model selects a tool and fills a Zod-validated specification.

Live URL: https://logistics-analytics-dashboard-nine.vercel.app/

Video walkthrough: https://www.loom.com/share/bb352ff7768a437fb142327515d9c6cf

## 2. Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and set the required environment variables:

   | Variable | Purpose |
   |---|---|
   | `OPENAI_API_KEY` | OpenAI API key used by `@ai-sdk/openai` |
   | `OPENAI_MODEL` | OpenAI model ID (e.g. a small tier model) |

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Run checks:

   ```bash
   npm test       # Vitest unit tests
   npm run lint   # ESLint
   npm run build  # Production build
   npm run eval   # Routing eval (calls OpenAI API)
   ```

## 3. Architecture

- **Data layer (`lib/data/orders.ts`):** Reads `data/mock_logistics_data.csv` once into memory, validates all 17 columns per row with Zod, and derives `deliveryDays`. No database is used.
- **Business definitions (`lib/domain/`):** Single source of truth for metric definitions, `REFERENCE_DATE` (`2026-01-01`), completed statuses (`delivered`, `delayed`), and UTC calendar date bucketing.
- **Deterministic engines (`lib/analytics/`, `lib/forecast/`, `lib/chart/`):** Pure functions (`runQuery`, `runForecast`, `selectChart`) with no AI SDK imports. Both the server-rendered dashboard (`app/page.tsx`) and the chat endpoint (`app/api/chat/route.ts`) call the same engines.
- **Data flow (chat):** User question → `POST /api/chat` (length check + per-IP rate limit) → `interpret()` calls `generateText` with `query` and `forecast` tools (max 3 steps) → engine computes `QueryResult` / `ForecastResult` → `isGrounded()` verifies narrative numbers against tool outputs → response renders narrative, deterministic chart/figure, and `TracePanel` (`"How this was answered"`).

- **Dashboard interactions:** Filters (date range with presets, carrier, region, warehouse, category) live in the URL and are shown as removable chips. Clicking a month in the two time charts, or a bar in the carrier chart, applies that filter to the whole dashboard. KPI cards show a sparkline and a change versus the previous period of the same length when a date range is selected. A "Needs attention" panel lists findings computed by `lib/analytics/insights.ts` (highest delay-rate carrier and lowest on-time region among groups with at least 10 completed orders, worst month); clicking one applies its filter. Theme is light or dark via semantic tokens in `app/globals.css`.

## 4. Key Design Decisions

| Decision | Why | Cost |
|---|---|---|
| In-memory data, no database | No setup, no connection failures, and trivially correct reads for 400 rows | Does not scale past a dataset that fits in memory |
| Structured spec, no SQL | No SQL injection surface, full validation, and every query is explainable | Queries outside the spec are unsupported |
| No agent framework | The flow is linear with two tools; a graph adds a layer without adding capability | Would need an orchestrator if complex branching flows were added |
| Rule-based chart selection | Deterministic and unit-testable mapping from result shape to chart type | No stylistic judgement from the model |
| No streaming | Answers are short, and a stateless single JSON response is simpler to test, trace, and evaluate | Full response waits for completion; follow-ups must be asked as a full question |
| Fixed reference date (`2026-01-01`) | Relative ranges like "last month" always return data from the 2025 dataset | Would need to become the real clock with a live data feed |

## 5. AI Approach

- **Tool routing with structured schemas:** Instead of generating SQL, the model chooses between two Zod-validated tools:
  - `query` (`QuerySpecSchema`): counts, rates, averages, and breakdowns by time grain or category dimension, with case-insensitive filter normalization and relative date resolution against `2026-01-01`.
  - `forecast` (`ForecastSpecSchema`): 1–6 month demand forecasts and inventory recommendations (`expectedDemand`, `safetyStock`, `recommended`) selecting between a 3-month moving average and linear trend by backtest MAE (default: learn from all 12 months and hold out Oct–Dec 2025). If the user names a base period ("based on the last 10 months") or a backtest length, the model sets optional `historyMonths` (4–12) and `backtestMonths`, and the engine rejects windows that leave fewer than 3 months to learn from.
- **Guardrails:** Invalid filter/category inputs return a `QueryError` payload so the model can self-correct within the 3-step limit. Out-of-scope questions trigger a refusal without calling a tool: if no tool returned a result, `app/api/chat/route.ts` discards the model's text and returns a fixed refusal message, so the model cannot answer general questions from its own knowledge. A runtime groundedness check replaces any response containing uncomputed numbers with deterministic `fallbackText`.

## 6. Metric Definitions and Assumptions

| Metric | Definition |
|---|---|
| `order_count` | Total number of orders across all statuses. |
| `delivered_count` | Number of orders with status `delivered` (arrived on time). |
| `delayed_count` | Number of orders with status `delayed` (arrived late). |
| `on_time_rate` | Percentage of completed orders (`delivered` or `delayed`) that arrived on time. |
| `delay_rate` | Percentage of completed orders (`delivered` or `delayed`) that arrived late. |
| `avg_delivery_days` | Mean delivery time in days from `order_date` to `delivery_date` across completed orders. |
| `total_quantity` | Sum of ordered units (`quantity`) across all orders. |
| `total_order_value` | Gross sum of order values in USD (`order_value_usd`) without deducting promo discounts. |

Key assumptions:

- **Lateness source:** The dataset has no promised delivery date; `status` is the sole indicator of delayed orders.
- **Completed orders:** `in_transit`, `exception`, and `canceled` orders are excluded from rate denominators and delivery-time averages; 30 rows have no `delivery_date`.
- **Date anchoring:** All date filters use `order_date` in plain UTC calendar dates; relative ranges resolve against `2026-01-01` using complete calendar units (ISO weeks starting Monday).
- **Forecasting limits:** With 12 monthly points (2025), seasonality is not modeled; canceled orders are excluded from demand; SKU-level requests resolve to the SKU's product category (since no SKU has more than 3 orders); inventory numbers represent units to have available over the horizon rather than reorder points.
- **Small samples:** Groups with fewer than 10 completed orders are flagged rather than hidden.

## 7. Limitations

- One metric and at most one grouping dimension per query (no two-dimensional cross-tabs).
- No period-over-period comparisons in a single query.
- No multi-turn conversation memory (each question is independent).
- No causal root-cause analysis beyond dimensional breakdowns.
- No SKU-, carrier-, region-, or client-level demand forecasts, and no stock-on-hand or supplier lead-time data.
- The number check is a heuristic and can pass a small wrong number if it happens to appear elsewhere in the serialized tool result.
- The rate limit is stored in memory for each server instance rather than shared globally.
- The routing eval result is from a single run, and the underlying model is not deterministic.

## 8. Evaluation

- **Unit tests (`npm test`):** 8 test files, 41 tests passing — asserting CSV row parsing, UTC relative date math (including `previousPeriod`), all golden values from `docs/PRD.md` section 6 / `docs/IMPLEMENTATION_PLAN.md` section 3, the "highest with at least 10 completed orders" ranking note, dashboard insights, chart selection rules, forecast backtest/inventory values, and groundedness checks. There are no UI component tests; the UI was checked manually in a browser (light and dark, 375px width, filters, chart clicks, chat).
- **Routing eval (`npm run eval`):** 32 cases in `evals/routing.jsonl` covering queries, relative/absolute dates, filter normalization, forecasts, SKU fallback, and out-of-scope refusals — **32 / 32 passing** in the latest run. Scoring first compares the query spec field by field; if the spec differs, `evals/run.ts` falls back to comparing the computed results (`key` and `value` rows from `runQuery`), so equivalent specs pass and wrong ones still fail. The model is not deterministic: one earlier run scored 31 / 32, with "What will our revenue be next year?" routed to `forecast` instead of being refused.

## 9. Future Improvements

1. Back `QuerySpec` with PostgreSQL or DuckDB parameterized queries if data outgrows in-memory CSV loading.
2. Period comparison and two-dimension questions as planned multi-step analysis.
3. Incorporate seasonal forecasting and true reorder points once multi-year history, stock levels, and lead times are available.
4. Add authentication and per-client data isolation.
5. Run the routing eval in CI on prompt or schema changes.

## 10. Documents

- [docs/PRD.md](docs/PRD.md)
- [docs/DESIGN.md](docs/DESIGN.md)
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)

## 11. AI Tool Disclosure

- **In the product:** the language model (OpenAI, set by `OPENAI_MODEL`, through the Vercel AI SDK) only picks a tool and fills a validated spec. Every number is computed by code, and narrative numbers are checked against tool output.
- **In development, Claude Code (Anthropic Claude models):** used to write and review code and documentation. This covers:
  - the dashboard redesign, the engine additions (`previousPeriod`, ranking note, insights) and their tests, with smaller Claude subagents producing parts of the UI under review;
  - a review of the implementation against the assignment requirements;
  - the eval scoring change (comparing computed results when a spec differs from the expected one) and the extra eval cases;
  - the forecast `historyMonths` / `backtestMonths` options, with golden values computed separately and added as tests;
  - building a knowledge graph of the codebase with graphify to trace how the dashboard reaches `runQuery()`;
  - the project rename, a scan for secrets before the first push, `.gitignore` updates, and the README and `docs/` updates.
- **In development, Google Antigravity:** used to write code.
- **Verification:** AI output was checked with the unit tests, lint, type checking, a production build, the routing eval and manual browser checks. The author is responsible for the final code.
