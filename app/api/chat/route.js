// app/api/chat/route.js
// ─────────────────────────────────────────────────────────────────────
// CHAT WITH THE NEWS API
//
// This route powers the conversational AI feature. It:
//   1. Receives the user's chat message and conversation history.
//   2. Fetches recent tech news stories from the database to use as context.
//   3. Sends the context + the user's question to Gemini 2.5 Flash.
//   4. Returns the AI's response so the frontend can display it.
// ─────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";
import { withRetry } from "@/lib/withRetry";

// Initialize the Gemini SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const { message, history = [], contextStory } = await request.json();

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Message is required." },
        { status: 400 }
      );
    }

    // ── 1. Fetch Context (Recent Stories) ────────────────────────────────
    // We fetch stories from the last 3 days to give the AI fresh knowledge
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const recentStories = await withRetry(() =>
      prisma.story.findMany({
        where: {
          fetchedAt: { gte: threeDaysAgo },
        },
        orderBy: { score: "desc" },
        take: 150,
      })
    );

    // Format the stories into a readable list for the AI
    const contextList = recentStories
      .map(
        (s) => `- [${s.topic}] ${s.title} (Score: ${s.score}, Source: ${s.source})`
      )
      .join("\n");

    // ── 2. Construct the Prompt ──────────────────────────────────────────
    // We give Gemini a strong system persona and inject the recent news
    let systemPrompt = `You are a helpful, knowledgeable tech news assistant for developers.
Your job is to answer the user's questions using ONLY the recent news stories provided below as your knowledge base.

RECENT NEWS (Last 3 Days):
${contextList}

INSTRUCTIONS:
1. If the user asks about recent events, trends, or specific topics, search the RECENT NEWS context to answer.
2. Be conversational but concise. Use markdown for formatting (bullet points, bold text).
3. If a user asks a question that CANNOT be answered using the RECENT NEWS context, politely inform them that you don't have information on that in the recent news fetched by the system.
4. Try to mention specific technologies, projects, or scores if relevant.`;

    // If the user clicked "Ask AI" on a specific story, force the AI to focus on it
    if (contextStory) {
      systemPrompt += `\n\n=== IMPORTANT IMMEDIATE CONTEXT ===
The user is currently looking at this specific article:
Title: "${contextStory.title}"
URL: ${contextStory.url}
Topic: ${contextStory.topic}
Source: ${contextStory.source} (Score: ${contextStory.score})

Unless the user explicitly changes the subject, base your next responses primarily around discussing, summarizing, or explaining THIS specific article. You can use the other RECENT NEWS to provide broader context if helpful.`;
    }

    // ── 3. Build Conversation History ────────────────────────────────────
    // The @google/genai SDK accepts `contents` as an array of roles and parts
    // We map the frontend history format to the Gemini format
    const contents = [
      // Inject the system instructions as the first 'user' message
      // (Gemini handles system instructions this way or via systemInstruction config)
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Understood. I'm ready to answer questions about the recent tech news." }] }
    ];

    // Add actual conversation history
    for (const msg of history) {
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      });
    }

    // Add the new user message
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    // ── 4. Call Gemini API ───────────────────────────────────────────────
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        temperature: 0.7,
      }
    });

    // ── 5. Return the result ─────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      text: response.text,
    });

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate response." },
      { status: 500 }
    );
  }
}
