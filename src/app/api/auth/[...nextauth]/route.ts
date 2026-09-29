import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/session-helpers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, action } = body; // action: "login" or "register"

    let user;

    if (action === "register" || !action) {
      // Register
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "User already exists" }, { status: 400 });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      user = await prisma.user.create({
        data: { email, passwordHash, name: name || email.split("@")[0] },
      });
    } else {
      // Login
      user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }
    }

    const token = await createSession(user.id);
    
    // Return JSON with cookie
    const response = NextResponse.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name 
      } 
    });
    response.headers.set("set-cookie", `${SESSION_COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`);
    return response;
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookieMatch = cookieHeader.match(/fluency_session=([^;]*)/);
  const token = cookieMatch?.[1];

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/db");
  
  const sessions = await prisma.$queryRawUnsafe(
    `SELECT st.*, u.* FROM session_tokens st JOIN users u ON st.userId = u.id WHERE st.token = '${token.replace(/'/g, "''")}' AND st.expiresAt > datetime('now') LIMIT 1`
  );

  if (!Array.isArray(sessions) || sessions.length === 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: sessions[0].id },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      xp: true,
      level: true,
      streak: true,
      bestStreak: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user });
}
