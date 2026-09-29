import { NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "fluency_session";

export async function getSessionFromRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookieMatch = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]*)`));
  const token = cookieMatch?.[1];

  if (!token) return null;

  const { prisma } = await import("@/lib/db");

  const sessions = await prisma.$queryRawUnsafe(
    `SELECT st.*, u.* FROM session_tokens st JOIN users u ON st.userId = u.id WHERE st.id = '${token.replace(/'/g, "''")}' AND st.expiresAt > datetime('now') LIMIT 1`
  );

  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  return { userId: sessions[0].userId };
}

export async function createSession(userId: string): Promise<string> {
  const { prisma } = await import("@/lib/db");
  const crypto = await import("crypto");
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.$executeRawUnsafe(
    `INSERT INTO session_tokens (id, userId, expiresAt) VALUES ('${token.replace(/'/g, "''")}', '${userId.replace(/'/g, "''")}', '${expiresAt.toISOString()}')`
  );

  return token;
}

export function setSessionCookie(token: string): Response {
  return new NextResponse(null, {
    headers: {
      "set-cookie": `${SESSION_COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`,
    },
  });
}
