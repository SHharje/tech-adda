// app/subscribe/page.js
// ─────────────────────────────────────────────────────────────────────
// SUBSCRIBE PAGE (/subscribe)
//
// Minimal, centered layout:
//   - Headline: "Pick your signal."
//   - Topic toggle cards (grid, not checkboxes)
//   - Terminal-style email input
//   - Full-width submit button
//
// Will connect to: /api/subscribe (POST)
// Currently: mock form with no backend connection
// ─────────────────────────────────────────────────────────────────────

"use client";

import { useState } from "react";

const TOPICS = [
  { key: "AI", count: 27, color: "#00D4FF" },
  { key: "Web Dev", count: 18, color: "#8B5CF6" },
  { key: "DevOps", count: 12, color: "#10B981" },
  { key: "Security", count: 9, color: "#F43F5E" },
  { key: "React", count: 7, color: "#F59E0B" },
  { key: "Cloud", count: 6, color: "#F97316" },
  { key: "Mobile", count: 4, color: "#06B6D4" },
  { key: "Database", count: 5, color: "#A78BFA" },
];

export default function SubscribePage() {
  const [selectedTopics, setSelectedTopics] = useState(new Set());
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null); // null | "success" | "error"

  function toggleTopic(key) {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (selectedTopics.size === 0 || !email) return;

    // TODO: connect to /api/subscribe
    // For now, simulate success
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          topics: Array.from(selectedTopics),
        }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
        setSelectedTopics(new Set());
      } else {
        setStatus("error");
      }
    } catch {
      // If API doesn't exist yet, show success anyway for demo
      setStatus("success");
      setEmail("");
      setSelectedTopics(new Set());
    }
  }

  return (
    <div className="max-w-[560px] mx-auto px-6 md:px-12 py-20">
      {/* Headline */}
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[#F8FAFC] tracking-tight mb-2">
        Pick your signal.
      </h1>
      <p className="font-[family-name:var(--font-mono)] text-xs text-[#64748B] mb-10">
        // select topics → get a weekly digest every Friday
      </p>

      {/* Success state */}
      {status === "success" && (
        <div className="border border-[#10B981] bg-[#10B981]/10 px-4 py-3 mb-8">
          <p className="font-[family-name:var(--font-mono)] text-sm text-[#10B981]">
            ✓ Subscribed. You'll receive your first digest on Friday.
          </p>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="border border-[#F43F5E] bg-[#F43F5E]/10 px-4 py-3 mb-8">
          <p className="font-[family-name:var(--font-mono)] text-sm text-[#F43F5E]">
            ✗ Something went wrong. Please try again.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Topic selector grid */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          {TOPICS.map(({ key, count, color }) => {
            const isSelected = selectedTopics.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleTopic(key)}
                className="text-left px-4 py-3 border transition-all"
                style={{
                  borderColor: isSelected ? color : "#1E293B",
                  backgroundColor: isSelected ? `${color}10` : "#111827",
                }}
              >
                <span
                  className="font-[family-name:var(--font-display)] text-sm font-bold block"
                  style={{ color: isSelected ? color : "#CBD5E1" }}
                >
                  {key}
                </span>
                <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#64748B]">
                  {count} stories this week
                </span>
              </button>
            );
          })}
        </div>

        {/* Email input — terminal style */}
        <div className="mb-4">
          <label className="font-[family-name:var(--font-mono)] text-[10px] text-[#64748B] uppercase tracking-wider block mb-2">
            Email
          </label>
          <div className="flex items-center bg-[#111827] border border-[#1E293B] focus-within:border-[#00D4FF] transition-colors">
            <span className="font-[family-name:var(--font-mono)] text-sm text-[#64748B] pl-3 select-none">
              &gt;
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-transparent font-[family-name:var(--font-mono)] text-sm text-[#F8FAFC] px-2 py-3 outline-none placeholder-[#334155]"
            />
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={selectedTopics.size === 0 || !email}
          className="w-full py-3 bg-[#00D4FF] text-[#0A0F1E] font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wider transition-all hover:bg-[#00BFEA] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Subscribe →
        </button>

        {/* Helper text */}
        <p className="font-[family-name:var(--font-mono)] text-[10px] text-[#64748B] mt-3 text-center">
          {selectedTopics.size === 0
            ? "// select at least one topic"
            : `// ${selectedTopics.size} topic${selectedTopics.size > 1 ? "s" : ""} selected`}
        </p>
      </form>
    </div>
  );
}
