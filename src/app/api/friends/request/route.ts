import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const sendRequestSchema = z.object({
  toEmail: z.string().email(),
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
    const { toEmail } = sendRequestSchema.parse(body);

    const sender = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    const recipient = await prisma.user.findUnique({
      where: { email: toEmail },
    });

    if (!recipient) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (recipient.id === sender?.id) {
      return NextResponse.json(
        { error: "Cannot send friend request to yourself" },
        { status: 400 }
      );
    }

    // Check if already friends
    const existingFriendship = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId: sender!.id, friendId: recipient.id },
          { userId: recipient.id, friendId: sender!.id },
        ],
      },
    });

    if (existingFriendship) {
      return NextResponse.json(
        { error: "Already friends" },
        { status: 400 }
      );
    }

    // Check if request already exists
    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { fromId: sender!.id, toId: recipient.id },
          { fromId: recipient.id, toId: sender!.id },
        ],
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "Friend request already sent" },
        { status: 400 }
      );
    }

    // Create friend request
    const request = await prisma.friendRequest.create({
      data: {
        fromId: sender!.id,
        toId: recipient.id,
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } },
      },
    });

    return NextResponse.json({ request });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: (error as any).issues },
        { status: 400 }
      );
    }
    console.error("Send friend request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
