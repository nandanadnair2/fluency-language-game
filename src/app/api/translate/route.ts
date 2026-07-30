import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

interface TranslateRequestBody {
  text: string;
  sourceLanguage?: string;
  targetLanguage?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TranslateRequestBody;
    const { text, sourceLanguage, targetLanguage } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Missing text to translate" },
        { status: 400 }
      );
    }

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Return mock translation — in production, call z-ai-web-dev-sdk LLM
    const mockTranslations: Record<string, { original: string; directTranslation: string; romanized: string }> = {
      "hola": { original: "Hola", directTranslation: "Hello", romanized: "OH-lah" },
      "gracias": { original: "Gracias", directTranslation: "Thank you", romanized: "GRAH-see-ahs" },
      "buenos días": { original: "Buenos días", directTranslation: "Good morning", romanized: "BWEH-nohs DEE-ahs" },
      "¿cómo estás?": { original: "¿Cómo estás?", directTranslation: "How are you?", romanized: "KOH-moh ehs-TAHS" },
      "bonjour": { original: "Bonjour", directTranslation: "Hello / Good day", romanized: "bohn-ZHOOR" },
      "merci beaucoup": { original: "Merci beaucoup", directTranslation: "Thank you very much", romanized: "mehr-SEE boh-KOO" },
      "au revoir": { original: "Au revoir", directTranslation: "Goodbye", romanized: "oh ruh-VWAHR" },
    };

    const lowerText = text.toLowerCase().trim();
    const found = mockTranslations[lowerText];

    const result = found || {
      original: text,
      directTranslation: `[Translation of "${text}"]`,
      romanized: `[${text}]`,
    };

    return NextResponse.json({
      ...result,
      sourceLanguage: sourceLanguage || "auto",
      targetLanguage: targetLanguage || "en",
      confidence: found ? 0.95 : 0.7,
    });
  } catch (error) {
    console.error("Translate error:", error);
    return NextResponse.json(
      { error: "Failed to translate" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/translate",
    description:
      "POST text to receive translation { original, direct, romanized }",
  });
}
