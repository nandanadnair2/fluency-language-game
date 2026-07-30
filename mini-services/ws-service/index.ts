import { createServer } from "http";
import { Server } from "socket.io";

const PORT = 3004;

// Room code → Set of socket IDs
const rooms = new Map<string, Set<string>>();

const httpServer = createServer();

const io = new Server(httpServer, {
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

/**
 * Generate a random 4-digit room code that doesn't collide
 * with an existing room.
 */
function generateRoomCode(): string {
  let code: string;
  do {
    code = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  } while (rooms.has(code));
  return code;
}

/**
 * Build a mock translation object for demonstration / development.
 */
function buildMockTranslation(originalText: string) {
  return {
    original: originalText,
    directTranslation: `[Translation of: "${originalText}"]`,
    romanized: `[Romanized: "${originalText}"]`,
    sourceLanguage: "auto",
    targetLanguage: "en",
  };
}

io.on("connection", (socket) => {
  console.log(`[connect] socket=${socket.id}`);

  // ── create-room ────────────────────────────────────────────────
  socket.on("create-room", (callback) => {
    const code = generateRoomCode();
    rooms.set(code, new Set([socket.id]));
    socket.join(code);
    console.log(`[create-room] socket=${socket.id} room=${code}`);
    callback({ code });
  });

  // ── join-room ───────────────────────────────────────────────────
  socket.on("join-room", (code: string, callback) => {
    const members = rooms.get(code);
    if (!members) {
      return callback({ error: "Room not found" });
    }

    members.add(socket.id);
    socket.join(code);
    const memberList = Array.from(members);
    console.log(`[join-room] socket=${socket.id} room=${code} members=${memberList.length}`);
    callback({ members: memberList });

    // Notify existing room members about the new participant
    socket.to(code).emit("member-joined", { socketId: socket.id, members: memberList });
  });

  // ── subtitle ───────────────────────────────────────────────────
  socket.on("subtitle", (payload: { code: string; text: string }) => {
    const { code, text } = payload;
    const members = rooms.get(code);

    if (!members) {
      console.warn(`[subtitle] room=${code} not found`);
      return;
    }

    const translation = buildMockTranslation(text);
    const data = { code, text, translation };

    console.log(`[subtitle] room=${code} text="${text.slice(0, 60)}"`);
    io.to(code).emit("subtitle", data);
  });

  // ── leave-room ────────────────────────────────────────────────
  socket.on("leave-room", (code: string) => {
    const members = rooms.get(code);
    if (!members) return;

    members.delete(socket.id);
    socket.leave(code);
    console.log(`[leave-room] socket=${socket.id} room=${code} remaining=${members.size}`);

    if (members.size === 0) {
      rooms.delete(code);
      console.log(`[leave-room] room=${code} deleted (empty)`);
    } else {
      const memberList = Array.from(members);
      socket.to(code).emit("member-left", { socketId: socket.id, members: memberList });
    }
  });

  // ── disconnect ────────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log(`[disconnect] socket=${socket.id}`);

    // Remove the socket from every room it belongs to
    for (const [code, members] of rooms) {
      if (members.has(socket.id)) {
        members.delete(socket.id);
        console.log(`[disconnect] removed from room=${code} remaining=${members.size}`);

        if (members.size === 0) {
          rooms.delete(code);
          console.log(`[disconnect] room=${code} deleted (empty)`);
        } else {
          const memberList = Array.from(members);
          io.to(code).emit("member-left", { socketId: socket.id, members: memberList });
        }
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`LinguaScout WebSocket service running on port ${PORT}`);
});
