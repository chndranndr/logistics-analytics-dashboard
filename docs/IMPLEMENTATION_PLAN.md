# Implementation Plan

This plan tells an implementation agent how to build the application. The text obeys the writing rules of ASD-STE100 (Simplified Technical English). Each sentence gives one instruction or one fact.

## 0. How to use this plan

1. Read `AGENTS.md`, `docs/PRD.md`, and `docs/DESIGN.md` before you start.
2. Do the tasks in the given sequence. Do not skip a task.
3. Do one task at a time.
4. Do the "Verify" steps at the end of each task. Continue only when all the checks pass.
5. Make one git commit after each task. Use the task number in the commit message.
6. Do not change a golden value in a test. If a test fails, the code is wrong.
7. Do not change the metric definitions in section 2.
8. Do not add a feature that is not in this plan.
9. Stop and ask the user if an instruction is not clear.
10. Stop and ask the user if a "Verify" step fails three times.

### Tasks that only the user can do

The agent must not do these tasks. Tell the user when a task is necessary.

| Task | When |
|---|---|
| Give the OpenAI API key in `.env.local` | Before task 9 |
| Set a usage limit in the OpenAI dashboard | Before task 14 |
| Make the GitHub repository and push | Task 14 |
| Log in to Vercel, set the environment variables, and deploy | Task 14 |
| Write the AI disclosure paragraph in the README | Task 13 |
| Record the Loom video | After task 14 |

## 1. Fixed decisions

| Item | Decision |
|---|---|
| Framework | Next.js with the App Router, TypeScript, strict mode |
| Package manager | npm |
| Styles | Tailwind CSS |
| Schema library | Zod |
| CSV parser | `csv-parse` (use `csv-parse/sync`) |
| AI library | Vercel AI SDK (`ai`) with the OpenAI provider (`@ai-sdk/openai`) |
| Charts | Recharts |
| Tests | Vitest |
| Database | None. The data is in memory. |
| Authentication | None |
| Streaming | None. The chat endpoint returns one JSON response. |
| Conversation memory | None. Each question is independent. |

**Important:** The function names of the AI SDK change between major versions. Read the documentation of the installed version before you write code that calls the SDK. Do not write function names from memory.

## 2. Definitions that you must not change

The source of these definitions is `docs/PRD.md`, section 6.

| Name | Definition |
|---|---|
| Completed order | An order with status `delivered` or `delayed` |
| Reference date | `2026-01-01`. Use this date as "today". Do not use the system clock. |
| Date filter | All date filters use `order_date` |
| Week | A week starts on Monday and ends on Sunday |

### 2.1 Metrics

Calculate each metric for a group of rows. `n` is the sample size that the result shows.

| Metric id | Value | Rounding | `n` |
|---|---|---|---|
| `order_count` | Number of rows | Integer | Number of rows |
| `delivered_count` | Number of rows with status `delivered` | Integer | Number of rows |
| `delayed_count` | Number of rows with status `delayed` | Integer | Number of rows |
| `on_time_rate` | 100 × delivered ÷ completed | 1 decimal | Number of completed orders |
| `delay_rate` | 100 × delayed ÷ completed | 1 decimal | Number of completed orders |
| `avg_delivery_days` | Mean of `deliveryDays` for completed orders | 2 decimals | Number of completed orders |
| `total_quantity` | Sum of `quantity` for all rows | Integer | Number of rows |
| `total_order_value` | Sum of `order_value_usd` for all rows | 2 decimals | Number of rows |

Rules:

- If the number of completed orders is 0, the value of `on_time_rate`, `delay_rate`, and `avg_delivery_days` is `null`.
- Do not return `0` or `NaN` for an empty rate.
- `deliveryDays` is `delivery_date` minus `order_date` in days.
- `deliveryDays` is `null` when `delivery_date` is empty.

### 2.2 Relative date ranges

A relative range has a unit and a count. Calculate the range from the reference date. The range contains only complete calendar units before the reference date.

| Unit | Count | From | To |
|---|---|---|---|
| `month` | 1 | 2025-12-01 | 2025-12-31 |
| `month` | 3 | 2025-10-01 | 2025-12-31 |
| `week` | 1 | 2025-12-22 | 2025-12-28 |
| `week` | 2 | 2025-12-15 | 2025-12-28 |
| `day` | 7 | 2025-12-25 | 2025-12-31 |

Use plain calendar dates. Do not use time zones. Do the date arithmetic in UTC.

## 3. Golden values

Use these values in the tests. A script calculated all the values from the CSV file.

### 3.1 All data, no filters

| Query | Result |
|---|---|
| `order_count` | 400 |
| `delivered_count` | 304 |
| `delayed_count` | 55 |
| `on_time_rate` | 84.7, `n` = 359 |
| `delay_rate` | 15.3, `n` = 359 |
| `avg_delivery_days` | 3.69, `n` = 359 |
| `total_quantity` | 1310 |
| `total_order_value` | 13695.87 |

### 3.2 Groups

`order_count` by `status`: canceled 3, delayed 55, delivered 304, exception 11, in_transit 27.

`order_count` by `region`: EU 81, UK 54, US-C 78, US-E 95, US-W 92.

`on_time_rate` by `region`: EU 84.3 (n 70), UK 83.3 (n 48), US-C 85.3 (n 68), US-E 82.6 (n 86), US-W 87.4 (n 87).

`delay_rate` by `carrier`, sorted from high to low:

| Carrier | Value | `n` |
|---|---|---|
| GLS | 28.6 | 7 |
| USPS | 23.9 | 46 |
| UPS | 22.4 | 76 |
| Royal Mail | 20.8 | 24 |
| OnTrac | 16.0 | 25 |
| FedEx | 13.1 | 84 |
| LaserShip | 8.3 | 24 |
| DHL | 5.3 | 57 |
| DPD | 0.0 | 16 |

GLS is the only carrier with `n` less than 10.

By month, 2025-01 to 2025-12:

| Metric | Values |
|---|---|
| `order_count` | 75, 36, 46, 25, 29, 21, 42, 34, 18, 26, 24, 24 |
| `delivered_count` | 57, 28, 34, 22, 17, 16, 32, 26, 16, 20, 16, 20 |
| `delayed_count` | 12, 4, 5, 0, 7, 4, 7, 4, 2, 3, 4, 3 |

### 3.3 Date ranges and filters

| Query | Result |
|---|---|
| `order_count`, relative month 1 | 24 |
| `delayed_count`, relative month 1 | 3 |
| `order_count`, relative month 3 | 74 |
| `delayed_count`, relative month 3 | 10 |
| `order_count`, relative week 1 | 6 |
| `order_count`, filter carrier `FedEx` | 89 |
| `order_count`, filter carrier `fedex` (lower case) | 89 |

`delayed_count` by `week`, relative month 3. The result has 14 rows. The key of each row is the Monday of the week.

| Key | Value | Key | Value |
|---|---|---|---|
| 2025-09-29 | 1 | 2025-11-17 | 0 |
| 2025-10-06 | 2 | 2025-11-24 | 1 |
| 2025-10-13 | 0 | 2025-12-01 | 1 |
| 2025-10-20 | 0 | 2025-12-08 | 2 |
| 2025-10-27 | 1 | 2025-12-15 | 0 |
| 2025-11-03 | 0 | 2025-12-22 | 0 |
| 2025-11-10 | 2 | 2025-12-29 | 0 |

### 3.4 Forecast

The forecast series does not include canceled orders. Thus the sum of the series (1303) is less than `total_quantity` (1310).

| Item | All products | Category CRAYON |
|---|---|---|
| Monthly series | 233, 86, 147, 55, 115, 64, 126, 98, 94, 79, 113, 93 | 60, 12, 33, 11, 3, 22, 5, 25, 23, 14, 4, 16 |
| Backtest: moving average prediction | 106, 106, 106 | 17.67, 17.67, 17.67 |
| Backtest: moving average MAE / RMSE | 15.67 / 17.77 | 6.33 / 8.23 |
| Backtest: linear trend prediction | 67.03, 57.81, 48.59 | 8.72, 6.16, 3.59 |
| Backtest: linear trend MAE / RMSE | 37.19 / 41.48 | 6.61 / 7.89 |
| Selected method | `moving_average` | `moving_average` |
| Forecast, horizon 4 | 95, 95, 95, 95 | 11, 11, 11, 11 |
| Expected demand | 380 | 44 |
| Safety stock | 59 | 28 |
| Recommended units | 439 | 72 |
| Bounds of the first forecast month | 66 to 124 | (no golden value) |

SKU `CRAYON-0008` is in category `CRAYON`. A forecast for this SKU gives the CRAYON result.

## 4. File layout

```
app/page.tsx                    dashboard and chat
app/api/chat/route.ts           chat endpoint
components/dashboard/           KPI cards, filter bar, fixed charts
components/chat/                chat panel, answer card, suggestion chips
components/result/              ResultChart, ResultTable, TracePanel
lib/data/orders.ts              CSV load
lib/domain/metrics.ts           metric definitions
lib/domain/dates.ts             date functions
lib/analytics/spec.ts           QuerySpec schema
lib/analytics/engine.ts         runQuery
lib/chart/select.ts             chart selection
lib/forecast/spec.ts            ForecastSpec schema
lib/forecast/methods.ts         forecast arithmetic
lib/forecast/engine.ts          runForecast
lib/ai/prompt.ts                system prompt
lib/ai/tools.ts                 tool definitions
lib/ai/interpret.ts             model call
lib/ai/grounding.ts             number check
lib/ai/rateLimit.ts             rate limit
data/mock_logistics_data.csv    dataset
evals/routing.jsonl             eval cases
evals/run.ts                    eval runner
tests/                          unit tests
```

Import rules:

- `lib/domain` must not import from other `lib` folders.
- `lib/analytics`, `lib/forecast`, and `lib/chart` must not import from `lib/ai`.
- `lib/analytics`, `lib/forecast`, and `lib/chart` must not import the AI SDK.

## 5. Tasks

### Task 1: Make the project

1. Run `git init` in the repository root.
2. Make the Next.js project in a temporary folder. Use this command:
   `npx create-next-app@latest tmp-app --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm`
3. Move all the files and folders from `tmp-app` to the repository root. Include the hidden files.
4. Delete the `tmp-app` folder.
5. Make the `data` folder. Move `mock_logistics_data.csv` into `data`.
6. Install the packages: `npm install zod csv-parse recharts ai @ai-sdk/openai`
7. Install the test packages: `npm install -D vitest tsx`
8. Add these scripts to `package.json`: `"test": "vitest run"` and `"eval": "tsx evals/run.ts"`.
9. Make `vitest.config.ts`. Set the `@` alias to the repository root.
10. Add these lines to `.gitignore`: `.env*`, `!.env.example`, `*.docx`.
11. Make `.env.example` with these two lines: `OPENAI_API_KEY=` and `OPENAI_MODEL=`.
12. Do not delete `AGENTS.md` or the `docs` folder.

Verify:

- `npm run build` is successful.
- `npm test` runs and finds no tests.
- `git status` does not show the `.docx` files.

### Task 2: Data layer

File: `lib/data/orders.ts`

1. Define the `Status` type: `"delivered" | "delayed" | "in_transit" | "exception" | "canceled"`.
2. Define a Zod schema for one CSV row. All 17 columns are necessary.
3. `delivery_date` can be an empty string. Convert an empty string to `null`.
4. Convert `quantity`, `unit_price_usd`, `order_value_usd`, and `promo_discount_pct` to numbers.
5. Convert `is_promo` to a boolean. The value `1` is `true`.
6. Keep `order_date` and `delivery_date` as `YYYY-MM-DD` strings.
7. Add the field `deliveryDays` to each row. See section 2.1.
8. Export the function `getOrders(): Order[]`.
9. Read the file with `fs.readFileSync` and `path.join(process.cwd(), "data", "mock_logistics_data.csv")`.
10. Parse the file with `csv-parse/sync`. Use the options `columns: true` and `bom: true`.
11. Read the file only one time. Keep the result in a module variable.
12. If a row is not valid, throw an error. Put the row number in the error message.
13. Add `outputFileTracingIncludes` to `next.config`. Include `./data/**` for all routes.

Tests: `tests/orders.test.ts`

- The number of orders is 400.
- The number of orders with `deliveryDays === null` is 30.
- The order with the lowest `order_date` has the date `2025-01-01`.
- The order with the highest `order_date` has the date `2025-12-30`.

### Task 3: Domain definitions

File: `lib/domain/metrics.ts`

1. Export `REFERENCE_DATE = "2026-01-01"`.
2. Export `COMPLETED_STATUSES = ["delivered", "delayed"]`.
3. Export `SMALL_SAMPLE = 10`.
4. Export `METRIC_IDS` as a constant array of the 8 metric ids in section 2.1.
5. Export `METRICS`. Each metric has `label`, `unit`, and `definition`.
6. Write each `definition` as one sentence. Use the definitions in `docs/PRD.md`, section 6.
7. Export the function `computeMetric(metric, rows): { value: number | null, n: number }`. Use the table in section 2.1.

File: `lib/domain/dates.ts`

1. Export `resolveDateRange(range, referenceDate, dataMin, dataMax): { from: string, to: string }`.
2. For type `all`, return `dataMin` and `dataMax`.
3. For type `absolute`, return the given dates.
4. For type `relative`, use the rules in section 2.2.
5. Export `bucketKey(date, grain): string`.
6. For grain `day`, the key is the date.
7. For grain `week`, the key is the Monday of the week of the date.
8. For grain `month`, the key is `YYYY-MM`.
9. Export `listBuckets(from, to, grain): string[]`. Return each bucket key from the bucket of `from` to the bucket of `to`.

Tests: `tests/metrics.test.ts`, `tests/dates.test.ts`

- All the values in section 3.1.
- `computeMetric("on_time_rate", [])` returns `{ value: null, n: 0 }`.
- All the rows in the table in section 2.2.
- `bucketKey("2025-10-01", "week")` is `"2025-09-29"`.
- `listBuckets("2025-10-01", "2025-12-31", "week")` has 14 items.
- `listBuckets("2025-01-01", "2025-12-30", "month")` has 12 items.

### Task 4: Query engine

File: `lib/analytics/spec.ts`

Define `QuerySpecSchema` with Zod. Export the type `QuerySpec`.

```ts
{
  metric:  one of METRIC_IDS,
  groupBy: null | "day" | "week" | "month" | "carrier" | "region" | "warehouse"
         | "product_category" | "destination_city" | "origin_city" | "status" | "client_id",
  filters: {
    carrier?: string[], region?: string[], warehouse?: string[],
    product_category?: string[], status?: Status[],
    destination_city?: string[], is_promo?: boolean
  },
  dateRange: { type: "all" }
           | { type: "relative", unit: "day" | "week" | "month", count: integer 1 to 24 }
           | { type: "absolute", from: "YYYY-MM-DD", to: "YYYY-MM-DD" },
  sort:  "value_desc" | "value_asc" | "natural",
  limit: null | integer 1 to 50
}
```

Add a `.describe()` text to each field. The model reads these texts.

File: `lib/analytics/engine.ts`

Export `runQuery(spec: QuerySpec, orders = getOrders()): QueryResult`.

```ts
type QueryResult = {
  kind: "query",
  metric: MetricId,
  groupBy: string | null,
  rows: { key: string, value: number | null, n: number }[],
  resolved: { dateFrom: string, dateTo: string, filters: Record<string, string[] | boolean> },
  matchedOrders: number,
  notes: string[],
  chart: ChartSpec
}
```

Do these steps in this sequence:

1. Normalize each string filter value. Compare the value with the values in the data. Ignore the letter case.
2. If a filter value is not in the data, throw a `QueryError`. Put the valid values in the message.
3. Resolve the date range. Use `resolveDateRange`.
4. Keep the rows where `order_date` is in the range and all the filters match.
5. Set `matchedOrders` to the number of these rows.
6. If `groupBy` is `null`, calculate one row with the key `"all"`.
7. If `groupBy` is a time grain, make one group for each key from `listBuckets`. Include the buckets that have no rows.
8. If `groupBy` is a category, make one group for each value that occurs in the rows.
9. Calculate the metric for each group. Use `computeMetric`.
10. Sort the rows. For `natural`, sort the keys from low to high. For the value sorts, put `null` values last.
11. If `limit` is not `null`, keep the first `limit` rows.
12. For the metrics `on_time_rate`, `delay_rate`, and `avg_delivery_days`: add a note for each category group with `n` less than `SMALL_SAMPLE`. Use this format: `"GLS: small sample (7 completed orders)"`.
13. Set `chart` with `selectChart` (task 5).

Tests: `tests/engine.test.ts`

- All the values in sections 3.2 and 3.3.
- `delay_rate` by `carrier` with sort `value_desc` gives GLS as the first row.
- The same query has one note. The note contains `GLS`.
- An unknown carrier throws a `QueryError`.
- A query with no matching rows returns `matchedOrders` 0 and does not throw.

### Task 5: Chart selection

File: `lib/chart/select.ts`

Export `selectChart(groupBy, rowCount): ChartSpec`. `ChartSpec` is `{ type: "figure" | "line" | "bar" | "bar_horizontal" }`.

| Condition | Type |
|---|---|
| `groupBy` is `null` | `figure` |
| `groupBy` is `day`, `week`, or `month` | `line` |
| `groupBy` is a category and `rowCount` is 12 or less | `bar` |
| `groupBy` is a category and `rowCount` is more than 12 | `bar_horizontal` |

Tests: one test for each row of the table.

### Task 6: Forecast engine

File: `lib/forecast/spec.ts`

```ts
{
  scope: { type: "all" } | { type: "category", category: string } | { type: "sku", sku: string },
  horizonMonths: integer 1 to 6
}
```

File: `lib/forecast/methods.ts`

1. `movingAverage(series, horizon)`: return the mean of the last 3 values, `horizon` times.
2. `linearTrend(series, horizon)`: fit a least-squares line. Use x = 0, 1, 2, and so on.
3. `linearTrend` returns the line value for each future month. Replace a negative value with 0.
4. `mae(predicted, actual)` and `rmse(predicted, actual)`.

File: `lib/forecast/engine.ts`

Export `runForecast(spec, orders = getOrders()): ForecastResult`.

1. Resolve the scope. Match the category name without letter case.
2. For scope `sku`, find the category of the SKU. Use that category. Add a note that explains the change.
3. If the category or the SKU is not in the data, throw a `QueryError` with the valid categories.
4. Remove the orders with status `canceled`.
5. Make the monthly series: the sum of `quantity` for each month, 2025-01 to 2025-12. A month with no orders has the value 0.
6. Backtest: use the first 9 values as the training data. Predict the last 3 values with each method.
7. Calculate the MAE and the RMSE of each method.
8. Select the method with the lower MAE. If the two MAE values are equal, select `moving_average`.
9. Calculate the forecast with the selected method. Use all 12 values.
10. Round each forecast value with `Math.round`.
11. For forecast month `k` (1, 2, 3, and so on), the margin is `1.65 × RMSE × √k`. Use the RMSE of the selected method.
12. The lower bound is `max(0, round(forecast − margin))`. The upper bound is `round(forecast + margin)`.
13. Expected demand is the sum of the rounded forecast values.
14. Safety stock is `ceil(1.65 × RMSE × √horizonMonths)`.
15. Recommended units is expected demand plus safety stock.

```ts
type ForecastResult = {
  kind: "forecast",
  scopeLabel: string,                       // "All products" or "Category CRAYON"
  history:  { month: string, value: number }[],
  forecast: { month: string, value: number, lower: number, upper: number }[],
  method: "moving_average" | "linear_trend",
  backtest: { moving_average: { mae: number, rmse: number },
              linear_trend:   { mae: number, rmse: number } },
  inventory: { expectedDemand: number, safetyStock: number, recommended: number },
  methodology: string,                      // made by code from the fields above
  notes: string[]
}
```

The `notes` array always contains these three notes:

- `"The history has only 12 months. The forecast does not include seasonality."`
- `"The data has no stock level and no lead time. The recommendation is the number of units to have available in the forecast period."`
- `"The forecast does not include canceled orders."`

Round the backtest errors to 2 decimals.

Tests: `tests/forecast.test.ts`. Use all the values in section 3.4.

### Task 7: Dashboard

File: `app/page.tsx` and `components/dashboard/`

1. Make `app/page.tsx` a server component.
2. Read the filters from the URL search parameters: `from`, `to`, `carrier`, `region`.
3. Make one base `QuerySpec` from these filters.
4. Call `runQuery` directly for each KPI and each chart. Do not call the chat endpoint.
5. Show 5 KPI cards: total orders, delivered orders, delayed orders, on-time delivery rate, average delivery time.
6. Show the `definition` text of each metric on the card.
7. Show chart 1: `order_count` by `month`, as a line chart.
8. Show chart 2: `delivered_count` and `delayed_count` by `month`, as a stacked bar chart.
9. Show chart 3: `delay_rate` by `carrier`, as a bar chart. Show the `n` of each carrier in the tooltip.
10. Show the filter bar: two date inputs, a carrier selector, and a region selector.
11. When the user changes a filter, change the URL search parameters.
12. Show the text `"Data: 2025-01-01 to 2025-12-30. Reference date: 2026-01-01."` near the title.
13. Recharts components need `"use client"`. Put each chart in a client component.

Verify:

- `npm run dev` shows the dashboard at `http://localhost:3000`.
- With no filters, the KPI cards show 400, 304, 55, 84.7%, and 3.69 days.
- With `?carrier=FedEx`, the total orders card shows 89.

### Task 8: Result components

Folder: `components/result/`

1. `ResultChart`: show a `QueryResult` with the chart type from `result.chart`.
2. For type `figure`, show the value as a large number with the metric label and unit.
3. `ResultTable`: show the rows as a table with the columns key, value, and `n`.
4. Show `null` values as `"n/a"`.
5. `ForecastChart`: show the history as a solid line and the forecast as a dashed line.
6. Show the area between the lower and upper bounds.
7. `TracePanel`: a collapsed panel with the title `"How this was answered"`.
8. `TracePanel` shows: the tool name, the resolved date range, the filters, the metric label and definition, the dimension, the tool input as formatted JSON, the notes, and the result table.

### Task 9: AI layer

**The user must give the OpenAI API key in `.env.local` before this task.**

File: `lib/ai/prompt.ts`

Export `buildSystemPrompt(): string`. Make the metric list from `METRICS`. Do not write the metric list by hand. Use this text:

```
You answer questions about one logistics dataset. The dataset has 400 orders from 2025-01-01 to 2025-12-30.

Rules:
1. You cannot calculate. Call a tool to get each number.
2. Do not write a number that a tool did not return.
3. For a relative period (last month, last 3 months, last week), use dateRange type "relative" with a unit and a count. Do not write dates for a relative period.
4. For a named period (March, Q2 2025), use dateRange type "absolute". The year is 2025.
5. If the question has no period, use dateRange type "all".
6. For a question about the highest or lowest group, set groupBy to that dimension, set the sort, and set limit to null.
7. Use the query tool for counts, rates, averages, and breakdowns.
8. Use the forecast tool for future demand and for inventory planning.
9. If the question is not about this dataset, do not call a tool. Tell the user what you can answer.
10. If the question is not clear, make one reasonable assumption and state it in the answer.
11. After the tool returns, answer in one to three sentences. Use only the numbers in the tool result.
12. If the tool result has notes, include the notes in the answer.

Metrics:
{one line for each metric: id, label, definition}

Dimensions for groupBy: day, week, month, carrier, region, warehouse, product_category, destination_city, origin_city, status, client_id.
```

File: `lib/ai/tools.ts`

1. Define two tools: `query` and `forecast`.
2. The input schema of `query` is `QuerySpecSchema`.
3. The input schema of `forecast` is `ForecastSpecSchema`.
4. The `execute` function of each tool calls `runQuery` or `runForecast`.
5. If the engine throws a `QueryError`, return `{ error: message }`. Do not throw. The model can then correct the input.

File: `lib/ai/interpret.ts`

Export `interpret(question: string): Promise<Interpretation>`.

```ts
type Interpretation = {
  tool: "query" | "forecast" | null,
  toolInput: unknown | null,
  result: QueryResult | ForecastResult | null,
  text: string,
  validationErrors: string[],
  usage: { inputTokens: number, outputTokens: number },
  model: string
}
```

1. Call the text-generation function of the AI SDK with the system prompt, the question, and the two tools.
2. Read the model name from `process.env.OPENAI_MODEL`.
3. Set the step limit to 3.
4. Find the last tool call that returned a result without an error. Set `tool`, `toolInput`, and `result` from this call.
5. Put each tool error message in `validationErrors`.
6. Set `text` to the final text of the model.

Verify: write a temporary script that calls `interpret("Which carrier has the highest delay rate?")`. The tool is `query`. The first row of the result is GLS. Delete the script after the check.

### Task 10: Grounding, rate limit, and chat endpoint

File: `lib/ai/grounding.ts`

Export `isGrounded(text, result, question): boolean`.

1. Find all the numbers in `text` with the pattern `\d[\d,]*(\.\d+)?`.
2. Remove the commas. Convert each number with `parseFloat`.
3. Make the allowed set: all the numbers in `JSON.stringify(result)` and all the numbers in `question`. Use the same pattern.
4. Return `true` only if each number in `text` is in the allowed set.

Export `fallbackText(result): string`. Make one sentence from the result with code.

- For a query with one row: `"{label}: {value} {unit} ({n} orders in the sample)."`
- For a query with more than one row: `"{label} by {groupBy}. The highest is {key} with {value} {unit}. See the chart and the table."`
- For a forecast: `"Forecast for {scopeLabel}: {expectedDemand} units in {h} months. Recommended: {recommended} units."`

File: `lib/ai/rateLimit.ts`

1. Keep a `Map` from the IP address to a list of request times.
2. Allow 10 requests in 60 seconds for each IP address.
3. Export `checkRateLimit(ip): boolean`.

File: `app/api/chat/route.ts`

The endpoint accepts `POST` with the body `{ question: string }`.

1. If `question` is empty or longer than 300 characters, return status 400.
2. Read the IP address from the `x-forwarded-for` header. If the rate limit is exceeded, return status 429.
3. Call `interpret(question)`.
4. If `tool` is `null` and `text` contains a number that is not in the question: replace `text` with `"I can answer questions about the orders in this dataset: counts, delays, delivery times, carrier and region breakdowns, and demand forecasts."`
5. If `tool` is not `null` and `isGrounded` returns `false`: replace `text` with `fallbackText(result)`. Set `grounded` to `false`.
6. Make the trace object. See `docs/DESIGN.md`, section 10.
7. Write the trace to the log with `console.log(JSON.stringify(trace))`.
8. Return `{ text, result, trace }` as JSON.
9. If the model call throws, return status 502 with the message `"The AI service is not available. The dashboard still works."`

Tests: `tests/grounding.test.ts`

- A text with only numbers from the result is grounded.
- A text with one number that is not in the result is not grounded.
- A number with commas (`1,310`) matches `1310`.

### Task 11: Chat interface

Folder: `components/chat/`

1. Show the chat panel on the right side of the dashboard. On a narrow screen, show the chat panel below the dashboard.
2. Show a text input and a send button.
3. Show these suggestion chips when there are no messages:
   - `Show delayed orders by week for the last 3 months`
   - `Which carrier has the highest delay rate?`
   - `How many orders were delivered late last month?`
   - `What is the on-time rate by region?`
   - `Predict demand for CRAYON for the next 4 months`
   - `How much inventory should I plan for the next 3 months?`
4. Send the question to `/api/chat` with `fetch`.
5. Show a loading indicator while the request is in progress.
6. Show each answer as a card. The card shows, from top to bottom: the text, the chart or the figure, and the `TracePanel`.
7. For a forecast, also show the three inventory numbers, the methodology text, and the notes.
8. If `matchedOrders` is 0, show `"No orders match this question."`
9. For status 429, show `"Too many questions. Wait one minute."`
10. For other errors, show the error message from the response.
11. Keep the list of questions in `sessionStorage`. Show the list as "Recent questions". A click on a question sends the question again.

Verify in the browser:

- Each of the 6 suggestion chips returns an answer with a chart or a figure.
- `Show delayed orders by week for the last 3 months` shows a line chart with 14 points. The trace shows the range 2025-10-01 to 2025-12-31.
- `How many orders were delivered late last month?` shows the number 3.
- `What is the weather in London?` returns the scope message and no chart.
- `Predict demand for SKU CRAYON-0008 for the next 4 months` shows a note about the category.

### Task 12: Routing eval

File: `evals/routing.jsonl`. Each line has `question`, `tool`, and `expect`. `expect` contains only the fields to compare.

| # | Question | Tool | Expected fields |
|---|---|---|---|
| 1 | Show delayed orders by week for the last 3 months | query | metric `delayed_count`, groupBy `week`, relative month 3 |
| 2 | Which carrier has the highest delay rate? | query | metric `delay_rate`, groupBy `carrier`, sort `value_desc` |
| 3 | How many orders were delivered late last month? | query | metric `delayed_count`, groupBy `null`, relative month 1 |
| 4 | How many orders do we have in total? | query | metric `order_count`, groupBy `null`, dateRange `all` |
| 5 | What is our on-time delivery rate? | query | metric `on_time_rate`, groupBy `null` |
| 6 | Average delivery time by carrier | query | metric `avg_delivery_days`, groupBy `carrier` |
| 7 | Order volume per month | query | metric `order_count`, groupBy `month` |
| 8 | On-time rate by region | query | metric `on_time_rate`, groupBy `region` |
| 9 | Which warehouse ships the most orders? | query | metric `order_count`, groupBy `warehouse`, sort `value_desc` |
| 10 | How many units did we sell by product category? | query | metric `total_quantity`, groupBy `product_category` |
| 11 | Total order value in March | query | metric `total_order_value`, absolute 2025-03-01 to 2025-03-31 |
| 12 | How many fedex orders were delayed? | query | metric `delayed_count`, filter carrier contains FedEx (ignore case) |
| 13 | Delay rate for UK orders | query | metric `delay_rate`, filter region `UK` |
| 14 | Orders by status | query | metric `order_count`, groupBy `status` |
| 15 | How many orders last week? | query | metric `order_count`, relative week 1 |
| 16 | Which destination city has the lowest on-time rate? | query | metric `on_time_rate`, groupBy `destination_city`, sort `value_asc` |
| 17 | How many promo orders were there? | query | metric `order_count`, filter is_promo `true` |
| 18 | Predict demand for the next 4 months | forecast | scope `all`, horizonMonths 4 |
| 19 | Forecast CRAYON demand for the next 3 months | forecast | scope category `CRAYON`, horizonMonths 3 |
| 20 | Predict demand for SKU CRAYON-0008 for the next 4 months | forecast | scope sku `CRAYON-0008`, horizonMonths 4 |
| 21 | How much inventory should I plan for the next 2 months? | forecast | horizonMonths 2 |
| 22 | What is the weather in London? | none | (no tool) |
| 23 | What is our profit margin? | none | (no tool) |
| 24 | Write a poem about trucks | none | (no tool) |

File: `evals/run.ts`

1. Read the cases.
2. Call `interpret(question)` for each case.
3. A case passes when the tool is the same and each expected field is the same in `toolInput`.
4. Print one line for each case: the number, PASS or FAIL, and the difference for a failure.
5. Print the total: `passed / total`.

Verify: `npm run eval` runs to the end. Give the result to the user. Do not change a case to make it pass. If a case fails, improve the field descriptions or the system prompt.

### Task 13: README

Write `README.md` with these sections. Use the content of `docs/PRD.md` and `docs/DESIGN.md`. Keep each section short.

1. Overview, with the live URL.
2. Setup: local setup steps and the environment variables.
3. Architecture: system overview, key design decisions, data flow.
4. AI approach: how the system interprets a question and how it selects a tool.
5. Metric definitions and assumptions.
6. Limitations: the questions that the system does not support.
7. Evaluation: the unit tests and the routing eval result.
8. Future improvements.
9. AI tool disclosure. Write only the heading. The user writes this section.

### Task 14: Final checks and deployment

1. Run `npm run lint`. Correct all the errors.
2. Run `npm test`. All the tests must pass.
3. Run `npm run build`. The build must be successful.
4. Search the repository for the API key text `sk-`. There must be no result.
5. Make sure that `.env.local` is not in `git status`.
6. Tell the user that the project is ready for deployment.
7. The user makes the GitHub repository, pushes the code, and deploys to Vercel.
8. After deployment, open the live URL in a private browser window.
9. Do the "Verify" steps of task 7 and task 11 again on the live URL.
10. If the dashboard shows a file error on the live URL, examine `outputFileTracingIncludes` in `next.config`.

## 6. Definition of done

- All the unit tests pass with the golden values in section 3.
- The three example questions in the brief return correct answers on the live URL.
- Each answer shows the trace panel.
- The routing eval result is in the README.
- The repository contains no secrets and no `.docx` files.
