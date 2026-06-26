// components/DashboardClient.js
// ─────────────────────────────────────────────────────────────────────
// Interactive dashboard client component.
//
// Features:
//   - Fetches data from /api/dashboard on mount
//   - Topic tabs: "All" + per-topic filters for cluster cards
//   - Animated loading skeleton
//   - Smooth fade-in transitions when switching tabs
//   - Responsive 2-column layout: clusters (left) + activity feed (right)
// ─────────────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect } from "react";
import SignalBar from "@/components/SignalBar";
import TopicClusterCard from "@/components/TopicClusterCard";
import ActivityFeed from "@/components/ActivityFeed";

// ── Topic color palette ──────────────────────────────────────────────
const TOPIC_COLORS = {
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

// ── Loading skeleton ─────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div>
      {/* Signal bar skeleton */}
      <div className="border-b border-[#1E293B] bg-[#111827]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-[#1E293B] rounded-full" />
            <div className="skeleton-line w-20" />
          </div>
          <div className="flex flex-col gap-2">
            {[80, 60, 45, 30, 20].map((w, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton-line w-20 shrink-0" style={{ height: "12px" }} />
                <div className="flex-1 h-6 bg-[#0A0F1E] rounded" style={{ position: "relative" }}>
                  <div
                    className="h-full bg-[#1E293B] rounded"
                    style={{
                      width: `${w}%`,
                      animation: `skeleton-pulse 1.5s ease-in-out infinite`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-12">
        {/* Tabs skeleton */}
        <div className="flex items-center gap-2 mb-6">
          {[48, 32, 40, 44, 36, 38].map((w, i) => (
            <div
              key={i}
              className="h-8 bg-[#1E293B] rounded"
              style={{
                width: `${w}px`,
                animation: `skeleton-pulse 1.5s ease-in-out infinite`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          {/* Cluster cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-[#111827] border border-[#1E293B] border-l-[3px] p-5"
                style={{
                  borderLeftColor: "#1E293B",
                  animation: `skeleton-pulse 1.5s ease-in-out infinite`,
                  animationDelay: `${i * 0.15}s`,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="skeleton-line w-24" style={{ height: "14px" }} />
                  <div className="skeleton-line w-16" style={{ height: "14px" }} />
                </div>
                <div className="skeleton-line w-full mb-2" style={{ height: "10px" }} />
                <div className="skeleton-line w-3/4 mb-4" style={{ height: "10px" }} />
                <div className="flex flex-col gap-2">
                  <div className="skeleton-line w-full" style={{ height: "8px" }} />
                  <div className="skeleton-line w-5/6" style={{ height: "8px" }} />
                  <div className="skeleton-line w-4/6" style={{ height: "8px" }} />
                </div>
              </div>
            ))}
          </div>

          {/* Activity feed skeleton */}
          <div className="bg-[#111827] border border-[#1E293B]">
            <div className="px-4 py-3 border-b border-[#1E293B]">
              <div className="skeleton-line w-24" style={{ height: "12px" }} />
            </div>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="px-4 py-3 border-b border-[#1E293B] last:border-b-0">
                <div
                  className="skeleton-line w-full mb-2"
                  style={{
                    height: "10px",
                    animationDelay: `${i * 0.08}s`,
                  }}
                />
                <div className="flex items-center gap-2">
                  <div className="skeleton-line w-8" style={{ height: "8px" }} />
                  <div className="skeleton-line w-12" style={{ height: "8px" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Error state ──────────────────────────────────────────────────────
function DashboardError({ onRetry }) {
  return (
    <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-20 text-center">
      <div className="inline-block border border-[#F43F5E] bg-[#F43F5E]/5 px-8 py-6">
        <p className="font-[family-name:var(--font-mono)] text-sm text-[#F43F5E] mb-1">
          ✗ Failed to load dashboard data
        </p>
        <p className="font-[family-name:var(--font-mono)] text-xs text-[#64748B] mb-4">
          // check console for details
        </p>
        <button
          onClick={onRetry}
          className="px-4 py-2 text-xs font-medium border border-[#1E293B] text-[#CBD5E1] hover:border-[#00D4FF] hover:text-[#00D4FF] transition-all font-[family-name:var(--font-mono)]"
        >
          retry →
        </button>
      </div>
    </div>
  );
}

// ── Main dashboard component ─────────────────────────────────────────
export default function DashboardClient() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const [tabTransition, setTabTransition] = useState(false);

  async function fetchDashboard() {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setHasError(true);
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboard();
  }, []);

  // ── Tab switch with animation ──────────────────────────────────────
  function handleTabSwitch(topic) {
    if (topic === activeTab) return;
    setTabTransition(true);
    setTimeout(() => {
      setActiveTab(topic);
      setTabTransition(false);
    }, 150);
  }

  // ── Loading state ──────────────────────────────────────────────────
  if (isLoading) return <DashboardSkeleton />;
  if (hasError) return <DashboardError onRetry={fetchDashboard} />;
  if (!data) return null;

  // ── Filter clusters by active tab ──────────────────────────────────
  const filteredClusters =
    activeTab === "All"
      ? data.clusters
      : data.clusters.filter((c) => c.topic === activeTab);

  // ── Filter stories by active tab ────────────────────────────────────────
  const filteredStories =
    activeTab === "All"
      ? data.recentStories
      : data.recentStories.filter((s) => s.topic === activeTab);

  const filteredWeeklyStories =
    activeTab === "All"
      ? (data.weeklyStories || [])
      : (data.weeklyStories || []).filter((s) => s.topic === activeTab);

  // Build tab list: "All" + every topic from Story table
  const tabs = ["All", ...(data.topics || [])];

  return (
    <div>
      {/* Signal Bar */}
      <SignalBar signals={data.signals.length > 0 ? data.signals : undefined} />

      {/* Main content */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-12">
        {/* ── Topic Tabs ──────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            const color = tab === "All" ? "#00D4FF" : TOPIC_COLORS[tab] || "#64748B";
            const count =
              tab === "All"
                ? data.recentStories.length
                : (data.topicCounts && data.topicCounts[tab]) || 0;

            return (
              <button
                key={tab}
                onClick={() => handleTabSwitch(tab)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all border whitespace-nowrap font-[family-name:var(--font-mono)]"
                style={{
                  borderColor: isActive ? color : "#1E293B",
                  backgroundColor: isActive ? `${color}15` : "transparent",
                  color: isActive ? color : "#64748B",
                }}
              >
                <span>{tab}</span>
                <span
                  className="text-[10px] opacity-60 tabular-nums"
                  style={{ color: isActive ? color : "#4A5568" }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── 2-column layout: clusters sidebar + activity feed main ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8">
          {/* Left sidebar: Cluster Cards (single column) */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="font-[family-name:var(--font-display)] text-lg font-bold text-[#F8FAFC] tracking-tight">
                Topic Clusters
              </span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-[#64748B]">
                // AI summaries
              </span>
            </div>

            <div
              className="flex flex-col gap-4 transition-opacity duration-150"
              style={{ opacity: tabTransition ? 0 : 1 }}
            >
              {filteredClusters.length > 0 ? (
                filteredClusters.map((cluster, i) => (
                  <div
                    key={cluster.topic}
                    className="dashboard-card-enter"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <TopicClusterCard cluster={cluster} />
                  </div>
                ))
              ) : (
                <div className="py-12 text-center border border-[#1E293B] border-dashed">
                  <p className="font-[family-name:var(--font-mono)] text-sm text-[#64748B]">
                    {activeTab === "All"
                      ? "// Waiting for first cron run to generate clusters..."
                      : `// No AI summary for "${activeTab}" yet — stories shown in feed →`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right main area: Activity Feed */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <ActivityFeed
              stories={filteredStories.length > 0 ? filteredStories : undefined}
              weeklyStories={filteredWeeklyStories}
              activeTab={activeTab}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
