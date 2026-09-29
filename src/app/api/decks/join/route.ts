import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const joinDeckSchema = z.object({
  deckId: z.string(),
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
    const { deckId } = joinDeckSchema.parse(body);

    // Check if deck exists
    const deck = await prisma.sharedDeck.findUnique({
      where: { id: deckId },
    });

    if (!deck) {
      return NextResponse.json(
        { error: "Deck not found" },
        { status: 404 }
      );
    }

    // Check if already member
    const existingMembership = await prisma.userDeckMembership.findFirst({
      where: {
        userId: session.userId,
        deckId,
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "Already a member of this deck" },
        { status: 400 }
      );
    }

    // Add membership
    const membership = await prisma.userDeckMembership.create({
      data: {
        userId: session.userId,
        deckId,
        role: "member",
      },
      include: {
        deck: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    // Update deck study count
    await prisma.sharedDeck.update({
      where: { id: deckId },
      data: {
        studyCount: { increment: 1 },
      },
    });

    return NextResponse.json({ membership });
  } catch (error) {
    console.error("Join deck error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
