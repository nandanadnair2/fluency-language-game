/**
 * LinguaScout Content Script
 * Detects subtitle/caption text from YouTube and Netflix using MutationObserver.
 * Stores detected subtitles in chrome.storage.local for the popup to read.
 */

(function () {
  "use strict";

  // Prevent double-injection
  if (window.__linguaScoutInjected) return;
  window.__linguaScoutInjected = true;

  const HOST = window.location.hostname;
  const isYouTube = HOST.includes("youtube.com");
  const isNetflix = HOST.includes("netflix.com");

  if (!isYouTube && !isNetflix) return;

  let lastSubtitleText = "";
  let debounceTimer = null;

  // ---------------------------------------------------------------
  // Selector strategies per platform
  // ---------------------------------------------------------------
  function getSubtitleSelectors() {
    if (isYouTube) {
      // YouTube uses multiple caption selectors depending on player version
      return [
        ".ytp-caption-segment",
        ".caption-visual-line",
        "[class*=\"caption\"]",
        ".ytp-caption-window-container",
      ];
    }
    if (isNetflix) {
      // Netflix player-timedtext is the primary container
      return [
        ".player-timedtext-text",
        ".caption-text",
        ".timed-text",
        ".ltr-dhwu0h",
        ".bcp47-dhwu0h",
      ];
    }
    return [];
  }

  /**
   * Attempt to extract current subtitle text from the DOM.
   * Returns the concatenated text content or empty string.
   */
  function extractSubtitleText() {
    const selectors = getSubtitleSelectors();

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        // Skip elements that are hidden or have zero dimensions
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;

        const text = (el.textContent || "").trim();
        if (text.length > 0) {
          return text;
        }
      }
    }
    return "";
  }

  /**
   * Save the subtitle text to chrome.storage.local and update the badge.
   */
  function onSubtitleDetected(text) {
    if (!text || text === lastSubtitleText) return;

    lastSubtitleText = text;

    chrome.storage.local.set(
      {
        linguaScout_lastSubtitle: text,
        linguaScout_lastTimestamp: Date.now(),
      },
      () => {
        // Small visual cue in the console for debugging
        console.log("[LinguaScout] Subtitle detected:", text);
      }
    );
  }

  /**
   * Debounced handler – waits 200ms after DOM changes before reading.
   */
  function handleMutation() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const text = extractSubtitleText();
      onSubtitleDetected(text);
    }, 200);
  }

  // ---------------------------------------------------------------
  // Also poll periodically as a fallback (some players update
  // attributes rather than DOM structure)
  // ---------------------------------------------------------------
  function startPolling() {
    setInterval(() => {
      const text = extractSubtitleText();
      onSubtitleDetected(text);
    }, 500);
  }

  // ---------------------------------------------------------------
  // Main: set up MutationObserver + polling
  // ---------------------------------------------------------------
  function init() {
    console.log(
      `[LinguaScout] Content script active on ${HOST}`
    );

    // Observe the entire document body for subtree changes
    const observer = new MutationObserver(handleMutation);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Fallback polling for players that use attribute-only updates
    startPolling();

    // Initial scan in case subtitles are already showing
    setTimeout(() => {
      const text = extractSubtitleText();
      onSubtitleDetected(text);
    }, 1000);
  }

  // Wait for the page to be ready before observing
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
