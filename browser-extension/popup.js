/**
 * Fluency Popup Script v7
 * Connects to a self-hosted Fluency WebSocket service.
 *
 * v7: Active diagnostic PING system — popup queries content script on every open.
 * Shows clear pipeline status with troubleshooting guidance.
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
  const diagContent     = document.getElementById("diagnosticsContent");
  const diagSection     = document.getElementById("diagnosticsSection");

  // ---- State ----
  let socket = null;
  let roomCode = "";
  let isConnected = false;
  let isConnecting = false;
  let lastSentText = "";
  let storagePollTimer = null;
  let intentionalClose = false;
  let pingResponse = null;

  // ---- Diagnostics ----
  let audioStage = "idle";
  let chunkCount = 0;
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
        audioLabel.textContent = "🎙️ Audio Capture";
        audioDetail.textContent = detail || "Capturing audio…";
        audioIcon.textContent = "🎙️";
        break;
      case "transcribing":
        audioLabel.textContent = "⚡ Transcribing…";
        audioDetail.textContent = detail || "Sending audio to AI…";
        audioIcon.textContent = "⚡";
        break;
      case "success":
        audioLabel.textContent = "✅ Speech Detected";
        audioDetail.textContent = detail || "Translating…";
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
        audioDetail.textContent = detail || "No speech detected yet";
        audioIcon.textContent = "🔇";
        break;
      case "no_data":
        audioLabel.textContent = "⚠️ No Audio Data";
        audioDetail.textContent = detail || "Is the video unmuted?";
        audioIcon.textContent = "⚠️";
        break;
      case "muted":
        audioLabel.textContent = "🔇 Video Muted";
        audioDetail.textContent = detail || "Unmute the video";
        audioIcon.textContent = "🔇";
        break;
      case "error":
        audioLabel.textContent = "❌ Error";
        audioDetail.textContent = detail || "Audio capture error";
        audioIcon.textContent = "❌";
        break;
      default:
        audioLabel.textContent = "🎙️ Audio";
        audioDetail.textContent = detail || "";
        audioIcon.textContent = "🎙️";
    }
  }

  // ---- Diagnostics Display ----
  function updateDiagnostics() {
    if (!diagContent) return;

    const lines = [];

    // Content script status
    if (pingResponse) {
      if (pingResponse.contentScriptActive) {
        lines.push("✅ Content script: active");
      } else {
        lines.push("❌ " + (pingResponse.error || "Content script not active"));
      }
    } else {
      lines.push("⏳ Checking content script…");
      return; // Don't show other diagnostics until PING returns
    }

    // Video info
    if (pingResponse.video && pingResponse.video.found) {
      const v = pingResponse.video;
      const state = v.playing ? "▶️ playing" : "⏸️ paused";
      const mute = v.muted ? " 🔇 muted" : " 🔊 audio on";
      lines.push(`🎬 Video: ${state}${mute} (${v.width}×${v.height})`);
      if (v.hasCaptureStream) {
        lines.push("📡 captureStream: available");
      } else {
        lines.push("⚠️ captureStream: NOT available");
      }
    } else if (pingResponse.contentScriptActive) {
      lines.push("❌ No video element found on page");
    }

    // Audio script injection
    if (pingResponse.audioScriptInjected) {
      lines.push("📡 Audio script: injected");
    } else if (pingResponse.contentScriptActive) {
      lines.push("❌ Audio script: NOT injected");
    }

    // Audio capture status
    if (pingResponse.audioCaptureStatus) {
      const st = pingResponse.audioCaptureStatus;
      lines.push(`🎙️ Audio: ${st.status}${st.error ? " (" + st.error + ")" : ""}`);
    } else if (pingResponse.contentScriptActive) {
      lines.push("⏳ Audio capture: not started");
    }

    // Chunk stats
    if (chunkCount > 0) {
      lines.push(`📦 Chunks: ${chunkCount}`);
    }

    // Last error
    if (lastError) {
      lines.push(`❌ Error: ${lastError}`);
    }

    diagContent.textContent = lines.join("\n");
  }

  // ── PING Content Script ──────────────────────────────────────
  function pingContentScript() {
    // Clear previous diagnostics while we wait
    diagContent.textContent = "⏳ Checking YouTube/Netflix tab…";
    audioIndicator.classList.remove("visible");

    chrome.runtime.sendMessage({ type: "FLUENCY_PING" }, (response) => {
      if (chrome.runtime.lastError) {
        pingResponse = { contentScriptActive: false, error: "Background not responding: " + chrome.runtime.lastError.message };
        updateDiagnostics();
        return;
      }
      if (!response) {
        pingResponse = { contentScriptActive: false, error: "No response from background" };
        updateDiagnostics();
        return;
      }

      pingResponse = response;
      console.log("[Fluency] PONG received:", JSON.stringify(response).slice(0, 300));

      // Parse the pong response and update UI
      if (!response.contentScriptActive) {
        // Content script is not running on any YouTube/Netflix tab
        updateAudioStage("idle");
        lastError = response.error || "Content script not active";
        updateDiagnostics();

        // Show guidance in subtitle area
        subtitlePreview.textContent = "Open a YouTube or Netflix video page, then reload this popup.";
        subtitlePreview.classList.add("empty");
        return;
      }

      // Content script is active — check audio capture state
      const audioStatus = response.audioCaptureStatus;
      if (audioStatus) {
        const status = audioStatus.status;
        if (status === "active" || status === "active_data") {
          chunkCount = audioStatus.chunksProduced || chunkCount;
          updateAudioStage("capturing", `Audio active — ${chunkCount} chunk(s) captured`);
        } else if (status === "no_data") {
          updateAudioStage("no_data", `No audio data after ${audioStatus.elapsed || "?"}s — unmute the video`);
          lastError = "No audio data received";
        } else if (status === "muted") {
          updateAudioStage("muted", audioStatus.error || "Video is muted");
        } else if (status === "error") {
          lastError = audioStatus.error || "Audio capture error";
          updateAudioStage("error", lastError);
        } else if (status === "stopped") {
          updateAudioStage("idle");
        }
      } else {
        // Audio capture status not received — audio-capture.js may not have started yet
        const video = response.video;
        if (video && video.found) {
          if (!video.playing) {
            updateAudioStage("idle");
            diagContent.textContent = "✅ Content script active\n🎬 Video found but paused\n⏳ Audio capture will start when video plays";
            subtitlePreview.textContent = "Video is paused. Press play to start audio capture.";
            subtitlePreview.classList.add("empty");
            return;
          }
          if (video.muted || video.volume === 0) {
            updateAudioStage("muted", "Video is muted — unmute for audio capture");
          } else if (!video.hasCaptureStream) {
            updateAudioStage("error", "captureStream() not supported on this video");
            lastError = "captureStream not available";
          } else {
            // Video is playing, unmuted, has captureStream, but audio capture hasn't started
            // audio-capture.js might still be in its 4s initial delay
            updateAudioStage("capturing", "Waiting for audio capture to start…");
            // Retry ping in a few seconds
            setTimeout(pingContentScript, 5000);
          }
        } else {
          updateAudioStage("idle");
          diagContent.textContent = "✅ Content script active\n❌ No video element found on page\n🔍 Try navigating to a video";
        }
      }

      updateDiagnostics();

      // Show any existing subtitle
      if (response.lastSubtitleText) {
        updateSubtitlePreview(response.lastSubtitleText);
      }
    });
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
        if (!intentionalClose) {
          setStatus("error", `Disconnected (${reason}) — retrying…`);
        } else {
          setStatus("disconnected");
        }
      });

      socket.on("connect_error", (err) => {
        clearTimeout(connectTimeout);
        isConnecting = false;
        setStatus("error", `Connection failed — ${err.message}`);
        cleanup();
      });

      socket.on("subtitle", (data) => {
        console.log("[Fluency] Subtitle echoed:", data.text?.slice(0, 40));
      });

    } catch (err) {
      setStatus("error", "Failed to create connection");
      isConnecting = false;
    }
  }

  function disconnect() {
    intentionalClose = true;
    isConnecting = false;
    stopStoragePolling();
    if (socket) {
      try {
        if (isConnected && roomCode) socket.emit("leave-room", roomCode);
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
    storagePollTimer = setInterval(pollStorage, 500);
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
      ["fluency_lastSubtitle", "fluency_lastTimestamp", "fluency_audioMode", "fluency_audioStatus"],
      (result) => {
        const text = result.fluency_lastSubtitle || "";
        updateSubtitlePreview(text);
        lastUpdateTime = result.fluency_lastTimestamp || 0;

        if (isConnected && text && text !== lastSentText) {
          lastSentText = text;
          try {
            socket.emit("subtitle", { code: roomCode, text: text });
          } catch (err) { /* ignore */ }
        }
      }
    );
  }

  // ---- Event Listeners ----
  connectBtn.addEventListener("click", () => {
    if (isConnected) disconnect();
    else if (isConnecting) { intentionalClose = true; isConnecting = false; cleanup(); setStatus("disconnected"); }
    else connect();
  });

  roomInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") connectBtn.click();
  });

  // Restore saved values on popup open
  chrome.storage.local.get(["fluency_roomCode", "fluency_serverUrl"], (result) => {
    if (result.fluency_roomCode) roomInput.value = result.fluency_roomCode;
    if (result.fluency_serverUrl) serverUrlInput.value = result.fluency_serverUrl;
  });

  roomInput.addEventListener("input", () => {
    chrome.storage.local.set({ fluency_roomCode: roomInput.value });
  });
  serverUrlInput.addEventListener("input", () => {
    chrome.storage.local.set({ fluency_serverUrl: serverUrlInput.value });
  });

  // Listen for messages from background/content
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "FLUENCY_AUDIO_STATUS") {
      const status = message.status;
      if (status === "active" || status === "active_data") {
        chunkCount = message.chunksProduced || chunkCount;
        updateAudioStage("capturing", `Capturing — ${chunkCount} chunk(s)`);
      } else if (status === "no_data") {
        updateAudioStage("no_data", `No audio after ${message.elapsed || "?"}s — unmute video`);
      } else if (status === "muted") {
        updateAudioStage("muted", message.error || "Video muted");
      } else if (status === "stopped") {
        updateAudioStage("idle");
      } else if (status === "error") {
        lastError = message.error || "Audio error";
        updateAudioStage("error", lastError);
      }
    }

    if (message.type === "FLUENCY_TRANSCRIBED") {
      if (message.error) {
        lastError = message.error;
        updateAudioStage("error", "Transcription: " + message.error);
      } else if (message.text) {
        chunkCount++;
        updateAudioStage("success", `Recognized: "${message.text.slice(0, 40)}…"`);
        updateSubtitlePreview(message.text);
      } else if (message.info) {
        updateAudioStage("no_speech", message.info);
      }
    }
  });

  // ---- On Popup Open: Ping content script immediately ----
  // This is the KEY fix — actively query instead of passively waiting
  pingContentScript();

  // Cleanup on popup close
  window.addEventListener("unload", () => {
    stopStoragePolling();
  });
})();
