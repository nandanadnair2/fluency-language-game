import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getSessionFromRequest, createSession, setSessionCookie } from "@/lib/session-helpers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (password && password.length >= 6) {
      // Register
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "User already exists" }, { status: 400 });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { email, passwordHash, name: name || email.split("@")[0] },
      });

      const token = await createSession(user.id);
      const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
      return setSessionCookie(token);
    } else {
      // Login
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const token = await createSession(user.id);
      const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
      return setSessionCookie(token);
    }
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
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
