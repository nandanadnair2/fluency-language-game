/**
 * LinguaScout Popup Script v2
 * Uses socket.io-client to connect to the LinguaScout ws-service.
 * Forwards subtitle text detected by the content script in real-time.
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
  let reconnectTimer = null;
  let intentionalClose = false;

  // ---- Server URL Helpers ----
  // The ws-service runs on port 3004 behind the gateway.
  // When connecting to a Next.js server on port X, we append XTransformPort=3004.
  function buildSocketUrl(serverBase) {
    let url = serverBase.trim().replace(/\/+$/, "");
    // Remove any existing query params
    const hashIdx = url.indexOf("#");
    const qIdx = url.indexOf("?");
    if (hashIdx > -1) url = url.substring(0, hashIdx);
    if (qIdx > -1) url = url.substring(0, qIdx);

    // Determine the base port from the URL
    try {
      const parsed = new URL(url);
      const basePort = parsed.port || (parsed.protocol === "https:" ? "443" : "80");

      // If the user is connecting to the Next.js server (typically port 3000),
      // route to the ws-service via XTransformPort=3004
      return `${url}/?XTransformPort=3004`;
    } catch {
      return `${url}/?XTransformPort=3004`;
    }
  }

  function getServerUrl() {
    const val = serverUrlInput.value.trim();
    if (val && val.length > 3) return val;
    // Default: assume same server as the web app
    return window.location ? window.location.origin : "http://localhost:3000";
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

    const serverUrl = getServerUrl();
    const socketUrl = buildSocketUrl(serverUrl);

    console.log(`[LinguaScout] Connecting to: ${socketUrl}`);
    console.log(`[LinguaScout] Room code: ${roomCode}`);

    try {
      socket = io(socketUrl, {
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
          setStatus("error", "Connection timed out — check server URL");
          isConnecting = false;
          cleanup();
        }
      }, 10000);

      socket.on("connect", () => {
        clearTimeout(connectTimeout);
        isConnected = true;
        isConnecting = false;
        console.log(`[LinguaScout] Socket connected: ${socket.id}`);
        setStatus("connected");

        // Join the room via Socket.io event
        socket.emit("join-room", roomCode, (response) => {
          console.log(`[LinguaScout] Joined room ${roomCode}:`, response);
        });

        // Start polling chrome.storage for subtitles
        startStoragePolling();
      });

      socket.on("disconnect", (reason) => {
        clearTimeout(connectTimeout);
        isConnected = false;
        isConnecting = false;
        stopStoragePolling();
        console.warn(`[LinguaScout] Disconnected: ${reason}`);

        if (!intentionalClose) {
          setStatus("error", `Disconnected — retrying…`);
          // socket.io-client handles reconnection automatically
        } else {
          setStatus("disconnected");
        }
      });

      socket.on("connect_error", (err) => {
        clearTimeout(connectTimeout);
        isConnecting = false;
        console.error(`[LinguaScout] Connection error: ${err.message}`);
        setStatus("error", `Connection failed — ${err.message}`);
        cleanup();
      });

      socket.on("subtitle", (data) => {
        // Server echoing subtitle back — ignore (we sent it)
        console.log("[LinguaScout] Subtitle echoed back:", data.text?.slice(0, 40));
      });

      socket.on("member-joined", (data) => {
        console.log("[LinguaScout] Member joined:", data);
      });

      socket.on("member-left", (data) => {
        console.log("[LinguaScout] Member left:", data);
      });

    } catch (err) {
      setStatus("error", "Failed to create connection");
      isConnecting = false;
      console.error("[LinguaScout] Socket creation error:", err);
    }
  }

  function disconnect() {
    intentionalClose = true;
    isConnecting = false;
    clearTimeout(reconnectTimer);
    stopStoragePolling();

    if (socket) {
      try {
        // Leave the room before disconnecting
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
      ["linguaScout_lastSubtitle", "linguaScout_lastTimestamp"],
      (result) => {
        const text = result.linguaScout_lastSubtitle || "";
        updateSubtitlePreview(text);

        // Send to Socket.io if it's new text and we're connected
        if (isConnected && text && text !== lastSentText) {
          lastSentText = text;
          try {
            socket.emit("subtitle", {
              code: roomCode,
              text: text,
            });
            console.log(`[LinguaScout] Sent subtitle: "${text.slice(0, 50)}"`);
          } catch (err) {
            console.error("[LinguaScout] Failed to send subtitle:", err);
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

  // Allow Enter key to connect
  roomInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") connectBtn.click();
  });

  // Restore saved values on popup open
  chrome.storage.local.get(
    ["linguaScout_roomCode", "linguaScout_serverUrl"],
    (result) => {
      if (result.linguaScout_roomCode) {
        roomInput.value = result.linguaScout_roomCode;
      }
      if (result.linguaScout_serverUrl) {
        serverUrlInput.value = result.linguaScout_serverUrl;
      }
    }
  );

  // Save room code whenever it changes
  roomInput.addEventListener("input", () => {
    chrome.storage.local.set({ linguaScout_roomCode: roomInput.value });
  });

  // Save server URL whenever it changes
  serverUrlInput.addEventListener("input", () => {
    chrome.storage.local.set({ linguaScout_serverUrl: serverUrlInput.value });
  });

  // Always show the latest subtitle, even when not connected
  chrome.storage.local.get(
    ["linguaScout_lastSubtitle", "linguaScout_lastTimestamp"],
    (result) => {
      updateSubtitlePreview(result.linguaScout_lastSubtitle || "");
    }
  );

  // Clean up when popup closes
  window.addEventListener("unload", () => {
    stopStoragePolling();
    clearTimeout(reconnectTimer);
    // Keep socket alive when popup closes — it will reconnect when reopened
  });
})();
