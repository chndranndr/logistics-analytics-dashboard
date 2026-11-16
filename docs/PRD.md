# PRD: AI-Powered Logistics Analytics Dashboard

| | |
|---|---|
| Status | Draft, pending sign-off on section 6 (metric definitions) |
| Owner | Chandra Aji Anindra |
| Context | Take-home assessment, AI Tech Lead, Spaceship |
| Deadline | Friday 20 November 2026, 16:30 WIB |
| Companion doc | [DESIGN.md](DESIGN.md) |

## 1. Problem

A logistics client has order and delivery data but two gaps in how they use it:

1. Standard questions (how many orders, how many late, which carrier is worst) need a dashboard that is always correct and always defined the same way.
2. Ad-hoc questions ("delayed orders by week for the last 3 months") need an analyst today. A natural-language interface can answer them, but only if the numbers come from computation and not from a language model's guess.

The product is one web app that covers both, plus a basic demand forecast, on a single read-only dataset.

## 2. Users

| User | Needs |
|---|---|
| Operations manager at the client | KPIs at a glance, quick answers without writing queries, a demand number to plan inventory against |
| Reviewer (Spaceship) | A public URL that works without setup, and enough transparency to verify that every number is computed and correct |

## 3. Goals and non-goals

**Goals**

- Every number shown is computed by deterministic code from the dataset.
- The dashboard and the chat use the same metric definitions and the same query engine, so they cannot disagree.
- Every answer shows how it was produced: filters, metric, dimension, structured query, underlying rows.
- The forecast is honest about how thin the data is.
- A reviewer can open the URL and use everything with no login and no setup.

**Non-goals**

- Authentication, multi-tenant access, user accounts.
- Editing or uploading data. The dataset is read-only.
- Free-form SQL, or any query the structured spec cannot express.
- Advanced forecasting (seasonality models, ML). The data does not support it.
- Persisted chat history across sessions or devices.

## 4. Scope summary

| Level | Feature | Tool |
|---|---|---|
| Descriptive | Dashboard: 5 KPIs, 3 charts, 3 filters | Query engine, called directly |
| Diagnostic | Natural-language questions answered with a number, a chart, or both | Query tool, selected by the AI |
| Predictive and prescriptive | Demand forecast with inventory recommendation | Forecast tool, selected by the AI |

## 5. Requirements

Priority: **P0** is required by the brief, **P1** is a brief bonus item that is cheap and high-value, **P2** is deferred.

### 5.1 Dashboard

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| D1 | KPI cards: total orders, delivered orders, delayed orders, on-time delivery rate, average delivery time | P0 | Unfiltered values match section 6: 400 / 304 / 55 / 84.7% / 3.69 days |
| D2 | Chart: order volume over time (monthly) | P0 | 12 monthly points, summing to 400 |
| D3 | Chart: delivery performance, on-time vs delayed over time | P0 | Monthly stacked bars; totals 304 on-time, 55 delayed |
| D4 | Chart: carrier breakdown with delay rate and order count | P0 | 9 carriers; sample size visible per carrier |
| D5 | Filters: date range, carrier, region | P0 | All KPIs and charts recompute; active filters are visible |
| D6 | Each KPI shows its definition on hover or tap | P0 | Definition text matches section 6 |

### 5.2 Natural-language queries

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| N1 | User asks a question in plain English and gets a direct answer, a chart, or both | P0 | The three example questions from the brief return correct results |
| N2 | Relative dates ("last month", "last 3 months") resolve against the dataset reference date, not the system clock | P0 | "last month" resolves to December 2025; the resolved range is shown |
| N3 | Out-of-scope questions get a clear refusal with no numbers | P0 | "What's the weather in London?" returns a scope message and no data |
| N4 | Ambiguous questions get one clarifying question or a stated assumption | P1 | "How are we doing?" does not return an arbitrary metric silently |
| N5 | Suggested question chips for first-time users | P0 | At least 5 chips covering query and forecast |
| N6 | Query history within the session | P1 | Previous questions are listed and re-runnable |

### 5.3 Dynamic charts

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| C1 | Chart type is selected automatically from the shape of the result | P0 | Time dimension gives a line chart; categorical gives a bar chart; no dimension gives a single figure |
| C2 | Chart selection is rule-based code, not a model decision | P0 | Same query spec always gives the same chart type |

### 5.4 Explainability

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| E1 | Every answer shows filters applied, including the resolved date range | P0 | Visible without leaving the answer |
| E2 | Every answer shows the metric and dimension used, with the metric definition | P0 | |
| E3 | Every answer shows the structured query the AI produced | P0 | Rendered as readable JSON |
| E4 | Every answer gives access to the underlying result table | P0 | Table is expandable under the answer |
| E5 | Small samples are flagged | P1 | Any group with fewer than 10 orders is marked |

### 5.5 Forecasting

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| F1 | Forecast monthly demand in units for all products or one product category, 1 to 6 months ahead | P0 | Returns one value per future month |
| F2 | Chart shows history and forecast together, visually distinct | P0 | Forecast segment is dashed with an uncertainty band |
| F3 | Inventory recommendation in units for the horizon | P0 | Shows expected demand, safety stock, and total |
| F4 | Methodology explanation, including which method was used and why | P0 | Names the method, the backtest error, and the assumptions |
| F5 | SKU-level requests fall back to the SKU's category, and say so | P0 | "Predict demand for SKU CRAYON-0008" returns a CRAYON forecast with an explicit note |

### 5.6 AI orchestration

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| A1 | The AI selects a tool and fills a structured input; it never computes or invents numbers | P0 | Every number in an answer appears in the tool result |
| A2 | Tool inputs are validated against a schema before execution | P0 | Invalid input is rejected and never reaches the engine |
| A3 | No AI-generated SQL | P0 | There is no SQL in the system |
| A4 | Routing quality is measured | P1 | An eval set of about 25 questions with a reported pass rate |

### 5.7 Deployment and delivery

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| X1 | Public URL, no login, no local setup | P0 | Works from a private browser window |
| X2 | No secrets in the repository | P0 | Keys only in environment variables; `.env.example` provided |
| X3 | Abuse protection on the chat endpoint | P0 | Per-IP rate limit and input length cap; provider spend limit set |
| X4 | README covering setup, architecture, AI approach, assumptions, limitations, future work, and AI tool disclosure | P0 | |
| X5 | Unit tests for the query engine and forecast | P1 | Golden values from section 6 are asserted |
| X6 | Loom walkthrough | P0 | Link viewable by anyone |

## 6. Metric definitions

These definitions are the product's single source of truth. They are proposals until signed off.

The dataset has no promised-delivery date, so lateness cannot be derived. **The `status` column is the only source of "delayed".**

| Metric | Definition | Value (all data) |
|---|---|---|
| Total orders | All rows, every status | 400 |
| Delivered orders | `status = delivered` (arrived on time) | 304 |
| Delayed orders | `status = delayed` (arrived, late) | 55 |
| On-time delivery rate | delivered / (delivered + delayed) | 304 / 359 = 84.7% |
| Delay rate | delayed / (delivered + delayed) | 55 / 359 = 15.3% |
| Average delivery time | Mean of `delivery_date - order_date` in days, over delivered and delayed orders | 3.69 days |
| Demand | Sum of `quantity` (units) | 1,310 units |
| Order value | Sum of `order_value_usd`. Gross: promo discounts are not deducted | |

**Rules that follow from these**

- **Rates use completed orders only.** In-transit (27), exception (11), and canceled (3) orders have no final outcome and are excluded from both numerator and denominator.
- **Exception orders are their own category.** They have a delivery date but are neither on-time nor delayed. They are excluded from average delivery time.
- **All time filters use `order_date`.** "Orders delivered late last month" means orders placed last month whose status is delayed.
- **Reference date is 1 January 2026**, the day after the last date in the dataset. "Last month" is December 2025; "last 3 months" is October to December 2025.
- **Relative ranges are whole calendar units.** Weeks start on Monday (ISO).
- **Demand is measured in units, not orders,** because an inventory recommendation needs units.

## 7. Data findings that shape the product

| Finding | Consequence |
|---|---|
| All 400 orders are dated in 2025; today is November 2026 | Relative dates anchor to the dataset reference date, shown on every answer |
| No SLA or promised-date column | "Delayed" comes from `status` only |
| 30 rows have no delivery date (in-transit, canceled) | Excluded from delivery-time averages, never counted as zero |
| 355 distinct SKUs across 400 rows; no SKU has more than 3 orders | SKU-level forecasting is not possible; forecast by category or total |
| 12 months of history; January has 75 orders against 18 to 46 in other months | Seasonality cannot be established; simple methods with stated uncertainty |
| Some category-months have a single order | Category forecasts are noisy; the backtest error is shown |
| Carrier sample sizes range from 9 orders (GLS) to 89 (FedEx). The highest delay rate is GLS at 28.6%, on 2 of 7 completed orders; USPS is next at 23.9%, on 11 of 46 | Rates always shown with order counts; small samples flagged; ranking answers name both the top group and the top group with at least 10 completed orders |
| `order_value_usd` equals quantity times unit price on all rows, including the 22 promo orders | Order value is labelled gross |
| Order IDs contain "2026" while order dates are 2025 | Order ID is treated as an opaque identifier |

## 8. Supported and unsupported questions

**Supported**

- One metric, optionally grouped by one dimension (time grain or a category), with filters and a date range.
- "Which X has the highest or lowest Y" as a ranked result.
- Demand forecast for all products or one category, 1 to 6 months.

**Not supported in this version** (the app says so instead of guessing)

- Two dimensions at once ("delay rate by carrier by month").
- Comparisons across two periods in one question ("this quarter vs last quarter").
- Causal "why" questions beyond a breakdown.
- Forecasts by SKU, carrier, region, or client.
- Questions about data that is not in the dataset (costs, stock on hand, lead times).

## 9. Success criteria

1. Dashboard KPIs match the values in section 6 exactly, verified by unit tests.
2. The three example questions from the brief return correct answers with a chart.
3. The routing eval passes at least 90%, with the failures understood and documented.
4. No answer contains a number that is absent from its tool result.
5. A reviewer completes a query and a forecast from a private window in under a minute.

## 10. Risks

| Risk | Mitigation |
|---|---|
| The model picks the wrong tool or arguments | Schema validation, the structured query shown on every answer, routing eval |
| The model states a number that was not computed | Headline figures render from the tool result; groundedness check on the narrative |
| Public endpoint is abused and burns credit | Per-IP rate limit, input cap, provider spend limit |
| Provider outage during review | Dashboard has no AI dependency; chat shows a clear error |
| Forecast is read as more certain than it is | Backtest error, uncertainty band, and plain-language caveat on every forecast |
| Metric definitions differ from the reviewer's expectation | Definitions are visible in the UI and argued in the README |

## 11. Milestones

| Day | Outcome |
|---|---|
| Mon 16 Nov | PRD and design agreed; data layer, query engine, unit tests |
| Tue 17 Nov | Dashboard; forecast tool with tests |
| Wed 18 Nov | Chat, explainability panel, deployed to public URL |
| Thu 19 Nov | Routing eval, README, Loom recording |
| Fri 20 Nov | Buffer; submit before 16:30 WIB |

## 12. Open questions

1. Sign-off on the definitions in section 6, in particular delivered = 304 and the on-time denominator.
2. Should "delivered late last month" filter on delivery date instead of order date? Current proposal: order date, stated on the answer.
