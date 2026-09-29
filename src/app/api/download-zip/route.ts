import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET() {
  try {
    const zipPath = path.join(process.cwd(), "public", "fluency-project.zip");
    const buffer = await fs.readFile(zipPath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=fluency-project.zip",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "ZIP file not found" },
      { status: 404 }
    );
  }
}
