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

interface ExtractTextRequest {
  imageData: string; // base64 data URL
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ExtractTextRequest;
    const { imageData } = body;

    if (!imageData || !imageData.startsWith("data:image")) {
      return NextResponse.json(
        { error: "Missing or invalid image data" },
        { status: 400 }
      );
    }

    // Strip large images — limit to reasonable size for API
    const maxLen = 5 * 1024 * 1024; // 5MB
    if (imageData.length > maxLen) {
      return NextResponse.json(
        { error: "Image too large" },
        { status: 400 }
      );
    }

    const zai = await getZAI();

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `This is a screenshot from a video (movie, anime, TV show, YouTube video). Extract any visible text that appears to be dialogue, subtitles, signs, or on-screen text — especially in Japanese, Korean, or Chinese. 

Return ONLY a JSON object with:
- "texts": array of detected text strings
- "hasSubtitles": boolean — whether subtitles/CC are visible on screen
- "primaryText": the most prominent text string (likely the main subtitle/dialogue)

If no text is found, return: {"texts":[],"hasSubtitles":false,"primaryText":""}
No markdown code fences, just raw JSON.`,
            },
            {
              type: "image_url",
              image_url: {
                url: imageData,
              },
            },
          ],
        },
      ],
      thinking: { type: "disabled" },
    });

    const raw = response.choices[0]?.message?.content || "";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      return NextResponse.json({
        texts: parsed.texts || [],
        hasSubtitles: parsed.hasSubtitles || false,
        primaryText: parsed.primaryText || "",
      });
    } catch {
      return NextResponse.json({
        texts: [],
        hasSubtitles: false,
        primaryText: "",
      });
    }
  } catch (error) {
    console.error("Extract text error:", error);
    return NextResponse.json(
      { error: "Text extraction failed" },
      { status: 500 }
    );
  }
}
