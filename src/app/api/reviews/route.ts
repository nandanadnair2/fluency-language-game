import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const reviewSchema = z.object({
  wordOriginal: z.string(),
  wordTranslation: z.string(),
  correct: z.boolean(),
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
    const data = reviewSchema.parse(body);

    // Calculate XP based on correctness
    const xpEarned = data.correct ? 10 : 2;

    // Record the review
    const review = await prisma.wordReview.create({
      data: {
        userId: session.userId,
        wordOriginal: data.wordOriginal,
        wordTranslation: data.wordTranslation,
        correct: data.correct,
        earnedXP: xpEarned,
      },
    });

    // Update user XP
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        xp: { increment: xpEarned },
      },
    });

    return NextResponse.json({ review, xpEarned });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: (error as any).issues },
        { status: 400 }
      );
    }
    console.error("Word review error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
