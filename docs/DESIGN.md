# Design: AI-Powered Logistics Analytics Dashboard

Companion to [PRD.md](PRD.md). The PRD says what the product does and how metrics are defined; this document says how it is built and why.

## 1. Design principles

1. **The model routes; code computes.** The language model turns a question into a structured tool input. Every number comes from a pure function over the dataset.
2. **One engine, two callers.** The dashboard and the chat both call the same query engine, so a KPI and a chat answer for the same question cannot differ.
3. **Business definitions live in one file.** "Delayed", "on-time rate", and the reference date are defined once and imported everywhere.
4. **Everything is inspectable.** Each answer carries a trace of how it was produced.
5. **Smallest thing that is correct.** 400 read-only rows do not need a database, an agent framework, or a cache.

## 2. Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | One repo and one deploy for UI and API; types shared end to end |
| Hosting | Vercel | Zero-config for Next.js; public URL; env vars for secrets |
| Data | CSV parsed into memory at startup | 400 read-only rows; a database adds setup and a failure point with no benefit |
| Validation | Zod | One schema serves as the tool definition, the runtime validator, and the TypeScript type |
| AI library | Vercel AI SDK | Tool calling with Zod schemas, multi-step tool loop, provider swap in one line |
| Model | OpenAI, small tier | The task is picking one of two tools and filling arguments; a small model is enough |
| Charts | Recharts | Declarative, covers line, bar, and area |
| Tests | Vitest | Fast unit tests for pure functions |

**Rejected alternatives**

- **PostgreSQL with AI-generated SQL.** The brief warns against unvalidated generated SQL. A structured spec removes the problem instead of mitigating it.
- **LangGraph or another agent framework.** The flow is linear with two tools. A graph adds a layer without adding capability.
- **Python backend (pandas, statsmodels).** Better forecasting libraries, but two services to deploy, and the forecasting methods here are a few lines of arithmetic.

## 3. Architecture

```
                         Browser
        ┌───────────────────────────────────────┐
        │  Dashboard            Chat panel      │
        └──────┬───────────────────┬────────────┘
               │ server render     │ POST /api/chat
               │                   ▼
               │        ┌──────────────────────┐
               │        │ AI orchestration     │  model picks a tool,
               │        │ (app/api/chat)       │  fills a Zod-validated input
               │        └───┬──────────────┬───┘
               │            │              │
               ▼            ▼              ▼
        ┌────────────────────────┐  ┌──────────────────┐
        │ Query engine           │  │ Forecast engine  │   pure functions,
        │ lib/analytics          │  │ lib/forecast     │   no AI imports
        └───────────┬────────────┘  └────────┬─────────┘
                    │                        │
                    ▼                        ▼
        ┌──────────────────────────────────────────────┐
        │ Business definitions  lib/domain/metrics.ts  │
        ├──────────────────────────────────────────────┤
        │ Data layer  lib/data  (CSV → typed Order[])  │
        └──────────────────────────────────────────────┘
```

The three separations the brief asks for map to directories:

| Concern | Location | May import |
|---|---|---|
| AI interpretation | `app/api/chat`, `lib/ai` | engines, schemas |
| Data computation | `lib/analytics`, `lib/forecast` | domain, data |
| Business logic | `lib/domain` | nothing but types |

The engines never import the AI SDK. That rule is what makes them unit-testable and reusable by the dashboard.

## 4. Project layout

```
app/
  page.tsx                  dashboard + chat shell
  api/chat/route.ts         AI orchestration endpoint
components/
  dashboard/                KPI cards, filter bar, fixed charts
  chat/                     message list, input, suggestion chips
  result/                   ResultChart, ResultTable, TracePanel
lib/
  data/orders.ts            CSV load, row validation, typed Order[]
  domain/metrics.ts         metric definitions, status sets, reference date
  domain/dates.ts           relative range resolution, ISO week, month buckets
  analytics/spec.ts         QuerySpec Zod schema
  analytics/engine.ts       runQuery(spec) → QueryResult
  forecast/spec.ts          ForecastSpec Zod schema
  forecast/methods.ts       moving average, linear trend
  forecast/engine.ts        runForecast(spec) → ForecastResult
  chart/select.ts           result shape → chart type
  ai/tools.ts               tool definitions wrapping the engines
  ai/prompt.ts              system prompt
  ai/grounding.ts           numbers-in-answer check
data/mock_logistics_data.csv
evals/routing.jsonl         question → expected tool and arguments
evals/run.ts                eval runner
tests/                      engine, dates, forecast unit tests
docs/                       PRD.md, DESIGN.md
```

## 5. Data layer

- The CSV is read once per server instance and held in a module-level constant. It is never written.
- Each row is validated with a Zod schema on load: dates parse as ISO dates, numbers are numeric, `status` is one of the five known values, `delivery_date` is nullable. A row that fails validation stops startup with a clear error, since a silent skip would make totals wrong.
- Derived fields are added once at load: `deliveryDays` (null when there is no delivery date) and `category`.
- Dates are plain calendar dates. No time zones are involved anywhere.

## 6. Business definitions

`lib/domain/metrics.ts` is the only place these appear. Values are from [PRD section 6](PRD.md#6-metric-definitions).

```ts
export const REFERENCE_DATE = "2026-01-01";          // day after the last date in the data
export const COMPLETED = ["delivered", "delayed"];   // orders with a final outcome

export const METRICS = {
  order_count:        { label: "Orders",                 unit: "orders" },
  delivered_count:    { label: "Delivered (on time)",    unit: "orders" },
  delayed_count:      { label: "Delayed",                unit: "orders" },
  on_time_rate:       { label: "On-time delivery rate",  unit: "%"      },  // delivered / completed
  delay_rate:         { label: "Delay rate",             unit: "%"      },  // delayed / completed
  avg_delivery_days:  { label: "Average delivery time",  unit: "days"   },  // over completed
  total_quantity:     { label: "Units ordered",          unit: "units"  },
  total_order_value:  { label: "Order value (gross)",    unit: "USD"    },
};
```

Each metric also carries a one-sentence definition string. The UI tooltips, the trace panel, and the README all read from it.

## 7. Query tool

### 7.1 Input: `QuerySpec`

```ts
{
  metric:  "order_count" | "delivered_count" | "delayed_count" | "on_time_rate"
         | "delay_rate" | "avg_delivery_days" | "total_quantity" | "total_order_value",

  groupBy: null | "day" | "week" | "month"                       // time grain
         | "carrier" | "region" | "warehouse" | "product_category"
         | "destination_city" | "origin_city" | "status" | "client_id",

  filters: {                      // all optional; values are checked against the data
    carrier?: string[], region?: string[], warehouse?: string[],
    product_category?: string[], status?: Status[],
    destination_city?: string[], is_promo?: boolean
  },

  dateRange: { type: "all" }
           | { type: "relative", unit: "day" | "week" | "month", count: number }
           | { type: "absolute", from: "YYYY-MM-DD", to: "YYYY-MM-DD" },

  sort:  "value_desc" | "value_asc" | "natural",
  limit: number | null
}
```

Decisions:

- **One metric, at most one dimension.** This covers every example in the brief. Two-dimension queries are a listed limitation.
- **The model never writes dates for relative ranges.** It emits `{ unit: "month", count: 3 }`; the server resolves that against `REFERENCE_DATE` into whole calendar units. This removes the most likely source of wrong answers on a dataset that ends a year before today.
- **Filter values are validated against the values present in the data.** "Fedex" is matched case-insensitively to "FedEx"; an unknown carrier returns a tool error listing valid values, which the model can use to correct itself or ask the user.
- **Dates filter on `order_date`.**

### 7.2 Output: `QueryResult`

```ts
{
  rows: { key: string, value: number | null, n: number }[],   // n = orders behind the value
  metric, groupBy,
  resolved: { dateFrom, dateTo, filters },     // what was actually applied
  matchedOrders: number,                       // rows after filtering
  notes: string[],                             // e.g. "GLS: only 9 orders"
  chart: { type, xKey, yKey }                  // from chart selection
}
```

- Rate metrics return `n` as the denominator (completed orders in the group), so the UI can flag small samples. A group with a zero denominator returns `value: null`, never 0 or NaN.
- Ranking questions return every group, not only the winner. "Which carrier has the highest delay rate?" returns GLS first (28.6%, 2 of 7) with a small-sample note, and the answer also names the highest carrier with at least 10 completed orders (USPS, 23.9%, 11 of 46). Groups are flagged, never hidden.
- Time-grouped results fill empty buckets with zero for counts and null for rates, so a line chart does not skip a week with no orders.

### 7.3 Chart selection

A pure function of the result shape:

| Result shape | Chart |
|---|---|
| No `groupBy` | Single figure card |
| `groupBy` is a time grain | Line chart |
| `groupBy` is categorical, up to 12 groups | Vertical bar chart, sorted by value |
| `groupBy` is categorical, more than 12 groups | Horizontal bar chart, top 12, remainder available in the table |

The model does not choose the chart. The same spec always yields the same chart.

## 8. Forecast tool

### 8.1 Input: `ForecastSpec`

```ts
{
  scope: { type: "all" }
       | { type: "category", category: string }
       | { type: "sku", sku: string },          // resolved to its category
  horizonMonths: number                         // 1 to 6
}
```

### 8.2 Method

1. **Build the series.** Monthly sum of `quantity` for the scope, January to December 2025, 12 points. Canceled orders are excluded; every other status counts as demand, since the customer ordered the goods.
2. **Two candidate methods:** a 3-month moving average, and a linear trend fitted by least squares.
3. **Backtest.** Fit each on January to September, predict October to December, measure mean absolute error. Use the method with the lower error.
4. **Forecast** the requested horizon with the chosen method refitted on all 12 months. Values are floored at zero and rounded to whole units.
5. **Uncertainty.** The band is plus or minus 1.65 times the backtest RMSE, widening with the square root of the months ahead.

### 8.3 Inventory recommendation

```
expected demand = sum of forecast over the horizon
safety stock    = 1.65 × backtest RMSE × √horizon        (about a 95% service level)
recommended     = expected demand + safety stock
```

The dataset has no stock-on-hand or supplier lead time, so this is "units to have available over the horizon", not a reorder quantity. The output says so.

### 8.4 Output: `ForecastResult`

History points, forecast points with lower and upper bounds, the method chosen, both backtest errors, the three inventory figures, and a list of assumption strings. The methodology text shown to the user is assembled from these fields by code.

### 8.5 Honest limits

- Twelve points cannot establish seasonality. January's spike may or may not recur; the forecast does not assume it does.
- A SKU request returns the forecast for the SKU's category with an explicit note, because no SKU has more than 3 orders.
- Some category-months have a single order. Category forecasts carry a wide band, and that is the correct output.

## 9. AI orchestration

### 9.1 Flow

```
question
  → model call 1: system prompt + two tool schemas → tool call with structured input
  → Zod validation → engine executes → result
  → model call 2: result → short narrative answer
  → groundedness check
  → response: narrative + chart + table + trace
```

One request allows at most 3 model steps, enough for one self-correction after a validation error.

The endpoint returns one JSON response; it does not stream. Each question is independent, with no conversation memory. Both are deliberate: answers are short, and a stateless single response is simpler to test, trace, and evaluate. The cost is that a follow-up such as "and for UPS?" must be asked as a full question.

### 9.2 System prompt contract

The prompt states, in order:

1. You answer questions about one logistics dataset by calling tools. You never state a number that a tool did not return.
2. The dataset covers 2025. Express relative dates as unit and count; do not compute dates.
3. Metric definitions (generated from `METRICS`, so prompt and code cannot drift).
4. When to use each tool, with two examples each.
5. If the question is outside the dataset, say so and call no tool. If it is ambiguous, state the assumption you made or ask one question.

### 9.3 Guarantees and how each is enforced

| Guarantee | Mechanism |
|---|---|
| Tool input is well-formed | Zod schema validation before execution |
| No generated SQL | There is no SQL engine in the system |
| Headline numbers are computed | The figure, chart, and table render from the tool result, not from model text |
| Narrative numbers are computed | `grounding.ts` extracts numbers from the narrative and checks each against the tool result and resolved inputs; on failure the narrative is replaced by a template sentence built from the result |
| No answer without computation | A response with no tool call may contain no digits other than those in the user's question; otherwise it is replaced by the scope message |
| Bounded cost | Step limit, input length cap, per-IP rate limit, provider spend limit |

## 10. Traceability

Every chat request builds one trace object on the server:

```ts
{
  id, timestamp, question,
  referenceDate,
  tool: "query" | "forecast" | null,
  toolInput,                    // validated spec
  resolved,                     // date range and filters as applied
  matchedOrders,
  validationErrors: string[],
  grounded: boolean,
  model, inputTokens, outputTokens, durationMs
}
```

It is used twice:

- **In the UI**, as the "How this was answered" panel under each answer. This is the explainability requirement: filters, metric, dimension, structured query, and the result table.
- **In server logs**, as one JSON line per request, visible in the Vercel log viewer.

No external tracing service is used. With two tools and a linear flow, structured logs are sufficient.

## 11. Evaluation

| Layer | What it checks | Uses the model | When it runs |
|---|---|---|---|
| Unit tests | Engine, date resolution, forecast arithmetic against golden values | No | Every commit |
| Routing eval | Question → expected tool and key arguments | Yes | On demand (`npm run eval`) |
| Groundedness | Numbers in the narrative exist in the result | No | Every request, at runtime |

**Golden values for unit tests** (all data, no filters): 400 orders; 304 delivered; 55 delayed; on-time rate 84.7%; average delivery time 3.69 days; 1,310 units; GLS has the highest carrier delay rate at 28.6% (2 of 7 completed orders, flagged as a small sample); USPS is highest among carriers with at least 10 completed orders at 23.9% (11 of 46); "last 3 months" resolves to 2025-10-01 through 2025-12-31.

**Routing eval set**, about 25 cases in `evals/routing.jsonl`:

- The three example questions from the brief.
- Relative-date variants (last week, last month, last 3 months, a named month).
- Each metric at least once; each dimension type at least once.
- Forecast requests: all products, a category, a SKU, an inventory-planning phrasing.
- Filter value normalisation ("fedex", "UK orders").
- Ambiguous ("how are we doing?") and out-of-scope (weather, a data column that does not exist).

Scoring is exact match on the tool and on the key arguments (metric, groupBy, date range, scope). The pass rate and each failure are reported in the README. The eval is not run in CI because it costs money and is not deterministic.

## 12. Frontend

- **One page.** Dashboard on the left as the main area; chat as a panel on the right. On narrow screens the chat becomes a second tab.
- **Dashboard** is server-rendered by calling `runQuery` directly with fixed specs. Filters live in the URL query string, so a filtered view is shareable and the server recomputes on change.
- **Chat answer card**, top to bottom: narrative sentence, figure or chart, then a collapsed "How this was answered" panel with the resolved filters, metric definition, structured query, and result table.
- **Forecast card** adds the three inventory figures and the methodology text.
- **States:** empty state with suggestion chips; loading indicator while the model works; a specific message for rate limit, validation failure, and provider error; "no orders match" for empty results, distinct from an error.
- **Session history** is kept in browser storage and listed for re-running. Nothing is stored on the server.

## 13. Security and operations

| Concern | Handling |
|---|---|
| Secrets | `OPENAI_API_KEY` in Vercel environment variables only; `.env.example` in the repo |
| Abuse | Per-IP rate limit on `/api/chat`; question length capped; model step limit |
| Spend | Usage limit set in the provider dashboard |
| Prompt injection | Tools are read-only over a fixed public dataset; the worst outcome is a wrong tool input, which validation rejects |
| Data | Read-only, bundled with the build; no user data is stored |

**Environment variables**

| Name | Purpose |
|---|---|
| `OPENAI_API_KEY` | Model access |
| `OPENAI_MODEL` | Model name, so it can change without a code change |

## 14. Tradeoffs

| Decision | Gained | Given up |
|---|---|---|
| In-memory data instead of a database | No setup, no connection failures, trivially correct reads | Does not scale past a dataset that fits in memory |
| Structured spec instead of SQL | No injection surface, full validation, every query explainable | Queries outside the spec are unsupported |
| One dimension per query | Simple spec the model fills reliably; simple chart rules | No cross-tabs |
| Rule-based chart selection | Deterministic and testable | No stylistic judgement from the model |
| Two forecasting methods chosen by backtest | Defensible, explainable, a few lines of code | No seasonality, no external signals |
| Reference date fixed to the data | "Last month" always returns data | Would need to become the real clock with a live feed |
| No auth | Reviewer needs no credentials | Not suitable for real client data as-is |
| Logs instead of a tracing platform | No third service | No trace search or dashboards |

## 15. Future improvements

1. PostgreSQL or DuckDB behind the same `QuerySpec`, compiled to parameterised SQL, once data outgrows memory.
2. Two-dimension queries and period-over-period comparison.
3. Multi-step analysis, where the model chains several queries to answer a "why" question. This is the point where a graph-based orchestrator becomes worth its cost.
4. Seasonal forecasting once there are at least two years of history; stock-on-hand and lead time for true reorder points.
5. Authentication and per-client data isolation.
6. A tracing and eval platform, with the routing eval run on every prompt change.
