import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().optional(),
  avatar: z.string().optional(),
  language: z.string().optional(),
});

export async function PATCH(req: Request) {
  const session = await getSessionFromRequest(req);
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = updateProfileSchema.parse(body);

    const user = await prisma.user.update({
      where: { id: session.userId },
      data,
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: (error as any).issues },
        { status: 400 }
      );
    }
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
