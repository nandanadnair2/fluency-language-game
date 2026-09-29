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

  // Get incoming friend requests
  const incomingRequests = await prisma.friendRequest.findMany({
    where: {
      toId: session.userId,
      status: "pending",
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          avatar: true,
          xp: true,
          level: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get outgoing friend requests
  const outgoingRequests = await prisma.friendRequest.findMany({
    where: {
      fromId: session.userId,
      status: "pending",
    },
    include: {
      receiver: {
        select: {
          id: true,
          name: true,
          avatar: true,
          xp: true,
          level: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get friends
  const friends = await prisma.friend.findMany({
    where: {
      OR: [
        { userId: session.userId },
        { friendId: session.userId },
      ],
    },
    include: {
      requester: {
        select: {
          id: true,
          name: true,
          avatar: true,
          xp: true,
          level: true,
        },
      },
      acceptee: {
        select: {
          id: true,
          name: true,
          avatar: true,
          xp: true,
          level: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Format friends
  const formattedFriends = friends.map((friend) => {
    const isRequester = friend.userId === session.userId;
    const otherUser = isRequester ? friend.acceptee : friend.requester;
    return {
      id: otherUser.id,
      name: otherUser.name,
      avatar: otherUser.avatar,
      xp: otherUser.xp,
      level: otherUser.level,
      friendSince: friend.createdAt,
    };
  });

  return NextResponse.json({
    incomingRequests,
    outgoingRequests,
    friends: formattedFriends,
  });
}
