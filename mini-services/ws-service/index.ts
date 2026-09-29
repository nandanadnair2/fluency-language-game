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
    const code = String(Math.floor(1000 + Math.random() * 9000));
    rooms.set(code, new Set([socket.id]));
    socket.join(code);
    console.log(`[create-room] socket=${socket.id} room=${code}`);
    if (callback) callback({ code });
  });

  // ── join-room ───────────────────────────────────────────────────
  // Auto-creates room if it doesn't exist (supports web app room codes)
  socket.on("join-room", (code: string, callback) => {
    let members = rooms.get(code);

    // Auto-create room if it doesn't exist yet
    if (!members) {
      console.log(`[join-room] Auto-creating room=${code} for socket=${socket.id}`);
      members = new Set();
      rooms.set(code, members);
    }

    members.add(socket.id);
    socket.join(code);
    const memberList = Array.from(members);
    console.log(`[join-room] socket=${socket.id} room=${code} members=${memberList.length}`);
    if (callback) callback({ members: memberList });

    // Notify existing room members
    socket.to(code).emit("member-joined", { socketId: socket.id, members: memberList });
  });

  // ── subtitle ───────────────────────────────────────────────────
  socket.on("subtitle", (payload: { code: string; text: string }) => {
    const { code, text } = payload;
    let members = rooms.get(code);

    // Auto-create room if needed
    if (!members) {
      console.log(`[subtitle] Auto-creating room=${code}`);
      members = new Set([socket.id]);
      rooms.set(code, members);
      socket.join(code);
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
  console.log(`Fluency WebSocket service running on port ${PORT}`);
});
