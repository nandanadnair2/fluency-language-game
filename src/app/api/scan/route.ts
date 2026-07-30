import { NextRequest, NextResponse } from "next/server";
import { getMockTranslation } from "@/lib/translation-utils";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ScanRequestBody {
  image: string;
  language?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ScanRequestBody;

    // Simulate OCR processing delay for realistic UX
    await new Promise((resolve) => setTimeout(resolve, 900));

    // Always return a Japanese mock translation
    const translation = getMockTranslation();

    return NextResponse.json({
      ...translation,
      sourceLanguage: "ja",
      targetLanguage: "en",
      detectedLanguage: "ja",
      processingTime: 900,
      cached: false,
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Failed to process scan" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/scan",
    language: "ja",
    description:
      "POST a base64 image to receive Japanese OCR text + English translation",
  });
}
