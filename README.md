# AI-Powered Logistics Analytics Dashboard

## 1. Overview

An AI-powered logistics analytics dashboard and natural-language query interface over a 400-order dataset (`2025-01-01` to `2025-12-30`). Every number is computed deterministically by TypeScript engines; the language model selects a tool and fills a Zod-validated specification.

Live URL: *Pending Vercel deployment*

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

## 4. AI Approach

- **Tool routing with structured schemas:** Instead of generating SQL, the model chooses between two Zod-validated tools:
  - `query` (`QuerySpecSchema`): counts, rates, averages, and breakdowns by time grain or category dimension, with case-insensitive filter normalization and relative date resolution against `2026-01-01`.
  - `forecast` (`ForecastSpecSchema`): 1–6 month demand forecasts and inventory recommendations (`expectedDemand`, `safetyStock`, `recommended`) selecting between a 3-month moving average and linear trend by Oct–Dec 2025 backtest MAE.
- **Guardrails:** Invalid filter/category inputs return a `QueryError` payload so the model can self-correct within the 3-step limit. Out-of-scope questions trigger a refusal without calling a tool. A runtime groundedness check replaces any response containing uncomputed numbers with deterministic `fallbackText`.

## 5. Metric Definitions and Assumptions

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

## 6. Limitations

- One metric and at most one grouping dimension per query (no two-dimensional cross-tabs).
- No period-over-period comparisons in a single query.
- No multi-turn conversation memory (each question is independent).
- No causal root-cause analysis beyond dimensional breakdowns.
- No SKU-, carrier-, region-, or client-level demand forecasts, and no stock-on-hand or supplier lead-time data.

## 7. Evaluation

- **Unit tests (`npm test`):** 7 test files, 31 tests passing — asserting CSV row parsing, UTC relative date math, all golden values from `docs/PRD.md` section 6 / `docs/IMPLEMENTATION_PLAN.md` section 3, chart selection rules, forecast backtest/inventory values, and groundedness checks.
- **Routing eval (`npm run eval`):** 24 cases in `evals/routing.jsonl` covering queries, relative/absolute dates, filter normalization, forecasts, SKU fallback, and out-of-scope refusals — **24 / 24 passing**.

## 8. Future Improvements

1. Back `QuerySpec` with PostgreSQL or DuckDB parameterized queries if data outgrows in-memory CSV loading.
2. Support two-dimension breakdowns and period-over-period comparisons.
3. Add multi-step analysis chaining multiple tool calls to investigate "why" questions.
4. Incorporate seasonal forecasting and true reorder points once multi-year history, stock levels, and lead times are available.
5. Add authentication and per-client data isolation.
6. Run the routing eval automatically in CI on prompt or schema changes.

## 9. AI Tool Disclosure
