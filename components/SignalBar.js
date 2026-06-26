// components/SignalBar.js
// ─────────────────────────────────────────────────────────────────────
// The "live signal bar" — a horizontal strip showing the top 5 trending
// topics as animated pill-shaped bars.  Width is proportional to story
// volume.  Feels like a network activity meter.
//
// Receives real data from DashboardClient via /api/dashboard.
// Falls back to a minimal placeholder if no data is available.
// ─────────────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect } from "react";

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

export default function SignalBar({ signals }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Staggered entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // If no signals at all, show a minimal "awaiting data" state
  if (!signals || signals.length === 0) {
    return (
      <div className="border-b border-[#1E293B] bg-[#111827]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#64748B] rounded-full" />
            <span className="font-[family-name:var(--font-mono)] text-xs text-[#64748B] uppercase tracking-widest">
              Signal — awaiting data
            </span>
          </div>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...signals.map((s) => s.count));

  return (
    <div className="border-b border-[#1E293B] bg-[#111827]">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-4">
        {/* Label */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-[#00D4FF] rounded-full signal-pulse" />
          <span className="font-[family-name:var(--font-mono)] text-xs text-[#64748B] uppercase tracking-widest">
            Live Signal
          </span>
        </div>

        {/* Signal Bars */}
        <div className="flex flex-col gap-2">
          {signals.map((signal, index) => {
            const widthPercent = (signal.count / maxCount) * 100;
            const color = TOPIC_COLORS[signal.topic] || "#64748B";

            return (
              <div
                key={signal.topic}
                className="flex items-center gap-3"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? "translateX(0)" : "translateX(-12px)",
                  transition: `opacity 0.4s ease ${index * 0.08}s, transform 0.4s ease ${index * 0.08}s`,
                }}
              >
                {/* Topic name */}
                <span className="font-[family-name:var(--font-mono)] text-xs text-[#64748B] w-20 shrink-0 text-right">
                  {signal.topic}
                </span>

                {/* Bar container */}
                <div
                  className="flex-1 h-6 bg-[#0A0F1E] relative overflow-hidden"
                  style={{ borderRadius: "4px" }}
                >
                  <div
                    className="h-full signal-bar-fill flex items-center justify-end pr-2"
                    style={{
                      "--signal-width": `${widthPercent}%`,
                      backgroundColor: color,
                      opacity: 0.85,
                      borderRadius: "4px",
                      animationDelay: `${index * 0.1}s`,
                    }}
                  >
                    <span className="font-[family-name:var(--font-mono)] text-[10px] font-medium text-[#0A0F1E]">
                      {signal.count}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
