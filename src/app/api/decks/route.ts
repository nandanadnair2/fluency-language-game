import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createDeckSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  language: z.string().default("ja"),
  isPublic: z.boolean().default(false),
});

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const data = createDeckSchema.parse(body);

    const deck = await prisma.sharedDeck.create({
      data: {
        name: data.name,
        description: data.description,
        language: data.language,
        isPublic: data.isPublic,
        ownerId: session.userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Add creator as owner member
    await prisma.userDeckMembership.create({
      data: {
        userId: session.userId,
        deckId: deck.id,
        role: "owner",
      },
    });

    return NextResponse.json({ deck });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: (error as any).issues },
        { status: 400 }
      );
    }
    console.error("Create deck error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
