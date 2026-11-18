"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";

export function AnimatedNumber({
  value,
  format,
}: {
  value: number | null;
  format: (v: number) => string;
}) {
  const mv = useMotionValue(value ?? 0);
  const text = useTransform(mv, format);

  useEffect(() => {
    if (value === null) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const controls = animate(mv, value, { duration: reduce ? 0 : 0.6 });
    return () => controls.stop();
  }, [value, mv]);

  if (value === null) return <span>n/a</span>;
  return <motion.span>{text}</motion.span>;
}
