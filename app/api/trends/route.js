// app/api/trends/route.js
// ─────────────────────────────────────────────────────────────────────
// TRENDS API — returns the last 30 days of TopicStat data.
//
// Response shape (designed for easy Recharts consumption):
// {
//   topics: ["AI", "React", "DevOps", ...],
//   data: [
//     { date: "6/1", AI: 12, React: 5, DevOps: 8, ... },
//     { date: "6/2", AI: 15, React: 7, DevOps: 6, ... },
//     ...
//   ]
// }
//
// Each object in `data` has the date as a label and one key per topic
// with the story count for that day.  Missing days default to 0.
// ─────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // ── Query the last 30 days of TopicStat rows ───────────────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const stats = await prisma.topicStat.findMany({
      where: {
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: "asc" },
    });

    // ── Collect all unique topics ──────────────────────────────────
    const topicsSet = new Set();
    for (const stat of stats) {
      topicsSet.add(stat.topic);
    }
    const topics = Array.from(topicsSet).sort();

    // ── Build date → { topic: count } map ─────────────────────────
    // We need one object per date with all topic counts as keys.
    const dateMap = {};

    for (const stat of stats) {
      // Format date as "M/D" for chart labels
      const d = new Date(stat.date);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;

      if (!dateMap[label]) {
        dateMap[label] = { date: label };
        // Initialize all topics to 0 for this date
        for (const t of topics) {
          dateMap[label][t] = 0;
        }
      }

      dateMap[label][stat.topic] = stat.storyCount;
    }

    // Convert map to sorted array
    const data = Object.values(dateMap);

    // ── Also return topic rankings for the table ──────────────────
    // Sum up each topic's total story count this month
    const rankings = topics.map((topic) => {
      const topicStats = stats.filter((s) => s.topic === topic);
      const totalCount = topicStats.reduce((sum, s) => sum + s.storyCount, 0);
      const avgScore = topicStats.length > 0
        ? Math.round(
            topicStats.reduce((sum, s) => sum + s.avgScore, 0) / topicStats.length
          )
        : 0;

      return { topic, totalCount, avgScore };
    });

    // Sort by total count descending
    rankings.sort((a, b) => b.totalCount - a.totalCount);

    return NextResponse.json({
      success: true,
      topics,
      data,
      rankings,
    });
  } catch (error) {
    console.error("Trends API error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
