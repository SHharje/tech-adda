// app/api/summarize/route.js
// ─────────────────────────────────────────────────────────────────────
// WHAT THIS ROUTE DOES (in order):
//   1. Pulls all stories saved in the last 6 hours from the database.
//   2. Groups them by topic (AI, React, DevOps, etc.) using plain JS.
//   3. For each topic group, sends the headlines to Gemini and asks
//      it to write a 2-3 sentence summary of what's trending.
//   4. Saves each summary into the Cluster table.
//
// WHY THIS MATTERS:
//   This is where raw data becomes something a human actually wants to
//   read.  Instead of scrolling through 130 headlines, the user gets
//   one short paragraph per topic: "Here's what's happening in AI today
//   and why you should care."
//
// HOW TO TRIGGER:
//   - Manually:  visit  http://localhost:3000/api/summarize
//   - Automatically:  chain it after fetch-news in your cron schedule.
// ─────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

// ── Initialize Gemini ────────────────────────────────────────────────
// GoogleGenAI is the new unified SDK's entry point.  You pass your API
// key once, then call ai.models.generateContent() with your chosen model.
//
// WHY @google/genai instead of @google/generative-ai?
// The older package only supports v1beta models (up to Gemini 2.x).
// The new @google/genai SDK supports all models including Gemini 3.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ── Helper: wait between API calls to respect rate limits ────────────
// Gemini's free tier has per-minute request limits.  A short pause
// between calls prevents 429 "Too Many Requests" errors.
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Helper: group an array of stories by their topic field ───────────
// Input:  [{ topic: "AI", title: "..." }, { topic: "React", title: "..." }, ...]
// Output: { "AI": [story, story], "React": [story, story], ... }
//
// This uses .reduce() — a common JS pattern for building an object
// from an array.  For each story, it checks if the topic key already
// exists in the accumulator; if not, it creates an empty array first.
function groupByTopic(stories) {
  return stories.reduce((groups, story) => {
    const topic = story.topic;
    if (!groups[topic]) {
      groups[topic] = [];
    }
    groups[topic].push(story);
    return groups;
  }, {});
}

// ── Helper: ask Gemini to summarize a topic's headlines ───────────────
// We build a prompt that lists all the story titles for one topic,
// then ask Gemini for a concise 2-3 sentence summary.
//
// WHY we include scores: it helps Gemini understand which stories
// are getting the most attention, so it can focus the summary on
// what's genuinely trending rather than treating all equally.
async function generateSummary(topic, stories) {
  // Build a numbered list of headlines with their scores
  const headlineList = stories
    .sort((a, b) => b.score - a.score) // highest score first
    .map(
      (s, i) =>
        `${i + 1}. "${s.title}" (score: ${s.score}, comments: ${s.commentCount})`
    )
    .join("\n");

  const prompt = `You are a tech news editor writing for a developer audience.

Here are today's top ${topic} stories:
${headlineList}

Write a 2-3 sentence summary of what's trending in ${topic} right now and why it matters to developers. Be specific — mention actual project names or technologies from the headlines. Keep it concise and engaging.`;

  try {
    // New SDK syntax: ai.models.generateContent({ model, contents })
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text;
  } catch (err) {
    console.error(`Gemini error for topic "${topic}":`, err.message);
    // If Gemini fails (rate limit, network, etc.), return a fallback
    // so the route doesn't crash entirely.
    return `${stories.length} stories trending in ${topic}. Top story: "${stories[0].title}".`;
  }
}

// ── Route handler ────────────────────────────────────────────────────
export async function GET(request) {
  try {
    // ── Secret check (same pattern as fetch-news) ──────────────────
    if (process.env.NODE_ENV === "production") {
      const authHeader = request.headers.get("authorization");
      const cronSecret = process.env.CRON_SECRET;

      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    // ── Step 1: Fetch recent stories ─────────────────────────────────
    // Pull all stories from the last 12 hours.  This matches the cron
    // schedule — so each summarization cycle covers exactly one fetch
    // cycle's worth of stories.
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    const recentStories = await prisma.story.findMany({
      where: {
        fetchedAt: { gte: twelveHoursAgo },
      },
      orderBy: { score: "desc" },
    });

    if (recentStories.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No recent stories found. Run /api/fetch-news first.",
        clusters: [],
      });
    }

    // ── Step 2: Group by topic ────────────────────────────────────────
    const topicGroups = groupByTopic(recentStories);
    const topics = Object.keys(topicGroups);

    // ── Step 3: Generate AI summaries for each topic ──────────────────
    // We process topics one at a time (not in parallel) to be kind to
    // Gemini's free-tier rate limits.  With 8-10 topics this takes
    // about 10-20 seconds total — perfectly fine for a cron job.
    const clusters = [];

    for (const topic of topics) {
      const stories = topicGroups[topic];

      // Skip topics with very few stories — not enough signal
      // to write a meaningful summary.
      if (stories.length < 2) {
        console.log(
          `Skipping "${topic}" — only ${stories.length} story, not enough for a summary.`
        );
        continue;
      }

      console.log(
        `Summarizing "${topic}" (${stories.length} stories)...`
      );

      // Ask Gemini to summarize this topic's headlines
      const aiSummary = await generateSummary(topic, stories);

      // Small pause between Gemini calls to stay within free-tier limits
      await delay(2000);

      // Save the summary to the Cluster table
      const cluster = await prisma.cluster.create({
        data: {
          topic,
          aiSummary,
        },
      });

      clusters.push({
        topic,
        storyCount: stories.length,
        summary: aiSummary,
        clusterId: cluster.id,
      });
    }

    // ── Return results ───────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      message: `Summarized ${clusters.length} topics from ${recentStories.length} stories.`,
      clusters,
    });
  } catch (error) {
    console.error("Summarize error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
