import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { join } from "path";

export const runtime = "nodejs";
export const maxDuration = 30;

// Use system temp directory that works cross-platform
const getTempPath = (filename: string) => join(tmpdir(), filename);

export async function POST(req: NextRequest) {
  const filesToClean: string[] = [];

  try {
    const body = (await req.json()) as {
      audioBase64: string;
      mimeType?: string;
    };

    const { audioBase64, mimeType } = body;

    if (!audioBase64 || audioBase64.trim().length === 0) {
      return NextResponse.json({ error: "No audio data" }, { status: 400 });
    }

    if (audioBase64.length < 100) {
      return NextResponse.json({ error: "Audio too small" }, { status: 400 });
    }

    // Decode base64 and write to temp file
    const audioBuffer = Buffer.from(audioBase64, "base64");
    console.log(`[Transcribe] ${audioBuffer.length} bytes, mime: ${mimeType || "?"}`);

    if (audioBuffer.length < 100) {
      return NextResponse.json({ error: "Decoded audio too small" }, { status: 400 });
    }

    const fileId = randomUUID();
    const ext = mimeType?.includes("mp3") ? "mp3"
      : mimeType?.includes("ogg") ? "ogg"
      : "wav";
    const safeFile = getTempPath(`fluency_${fileId}.${ext}`);
    filesToClean.push(safeFile, `${safeFile}.json`);

    writeFileSync(safeFile, audioBuffer);

    // ── Method 1: z-ai CLI ──
    try {
      const output = execSync(
        `z-ai asr -f "${safeFile}" 2>&1`,
        { encoding: "utf-8", timeout: 20000 }
      );

      console.log(`[Transcribe] CLI stdout: ${output.slice(0, 300)}`);

      // Try to extract text from CLI output (JSON or plain text)
      const textMatch = output.match(/"text"\s*:\s*"([^"]+)"/);
      if (textMatch?.[1]) {
        return NextResponse.json({ text: textMatch[1].trim(), success: true, method: "cli" });
      }

      // CLI might output just text
      const lines = output.trim().split("\n").filter((l: string) => l.trim().length > 0);
      // Skip lines that look like metadata
      const textLines = lines.filter((l: string) =>
        !l.includes("Initializing") && !l.includes("Sending") && l.trim().length > 0
      );
      if (textLines.length > 0) {
        const joined = textLines.join(" ").trim();
        // Remove any JSON wrappers
        const cleaned = joined.replace(/^\{.*"text"\s*:\s*"([^"]+)".*\}$/s, "$1");
        if (cleaned.length > 0 && cleaned.length < 500) {
          return NextResponse.json({ text: cleaned, success: true, method: "cli-text" });
        }
      }

      return NextResponse.json({ text: "", success: true, message: "No speech (CLI)", raw: output.slice(0, 100) });
    } catch (cliErr: any) {
      console.error("[Transcribe] CLI failed:", cliErr.message?.slice(0, 300));
      // Fall through to SDK
    }

    // ── Method 2: SDK fallback ──
    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();
      const response = await zai.audio.asr.create({ file_base64: audioBase64 });
      const text = response.text || "";
      if (text.trim()) {
        return NextResponse.json({ text: text.trim(), success: true, method: "sdk" });
      }
      return NextResponse.json({ text: "", success: true, message: "No speech (SDK)" });
    } catch (sdkErr: any) {
      console.error("[Transcribe] SDK failed:", sdkErr.message?.slice(0, 300));
    }

    // ── Method 3: Convert via ffmpeg then retry CLI ──
    try {
      // Force convert to WAV using system ffmpeg
      const wavFile = getTempPath(`fluency_${fileId}_conv.wav`);
      filesToClean.push(wavFile, `${wavFile}.json`);
      execSync(`ffmpeg -y -i "${safeFile}" -ar 16000 -ac 1 "${wavFile}" 2>&1`, {
        encoding: "utf-8", timeout: 10000,
      });

      if (existsSync(wavFile)) {
        const output = execSync(`z-ai asr -f "${wavFile}" 2>&1`, {
          encoding: "utf-8", timeout: 20000,
        });
        console.log(`[Transcribe] ffmpeg+CLI stdout: ${output.slice(0, 300)}`);
        const textMatch = output.match(/"text"\s*:\s*"([^"]+)"/);
        if (textMatch?.[1]) {
          return NextResponse.json({ text: textMatch[1].trim(), success: true, method: "ffmpeg-cli" });
        }
      }
    } catch (ffmpegErr: any) {
      console.error("[Transcribe] ffmpeg retry failed:", ffmpegErr.message?.slice(0, 200));
    }

    return NextResponse.json(
      { error: "All transcription methods failed", text: "" },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("[Transcribe] Fatal:", error.message?.slice(0, 300));
    return NextResponse.json({ error: "Transcription failed", text: "" }, { status: 500 });
  } finally {
    for (const f of filesToClean) {
      try { if (existsSync(f)) unlinkSync(f); } catch (_) {}
    }
  }
}
