// app/api/dashboard/route.js
// ─────────────────────────────────────────────────────────────────────
// DASHBOARD API — returns all data needed for the homepage.
//
// Returns: { signals, clusters, recentStories, topics, topicCounts }
//
// Smart fallbacks:
//   - Signals: today's TopicStat → most recent TopicStat → Story counts
//   - Clusters: latest Cluster + real story counts from DB
//   - Activity: ALL recent stories (client filters by topic tab)
// ─────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";

// ── Helper: Format relative time ─────────────────────────────────────
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 0) return "just now";
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return Math.floor(seconds) + "s ago";
}

export async function GET() {
  try {
    // withRetry wraps ALL Prisma calls in this handler.
    // If Neon's control plane returns a transient HTTP 500
    // (DriverAdapterError / XX000), the entire block is retried
    // with exponential backoff (up to 4 attempts, max 5s wait).
    return await withRetry(async () => {
    // ════════════════════════════════════════════════════════════════
    // 1. SIGNALS — top topics with story counts
    // ════════════════════════════════════════════════════════════════

    let signals = [];

    // Attempt A: Today's TopicStat
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await prisma.topicStat.findMany({
      where: { date: today },
      orderBy: { storyCount: "desc" },
      take: 5,
    });

    if (todayStats.length > 0) {
      signals = todayStats.map((s) => ({
        topic: s.topic,
        count: s.storyCount,
      }));
    } else {
      // Attempt B: Most recent TopicStat date available
      const latestStat = await prisma.topicStat.findFirst({
        orderBy: { date: "desc" },
      });

      if (latestStat) {
        const latestDate = new Date(latestStat.date);
        latestDate.setHours(0, 0, 0, 0);

        const latestStats = await prisma.topicStat.findMany({
          where: { date: latestDate },
          orderBy: { storyCount: "desc" },
          take: 5,
        });

        signals = latestStats.map((s) => ({
          topic: s.topic,
          count: s.storyCount,
        }));
      } else {
        // Attempt C: Aggregate from Story table (last 24h)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentStories = await prisma.story.findMany({
          where: { fetchedAt: { gte: yesterday } },
        });

        const topicCounts = {};
        for (const story of recentStories) {
          topicCounts[story.topic] = (topicCounts[story.topic] || 0) + 1;
        }

        signals = Object.entries(topicCounts)
          .map(([topic, count]) => ({ topic, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 2. CLUSTERS — AI summaries + real story data
    // ════════════════════════════════════════════════════════════════

    // Get latest cluster per topic
    const recentClusters = await prisma.cluster.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const uniqueClusters = [];
    const seenTopics = new Set();
    for (const c of recentClusters) {
      if (!seenTopics.has(c.topic)) {
        seenTopics.add(c.topic);
        uniqueClusters.push(c);
      }
    }

    const displayClusters = uniqueClusters.slice(0, 8);

    // 7-day window for sparklines
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const enrichedClusters = await Promise.all(
      displayClusters.map(async (c) => {
        // Top 3 stories for this topic — try last 24h first, fall back to any recent
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        let topStories = await prisma.story.findMany({
          where: {
            topic: c.topic,
            fetchedAt: { gte: yesterday },
          },
          orderBy: { score: "desc" },
          take: 3,
        });

        // Fallback: if no stories in last 24h, get the most recent ones
        if (topStories.length === 0) {
          topStories = await prisma.story.findMany({
            where: { topic: c.topic },
            orderBy: { score: "desc" },
            take: 3,
          });
        }

        // Total story count for this topic (all time or last 7 days)
        const storyCount = await prisma.story.count({
          where: {
            topic: c.topic,
            fetchedAt: { gte: sevenDaysAgo },
          },
        });

        // Average score for this topic (last 7 days)
        const scoreAgg = await prisma.story.aggregate({
          where: {
            topic: c.topic,
            fetchedAt: { gte: sevenDaysAgo },
          },
          _avg: { score: true },
        });

        // 7-day sparkline from TopicStat
        const stats = await prisma.topicStat.findMany({
          where: {
            topic: c.topic,
            date: { gte: sevenDaysAgo },
          },
          orderBy: { date: "asc" },
        });

        const sparkline = stats.map((s) => ({ v: s.storyCount }));

        // If no TopicStat data, generate sparkline from stories
        if (sparkline.length === 0) {
          // Create a simple 7-point sparkline from story distribution
          for (let i = 6; i >= 0; i--) {
            const dayStart = new Date();
            dayStart.setDate(dayStart.getDate() - i);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);

            const count = await prisma.story.count({
              where: {
                topic: c.topic,
                fetchedAt: { gte: dayStart, lt: dayEnd },
              },
            });
            sparkline.push({ v: count });
          }
        }

        return {
          topic: c.topic,
          storyCount: storyCount || topStories.length,
          engagementScore: Math.round(scoreAgg._avg?.score || 0),
          aiSummary: c.aiSummary,
          topStories: topStories.map((s) => ({
            title: s.title,
            url: s.url,
            source: s.source,
            score: s.score,
          })),
          sparkline,
          timeAgo: "updated " + formatTimeAgo(c.createdAt),
        };
      })
    );

    // ════════════════════════════════════════════════════════════════
    // 3. ACTIVITY FEED — split into "Recent" (≤2 days) and "This Week" (3–7 days)
    // ════════════════════════════════════════════════════════════════

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const sevenDaysAgoFeed = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Stories from the last 2 days ("Recent" tab)
    const rawRecentStories = await prisma.story.findMany({
      where: { fetchedAt: { gte: twoDaysAgo } },
      orderBy: { fetchedAt: "desc" },
      take: 500,
    });

    // Stories from 3–7 days ago ("This Week" tab)
    const rawWeeklyStories = await prisma.story.findMany({
      where: {
        fetchedAt: {
          gte: sevenDaysAgoFeed,
          lt: twoDaysAgo,
        },
      },
      orderBy: { fetchedAt: "desc" },
      take: 500,
    });

    const mapStory = (s) => ({
      title: s.title,
      url: s.url,
      source: s.source,
      score: s.score,
      topic: s.topic,
      time: formatTimeAgo(s.fetchedAt),
    });

    const recentStories = rawRecentStories.map(mapStory);
    const weeklyStories = rawWeeklyStories.map(mapStory);

    // Use all stories (recent + weekly) for topic counts
    const rawRecentStoriesForTopics = [...rawRecentStories, ...rawWeeklyStories];

    // ════════════════════════════════════════════════════════════════
    // 4. ALL TOPICS — from the Story table, not just clusters
    // ════════════════════════════════════════════════════════════════

    // Get every unique topic from combined stories so all topics get a tab
    const topicCountMap = {};
    for (const s of rawRecentStoriesForTopics) {
      topicCountMap[s.topic] = (topicCountMap[s.topic] || 0) + 1;
    }

    // Sort topics by story count (most stories first)
    const allTopics = Object.keys(topicCountMap).sort(
      (a, b) => topicCountMap[b] - topicCountMap[a]
    );

    return NextResponse.json({
        success: true,
        signals,
        clusters: enrichedClusters,
        recentStories,
        weeklyStories,
        topics: allTopics,
        topicCounts: topicCountMap,
      });
    }); // end withRetry
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
