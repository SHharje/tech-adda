// app/api/fetch-news/route.js
// ─────────────────────────────────────────────────────────────────────
// THIS IS THE ENGINE OF THE ENTIRE APP.
//
// What it does (in order):
//   1. Calls the Hacker News public API to get the top 100 story IDs.
//   2. Fetches the full details for each story (title, url, score, etc.).
//   3. Assigns a topic to each story using simple keyword matching.
//   4. Saves each story to the database using "upsert" — which means
//      "update if this story already exists, otherwise create it."
//
// How to trigger it:
//   - Manually:  visit  http://localhost:3000/api/fetch-news
//   - Automatically:  Vercel Cron will call this URL every 6 hours.
// ─────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";

// ── Hacker News API endpoints ────────────────────────────────────────
// These are 100% free, require no API key, and return clean JSON.
// topstories.json → an array of up to 500 numeric story IDs
// /item/{id}.json  → full details for one story
const HN_TOP_STORIES = "https://hacker-news.firebaseio.com/v0/topstories.json";
const HN_ITEM = (id) => `https://hacker-news.firebaseio.com/v0/item/${id}.json`;

// ── Dev.to API endpoint ──────────────────────────────────────────────
// Also 100% free, no key needed.  Returns an array of article objects
// with title, url, positive_reactions_count, comments_count, etc.
const DEVTO_ARTICLES = "https://dev.to/api/articles?per_page=30&top=1";

// ── Topic keyword map ────────────────────────────────────────────────
// WHY: We need to categorize every story into a topic so we can group
// them later for AI summaries and trend charts.
//
// HOW: We check whether the story title contains any of these keywords
// (case-insensitive).  The FIRST match wins.  If nothing matches, the
// story is tagged "General".
//
// You can add more topics or keywords at any time — just extend this list.
const TOPIC_KEYWORDS = [
  {
    topic: "AI",
    keywords: [
      "ai", "gpt", "llm", "claude", "gemini", "openai", "chatgpt",
      "machine learning", "deep learning", "neural", "transformer",
      "copilot", "diffusion", "langchain", "rag", "embedding",
    ],
  },
  {
    topic: "React",
    keywords: [
      "react", "next.js", "nextjs", "remix", "jsx", "vercel", "hooks",
      "server component", "rsc",
    ],
  },
  {
    topic: "DevOps",
    keywords: [
      "docker", "kubernetes", "k8s", "ci/cd", "terraform", "ansible",
      "jenkins", "github actions", "devops", "infrastructure",
      "container", "helm",
    ],
  },
  {
    topic: "Web Dev",
    keywords: [
      "css", "html", "javascript", "typescript", "node", "deno", "bun",
      "vue", "angular", "svelte", "tailwind", "webpack", "vite",
      "frontend", "backend", "full-stack", "fullstack",
    ],
  },
  {
    topic: "Security",
    keywords: [
      "security", "vulnerability", "hack", "breach", "encryption",
      "ransomware", "malware", "zero-day", "cve", "auth",
    ],
  },
  {
    topic: "Cloud",
    keywords: [
      "aws", "azure", "gcp", "cloud", "serverless", "lambda",
      "s3", "ec2", "firebase",
    ],
  },
  {
    topic: "Mobile",
    keywords: [
      "ios", "android", "swift", "kotlin", "flutter", "react native",
      "mobile app",
    ],
  },
  {
    topic: "Database",
    keywords: [
      "postgres", "mysql", "mongodb", "redis", "sql", "database",
      "supabase", "prisma", "drizzle", "sqlite",
    ],
  },
];

// ── Helper: assign a topic to a story title ──────────────────────────
function assignTopic(title) {
  const lower = title.toLowerCase();

  for (const { topic, keywords } of TOPIC_KEYWORDS) {
    // .some() returns true as soon as ANY keyword is found in the title
    if (keywords.some((kw) => lower.includes(kw))) {
      return topic;
    }
  }

  // If no keyword matched, file it under "General"
  return "General";
}

// ── Fetch stories from Hacker News ───────────────────────────────────
async function fetchHackerNews() {
  // Step 1: Get the list of top story IDs (up to 500)
  const res = await fetch(HN_TOP_STORIES);
  const allIds = await res.json();

  // We only take the top 100 to keep things fast on the free tier.
  const top100 = allIds.slice(0, 100);

  // Step 2: Fetch full details for each story IN PARALLEL.
  // Promise.allSettled() means if one request fails, the rest still work.
  const results = await Promise.allSettled(
    top100.map(async (id) => {
      const itemRes = await fetch(HN_ITEM(id));
      return itemRes.json();
    })
  );

  // Step 3: Filter out failed requests and stories without titles/urls.
  const stories = results
    .filter((r) => r.status === "fulfilled" && r.value && r.value.title)
    .map((r) => {
      const item = r.value;
      return {
        title: item.title,
        url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        source: "hackernews",
        score: item.score || 0,
        commentCount: item.descendants || 0, // HN calls comments "descendants"
        topic: assignTopic(item.title),
      };
    });

  return stories;
}

// ── Fetch stories from Dev.to ────────────────────────────────────────
async function fetchDevTo() {
  const res = await fetch(DEVTO_ARTICLES);
  const articles = await res.json();

  const stories = articles.map((article) => ({
    title: article.title,
    url: article.url,
    source: "devto",
    score: article.positive_reactions_count || 0,
    commentCount: article.comments_count || 0,
    topic: assignTopic(article.title),
  }));

  return stories;
}

// ── Save stories to the database ─────────────────────────────────────
async function saveStories(stories) {
  let saved = 0;

  for (const story of stories) {
    try {
      // upsert = "update if exists, otherwise create"
      //
      // WHERE clause: we match on [title + source] (our @@unique constraint).
      // If a story with the same title from the same source already exists,
      // we UPDATE its score and comment count (they change over time).
      // If it doesn't exist yet, we CREATE a new row.
      await withRetry(() =>
        prisma.story.upsert({
          where: {
            title_source: {
              title: story.title,
              source: story.source,
            },
          },
          update: {
            score: story.score,
            commentCount: story.commentCount,
          },
          create: {
            title: story.title,
            url: story.url,
            source: story.source,
            score: story.score,
            commentCount: story.commentCount,
            topic: story.topic,
          },
        })
      );
      saved++;
    } catch (err) {
      // If one story fails (e.g. weird characters), skip it and continue.
      // We log the error so you can debug it if needed.
      console.error(`Failed to save: "${story.title}"`, err.message);
    }
  }

  return saved;
}

// ── The actual API route handler ─────────────────────────────────────
// Next.js App Router uses named exports: GET, POST, etc.
// We export GET so you can trigger this by simply visiting the URL.
//
// SECURITY: In production, only Vercel Cron (or someone who knows the
// secret) can trigger this.  Vercel automatically sends an
// "Authorization: Bearer <CRON_SECRET>" header with every cron request.
// We check that header here.  In local dev we skip the check so you
// can still test easily in your browser.
export async function GET(request) {
  try {
    // ── Secret check ───────────────────────────────────────────────
    // In production, verify the Authorization header matches CRON_SECRET.
    // This prevents random visitors from hitting this URL and flooding
    // your database with duplicate fetch cycles.
    //
    // In local development (NODE_ENV !== "production"), we skip this
    // so you can test by visiting http://localhost:3000/api/fetch-news.
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
    // Fetch from both sources at the same time (parallel)
    const [hnStories, devtoStories] = await Promise.all([
      fetchHackerNews(),
      fetchDevTo(),
    ]);

    const allStories = [...hnStories, ...devtoStories];

    // Save everything to the database
    const savedCount = await saveStories(allStories);

    // ── Step 4.1: Record topic stats ───────────────────────────────
    // Count stories per topic and save a daily snapshot to TopicStat.
    // This powers the 30-day trend chart on the /trends page.
    //
    // We use upsert with today's date so if the cron runs multiple
    // times in one day, it updates the existing row instead of
    // creating duplicates (thanks to our @@unique([topic, date])).
    const today = new Date();
    today.setHours(0, 0, 0, 0); // normalize to start of day

    // Group stories by topic and calculate stats
    const topicCounts = {};
    for (const story of allStories) {
      if (!topicCounts[story.topic]) {
        topicCounts[story.topic] = { count: 0, totalScore: 0 };
      }
      topicCounts[story.topic].count++;
      topicCounts[story.topic].totalScore += story.score;
    }

    // Save each topic's daily snapshot
    let statsRecorded = 0;
    for (const [topic, stats] of Object.entries(topicCounts)) {
      const avgScore = Math.round(stats.totalScore / stats.count);
      await withRetry(() =>
        prisma.topicStat.upsert({
          where: {
            topic_date: { topic, date: today },
          },
          update: {
            storyCount: stats.count,
            avgScore,
          },
          create: {
            topic,
            date: today,
            storyCount: stats.count,
            avgScore,
          },
        })
      );
      statsRecorded++;
    }

    // Return a friendly JSON response confirming what happened
    return NextResponse.json({
      success: true,
      message: `Fetched ${allStories.length} stories, saved ${savedCount} to database. Recorded stats for ${statsRecorded} topics.`,
      breakdown: {
        hackerNews: hnStories.length,
        devTo: devtoStories.length,
        topicStats: statsRecorded,
      },
    });
  } catch (error) {
    console.error("Fetch news error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
