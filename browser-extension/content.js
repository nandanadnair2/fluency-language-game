/**
 * Fluency Content Script v2
 * Detects subtitle/caption text from YouTube and Netflix.
 * Also supports videos WITHOUT closed captions by periodically
 * capturing video frames and sending them to the VLM API for text extraction.
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

  // ---------------------------------------------------------------
  // Subtitle selectors — ONLY target the actual subtitle containers
  // ---------------------------------------------------------------
  function getSubtitleSelectors() {
    if (isYouTube) {
      return [
        ".ytp-caption-segment",
        ".caption-visual-line",
        ".html5-video-player .caption-text",
      ];
    }
    if (isNetflix) {
      return [
        ".player-timedtext-text",
        ".timed-text-container .timed-text",
        "[class*='timedtext'][class*='text']",
      ];
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
      /\d{1,3}(,\d{3})*(,\d{3})+\s*(views|subscribers)/i,
      /\d+:\d{2}/,
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

    chrome.storage.local.set(
      {
        fluency_lastSubtitle: text,
        fluency_lastTimestamp: Date.now(),
      },
      () => {
        console.log("[Fluency] Subtitle detected:", text);
      }
    );
  }

  function handleMutation() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const text = extractSubtitleText();
      if (text) {
        onSubtitleDetected(text);
        // Reset the no-CC timer when we find CC text
        clearTimeout(noCCTimer);
        noCCTimer = setTimeout(() => {
          if (!ccDetected) startFrameCapture();
        }, 15000);
      }
    }, 250);
  }

  // ---------------------------------------------------------------
  // Frame capture for videos WITHOUT closed captions
  // Captures video frames and sends to VLM for text extraction
  // ---------------------------------------------------------------
  function getVideoElement() {
    const videos = document.querySelectorAll("video");
    for (const v of videos) {
      if (v.readyState >= 2 && v.videoWidth > 200) return v;
    }
    return videos[0] || null;
  }

  function captureFrame(video) {
    if (!video || video.readyState < 2 || frameProcessing) return;

    try {
      const canvas = document.createElement("canvas");
      // Downscale to reduce size — 640px wide is enough for text extraction
      const scale = Math.min(640 / video.videoWidth, 1);
      canvas.width = Math.floor(video.videoWidth * scale);
      canvas.height = Math.floor(video.videoHeight * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

      processFrame(dataUrl);
    } catch (err) {
      // Canvas tainted or other error — silently ignore
    }
  }

  function processFrame(imageDataUrl) {
    if (frameProcessing) return;
    frameProcessing = true;

    // Send to Fluency server for VLM text extraction
    // The server URL is stored in chrome.storage
    chrome.storage.local.get(["fluency_serverUrl"], (result) => {
      const serverUrl = result.fluency_serverUrl || "http://localhost:3000";
      const baseUrl = serverUrl.trim().replace(/\/+$/, "");

      fetch(`${baseUrl}/api/extract-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: imageDataUrl }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.primaryText && data.texts && data.texts.length > 0) {
            const combined = data.texts.filter(t => t.length > 1).join(" ");
            if (combined !== lastSubtitleText) {
              console.log("[Fluency] Frame text extracted:", combined);
              onSubtitleDetected(combined);
            }
          }
          frameProcessing = false;
        })
        .catch((err) => {
          // Server not running or other error — silently ignore
          frameProcessing = false;
        });
    });
  }

  function startFrameCapture() {
    if (frameCaptureInterval) return;
    console.log("[Fluency] No CC detected — starting frame capture for text extraction");

    // Capture a frame every 4 seconds
    frameCaptureInterval = setInterval(() => {
      const video = getVideoElement();
      if (video && !video.paused && !video.ended) {
        captureFrame(video);
      }
    }, 4000);

    // Capture one immediately
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
  // Poll periodically as a fallback
  // ---------------------------------------------------------------
  function startPolling() {
    setInterval(() => {
      const text = extractSubtitleText();
      if (text) onSubtitleDetected(text);
    }, 800);
  }

  // ---------------------------------------------------------------
  // Main
  // ---------------------------------------------------------------
  function init() {
    console.log(`[Fluency] Content script v2 active on ${HOST}`);

    const observer = new MutationObserver(handleMutation);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    startPolling();

    // Initial scan after page load
    setTimeout(() => {
      const text = extractSubtitleText();
      if (text) {
        onSubtitleDetected(text);
      } else {
        // No CC found after initial scan — start frame capture after delay
        noCCTimer = setTimeout(() => {
          if (!ccDetected) startFrameCapture();
        }, 10000);
      }
    }, 3000);

    // Listen for video play events to restart frame capture
    document.addEventListener("play", (e) => {
      if (e.target && e.target.tagName === "VIDEO") {
        const video = e.target;
        // Check if CC exists
        setTimeout(() => {
          const text = extractSubtitleText();
          if (!text && !ccDetected) {
            startFrameCapture();
          }
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
