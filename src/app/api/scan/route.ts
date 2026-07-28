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
    const { language } = body;

    // Simulate processing delay for nice UX
    await new Promise((resolve) => setTimeout(resolve, 900));

    // Return mock translation data
    const translation = getMockTranslation();

    return NextResponse.json({
      ...translation,
      sourceLanguage: language || translation.sourceLanguage,
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
    description:
      "POST a base64 image to receive OCR text + translation { original, direct, romanized }",
  });
}
