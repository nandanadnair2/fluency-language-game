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
          content: `You are an expert language translator. You will receive a text in any language. Translate it to ${targetLanguage} and provide romanization. If the text is already in ${targetLanguage}, translate it to Japanese instead (bidirectional). Respond ONLY with valid JSON, no markdown code blocks. Fields:
- "original": the exact original text as provided
- "directTranslation": the translation in the target language
- "romanized": phonetic romanization with hyphens between syllables (e.g. "kon-nee-chee-WAH"). For English text, provide Japanese pronunciation guide. For Japanese text, provide romaji.
- "sourceLanguage": detected ISO language code (ja, ko, zh, en, etc.)
- "targetLanguage": "${targetLanguage}"

Just raw JSON, no code fences.`,
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
