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

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "30");

  // Get user's review history
  const reviews = await prisma.wordReview.findMany({
    where: {
      userId: session.userId,
      createdAt: {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Get top learners globally
  const topLearners = await prisma.user.findMany({
    orderBy: { xp: "desc" },
    take: 10,
    select: {
      id: true,
      name: true,
      avatar: true,
      xp: true,
      level: true,
      streak: true,
    },
  });

  // Aggregate daily stats
  const dailyStats = reviews.reduce((acc, review) => {
    const date = review.createdAt.toISOString().split("T")[0];
    if (!acc[date]) {
      acc[date] = {
        date,
        reviews: 0,
        correct: 0,
        xpEarned: 0,
      };
    }
    acc[date].reviews += 1;
    if (review.correct) acc[date].correct += 1;
    acc[date].xpEarned += review.earnedXP;
    return acc;
  }, {} as Record<string, { date: string; reviews: number; correct: number; xpEarned: number }>);

  const dailyStatsArray = Object.values(dailyStats).sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  // Overall stats
  const totalReviews = reviews.length;
  const totalCorrect = reviews.filter((r) => r.correct).length;
  const accuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;
  const totalXP = reviews.reduce((sum, r) => sum + r.earnedXP, 0);

  return NextResponse.json({
    dailyStats: dailyStatsArray,
    topLearners,
    summary: {
      totalReviews,
      totalCorrect,
      accuracy,
      totalXP,
    },
  });
}
