// components/Sparkline.js
// ─────────────────────────────────────────────────────────────────────
// Extracted Recharts sparkline component.
// Loaded via dynamic import (ssr: false) to avoid hydration warnings.
// ─────────────────────────────────────────────────────────────────────

"use client";

import { LineChart, Line } from "recharts";

export default function Sparkline({ data, color = "#64748B" }) {
  if (!data || data.length === 0) return null;

  return (
    <LineChart width={64} height={20} data={data}>
      <Line
        type="monotone"
        dataKey="v"
        stroke={color}
        strokeWidth={1.5}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  );
}
