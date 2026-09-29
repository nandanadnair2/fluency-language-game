import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { romanizeJapanese, translateJapanese } from "@/lib/romanization";

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

interface TranslateRequestBody {
  text: string;
  targetLanguage?: string;
}

export async function POST(req: NextRequest) {
  let text = "";
  let targetLanguage = "en";
  
  try {
    const body = (await req.json()) as TranslateRequestBody;
    text = body.text || "";
    targetLanguage = body.targetLanguage || "en";

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing text to translate" },
        { status: 400 }
      );
    }

    const zai = await getZAI();

    // Fallback if ZAI is not available — use local translation map
    if (!zai) {
      const englishTranslation = translateJapanese(text) || "[Translation unavailable]";
      const romaji = romanizeJapanese(text) || text;
      
      return NextResponse.json({
        original: text,
        directTranslation: englishTranslation,
        romanized: romaji,
        sourceLanguage: /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(text) ? "ja" : "auto",
        targetLanguage: targetLanguage,
        confidence: 0.90,
      });
    }

    // Try ZAI API, fall back to local if it fails
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a Japanese→English translator. ALWAYS translate Japanese text to English. The "directTranslation" field MUST always be in English, never in Japanese.`,
          },
          {
            role: "assistant",
            content: `Respond ONLY with valid JSON:
{
  "original": "the exact original text",
  "directTranslation": "English translation",
  "romanized": "phonetic romaji with hyphens",
  "sourceLanguage": "ja",
  "targetLanguage": "en"
}`,
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
          sourceLanguage: parsed.sourceLanguage || "ja",
          targetLanguage: parsed.targetLanguage || "en",
          confidence: 0.95,
        });
      } catch {
        // Parse failed, use fallback
      }
    } catch {
      // ZAI API call failed, use fallback
    }
    
    // Use local translation map as fallback
    const englishTranslation = translateJapanese(text) || "[Translation unavailable]";
    const romaji = romanizeJapanese(text) || text;
    return NextResponse.json({
      original: text,
      directTranslation: englishTranslation,
      romanized: romaji,
      sourceLanguage: /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(text) ? "ja" : "auto",
      targetLanguage: targetLanguage,
      confidence: 0.90,
    });
  } catch (error) {
    console.error("Translate error:", error);
    // Final fallback
    const englishTranslation = translateJapanese(text) || "[Translation unavailable]";
    const romaji = romanizeJapanese(text) || text;
    return NextResponse.json({
      original: text,
      directTranslation: englishTranslation,
      romanized: romaji,
      sourceLanguage: /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(text) ? "ja" : "auto",
      targetLanguage: targetLanguage,
      confidence: 0.90,
    });
  }
}
