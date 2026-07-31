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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      audioBase64: string;
      mimeType?: string;
    };

    const { audioBase64 } = body;

    if (!audioBase64 || audioBase64.trim().length === 0) {
      return NextResponse.json(
        { error: "No audio data provided" },
        { status: 400 }
      );
    }

    // Validate minimum audio data size (at least a small chunk)
    if (audioBase64.length < 100) {
      return NextResponse.json(
        { error: "Audio data too small" },
        { status: 400 }
      );
    }

    const zai = await getZAI();

    // Use ASR to transcribe the audio
    const response = await zai.audio.asr.create({
      file_base64: audioBase64,
    });

    const text = response.text || "";

    if (!text || text.trim().length === 0) {
      return NextResponse.json({
        text: "",
        success: true,
        message: "No speech detected in audio segment",
      });
    }

    return NextResponse.json({
      text: text.trim(),
      success: true,
    });
  } catch (error) {
    console.error("[Transcribe] Error:", error);
    return NextResponse.json(
      { error: "Transcription failed", text: "" },
      { status: 500 }
    );
  }
}
