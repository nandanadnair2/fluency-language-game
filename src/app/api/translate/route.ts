import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

interface TranslateRequestBody {
  text: string;
  targetLanguage?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TranslateRequestBody;
    const { text, targetLanguage = "en" } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing text to translate" },
        { status: 400 }
      );
    }

    const zai = await getZAI();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content: `You are an expert Japanese↔English translator for a language learning app. Follow these rules strictly:

1. Detect the source language of the input text.
2. If the source is Japanese → translate to English. The "directTranslation" MUST be in English.
3. If the source is English → translate to Japanese. The "directTranslation" MUST be in Japanese.
4. If the source is another language → translate to English.
5. CRITICAL: The "directTranslation" field must ALWAYS be in the target language, NEVER in the source language. If the input is Japanese, the directTranslation must be English. If the input is English, the directTranslation must be Japanese.

Respond ONLY with valid JSON, no markdown code blocks:
{
  "original": "the exact original text as provided",
  "directTranslation": "the translation — MUST be in the target language (English if source is Japanese, Japanese if source is English)",
  "romanized": "phonetic romanization with hyphens between syllables (e.g. kon-nee-chee-WAH). For Japanese input: romaji. For English input: Japanese pronunciation guide in romaji.",
  "sourceLanguage": "detected ISO language code (ja, en, ko, zh, etc.)",
  "targetLanguage": "the target language code"
}

Output raw JSON only, no code fences.`,
        },
        {
          role: "user",
          content: `Translate: "${text}"`,
        },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices[0]?.message?.content || "";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      return NextResponse.json({
        original: parsed.original || text,
        directTranslation: parsed.directTranslation || text,
        romanized: parsed.romanized || text,
        sourceLanguage: parsed.sourceLanguage || "auto",
        targetLanguage: parsed.targetLanguage || targetLanguage,
        confidence: 0.90,
      });
    } catch {
      return NextResponse.json({
        original: text,
        directTranslation: text,
        romanized: text,
        sourceLanguage: "auto",
        targetLanguage: targetLanguage,
        confidence: 0.5,
      });
    }
  } catch (error) {
    console.error("Translate error:", error);
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}
