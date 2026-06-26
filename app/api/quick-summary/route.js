// app/api/quick-summary/route.js
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const { story } = await request.json();

    if (!story) {
      return NextResponse.json({ success: false, error: "Story is required" }, { status: 400 });
    }

    const prompt = `Write a very concise 1-2 sentence TL;DR summary for this tech article. Get straight to the point. Do not include introductory text like "Here is a summary".

Title: ${story.title}
URL: ${story.url}
Source: ${story.source}
Topic: ${story.topic}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return NextResponse.json({
      success: true,
      summary: response.text,
    });
  } catch (error) {
    console.error("Quick summary error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate summary." },
      { status: 500 }
    );
  }
}
