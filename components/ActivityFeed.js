// components/ActivityFeed.js
// ─────────────────────────────────────────────────────────────────────
// Live activity feed — right sidebar showing latest stories.
//
// Two internal tabs:
//   • Recent      — stories fetched in the last 2 days
//   • This Week   — stories fetched 3–7 days ago
//
// Each tab respects the topic filter from the parent dashboard.
// ─────────────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect } from "react";

// ── Extract publisher domain from URL ─────────────────────────────────
// e.g. "https://github.com/foo/bar" → "github.com"
function getDomain(url) {
  try {
    const { hostname } = new URL(url);
    // Strip "www." prefix for cleanliness
    return hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// ── Story list renderer ───────────────────────────────────────────────
function StoryList({ stories, isVisible }) {
  if (!stories || stories.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="font-[family-name:var(--font-mono)] text-xs text-[#4A5568]">
          // no stories found for this period
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#1E293B] max-h-[700px] overflow-y-auto">
      {[...stories].sort((a, b) => b.score - a.score).map((story, i) => {
        const publisher = getDomain(story.url);
        return (
          <a
            key={i}
            href={story.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-5 py-4 hover:bg-[#1E293B]/30 transition-all cursor-pointer group"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(8px)",
              transition: `opacity 0.3s ease ${i * 0.03}s, transform 0.3s ease ${i * 0.03}s`,
            }}
          >
            {/* Title row */}
            <div className="flex items-baseline gap-2 mb-2 flex-wrap">
              <p className="font-[family-name:var(--font-body)] text-sm text-[#CBD5E1] group-hover:text-[#F8FAFC] transition-colors leading-snug">
                {story.title}
              </p>
              {publisher && (
                <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#94A3B8] bg-[#1E293B] border border-[#334155] px-1.5 py-0.5 rounded shrink-0 group-hover:text-[#CBD5E1] group-hover:border-[#475569] transition-colors whitespace-nowrap">
                  {publisher}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault(); // Prevent navigating to the article
                  window.dispatchEvent(
                    new CustomEvent("open-news-chat", { detail: { story } })
                  );
                }}
                className="font-[family-name:var(--font-mono)] text-[10px] text-[#00D4FF] opacity-0 group-hover:opacity-100 bg-[#00D4FF]/10 hover:bg-[#00D4FF]/20 px-2 py-0.5 rounded shrink-0 transition-all border border-[#00D4FF]/20 flex items-center gap-1 ml-auto whitespace-nowrap"
              >
                <span>✨</span> Ask AI
              </button>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2.5">
              {/* Source badge */}
              <span
                className={`
                  font-[family-name:var(--font-mono)] text-[10px] font-medium px-2 py-0.5 uppercase
                  ${
                    story.source === "hackernews"
                      ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                      : "bg-[#00D4FF]/10 text-[#00D4FF]"
                  }
                `}
              >
                {story.source === "hackernews" ? "HN" : "DEV"}
              </span>

              {/* Score */}
              <span className="font-[family-name:var(--font-mono)] text-xs text-[#F59E0B] font-medium">
                ▲ {story.score}
              </span>

              {/* Time */}
              <span className="font-[family-name:var(--font-mono)] text-[11px] text-[#64748B] ml-auto">
                {story.time}
              </span>
            </div>
          </a>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export default function ActivityFeed({
  stories,
  weeklyStories = [],
  activeTab = "All",
}) {
  // "recent" = last 2 days | "week" = 3–7 days
  const [feedTab, setFeedTab] = useState("recent");
  const [isVisible, setIsVisible] = useState(false);

  // Re-trigger entrance animation when the story list or feed tab changes
  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, [stories, weeklyStories, feedTab]);

  // Reset to "recent" whenever the parent topic tab changes
  useEffect(() => {
    setFeedTab("recent");
  }, [activeTab]);

  const activeStories = feedTab === "recent" ? stories : weeklyStories;
  const hasStories = activeStories && activeStories.length > 0;

  return (
    <div className="bg-[#111827] border border-[#1E293B]">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-[#1E293B]">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: hasStories ? "#10B981" : "#64748B",
              boxShadow: hasStories ? "0 0 6px #10B981" : "none",
              animation: hasStories ? "signal-pulse 2s infinite" : "none",
            }}
          />
          <span className="font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-widest text-[#64748B]">
            {activeTab === "All" ? "Activity Feed" : `${activeTab} Stories`}
          </span>
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#4A5568] ml-auto">
            {hasStories ? `${activeStories.length} items` : "0 items"}
          </span>
        </div>

        {/* ── Internal feed tabs ──────────────────────────────────── */}
        <div className="flex items-center gap-1 mt-1">
          {[
            {
              id: "recent",
              label: "Recent",
              sublabel: "≤ 2 days",
              count: stories?.length ?? 0,
            },
            {
              id: "week",
              label: "This Week",
              sublabel: "3–7 days",
              count: weeklyStories?.length ?? 0,
            },
          ].map(({ id, label, sublabel, count }) => {
            const isActive = feedTab === id;
            return (
              <button
                key={id}
                onClick={() => setFeedTab(id)}
                className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-medium transition-all border font-[family-name:var(--font-mono)] whitespace-nowrap"
                style={{
                  borderColor: isActive ? "#00D4FF" : "#1E293B",
                  backgroundColor: isActive ? "#00D4FF15" : "transparent",
                  color: isActive ? "#00D4FF" : "#64748B",
                }}
              >
                <span>{label}</span>
                <span
                  className="opacity-60 tabular-nums"
                  style={{ color: isActive ? "#00D4FF" : "#4A5568" }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Story list ──────────────────────────────────────────────── */}
      <StoryList stories={activeStories} isVisible={isVisible} />
    </div>
  );
}
