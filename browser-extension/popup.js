/**
 * Fluency Popup Script v6
 * Connects to a self-hosted Fluency WebSocket service.
 * Shows detailed transcription pipeline status with diagnostics.
 *
 * v6: Added detailed stage-by-step status display, chunk counter,
 * last-error display, and "last update" freshness indicator.
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
  const audioIndicator  = document.getElementById("audioIndicator");
  const audioDetail     = document.getElementById("audioDetail");
  const audioLabel      = document.getElementById("audioLabel");
  const audioIcon       = document.querySelector(".audio-icon");
  const diagSection     = document.getElementById("diagnosticsSection");
  const diagContent     = document.getElementById("diagnosticsContent");

  // ---- State ----
  let socket = null;
  let roomCode = "";
  let isConnected = false;
  let isConnecting = false;
  let lastSentText = "";
  let storagePollTimer = null;
  let intentionalClose = false;

  // ---- Diagnostics State ----
  let audioStage = "idle"; // idle, capturing, transcribing, error, no_data, muted
  let chunkCount = 0;
  let transcriptionCount = 0;
  let lastError = "";
  let lastUpdateTime = 0;

  // ---- Server URL Helpers ----
  function getServerUrl() {
    const val = serverUrlInput.value.trim();
    if (val && val.length > 4) return val;
    return "";
  }

  function buildSocketUrl(serverBase) {
    let url = serverBase.trim().replace(/\/+$/, "");
    const hashIdx = url.indexOf("#");
    const qIdx = url.indexOf("?");
    if (hashIdx > -1) url = url.substring(0, hashIdx);
    if (qIdx > -1) url = url.substring(0, qIdx);
    const urlMatch = url.match(/^(https?:\/\/[^:]+)(?::(\d+))?/);
    if (urlMatch) {
      const base = urlMatch[1];
      const port = urlMatch[2];
      if (base.includes("localhost") || base.includes("127.0.0.1")) {
        return `${base}:3004`;
      }
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

  // ---- Audio Stage Display ----
  function updateAudioStage(stage, detail) {
    audioStage = stage;
    updateDiagnostics();

    if (stage === "idle") {
      audioIndicator.classList.remove("visible");
      return;
    }

    audioIndicator.classList.add("visible");

    switch (stage) {
      case "capturing":
        audioLabel.textContent = "🎙️ Audio Capture Active";
        audioDetail.textContent = detail || "Capturing audio for AI transcription…";
        audioIcon.textContent = "🎙️";
        break;
      case "transcribing":
        audioLabel.textContent = "⚡ Transcribing…";
        audioDetail.textContent = detail || "Sending audio to AI for speech recognition…";
        audioIcon.textContent = "⚡";
        break;
      case "success":
        audioLabel.textContent = "✅ Speech Detected";
        audioDetail.textContent = detail || "Translating recognized speech…";
        audioIcon.textContent = "✅";
        setTimeout(() => {
          if (audioStage === "success") {
            audioStage = "capturing";
            updateAudioStage("capturing", "Listening for more speech…");
          }
        }, 3000);
        break;
      case "no_speech":
        audioLabel.textContent = "🔇 Listening…";
        audioDetail.textContent = detail || "No speech detected yet — keep the video playing";
        audioIcon.textContent = "🔇";
        break;
      case "no_data":
        audioLabel.textContent = "⚠️ No Audio Data";
        audioDetail.textContent = detail || "Audio capture active but no data received. Is the video unmuted?";
        audioIcon.textContent = "⚠️";
        break;
      case "muted":
        audioLabel.textContent = "🔇 Video Muted";
        audioDetail.textContent = detail || "Please unmute the video for audio capture to work";
        audioIcon.textContent = "🔇";
        break;
      case "error":
        audioLabel.textContent = "❌ Audio Error";
        audioDetail.textContent = detail || "An error occurred during audio capture";
        audioIcon.textContent = "❌";
        break;
      default:
        audioLabel.textContent = "🎙️ Audio Capture";
        audioDetail.textContent = detail || "";
        audioIcon.textContent = "🎙️";
    }
  }

  // ---- Diagnostics Panel ----
  function updateDiagnostics() {
    if (!diagContent) return;

    const lines = [];
    lines.push(`Stage: ${audioStage}`);

    if (chunkCount > 0) {
      lines.push(`Chunks captured: ${chunkCount}`);
    }
    if (transcriptionCount > 0) {
      lines.push(`Transcriptions: ${transcriptionCount}`);
    }
    if (lastError) {
      lines.push(`Last error: ${lastError}`);
    }
    if (lastUpdateTime > 0) {
      const secondsAgo = Math.round((Date.now() - lastUpdateTime) / 1000);
      lines.push(`Last update: ${secondsAgo}s ago`);
    }

    diagContent.textContent = lines.join(" | ") || "No activity yet";
  }

  // ---- Socket.io Connection ----
  function connect() {
    if (isConnected || isConnecting) return;

    const serverUrl = getServerUrl();
    if (!serverUrl) {
      serverUrlInput.focus();
      serverUrlInput.style.borderColor = "#E8735A";
      setTimeout(() => { serverUrlInput.style.borderColor = "#EDE5D8"; }, 1500);
      setStatus("error", "Please enter the Web App URL");
      return;
    }

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
        path: "/",
        transports: ["websocket", "polling"],
        timeout: 8000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
        forceNew: true,
      });

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

        socket.emit("join-room", roomCode, (response) => {
          console.log(`[Fluency] Joined room ${roomCode}:`, response);
        });

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
      [
        "fluency_lastSubtitle",
        "fluency_lastTimestamp",
        "fluency_audioMode",
        "fluency_audioStatus",
        "fluency_audioError",
        "fluency_audioChunksProduced",
        "fluency_audioElapsed",
        "fluency_lastError",
      ],
      (result) => {
        // Update subtitle preview
        const text = result.fluency_lastSubtitle || "";
        updateSubtitlePreview(text);
        lastUpdateTime = result.fluency_lastTimestamp || 0;

        // Update diagnostics from storage
        if (result.fluency_audioChunksProduced) {
          chunkCount = result.fluency_audioChunksProduced;
        }
        if (result.fluency_lastError) {
          lastError = result.fluency_lastError;
        }
        updateDiagnostics();

        // Sync subtitle to room via socket
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
    ["fluency_roomCode", "fluency_serverUrl", "fluency_lastSubtitle", "fluency_lastTimestamp", "fluency_audioMode", "fluency_audioStatus"],
    (result) => {
      if (result.fluency_roomCode) {
        roomInput.value = result.fluency_roomCode;
      }
      if (result.fluency_serverUrl) {
        serverUrlInput.value = result.fluency_serverUrl;
      }
      updateSubtitlePreview(result.fluency_lastSubtitle || "");
      lastUpdateTime = result.fluency_lastTimestamp || 0;

      // Restore audio mode from storage
      if (result.fluency_audioMode) {
        const status = result.fluency_audioStatus || "active";
        updateAudioStage("capturing", "Audio capture active on video page");
      }
      updateDiagnostics();
    }
  );

  // Save on change
  roomInput.addEventListener("input", () => {
    chrome.storage.local.set({ fluency_roomCode: roomInput.value });
  });

  serverUrlInput.addEventListener("input", () => {
    chrome.storage.local.set({ fluency_serverUrl: serverUrlInput.value });
  });

  // ---- Message Handlers ----
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Audio capture status from content script
    if (message.type === "FLUENCY_AUDIO_STATUS") {
      const status = message.status;
      if (status === "active" || status === "active_data") {
        if (status === "active_data" && message.chunksProduced) {
          chunkCount = message.chunksProduced;
          updateAudioStage("capturing", `Capturing audio — ${chunkCount} chunk(s) recorded`);
        } else {
          updateAudioStage("capturing", "Audio stream ready — waiting for first chunk…");
        }
      } else if (status === "no_data") {
        updateAudioStage("no_data", `No audio data after ${message.elapsed || "?"}s — is the video unmuted?`);
      } else if (status === "muted") {
        updateAudioStage("muted", message.error || "Video appears to be muted");
      } else if (status === "stopped") {
        updateAudioStage("idle");
      } else if (status === "error") {
        lastError = message.error || "Audio capture error";
        updateAudioStage("error", message.error || "Audio capture error");
      }
    }

    // Transcription result from background
    if (message.type === "FLUENCY_TRANSCRIBED") {
      if (message.error) {
        lastError = message.error;
        updateAudioStage("error", "Transcription: " + message.error);
      } else if (message.text) {
        transcriptionCount++;
        updateAudioStage("success", `Recognized: "${message.text.slice(0, 40)}…"`);
        updateSubtitlePreview(message.text);
      } else if (message.info) {
        updateAudioStage("no_speech", message.info);
      }
    }
  });

  // Cleanup on popup close
  window.addEventListener("unload", () => {
    stopStoragePolling();
  });
})();
