// app/trends/page.js
// ─────────────────────────────────────────────────────────────────────
// TRENDS PAGE (/trends)
//
// - BarChart: X axis = topics, Y axis = number of stories
// - Each bar has its topic color with gradient fill
// - Ranked table of topics below the chart
// ─────────────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ── Topic color palette ──────────────────────────────────────────────
const TOPIC_COLOR_MAP = {
  AI: "#00D4FF",
  "Web Dev": "#8B5CF6",
  DevOps: "#10B981",
  Security: "#F43F5E",
  React: "#F59E0B",
  Cloud: "#F97316",
  Mobile: "#06B6D4",
  Database: "#A78BFA",
  General: "#64748B",
};

function getTopicColor(topic) {
  return TOPIC_COLOR_MAP[topic] || "#64748B";
}

// ── Custom Bar shape with gradient + glow ────────────────────────────
function GlowBar(props) {
  const { x, y, width, height, color, isHovered } = props;
  if (!height || height <= 0) return null;

  const gradId = `bar-grad-${color.replace("#", "")}`;

  return (
    <g>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={isHovered ? 1 : 0.85} />
          <stop offset="100%" stopColor={color} stopOpacity={0.3} />
        </linearGradient>
        {isHovered && (
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={`url(#${gradId})`}
        rx={3}
        ry={3}
        filter={isHovered ? "url(#glow)" : undefined}
        style={{ transition: "all 0.15s ease" }}
      />
      {/* Top accent line */}
      <rect
        x={x}
        y={y}
        width={width}
        height={2}
        fill={color}
        rx={3}
        opacity={isHovered ? 1 : 0.7}
      />
    </g>
  );
}

// ── Custom Tooltip ───────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  const color = getTopicColor(label);
  const value = payload[0]?.value ?? 0;

  return (
    <div
      style={{
        background: "#0D1424",
        border: `1px solid ${color}40`,
        borderRadius: "8px",
        padding: "10px 16px",
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${color}20`,
        minWidth: "140px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "11px",
            color: color,
            fontWeight: 600,
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
        <span
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "22px",
            color: "#F8FAFC",
            fontWeight: 700,
            letterSpacing: "-0.03em",
          }}
        >
          {value.toLocaleString()}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "10px",
            color: "#475569",
          }}
        >
          stories
        </span>
      </div>
    </div>
  );
}

// ── Custom X axis tick ───────────────────────────────────────────────
function ColoredTick({ x, y, payload }) {
  const color = getTopicColor(payload.value);
  return (
    <text
      x={x}
      y={y + 12}
      textAnchor="middle"
      fill={color}
      fontSize={11}
      fontFamily="var(--font-mono), monospace"
      fontWeight={600}
    >
      {payload.value}
    </text>
  );
}

// ── Main page ────────────────────────────────────────────────────────
export default function TrendsPage() {
  const [rankings, setRankings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredTopic, setHoveredTopic] = useState(null);

  useEffect(() => {
    async function fetchTrends() {
      try {
        const res = await fetch("/api/trends");
        const json = await res.json();
        if (json.success) {
          setRankings(json.rankings);
        }
      } catch (error) {
        console.error("Failed to fetch trends:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTrends();
  }, []);

  // Transform rankings into bar chart format: [{ topic, count }]
  const barData = rankings.map((r) => ({
    topic: r.topic,
    count: r.totalCount,
  }));

  if (isLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-12">
        <div className="skeleton-line w-1/4 mb-2" style={{ height: "28px" }} />
        <div className="skeleton-line w-1/3 mb-8" style={{ height: "12px" }} />
        <div className="skeleton-line w-full mb-8" style={{ height: "420px" }} />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton-line w-full mb-2" style={{ height: "48px" }} />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-12">
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#F8FAFC] tracking-tight">
          Topic Trends
        </h1>
        <p className="font-[family-name:var(--font-mono)] text-xs text-[#64748B] mt-1">
          // total stories per topic — all time
        </p>
      </div>

      {/* ── Bar Chart ────────────────────────────────────────────────── */}
      <div
        className="border border-[#1E293B] p-6 mb-12"
        style={{
          background: "linear-gradient(180deg, #0D1424 0%, #0A0F1E 100%)",
          borderRadius: "4px",
        }}
      >
        <div className="h-[420px]">
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 20, right: 20, left: -10, bottom: 10 }}
                barCategoryGap="30%"
                onMouseLeave={() => setHoveredTopic(null)}
              >
                <CartesianGrid
                  strokeDasharray="1 4"
                  stroke="#1E293B"
                  vertical={false}
                  strokeOpacity={0.8}
                />

                <XAxis
                  dataKey="topic"
                  tick={<ColoredTick />}
                  axisLine={{ stroke: "#1E293B" }}
                  tickLine={false}
                  dy={4}
                />

                <YAxis
                  tick={{
                    fontSize: 10,
                    fill: "#475569",
                    fontFamily: "var(--font-mono), monospace",
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
                />

                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{
                    fill: "rgba(255,255,255,0.03)",
                    radius: 4,
                  }}
                />

                <Bar
                  dataKey="count"
                  name="Stories"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={72}
                  shape={(props) => {
                    const color = getTopicColor(props.topic);
                    return (
                      <GlowBar
                        {...props}
                        color={color}
                        isHovered={hoveredTopic === props.topic}
                      />
                    );
                  }}
                  onMouseEnter={(data) => setHoveredTopic(data.topic)}
                  onMouseLeave={() => setHoveredTopic(null)}
                >
                  {barData.map((entry) => (
                    <Cell
                      key={entry.topic}
                      fill={getTopicColor(entry.topic)}
                      opacity={
                        hoveredTopic && hoveredTopic !== entry.topic ? 0.35 : 1
                      }
                      style={{ transition: "opacity 0.15s ease" }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 border border-dashed border-[#1E293B]">
              <div className="w-12 h-12 border border-[#1E293B] flex items-center justify-center opacity-40">
                <span className="text-xl">📊</span>
              </div>
              <p className="font-[family-name:var(--font-mono)] text-xs text-[#4A5568]">
                // No trend data yet — run /api/fetch-news first
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Rankings table ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[#F8FAFC] tracking-tight">
            All-Time Rankings
          </h2>
          <span className="font-[family-name:var(--font-mono)] text-xs text-[#64748B]">
            // by total story volume
          </span>
        </div>

        <div className="bg-[#111827] border border-[#1E293B]">
          <div className="grid grid-cols-[1fr_110px_110px] px-5 py-3 border-b border-[#1E293B]">
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#475569] uppercase tracking-wider">
              Topic
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#475569] uppercase tracking-wider text-right">
              Total Stories
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#475569] uppercase tracking-wider text-right">
              Avg Score
            </span>
          </div>

          {rankings.length > 0 ? (
            rankings.map((row, i) => {
              const color = getTopicColor(row.topic);
              const isTop = i === 0;
              return (
                <div
                  key={row.topic}
                  className="grid grid-cols-[1fr_110px_110px] px-5 py-3.5 border-b border-[#1E293B] last:border-b-0 hover:bg-[#1E293B]/40 transition-colors group"
                  style={{
                    borderLeft: isTop
                      ? `3px solid ${color}`
                      : "3px solid transparent",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-[family-name:var(--font-mono)] text-xs text-[#334155] w-5 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: color,
                        boxShadow: `0 0 8px ${color}60`,
                        flexShrink: 0,
                      }}
                    />
                    <span className="font-[family-name:var(--font-display)] text-sm font-medium text-[#CBD5E1] group-hover:text-[#F8FAFC] transition-colors">
                      {row.topic}
                    </span>
                  </div>
                  <span className="font-[family-name:var(--font-mono)] text-sm text-[#94A3B8] text-right tabular-nums">
                    {row.totalCount.toLocaleString()}
                  </span>
                  <span
                    className="font-[family-name:var(--font-mono)] text-sm text-right tabular-nums font-medium"
                    style={{ color }}
                  >
                    ▲ {row.avgScore}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="font-[family-name:var(--font-mono)] text-xs text-[#4A5568]">
                // No ranking data yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
