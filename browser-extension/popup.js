/**
 * LinguaScout Popup Script
 * Manages WebSocket connection to the LinguaScout backend and
 * forwards subtitle text detected by the content script.
 */

(function () {
  "use strict";

  // ---- DOM Elements ----
  const roomInput       = document.getElementById("roomCode");
  const connectBtn      = document.getElementById("connectBtn");
  const statusDot       = document.getElementById("statusDot");
  const statusText      = document.getElementById("statusText");
  const subtitlePreview = document.getElementById("subtitlePreview");
  const connectionHint  = document.getElementById("connectionHint");

  // ---- State ----
  const WS_URL = "ws://localhost:3004/";
  let ws = null;
  let roomCode = "";
  let isConnected = false;
  let isConnecting = false;
  let lastSentText = "";
  let storagePollTimer = null;
  let reconnectTimer = null;
  let intentionalClose = false;

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
      // disconnected / idle
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

  // ---- WebSocket ----
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
    setStatus("connecting");

    try {
      ws = new WebSocket(WS_URL);

      // Set a 5-second connection timeout
      const connectTimeout = setTimeout(() => {
        if (isConnecting) {
          setStatus("error", "Connection timed out — is the server running on port 3004?");
          isConnecting = false;
          cleanup();
        }
      }, 5000);

      ws.onopen = () => {
        clearTimeout(connectTimeout);
        isConnected = true;
        isConnecting = false;
        setStatus("connected");

        // Join the room
        ws.send(JSON.stringify({ type: "join-room", code: roomCode }));
        console.log(`[LinguaScout] Connected & joined room ${roomCode}`);

        // Start polling chrome.storage for subtitles
        startStoragePolling();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[LinguaScout] WS message:", data);
        } catch {
          // Non-JSON message, ignore
        }
      };

      ws.onclose = (event) => {
        clearTimeout(connectTimeout);
        isConnected = false;
        isConnecting = false;
        stopStoragePolling();

        if (!intentionalClose) {
          setStatus("error", `Disconnected (code ${event.code}) — retrying in 5s…`);
          console.warn(`[LinguaScout] Connection closed (code: ${event.code}). Reconnecting in 5s…`);
          reconnectTimer = setTimeout(connect, 5000);
        } else {
          setStatus("disconnected");
        }
      };

      ws.onerror = () => {
        console.error("[LinguaScout] WebSocket error");
        // onerror fires before onclose, so let onclose handle the UI
      };

    } catch (err) {
      setStatus("error", "Failed to create connection");
      isConnecting = false;
      console.error("[LinguaScout] WebSocket creation error:", err);
    }
  }

  function disconnect() {
    intentionalClose = true;
    isConnecting = false;
    clearTimeout(reconnectTimer);
    stopStoragePolling();

    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "leave-room", code: roomCode }));
        }
      } catch { /* ignore */ }
      ws.close();
      ws = null;
    }

    isConnected = false;
    lastSentText = "";
    setStatus("disconnected");
  }

  function cleanup() {
    if (ws) {
      try { ws.close(); } catch { /* ignore */ }
      ws = null;
    }
  }

  // ---- Storage Polling ----
  function startStoragePolling() {
    stopStoragePolling();
    storagePollTimer = setInterval(pollStorage, 300);
    pollStorage(); // Immediate first poll
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

        // Send to WebSocket if it's new text and we're connected
        if (isConnected && text && text !== lastSentText) {
          lastSentText = text;
          try {
            ws.send(
              JSON.stringify({
                type: "subtitle",
                code: roomCode,
                text: text,
              })
            );
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
      // Cancel connection attempt
      intentionalClose = true;
      isConnecting = false;
      clearTimeout(reconnectTimer);
      cleanup();
      setStatus("disconnected");
    } else {
      connect();
    }
  });

  // Allow Enter key to connect
  roomInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      connectBtn.click();
    }
  });

  // Restore saved room code on popup open
  chrome.storage.local.get("linguaScout_roomCode", (result) => {
    if (result.linguaScout_roomCode) {
      roomInput.value = result.linguaScout_roomCode;
    }
  });

  // Save room code whenever it changes
  roomInput.addEventListener("input", () => {
    chrome.storage.local.set({ linguaScout_roomCode: roomInput.value });
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
  });
})();
