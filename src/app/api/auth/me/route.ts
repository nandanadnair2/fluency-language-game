import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const SESSION_COOKIE_NAME = "fluency_session";

async function getSessionFromRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookieMatch = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]*)`));
  const token = cookieMatch?.[1];

  if (!token) return null;

  const sessions = await prisma.$queryRawUnsafe(
    `SELECT st.*, u.* FROM session_tokens st JOIN users u ON st.userId = u.id WHERE st.id = '${token.replace(/'/g, "''")}' AND st.expiresAt > datetime('now') LIMIT 1`
  );

  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  return { userId: sessions[0].id };
}

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      language: true,
      xp: true,
      level: true,
      streak: true,
      bestStreak: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
