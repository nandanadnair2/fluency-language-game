/**
 * Fluency Content Script v6
 * Detects subtitle/caption text from YouTube and Netflix.
 * Falls back to audio capture + ASR for videos WITHOUT closed captions.
 *
 * v6: All chrome.* API calls guarded against "Extension context invalidated"
 * (happens when extension is reloaded but page not refreshed).
 */

(function () {
  "use strict";

  // Prevent double-injection
  if (window.__fluencyInjected) return;
  window.__fluencyInjected = true;

  const HOST = window.location.hostname;
  const isYouTube = HOST.includes("youtube.com") || HOST.includes("youtu.be");
  const isNetflix = HOST.includes("netflix.com");

  if (!isYouTube && !isNetflix) return;

  let lastSubtitleText = "";
  let debounceTimer = null;
  let frameCaptureInterval = null;
  let frameProcessing = false;
  let ccDetected = false;
  let noCCTimer = null;
  let audioCaptureActive = false;
  let audioCaptureStatus = null;
  let extensionValid = true;

  // ---------------------------------------------------------------
  // Extension Context Guard
  // Prevents "Extension context invalidated" errors when the
  // extension is reloaded but the page hasn't been refreshed.
  // ---------------------------------------------------------------
  function isExtensionValid() {
    try {
      return !!chrome.runtime?.id;
    } catch (e) {
      return false;
    }
  }

  function safeStorageSet(obj) {
    try {
      if (isExtensionValid()) {
        chrome.storage.local.set(obj);
      }
    } catch (e) {
      extensionValid = false;
    }
  }

  function safeStorageGet(keys, callback) {
    try {
      if (!isExtensionValid()) return;
      chrome.storage.local.get(keys, callback);
    } catch (e) {
      extensionValid = false;
    }
  }

  function safeSendMessage(msg, callback) {
    try {
      if (!isExtensionValid()) return;
      if (callback) {
        chrome.runtime.sendMessage(msg, callback);
      } else {
        chrome.runtime.sendMessage(msg).catch(() => {});
      }
    } catch (e) {
      extensionValid = false;
    }
  }

  // ---------------------------------------------------------------
  // Video Detection
  // ---------------------------------------------------------------
  function getVideoElement() {
    const videos = document.querySelectorAll("video");
    for (const v of videos) {
      if (v.readyState >= 2 && v.videoWidth > 200) return v;
    }
    return videos[0] || null;
  }

  function getVideoInfo() {
    const video = getVideoElement();
    if (!video) return { found: false };
    return {
      found: true,
      playing: !video.paused && !video.ended,
      muted: video.muted,
      volume: video.volume,
      currentTime: video.currentTime,
      duration: video.duration,
      readyState: video.readyState,
      width: video.videoWidth,
      height: video.videoHeight,
      hasCaptureStream: typeof video.captureStream === "function" || typeof video.mozCaptureStream === "function",
    };
  }

  // ---------------------------------------------------------------
  // Inject audio-capture.js into the MAIN world
  // ---------------------------------------------------------------
  function injectAudioCapture() {
    if (document.getElementById("__fluencyAudioScript")) return;

    // Check if extension context is still valid before using chrome.runtime
    if (!isExtensionValid()) {
      console.warn("[Fluency] Extension context invalidated — cannot inject audio-capture.js. Refresh the page.");
      return;
    }

    try {
      const script = document.createElement("script");
      script.id = "__fluencyAudioScript";
      script.src = chrome.runtime.getURL("audio-capture.js");
      script.onload = () => {
        console.log("[Fluency] Audio capture script injected");
      };
      script.onerror = (e) => {
        console.error("[Fluency] Failed to inject audio-capture.js:", e);
      };
      (document.head || document.documentElement).appendChild(script);
    } catch (e) {
      console.error("[Fluency] Failed to inject audio-capture.js:", e);
      extensionValid = false;
    }
  }

  // ---------------------------------------------------------------
  // Listen for messages from audio-capture.js (MAIN world)
  // ---------------------------------------------------------------
  window.addEventListener("message", (event) => {
    if (!event.data || typeof event.data.type !== "string") return;
    if (!extensionValid) return; // Don't process if extension context is dead

    // Audio chunk received
    if (event.data.type === "FLUENCY_AUDIO_CHUNK") {
      handleAudioChunk(event.data.data, event.data.mimeType);
    }

    // Audio capture status updates
    if (event.data.type === "FLUENCY_AUDIO_STATUS") {
      audioCaptureStatus = event.data;
      const status = event.data.status;
      if (status === "active" || status === "active_data") {
        audioCaptureActive = true;
      } else if (status === "stopped" || status === "error") {
        audioCaptureActive = false;
      }

      // Store in chrome.storage (guarded)
      safeStorageSet({
        fluency_audioMode: audioCaptureActive,
        fluency_audioStatus: status,
        fluency_audioError: event.data.error || null,
        fluency_audioCodec: event.data.codec || null,
        fluency_audioChunksProduced: event.data.chunksProduced || 0,
        fluency_audioElapsed: event.data.elapsed || null,
        fluency_audioTracks: event.data.audioTracks || null,
      });

      // Forward to popup via background (guarded)
      safeSendMessage({
        type: "FLUENCY_AUDIO_STATUS",
        status: status,
        error: event.data.error,
        codec: event.data.codec,
        audioTracks: event.data.audioTracks,
        chunksProduced: event.data.chunksProduced,
        elapsed: event.data.elapsed,
      });
    }
  });

  // ---------------------------------------------------------------
  // Audio Transcription Pipeline
  // ---------------------------------------------------------------
  let transcriptionPending = false;
  let transcriptionTimeout = null;
  let chunksSent = 0;
  let chunksCompleted = 0;

  function handleAudioChunk(base64Audio, mimeType) {
    if (transcriptionPending || !extensionValid) return;
    transcriptionPending = true;
    chunksSent++;

    // Safety timeout
    clearTimeout(transcriptionTimeout);
    transcriptionTimeout = setTimeout(() => {
      console.warn("[Fluency] Transcription safety timeout");
      transcriptionPending = false;
      window.postMessage({ type: "FLUENCY_TRANSCRIPTION_DONE" }, "*");
    }, 20000);

    // Send to background (guarded)
    try {
      if (!isExtensionValid()) {
        transcriptionPending = false;
        return;
      }
      chrome.runtime.sendMessage(
        { type: "FLUENCY_AUDIO_CHUNK_BG", data: base64Audio, mimeType, chunkId: chunksSent },
        (response) => {
          if (!extensionValid) { transcriptionPending = false; return; }

          if (!response) {
            directTranscribe(base64Audio, mimeType);
            return;
          }
          if (response.status === "busy") {
            transcriptionPending = false;
            clearTimeout(transcriptionTimeout);
            setTimeout(() => {
              window.postMessage({ type: "FLUENCY_TRANSCRIPTION_DONE" }, "*");
            }, 2000);
            return;
          }
          console.log(`[Fluency] Chunk #${chunksSent} sent to background`);
        }
      );
    } catch (e) {
      extensionValid = false;
      transcriptionPending = false;
      directTranscribe(base64Audio, mimeType);
    }
  }

  function directTranscribe(base64Audio, mimeType) {
    safeStorageGet(["fluency_serverUrl"], (result) => {
      if (!extensionValid) return;
      const serverUrl = (result?.fluency_serverUrl || "http://localhost:3000").trim().replace(/\/+$/, "");

      fetch(`${serverUrl}/api/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64: base64Audio, mimeType: mimeType || "audio/wav" }),
      })
        .then((res) => res.json())
        .then((data) => {
          handleTranscriptionResult(data);
          transcriptionPending = false;
          clearTimeout(transcriptionTimeout);
          window.postMessage({ type: "FLUENCY_TRANSCRIPTION_DONE" }, "*");
        })
        .catch(() => {
          transcriptionPending = false;
          clearTimeout(transcriptionTimeout);
          window.postMessage({ type: "FLUENCY_TRANSCRIPTION_DONE" }, "*");
        });
    });
  }

  function handleTranscriptionResult(data) {
    chunksCompleted++;
    if (data.text && data.text.trim().length > 0) {
      safeStorageSet({
        fluency_lastSubtitle: data.text.trim(),
        fluency_lastTimestamp: Date.now(),
        fluency_audioMode: true,
      });
    }
  }

  // Listen for FLUENCY_TRANSCRIBED from background
  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // PING from popup
      if (message.type === "FLUENCY_PING") {
        const videoInfo = getVideoInfo();
        sendResponse({
          type: "FLUENCY_PONG",
          host: HOST,
          isYouTube, isNetflix,
          contentScriptActive: true,
          extensionValid: extensionValid,
          audioScriptInjected: !!document.getElementById("__fluencyAudioScript"),
          audioCaptureStatus: audioCaptureStatus,
          audioCaptureActive: audioCaptureActive,
          ccDetected, video: videoInfo,
          chunksSent, chunksCompleted, transcriptionPending,
          lastSubtitleText,
          timestamp: Date.now(),
        });
        return true;
      }

      // Transcription result
      if (message.type === "FLUENCY_TRANSCRIBED") {
        clearTimeout(transcriptionTimeout);
        if (message.error) {
          console.warn("[Fluency] Transcription error:", message.error);
        } else if (message.text) {
          handleTranscriptionResult({ text: message.text });
        }
        transcriptionPending = false;
        window.postMessage({ type: "FLUENCY_TRANSCRIPTION_DONE" }, "*");
        sendResponse({ received: true });
      }
    });
  } catch (e) {
    extensionValid = false;
  }

  // ---------------------------------------------------------------
  // Subtitle selectors
  // ---------------------------------------------------------------
  function getSubtitleSelectors() {
    if (isYouTube) return [".ytp-caption-segment", ".caption-visual-line", ".html5-video-player .caption-text"];
    if (isNetflix) return [".player-timedtext-text", ".timed-text-container .timed-text", "[class*='timedtext'][class*='text']"];
    return [];
  }

  function isSubtitleElement(el) {
    if (!el) return false;
    const excludedParents = ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "FORM", "LABEL"];
    let current = el.parentElement;
    while (current && current !== document.body) {
      if (excludedParents.includes(current.tagName)) return false;
      current = current.parentElement;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 50 && rect.height > 10;
  }

  function looksLikeSubtitle(text) {
    if (!text || text.length < 2 || text.length > 200) return false;
    if (/https?:\/\//.test(text)) return false;
    const patterns = [
      /\d{1,3}(,\d{3})*(,\d{3})+\s*(views|subscribers)/i, /\d+:\d{2}/,
      /views?/i, /subscribe/i, /share/i, /save/i, /copy link/i,
      /sign in/i, /sign out/i, /settings/i, /shopping/i,
      /info\b/i, /tap to unmute/i, /playback doesn/i,
      /restarting your device/i, /pull up for/i,
      /cancel$/i, /confirm$/i, /next$/i,
      /live$/i, /upcoming$/i, /search/i,
      /recommendation/i, /watch history/i,
      /recapping/i, /years ago/i,
    ];
    for (const p of patterns) { if (p.test(text)) return false; }
    return /[a-zA-Z\u3000-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(text);
  }

  function extractSubtitleText() {
    for (const selector of getSubtitleSelectors()) {
      for (const el of document.querySelectorAll(selector)) {
        if (!isSubtitleElement(el)) continue;
        const text = (el.textContent || "").trim();
        if (text && looksLikeSubtitle(text)) { ccDetected = true; return text; }
      }
    }
    return "";
  }

  function onSubtitleDetected(text) {
    if (!text || text === lastSubtitleText) return;
    lastSubtitleText = text;
    safeStorageSet({ fluency_lastSubtitle: text, fluency_lastTimestamp: Date.now() });
  }

  function handleMutation() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const text = extractSubtitleText();
      if (text) {
        onSubtitleDetected(text);
        clearTimeout(noCCTimer);
        noCCTimer = setTimeout(() => { if (!ccDetected) startFrameCapture(); }, 15000);
      }
    }, 250);
  }

  // ---------------------------------------------------------------
  // Frame capture fallback
  // ---------------------------------------------------------------
  function captureFrame(video) {
    if (!video || video.readyState < 2 || frameProcessing) return;
    try {
      const canvas = document.createElement("canvas");
      const scale = Math.min(640 / video.videoWidth, 1);
      canvas.width = Math.floor(video.videoWidth * scale);
      canvas.height = Math.floor(video.videoHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      processFrame(canvas.toDataURL("image/jpeg", 0.7));
    } catch (err) { /* ignore */ }
  }

  function processFrame(imageDataUrl) {
    if (frameProcessing) return;
    frameProcessing = true;
    safeStorageGet(["fluency_serverUrl"], (result) => {
      if (!extensionValid) { frameProcessing = false; return; }
      const serverUrl = (result?.fluency_serverUrl || "http://localhost:3000").trim().replace(/\/+$/, "");
      fetch(`${serverUrl}/api/extract-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: imageDataUrl }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.primaryText && data.texts?.length > 0) {
            const combined = data.texts.filter(t => t.length > 1).join(" ");
            if (combined !== lastSubtitleText) onSubtitleDetected(combined);
          }
          frameProcessing = false;
        })
        .catch(() => { frameProcessing = false; });
    });
  }

  function startFrameCapture() {
    if (frameCaptureInterval) return;
    frameCaptureInterval = setInterval(() => {
      const video = getVideoElement();
      if (video && !video.paused && !video.ended) captureFrame(video);
    }, 4000);
    captureFrame(getVideoElement());
  }

  function startPolling() {
    setInterval(() => {
      const text = extractSubtitleText();
      if (text) onSubtitleDetected(text);
    }, 800);
  }

  // ---------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------
  function init() {
    console.log(`[Fluency] Content script v6 active on ${HOST}`);

    if (!isExtensionValid()) {
      console.warn("[Fluency] Extension context invalid on init — refresh the page");
      return;
    }

    safeStorageSet({ fluency_contentStatus: "active", fluency_contentHost: HOST });

    injectAudioCapture();

    const observer = new MutationObserver(handleMutation);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    startPolling();

    // Initial scan
    setTimeout(() => {
      const text = extractSubtitleText();
      if (text) {
        onSubtitleDetected(text);
      } else {
        noCCTimer = setTimeout(() => { if (!ccDetected && !audioCaptureActive) startFrameCapture(); }, 12000);
      }
      console.log("[Fluency] Video info:", JSON.stringify(getVideoInfo()));
    }, 3000);

    // Listen for video play events
    document.addEventListener("play", (e) => {
      if (e.target?.tagName === "VIDEO") {
        setTimeout(() => {
          const text = extractSubtitleText();
          if (!text && !ccDetected && !audioCaptureActive) startFrameCapture();
        }, 5000);
      }
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
