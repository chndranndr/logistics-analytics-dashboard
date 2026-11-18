"use client";

import {
  Clock,
  Gauge,
  Minus,
  Package,
  PackageCheck,
  Timer,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Card } from "@/components/ui/Card";
import { METRICS, type MetricId } from "@/lib/domain/metrics";

export type KpiItem = {
  id: MetricId;
  value: number | null;
  n: number;
  spark: (number | null)[];
  previous: { value: number | null; n: number } | null;
};

const ICONS: Partial<Record<MetricId, LucideIcon>> = {
  order_count: Package,
  delivered_count: PackageCheck,
  delayed_count: Clock,
  on_time_rate: Gauge,
  avg_delivery_days: Timer,
};

const formatCount = (v: number) => v.toLocaleString("en-US");
const formatPercent = (v: number) => `${v.toFixed(1)}%`;
const formatDays = (v: number) => `${v.toFixed(2)} days`;

const FORMATS: Partial<Record<MetricId, (v: number) => string>> = {
  on_time_rate: formatPercent,
  avg_delivery_days: formatDays,
};

type Delta = {
  text: string;
  direction: "up" | "down" | "flat";
  tone: "good" | "bad" | "neutral";
};

function sign(v: number): string {
  return v > 0 ? "+" : "";
}

function computeDelta(item: KpiItem): Delta | null {
  const prev = item.previous;
  if (!prev || prev.n === 0 || prev.value === null || item.value === null) {
    return null;
  }
  const diff = item.value - prev.value;
  let text: string;
  if (item.id === "on_time_rate") {
    text = `${sign(diff)}${diff.toFixed(1)} pp`;
  } else if (item.id === "avg_delivery_days") {
    text = `${sign(diff)}${diff.toFixed(1)} d`;
  } else {
    if (prev.value === 0) return null;
    text = `${sign(diff)}${Math.round((diff / prev.value) * 100)}%`;
  }

  const direction = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  const higherIsBetter = METRICS[item.id].higherIsBetter;
  let tone: Delta["tone"] = "neutral";
  if (higherIsBetter !== null && direction !== "flat") {
    const improved = (direction === "up") === higherIsBetter;
    tone = improved ? "good" : "bad";
  }
  return { text, direction, tone };
}

const TONE_CLASS: Record<Delta["tone"], string> = {
  good: "text-good",
  bad: "text-bad",
  neutral: "text-muted",
};

const DIRECTION_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

export function KpiCards({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item, index) => {
        const meta = METRICS[item.id];
        const Icon = ICONS[item.id];
        const delta = computeDelta(item);
        const DeltaIcon = delta ? DIRECTION_ICON[delta.direction] : null;
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <Card className="flex h-full flex-col gap-3">
              <div className="flex items-center gap-2">
                {Icon && (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                )}
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  {meta.label}
                </p>
              </div>

              <div>
                <p className="text-2xl font-semibold tabular-nums text-text">
                  <AnimatedNumber
                    value={item.value}
                    format={FORMATS[item.id] ?? formatCount}
                  />
                </p>
                {delta && DeltaIcon && (
                  <p
                    className={`mt-1 flex items-center gap-1 text-xs font-medium ${TONE_CLASS[delta.tone]}`}
                    title="vs previous period of the same length"
                  >
                    <DeltaIcon className="size-3.5" aria-hidden="true" />
                    {delta.text}
                  </p>
                )}
              </div>

              <div className="h-9 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={item.spark.map((v, i) => ({ i, v }))}
                    margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
                  >
                    <Area
                      dataKey="v"
                      type="monotone"
                      stroke="var(--chart-1)"
                      fill="var(--chart-1)"
                      fillOpacity={0.15}
                      strokeWidth={1.5}
                      dot={false}
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <p className="text-xs text-muted">{meta.definition}</p>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
