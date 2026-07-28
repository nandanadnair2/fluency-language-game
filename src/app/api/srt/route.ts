import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { srtContent } = body;

    if (!srtContent) {
      return NextResponse.json({ error: "Missing SRT content" }, { status: 400 });
    }

    // Parse SRT format
    const blocks = srtContent
      .trim()
      .split(/\n\s*\n/)
      .filter((block: string) => block.trim());

    const subtitles = blocks.map((block: string) => {
      const lines = block.trim().split("\n");
      const textLines = lines.slice(2).join(" ");
      return {
        index: parseInt(lines[0]) || 0,
        text: textLines.replace(/<[^>]*>/g, "").trim(),
      };
    }).filter((sub: { text: string }) => sub.text.length > 0);

    return NextResponse.json({
      subtitles,
      count: subtitles.length,
      message: `Parsed ${subtitles.length} subtitle entries`,
    });
  } catch (error) {
    console.error("SRT parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse SRT file" },
      { status: 500 }
    );
  }
}
