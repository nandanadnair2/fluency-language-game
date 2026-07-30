import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// In-memory subtitle store
const rooms = new Map<string, { createdAt: number; subtitle: { text: string; translation: any; timestamp: number } | null }>();

// POST: create room, receive subtitle, or check status
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, code, text, translation } = body;

    // Create a new room
    if (action === "create-room") {
      const roomCode = String(Math.floor(1000 + Math.random() * 9000));
      rooms.set(roomCode, { createdAt: Date.now(), subtitle: null });
      return NextResponse.json({ code: roomCode });
    }

    // Receive a subtitle into a room
    if (action === "subtitle" && code && text) {
      if (!rooms.has(code)) {
        rooms.set(code, { createdAt: Date.now(), subtitle: null });
      }
      const room = rooms.get(code)!;
      room.subtitle = {
        text,
        translation: translation || null,
        timestamp: Date.now(),
      };
      return NextResponse.json({ success: true });
    }

    // Check room status
    if (action === "check" && code) {
      const room = rooms.get(code);
      return NextResponse.json({
        exists: !!room,
        subtitle: room?.subtitle || null,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// GET: poll for latest subtitle in a room
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const room = rooms.get(code);
  return NextResponse.json({
    exists: !!room,
    subtitle: room?.subtitle || null,
  });
}
