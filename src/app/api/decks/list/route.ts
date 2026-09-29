import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session-helpers";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Get public decks
  const publicDecks = await prisma.sharedDeck.findMany({
    where: { isPublic: true },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
      _count: {
        select: { words: true, members: true },
      },
    },
    orderBy: { studyCount: "desc" },
    take: 20,
  });

  // Get user's decks
  const userDecks = await prisma.sharedDeck.findMany({
    where: { ownerId: session.userId },
    include: {
      _count: {
        select: { words: true, members: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    publicDecks,
    userDecks,
  });
}
