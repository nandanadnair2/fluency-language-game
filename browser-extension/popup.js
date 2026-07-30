/**
 * Fluency Popup Script v5
 * Connects to a self-hosted Fluency WebSocket service.
 * The user provides their Fluency server URL and the extension
 * connects via Socket.io to sync subtitles in real-time.
 *
 * NOTE: This requires a self-hosted Fluency server. The extension cannot
 * connect to cloud-hosted sandbox environments.
 */

(function () {
  "use strict";

  // ---- DOM Elements ----
  const serverUrlInput = document.getElementById("serverUrl");
  const roomInput       = document.getElementById("roomCode");
  const connectBtn      = document.getElementById("connectBtn");
  const statusDot       = document.getElementById("statusDot");
  const statusText      = document.getElementById("statusText");
  const subtitlePreview = document.getElementById("subtitlePreview");
  const connectionHint  = document.getElementById("connectionHint");

  // ---- State ----
  let socket = null;
  let roomCode = "";
  let isConnected = false;
  let isConnecting = false;
  let lastSentText = "";
  let storagePollTimer = null;
  let intentionalClose = false;

  // ---- Server URL Helpers ----
  // The user enters the web app URL (e.g. http://localhost:81).
  // We route through the Caddy gateway via XTransformPort=3004.
  function getServerUrl() {
    const val = serverUrlInput.value.trim();
    if (val && val.length > 4) return val;
    return ""; // No default — user must enter their web app URL
  }

  function buildSocketUrl(serverBase) {
    let url = serverBase.trim().replace(/\/+$/, "");
    // Remove any existing query/hash
    const hashIdx = url.indexOf("#");
    const qIdx = url.indexOf("?");
    if (hashIdx > -1) url = url.substring(0, hashIdx);
    if (qIdx > -1) url = url.substring(0, qIdx);
    // Extract host and optional port
    const urlMatch = url.match(/^(https?:\/\/[^:]+)(?::(\d+))?/);
    if (urlMatch) {
      const base = urlMatch[1];
      const port = urlMatch[2];
      // For localhost: ALWAYS use port 3004 (the WebSocket service)
      // regardless of what port the user entered (3000 = web app, 3004 = ws)
      if (base.includes("localhost") || base.includes("127.0.0.1")) {
        return `${base}:3004`;
      }
      // For remote URLs: use the port user provided, or default to the URL as-is
      return url;
    }
    return url;
  }

  // ---- UI Helpers ----
  function setStatus(state, message) {
    statusDot.className = "status-dot";

    if (state === "connected") {
      statusDot.classList.add("connected");
      statusText.textContent = message || `Connected to room ${roomCode}`;
      statusText.className = "status-text";
      connectBtn.textContent = "Disconnect";
      connectBtn.classList.add("connected");
      connectionHint.style.display = "none";
    } else if (state === "error") {
      statusDot.classList.add("error");
      statusText.textContent = message || "Connection failed";
      statusText.className = "status-text error-text";
      connectBtn.textContent = "Connect";
      connectBtn.classList.remove("connected");
      connectionHint.style.display = "block";
    } else if (state === "connecting") {
      statusDot.classList.add("connecting");
      statusText.textContent = message || "Connecting…";
      statusText.className = "status-text";
      connectBtn.textContent = "Cancel";
      connectBtn.classList.remove("connected");
      connectionHint.style.display = "none";
    } else {
      statusText.textContent = message || "Not connected";
      statusText.className = "status-text";
      connectBtn.textContent = "Connect";
      connectBtn.classList.remove("connected");
      connectionHint.style.display = "block";
    }
  }

  function updateSubtitlePreview(text) {
    if (!text || text.trim().length === 0) {
      subtitlePreview.textContent = "Waiting for subtitles…";
      subtitlePreview.classList.add("empty");
    } else {
      subtitlePreview.textContent = text;
      subtitlePreview.classList.remove("empty");
    }
  }

  // ---- Socket.io Connection ----
  function connect() {
    if (isConnected || isConnecting) return;

    // Validate server URL
    const serverUrl = getServerUrl();
    if (!serverUrl) {
      serverUrlInput.focus();
      serverUrlInput.style.borderColor = "#E8735A";
      setTimeout(() => { serverUrlInput.style.borderColor = "#EDE5D8"; }, 1500);
      setStatus("error", "Please enter the Web App URL");
      return;
    }

    // Validate room code
    roomCode = roomInput.value.trim();
    if (roomCode.length < 1) {
      roomInput.focus();
      roomInput.style.borderColor = "#E8735A";
      setTimeout(() => { roomInput.style.borderColor = "#EDE5D8"; }, 1500);
      return;
    }

    intentionalClose = false;
    isConnecting = true;
    setStatus("connecting", "Connecting to server…");

    const socketUrl = buildSocketUrl(serverUrl);

    console.log(`[Fluency] Connecting to: ${socketUrl}`);
    console.log(`[Fluency] Room code: ${roomCode}`);

    try {
      socket = io(socketUrl, {
        // Match the ws-service path configuration
        path: "/",
        transports: ["websocket", "polling"],
        timeout: 8000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
        forceNew: true,
      });

      // Connection timeout fallback
      const connectTimeout = setTimeout(() => {
        if (isConnecting && !isConnected) {
          setStatus("error", "Connection timed out — check the server URL");
          isConnecting = false;
          cleanup();
        }
      }, 10000);

      socket.on("connect", () => {
        clearTimeout(connectTimeout);
        isConnected = true;
        isConnecting = false;
        console.log(`[Fluency] Socket connected: ${socket.id}`);
        setStatus("connected");

        // Join the room
        socket.emit("join-room", roomCode, (response) => {
          console.log(`[Fluency] Joined room ${roomCode}:`, response);
        });

        // Start polling chrome.storage for subtitles
        startStoragePolling();
      });

      socket.on("disconnect", (reason) => {
        clearTimeout(connectTimeout);
        isConnected = false;
        isConnecting = false;
        stopStoragePolling();
        console.warn(`[Fluency] Disconnected: ${reason}`);

        if (!intentionalClose) {
          setStatus("error", `Disconnected (${reason}) — retrying…`);
        } else {
          setStatus("disconnected");
        }
      });

      socket.on("connect_error", (err) => {
        clearTimeout(connectTimeout);
        isConnecting = false;
        console.error(`[Fluency] Connection error: ${err.message}`);
        setStatus("error", `Connection failed — ${err.message}`);
        cleanup();
      });

      socket.on("subtitle", (data) => {
        console.log("[Fluency] Subtitle echoed:", data.text?.slice(0, 40));
      });

      socket.on("member-joined", (data) => {
        console.log("[Fluency] Member joined:", data);
      });

      socket.on("member-left", (data) => {
        console.log("[Fluency] Member left:", data);
      });

    } catch (err) {
      setStatus("error", "Failed to create connection");
      isConnecting = false;
      console.error("[Fluency] Socket creation error:", err);
    }
  }

  function disconnect() {
    intentionalClose = true;
    isConnecting = false;
    stopStoragePolling();

    if (socket) {
      try {
        if (isConnected && roomCode) {
          socket.emit("leave-room", roomCode);
        }
        socket.disconnect();
      } catch { /* ignore */ }
      socket = null;
    }

    isConnected = false;
    lastSentText = "";
    setStatus("disconnected");
  }

  function cleanup() {
    if (socket) {
      try { socket.disconnect(); } catch { /* ignore */ }
      socket = null;
    }
  }

  // ---- Storage Polling ----
  function startStoragePolling() {
    stopStoragePolling();
    storagePollTimer = setInterval(pollStorage, 300);
    pollStorage();
  }

  function stopStoragePolling() {
    if (storagePollTimer) {
      clearInterval(storagePollTimer);
      storagePollTimer = null;
    }
  }

  function pollStorage() {
    chrome.storage.local.get(
      ["fluency_lastSubtitle", "fluency_lastTimestamp"],
      (result) => {
        const text = result.fluency_lastSubtitle || "";
        updateSubtitlePreview(text);

        if (isConnected && text && text !== lastSentText) {
          lastSentText = text;
          try {
            socket.emit("subtitle", {
              code: roomCode,
              text: text,
            });
            console.log(`[Fluency] Sent subtitle: "${text.slice(0, 50)}"`);
          } catch (err) {
            console.error("[Fluency] Failed to send subtitle:", err);
          }
        }
      }
    );
  }

  // ---- Event Listeners ----
  connectBtn.addEventListener("click", () => {
    if (isConnected) {
      disconnect();
    } else if (isConnecting) {
      intentionalClose = true;
      isConnecting = false;
      cleanup();
      setStatus("disconnected");
    } else {
      connect();
    }
  });

  roomInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") connectBtn.click();
  });

  // Restore saved values on popup open
  chrome.storage.local.get(
    ["fluency_roomCode", "fluency_serverUrl"],
    (result) => {
      if (result.fluency_roomCode) {
        roomInput.value = result.fluency_roomCode;
      }
      if (result.fluency_serverUrl) {
        serverUrlInput.value = result.fluency_serverUrl;
      }
    }
  );

  // Save on change
  roomInput.addEventListener("input", () => {
    chrome.storage.local.set({ fluency_roomCode: roomInput.value });
  });

  serverUrlInput.addEventListener("input", () => {
    chrome.storage.local.set({ fluency_serverUrl: serverUrlInput.value });
  });

  // Show latest subtitle even when not connected
  chrome.storage.local.get(
    ["fluency_lastSubtitle", "fluency_lastTimestamp"],
    (result) => {
      updateSubtitlePreview(result.fluency_lastSubtitle || "");
    }
  );

  // Cleanup on popup close
  window.addEventListener("unload", () => {
    stopStoragePolling();
  });
})();
