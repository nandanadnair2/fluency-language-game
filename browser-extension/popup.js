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

  // ---- State ----
  const WS_URL = "ws://localhost:3004/";
  let ws = null;
  let roomCode = "";
  let isConnected = false;
  let lastSentText = "";
  let storagePollTimer = null;
  let reconnectTimer = null;
  let intentionalClose = false;

  // ---- UI Helpers ----
  function setStatus(state) {
    statusDot.className = "status-dot";
    if (state === "connected") {
      statusDot.classList.add("connected");
      statusText.textContent = `Connected to room ${roomCode}`;
      connectBtn.textContent = "Disconnect";
      connectBtn.classList.add("connected");
    } else if (state === "error") {
      statusDot.classList.add("error");
      statusText.textContent = "Connection failed";
      connectBtn.textContent = "Connect";
      connectBtn.classList.remove("connected");
    } else {
      statusText.textContent = "Not connected";
      connectBtn.textContent = "Connect";
      connectBtn.classList.remove("connected");
    }
  }

  function updateSubtitlePreview(text) {
    if (!text) {
      subtitlePreview.textContent = "Waiting for subtitles…";
      subtitlePreview.classList.add("empty");
    } else {
      subtitlePreview.textContent = text;
      subtitlePreview.classList.remove("empty");
    }
  }

  // ---- WebSocket ----
  function connect() {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
      return;
    }

    intentionalClose = false;
    setStatus("connecting");
    statusText.textContent = "Connecting…";

    try {
      ws = new WebSocket(WS_URL);
    } catch (err) {
      setStatus("error");
      console.error("[LinguaScout] WebSocket creation error:", err);
      return;
    }

    ws.onopen = () => {
      isConnected = true;
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
        // Handle any server responses if needed in the future
      } catch {
        // Non-JSON message, ignore
      }
    };

    ws.onclose = (event) => {
      isConnected = false;
      stopStoragePolling();

      if (!intentionalClose) {
        setStatus("error");
        console.warn(`[LinguaScout] Connection closed (code: ${event.code}). Reconnecting in 3s…`);
        reconnectTimer = setTimeout(connect, 3000);
      } else {
        setStatus("disconnected");
      }
    };

    ws.onerror = () => {
      console.error("[LinguaScout] WebSocket error");
    };
  }

  function disconnect() {
    intentionalClose = true;
    clearTimeout(reconnectTimer);
    stopStoragePolling();

    if (ws) {
      // Leave the room before closing
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

  // ---- Storage Polling ----
  function startStoragePolling() {
    stopStoragePolling();
    // Poll every 300ms for new subtitle data
    storagePollTimer = setInterval(pollStorage, 300);
    // Also poll immediately
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
    } else {
      roomCode = roomInput.value.trim();
      if (roomCode.length < 1) {
        roomInput.focus();
        return;
      }
      // Save room code for persistence
      chrome.storage.local.set({ linguaScout_roomCode: roomCode });
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

  // Always show the latest subtitle, even when not connected
  chrome.storage.local.get(
    ["linguaScout_lastSubtitle", "linguaScout_lastTimestamp"],
    (result) => {
      updateSubtitlePreview(result.linguaScout_lastSubtitle || "");
    }
  );

  // Clean up when popup closes
  // (The popup is destroyed when closed; WS may continue if background service worker is used)
  window.addEventListener("unload", () => {
    // Intentionally do NOT disconnect here so the WebSocket stays alive
    // as long as the popup is open. The browser will close the socket
    // when the popup is destroyed.
    stopStoragePolling();
    clearTimeout(reconnectTimer);
  });
})();
