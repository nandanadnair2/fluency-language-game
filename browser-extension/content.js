/**
 * Fluency Content Script v5
 * Detects subtitle/caption text from YouTube and Netflix.
 * Falls back to audio capture + ASR for videos WITHOUT closed captions.
 *
 * v5: Added PING responder so popup can actively query content script status.
 * Reports: is content script running, video found, audio capture state, etc.
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
  let audioCaptureStatus = null; // Stores last FLUENCY_AUDIO_STATUS from audio-capture.js

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
    const script = document.createElement("script");
    script.id = "__fluencyAudioScript";
    script.src = chrome.runtime.getURL("audio-capture.js");
    script.onload = () => {
      console.log("[Fluency] Audio capture script injected successfully");
    };
    script.onerror = (e) => {
      console.error("[Fluency] Failed to inject audio-capture.js:", e);
      // Store error for popup to read
      chrome.storage.local.set({
        fluency_contentStatus: "audio_inject_failed",
      });
    };
    (document.head || document.documentElement).appendChild(script);
  }

  // ---------------------------------------------------------------
  // Listen for messages from audio-capture.js (MAIN world)
  // ---------------------------------------------------------------
  window.addEventListener("message", (event) => {
    if (!event.data || typeof event.data.type !== "string") return;

    // Audio chunk received — send to background for transcription
    if (event.data.type === "FLUENCY_AUDIO_CHUNK") {
      handleAudioChunk(event.data.data, event.data.mimeType);
    }

    // Audio capture status updates — forward to popup
    if (event.data.type === "FLUENCY_AUDIO_STATUS") {
      audioCaptureStatus = event.data;
      const status = event.data.status;
      if (status === "active" || status === "active_data") {
        audioCaptureActive = true;
        chrome.storage.local.set({ fluency_audioMode: true });
      } else if (status === "stopped" || status === "error") {
        audioCaptureActive = false;
        chrome.storage.local.set({ fluency_audioMode: false });
      }

      // Store status in chrome.storage so popup can read it even if popup was closed
      chrome.storage.local.set({
        fluency_audioStatus: status,
        fluency_audioError: event.data.error || null,
        fluency_audioCodec: event.data.codec || null,
        fluency_audioChunksProduced: event.data.chunksProduced || 0,
        fluency_audioElapsed: event.data.elapsed || null,
        fluency_audioTracks: event.data.audioTracks || null,
      });

      // Forward to popup via background
      chrome.runtime.sendMessage({
        type: "FLUENCY_AUDIO_STATUS",
        status: status,
        error: event.data.error,
        codec: event.data.codec,
        audioTracks: event.data.audioTracks,
        chunksProduced: event.data.chunksProduced,
        elapsed: event.data.elapsed,
      }).catch(() => {});
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
    if (transcriptionPending) return;
    transcriptionPending = true;
    chunksSent++;

    // Safety timeout: if background never responds with TRANSCRIBED, reset after 20s
    clearTimeout(transcriptionTimeout);
    transcriptionTimeout = setTimeout(() => {
      console.warn("[Fluency] Transcription safety timeout — resetting pipeline");
      transcriptionPending = false;
      window.postMessage({ type: "FLUENCY_TRANSCRIPTION_DONE" }, "*");
    }, 20000);

    // Send to background service worker
    chrome.runtime.sendMessage(
      {
        type: "FLUENCY_AUDIO_CHUNK_BG",
        data: base64Audio,
        mimeType: mimeType,
        chunkId: chunksSent,
      },
      (response) => {
        if (!response) {
          console.warn("[Fluency] Background not responding, using direct fetch");
          directTranscribe(base64Audio, mimeType);
          return;
        }

        if (response.status === "busy") {
          console.log("[Fluency] Background is busy — will retry");
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
  }

  function directTranscribe(base64Audio, mimeType) {
    chrome.storage.local.get(["fluency_serverUrl"], (result) => {
      const serverUrl = (result.fluency_serverUrl || "http://localhost:3000")
        .trim().replace(/\/+$/, "");

      fetch(`${serverUrl}/api/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64: base64Audio, mimeType }),
      })
        .then((res) => res.json())
        .then((data) => {
          handleTranscriptionResult(data);
          transcriptionPending = false;
          clearTimeout(transcriptionTimeout);
          window.postMessage({ type: "FLUENCY_TRANSCRIPTION_DONE" }, "*");
        })
        .catch((err) => {
          console.error("[Fluency] Direct transcription failed:", err);
          transcriptionPending = false;
          clearTimeout(transcriptionTimeout);
          window.postMessage({ type: "FLUENCY_TRANSCRIPTION_DONE" }, "*");
        });
    });
  }

  function handleTranscriptionResult(data) {
    chunksCompleted++;
    console.log(`[Fluency] Transcription #${chunksCompleted}:`, data.text ? `"${data.text.slice(0, 50)}"` : "empty");

    if (data.text && data.text.trim().length > 0) {
      const text = data.text.trim();
      chrome.storage.local.set({
        fluency_lastSubtitle: text,
        fluency_lastTimestamp: Date.now(),
        fluency_audioMode: true,
      });
    }
  }

  // Listen for FLUENCY_TRANSCRIBED from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // PING from popup — respond with full diagnostic status
    if (message.type === "FLUENCY_PING") {
      const videoInfo = getVideoInfo();
      const response = {
        type: "FLUENCY_PONG",
        host: HOST,
        isYouTube: isYouTube,
        isNetflix: isNetflix,
        contentScriptActive: true,
        audioScriptInjected: !!document.getElementById("__fluencyAudioScript"),
        audioCaptureStatus: audioCaptureStatus,
        audioCaptureActive: audioCaptureActive,
        ccDetected: ccDetected,
        video: videoInfo,
        chunksSent: chunksSent,
        chunksCompleted: chunksCompleted,
        transcriptionPending: transcriptionPending,
        lastSubtitleText: lastSubtitleText,
        timestamp: Date.now(),
      };
      console.log("[Fluency] Responding to PING:", JSON.stringify(response).slice(0, 200));
      sendResponse(response);
      return true;
    }

    // Transcription result from background
    if (message.type === "FLUENCY_TRANSCRIBED") {
      clearTimeout(transcriptionTimeout);

      if (message.error) {
        console.warn("[Fluency] Transcription error:", message.error);
      } else if (message.text) {
        handleTranscriptionResult({ text: message.text });
      } else {
        console.log("[Fluency] Transcription returned empty");
      }

      transcriptionPending = false;
      window.postMessage({ type: "FLUENCY_TRANSCRIPTION_DONE" }, "*");
      sendResponse({ received: true });
    }
  });

  // ---------------------------------------------------------------
  // Subtitle selectors
  // ---------------------------------------------------------------
  function getSubtitleSelectors() {
    if (isYouTube) {
      return [".ytp-caption-segment", ".caption-visual-line", ".html5-video-player .caption-text"];
    }
    if (isNetflix) {
      return [".player-timedtext-text", ".timed-text-container .timed-text", "[class*='timedtext'][class*='text']"];
    }
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
    if (rect.width === 0 && rect.height === 0) return false;
    if (rect.width < 50 || rect.height < 10) return false;
    return true;
  }

  function looksLikeSubtitle(text) {
    if (!text || text.length === 0) return false;
    if (text.length > 200) return false;
    if (/https?:\/\//.test(text)) return false;
    const metadataPatterns = [
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
    for (const pattern of metadataPatterns) {
      if (pattern.test(text)) return false;
    }
    if (text.length < 2) return false;
    if (!/[a-zA-Z\u3000-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(text)) return false;
    return true;
  }

  function extractSubtitleText() {
    const selectors = getSubtitleSelectors();
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        if (!isSubtitleElement(el)) continue;
        const text = (el.textContent || "").trim();
        if (text && looksLikeSubtitle(text)) {
          ccDetected = true;
          return text;
        }
      }
    }
    return "";
  }

  function onSubtitleDetected(text) {
    if (!text || text === lastSubtitleText) return;
    lastSubtitleText = text;
    chrome.storage.local.set({
      fluency_lastSubtitle: text,
      fluency_lastTimestamp: Date.now(),
    });
  }

  function handleMutation() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const text = extractSubtitleText();
      if (text) {
        onSubtitleDetected(text);
        clearTimeout(noCCTimer);
        noCCTimer = setTimeout(() => {
          if (!ccDetected) startFrameCapture();
        }, 15000);
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
    chrome.storage.local.get(["fluency_serverUrl"], (result) => {
      const serverUrl = (result.fluency_serverUrl || "http://localhost:3000").trim().replace(/\/+$/, "");
      fetch(`${serverUrl}/api/extract-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: imageDataUrl }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.primaryText && data.texts && data.texts.length > 0) {
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
    const video = getVideoElement();
    if (video) captureFrame(video);
  }

  function stopFrameCapture() {
    if (frameCaptureInterval) {
      clearInterval(frameCaptureInterval);
      frameCaptureInterval = null;
    }
  }

  // ---------------------------------------------------------------
  // Poll for CC subtitles
  // ---------------------------------------------------------------
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
    console.log(`[Fluency] Content script v5 active on ${HOST}`);

    // Store that we're alive — popup can read this
    chrome.storage.local.set({ fluency_contentStatus: "active", fluency_contentHost: HOST });

    // Inject audio capture script
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
        noCCTimer = setTimeout(() => {
          if (!ccDetected && !audioCaptureActive) startFrameCapture();
        }, 12000);
      }

      // Log video status for debugging
      const videoInfo = getVideoInfo();
      console.log("[Fluency] Video info:", JSON.stringify(videoInfo));
    }, 3000);

    // Listen for video play events
    document.addEventListener("play", (e) => {
      if (e.target && e.target.tagName === "VIDEO") {
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
