// components/TopicClusterCard.js
// ─────────────────────────────────────────────────────────────────────
// A single topic cluster card showing:
//   - Topic label with colored left-border
//   - AI summary (2-3 sentences)
//   - Top 3 story headlines as links
//   - Engagement score
//   - Mini sparkline (7-day volume) — lazy-loaded to avoid SSR issues
//
// Sharp borders, no shadows, no rounded corners.
// ─────────────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// ── Lazy-load Recharts to avoid SSR hydration warnings ───────────────
// ResponsiveContainer relies on DOM measurements which don't exist
// during server-side rendering. Using dynamic import with ssr: false
// ensures Recharts only loads on the client.
const LazySparkline = dynamic(() => import("./Sparkline"), {
  ssr: false,
  loading: () => (
    <div className="w-16 h-5 bg-[#1E293B]" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
  ),
});

const TOPIC_BORDER_COLORS = {
  AI: "#00D4FF",
  React: "#F59E0B",
  DevOps: "#10B981",
  "Web Dev": "#8B5CF6",
  Security: "#F43F5E",
  Cloud: "#F97316",
  Mobile: "#06B6D4",
  Database: "#A78BFA",
  General: "#64748B",
};

export default function TopicClusterCard({ cluster }) {
  const borderColor = TOPIC_BORDER_COLORS[cluster.topic] || "#64748B";
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="bg-[#111827] border border-[#1E293B] border-l-[3px] p-5 transition-all duration-200 group cursor-default"
      style={{
        borderLeftColor: borderColor,
        borderColor: isHovered ? `${borderColor}60` : undefined,
        borderLeftColor: borderColor,
        transform: isHovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: isHovered ? `0 4px 20px ${borderColor}10` : "none",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header row: topic + sparkline + score */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3
            className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wider"
            style={{ color: borderColor }}
          >
            {cluster.topic}
          </h3>
          <span className="font-[family-name:var(--font-mono)] text-[11px] text-[#64748B]">
            {cluster.storyCount} {cluster.storyCount === 1 ? "story" : "stories"}
          </span>
        </div>

        {/* Mini sparkline + score */}
        <div className="flex items-center gap-3">
          <div className="w-16 h-5">
            {cluster.sparkline && cluster.sparkline.length > 0 ? (
              <LazySparkline data={cluster.sparkline} color={borderColor} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-full h-[1px] bg-[#1E293B]" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="font-[family-name:var(--font-mono)] text-xs text-[#F59E0B] font-medium">
              ▲ {cluster.engagementScore}
            </span>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <p className="font-[family-name:var(--font-body)] text-sm text-[#CBD5E1] leading-relaxed mb-4">
        {cluster.aiSummary}
      </p>

      {/* Top 3 headlines */}
      <div className="flex flex-col gap-1.5">
        {cluster.topStories && cluster.topStories.slice(0, 3).map((story, i) => (
          <a
            key={i}
            href={story.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 text-xs group/link"
          >
            <span className="font-[family-name:var(--font-mono)] text-[#64748B] shrink-0 mt-px">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="font-[family-name:var(--font-body)] text-[#CBD5E1] group-hover/link:text-[#F8FAFC] transition-colors leading-tight">
              {story.title}
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#64748B] shrink-0 mt-px">
              {story.source === "hackernews" ? "HN" : "DEV"}
            </span>
          </a>
        ))}
        {(!cluster.topStories || cluster.topStories.length === 0) && (
          <span className="font-[family-name:var(--font-mono)] text-[11px] text-[#4A5568]">
            // no stories available
          </span>
        )}
      </div>

      {/* Timestamp */}
      <div className="mt-3 pt-3 border-t border-[#1E293B]">
        <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#64748B]">
          {cluster.timeAgo}
        </span>
      </div>
    </div>
  );
}
