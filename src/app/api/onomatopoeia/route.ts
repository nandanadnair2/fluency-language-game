import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import type { OnomatopoeiaEntry } from "@/lib/onomatopoeia";

export const runtime = "nodejs";
export const maxDuration = 30;

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    try {
      zaiInstance = await ZAI.create();
    } catch (err: any) {
      console.warn("ZAI SDK not available:", err?.message || err);
      zaiInstance = null;
    }
  }
  return zaiInstance;
}

interface OnomatopoeiaRequest {
  text: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OnomatopoeiaRequest;
    const { text } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const zai = await getZAI();

    // Fallback if ZAI is not available
    if (!zai) {
      return NextResponse.json({
        onomatopoeia: [],
        count: 0,
        message: "Onomatopoeia detection unavailable (API not configured)",
      });
    }

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content: `You are a Japanese linguistics expert specializing in onomatopoeia (オノマトペ). Japanese has two main types:
- Giongo (擬音語): words that imitate actual sounds (e.g. かわいい = kawa-kawaii for cute appearance, but also sounds like pika-pika for sparkling)
- Gitaigo (擬態語): words that describe states, emotions, or appearances (e.g. ワクワク = wakuwaku for excited feeling)

When you find onomatopoeic words in the text, return them as a JSON array with these fields:
- "word": the Japanese onomatopoeia
- "reading": romaji pronunciation
- "type": either "giongo" or "gitaigo"
- "englishMeaning": clear English explanation
- "mood": one of: excited, calm, sad, energetic, eerie, peaceful, sudden, gentle, noisy, soft
- "moodColor": a hex color matching the mood (e.g. "#FF7B5A" for energetic, "#7DBD8C" for calm)
- "category": one of: sound, emotion, appearance, movement
- "exampleSentence": a short example sentence using this word (in Japanese)
- "exampleReading": romaji of the example sentence

Respond ONLY with raw JSON array, no markdown, no explanation. Return [] if no onomatopoeia found.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices[0]?.message?.content || "";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return NextResponse.json({
          onomatopoeia: parsed,
          count: parsed.length,
        });
      }
      return NextResponse.json({ onomatopoeia: [], count: 0 });
    } catch {
      return NextResponse.json({ onomatopoeia: [], count: 0 });
    }
  } catch (error) {
    console.error("Onomatopoeia detection error:", error);
    // Return empty array so the UI doesn't break
    return NextResponse.json({ onomatopoeia: [], count: 0 });
  }
}
