/**
 * LinguaScout Content Script
 * Detects subtitle/caption text from YouTube and Netflix using MutationObserver.
 * Only extracts ACTUAL subtitle text — filters out page metadata, buttons, links, etc.
 * Stores detected subtitles in chrome.storage.local for the popup to read.
 */

(function () {
  "use strict";

  // Prevent double-injection
  if (window.__linguaScoutInjected) return;
  window.__linguaScoutInjected = true;

  const HOST = window.location.hostname;
  const isYouTube = HOST.includes("youtube.com") || HOST.includes("youtu.be");
  const isNetflix = HOST.includes("netflix.com");

  if (!isYouTube && !isNetflix) return;

  let lastSubtitleText = "";
  let debounceTimer = null;

  // ---------------------------------------------------------------
  // Subtitle selectors — ONLY target the actual subtitle containers
  // ---------------------------------------------------------------
  function getSubtitleSelectors() {
    if (isYouTube) {
      // YouTube closed captions live inside .ytp-caption-window-container
      // The actual text segments are .ytp-caption-segment
      return [
        ".ytp-caption-segment",            // Standard CC segments
        ".caption-visual-line",             // Newer YouTube player
        ".html5-video-player .caption-text", // Alternative CC class
      ];
    }
    if (isNetflix) {
      // Netflix timed text is in specific containers
      return [
        ".player-timedtext-text",          // Primary Netflix subtitles
        ".timed-text-container .timed-text", // Alternative
        "[class*='timedtext'][class*='text']", // Regex fallback
      ];
    }
    return [];
  }

  /**
   * Check if an element is a genuine subtitle element (not a button, link, etc.)
   */
  function isSubtitleElement(el) {
    if (!el) return false;

    // Must NOT be inside a button, link, input, or form
    const excludedParents = ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "FORM", "LABEL"];
    let current = el.parentElement;
    while (current && current !== document.body) {
      if (excludedParents.includes(current.tagName)) return false;
      current = current.parentElement;
    }

    // Must be visible and have reasonable dimensions
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;

    // Should not be tiny (likely an icon or badge)
    if (rect.width < 50 || rect.height < 10) return false;

    return true;
  }

  /**
   * Check if text looks like an actual subtitle line
   * (not a page title, button label, URL, or metadata)
   */
  function looksLikeSubtitle(text) {
    if (!text || text.length === 0) return false;

    // Filter out extremely long text (subtitles are typically short)
    if (text.length > 200) return false;

    // Filter out text with URLs
    if (/https?:\/\//.test(text)) return false;

    // Filter out text that looks like UI metadata
    const metadataPatterns = [
      /\d{1,3}(,\d{3})*(,\d{3})+\s*(views|subscribers)/i,
      /\d+:\d{2}/,              // Timestamps like 5:40
      /views?/i,
      /subscribe/i,
      /share/i,
      /save/i,
      /copy link/i,
      /sign in/i,
      /sign out/i,
      /settings/i,
      /shopping/i,
      /info\b/i,
      /tap to unmute/i,
      /playback doesn/i,
      /restarting your device/i,
      /pull up for/i,
      /cancel$/i,
      /confirm$/i,
      /next$/i,
      /live$/i,
      /upcoming$/i,
      /search/i,
      /recommendation/i,
      /watch history/i,
      /recapping/i,
      /years ago/i,
    ];

    for (const pattern of metadataPatterns) {
      if (pattern.test(text)) return false;
    }

    // Filter out very short text (single characters, emojis only)
    if (text.length < 2) return false;

    // Should contain at least one letter or CJK character
    if (!/[a-zA-Z\u3000-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(text)) return false;

    return true;
  }

  /**
   * Extract current subtitle text from the DOM.
   * Returns empty string if no valid subtitle found.
   */
  function extractSubtitleText() {
    const selectors = getSubtitleSelectors();

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        if (!isSubtitleElement(el)) continue;

        const text = (el.textContent || "").trim();
        if (text && looksLikeSubtitle(text)) {
          return text;
        }
      }
    }
    return "";
  }

  /**
   * Save the subtitle text to chrome.storage.local.
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
        console.log("[LinguaScout] Subtitle detected:", text);
      }
    );
  }

  /**
   * Debounced handler – waits 250ms after DOM changes before reading.
   */
  function handleMutation() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const text = extractSubtitleText();
      onSubtitleDetected(text);
    }, 250);
  }

  // ---------------------------------------------------------------
  // Poll periodically as a fallback (some players update attributes)
  // ---------------------------------------------------------------
  function startPolling() {
    setInterval(() => {
      const text = extractSubtitleText();
      onSubtitleDetected(text);
    }, 800); // Slightly slower polling to avoid excessive DOM reads
  }

  // ---------------------------------------------------------------
  // Main: MutationObserver + polling
  // ---------------------------------------------------------------
  function init() {
    console.log(`[LinguaScout] Content script active on ${HOST}`);

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
      onSubtitleDetected(text);
    }, 2000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
