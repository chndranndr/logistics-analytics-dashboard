# Loom Walkthrough Script (~5 min)

Goal: show the grader (a) it works, (b) the AI is only a router, (c) numbers are correct, (d) you made deliberate trade-offs.
Tip: say it in your own words. Bold = what to show on screen. Numbers come from `docs/IMPLEMENTATION_PLAN.md` section 3.

Before recording: open the live URL (or `npm run dev`) in a clean window, light theme, no filters, chat empty. Have the README open in a second tab.

---

## 1. Intro (0:00 – 0:25)

**On screen: dashboard, top of page.**

> Hi, this is my AI-powered logistics analytics dashboard. It covers the three levels from the brief: a descriptive dashboard, natural-language questions answered from the data, and a demand forecast with an inventory recommendation. I'll show the product first, then how it's built, then the trade-offs.

## 2. Dashboard (0:25 – 1:30)

**On screen: KPI cards, then charts.**

> One dataset, 400 orders for 2025, loaded into memory from the CSV. The five KPIs are total orders 400, delivered 304, delayed 55, on-time rate 84.7%, and average delivery 3.69 days.
>
> A definition worth noting: the dataset has no promised delivery date, so `status` is the only source of "delayed". On-time and delay rates use completed orders only, delivered plus delayed. In-transit, exception and canceled are excluded from the denominator.

**Click the FedEx bar in the carrier chart.**

> Charts are interactive. Clicking a carrier applies it as a filter to the whole dashboard. Filters live in the URL, so any view is shareable. Total orders now shows 89.

**Click the view switcher: Table, then Chart + Table.**

> A view switcher shows the charts, the raw orders table, or both. The table follows the same filters, so FedEx shows exactly those 89 rows, and you can sort any column. It also shows what columns exist, which helps decide what to ask the AI.

**Remove chip, click a month in the volume chart, point at sparkline and change-vs-previous-period.**

> Same for months. KPI cards show a sparkline and a change against the previous period of the same length.

**Point at "Needs attention".**

> This panel is computed by code, not the model: highest delay-rate carrier and lowest on-time region among groups with at least 10 completed orders, so tiny samples like GLS with 7 orders don't win by accident.

## 3. Natural-language queries (1:30 – 3:00)

**On screen: chat panel. Ask each, pausing on the answer.**

1. **"Which carrier has the highest delay rate?"**
   > GLS is 28.6% but has only 7 orders, so the ranking note says so, and USPS at 23.9% over 46 orders is the meaningful answer. Small samples are flagged, not hidden.
2. **"Show delayed orders by week for the last 3 months"**
   > The model picked a week grain, a relative date range, and the system chose a line or bar chart by rule.
3. **Open "How this was answered".**
   > This is the explainability requirement: filters, metric, dimension, the structured spec the model filled in, and the underlying table. "Last 3 months" resolves against a fixed reference date, 2026-01-01, not the system clock, so results are reproducible.
4. **"How many fedex orders were delayed?"** (lowercase on purpose)
   > Filter values are normalized case-insensitively, so this maps to FedEx.
5. **"What is the weather in London?"**
   > Out-of-scope questions are refused without calling any tool.

## 4. Forecast (3:00 – 3:50)

**Ask: "How much inventory should I plan for the next 4 months?"**

> The model calls the forecast tool. Code backtests two simple methods, a 3-month moving average and a linear trend, holding out Oct to Dec, and picks the lower error. Moving average wins here, 15.67 MAE versus 37.19.
>
> Result: about 95 units a month, expected demand 380, safety stock 59, recommended 439 units. The chart shows history, forecast and an uncertainty band, and the methodology is explained under the answer.

**Ask: "Based on the last 10 months, forecast the next 3 months."**

> The model can also set the history window and backtest length, and the engine rejects windows that leave fewer than 3 months to learn from.

> Honest limit: 12 points means no seasonality, and I don't have stock-on-hand or lead times, so "recommended" is units to have available, not a reorder point.

## 5. Architecture and AI approach (3:50 – 4:35)

**On screen: README architecture section or a simple diagram.**

> The key principle from the brief: AI routes, code computes. The model only chooses between two tools, `query` and `forecast`, and fills a Zod-validated spec. No SQL, no raw model output touches the data.
>
> Flow: question, rate limit and length check, model picks a tool, engine computes, then a groundedness check verifies every number in the narrative against the tool output. If it fails, I replace the text with a deterministic fallback. The dashboard and the chat call the same engines, and metric definitions live in one file, so they can't disagree.

## 6. Quality and trade-offs (4:35 – 5:15)

**On screen: terminal with `npm test`, then `evals/routing.jsonl`.**

> 41 unit tests assert the golden values, and a 32-case routing eval covers queries, dates, filters, forecasts and refusals. Latest run was 32 of 32. An earlier run scored 31, so the model isn't deterministic, and I say that in the README.
>
> Trade-offs: in-memory data instead of a database, no agent framework because the flow is linear, no streaming, no multi-turn memory, and the rate limiter is per instance. Next I'd back the spec with DuckDB or Postgres and add period comparisons.

## 7. Close (5:15 – 5:30)

> The code, README with setup, assumptions, limitations and AI-tool disclosure are in the repo. Thanks for watching.

---

## Checklist

- [ ] Live URL works in a private window (README still says "Pending Vercel deployment"; update before sending)
- [ ] Loom link set to "anyone with the link" (PRD X6)
- [ ] Run each demo question once beforehand to confirm answers match the numbers above
- [ ] Keep it under ~5:30; cut section 5 or the second forecast question if running long
