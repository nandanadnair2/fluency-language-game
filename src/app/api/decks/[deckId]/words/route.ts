import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const addWordSchema = z.object({
  original: z.string().min(1),
  translation: z.string().min(1),
  romanized: z.string().optional(),
  context: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const session = await getSessionFromRequest(req);
  
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { deckId } = await params;

  try {
    const body = await req.json();
    const data = addWordSchema.parse(body);

    // Check if user has access to this deck
    const membership = await prisma.userDeckMembership.findFirst({
      where: {
        userId: session.userId,
        deckId,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const word = await prisma.deckWord.create({
      data: {
        deckId,
        original: data.original,
        translation: data.translation,
        romanized: data.romanized,
        context: data.context,
        addedById: session.userId,
      },
      include: {
        addedBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Update deck word count
    await prisma.sharedDeck.update({
      where: { id: deckId },
      data: {
        wordCount: { increment: 1 },
      },
    });

    return NextResponse.json({ word });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: (error as any).issues },
        { status: 400 }
      );
    }
    console.error("Add word error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const session = await getSessionFromRequest(req);
  
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { deckId } = await params;

  // Check access
  const [deck, membership] = await Promise.all([
    prisma.sharedDeck.findUnique({
      where: { id: deckId },
    }),
    prisma.userDeckMembership.findFirst({
      where: {
        userId: session.userId,
        deckId,
      },
    }),
  ]);

  if (!deck) {
    return NextResponse.json(
      { error: "Deck not found" },
      { status: 404 }
    );
  }

  if (!deck.isPublic && !membership) {
    return NextResponse.json(
      { error: "Access denied" },
      { status: 403 }
    );
  }

  const words = await prisma.deckWord.findMany({
    where: { deckId },
    include: {
      addedBy: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
    orderBy: { addedAt: "desc" },
  });

  return NextResponse.json({ words, deck });
}
