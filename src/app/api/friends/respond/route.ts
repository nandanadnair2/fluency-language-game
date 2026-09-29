import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const responseSchema = z.object({
  requestId: z.string(),
  action: z.enum(["accept", "decline"]),
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
    const { requestId, action } = responseSchema.parse(body);

    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
      include: { sender: true, receiver: true },
    });

    if (!request) {
      return NextResponse.json(
        { error: "Friend request not found" },
        { status: 404 }
      );
    }

    if (request.toId !== session.userId) {
      return NextResponse.json(
        { error: "Unauthorized to respond to this request" },
        { status: 403 }
      );
    }

    if (action === "accept") {
      // Create friendship
      await prisma.$transaction([
        prisma.friend.create({
          data: {
            userId: request.fromId,
            friendId: request.toId,
          },
        }),
        prisma.friendRequest.update({
          where: { id: requestId },
          data: { status: "accepted" },
        }),
      ]);

      // Update streaks for both users (bonus XP for making a friend)
      await prisma.user.updateMany({
        where: {
          id: { in: [request.fromId, request.toId] },
        },
        data: {
          xp: { increment: 25 },
        },
      });

      return NextResponse.json({ message: "Friend request accepted!" });
    } else {
      // Decline
      await prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: "declined" },
      });

      return NextResponse.json({ message: "Friend request declined" });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: (error as any).issues },
        { status: 400 }
      );
    }
    console.error("Response friend request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
