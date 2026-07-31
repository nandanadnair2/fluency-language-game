/**
 * Fluency Background Service Worker v1
 * Handles audio transcription by calling the Fluency API
 * on behalf of content scripts (avoids mixed-content HTTPS→HTTP blocks).
 *
 * Also relays messages between content scripts and popup.
 */

let transcriptionPending = false;

// ── Listen for messages from content scripts ──────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // ── Audio chunk → transcribe via API ──
  if (message.type === "FLUENCY_AUDIO_CHUNK_BG") {
    if (transcriptionPending) {
      sendResponse({ status: "busy" });
      return true;
    }

    transcriptionPending = true;

    // Get server URL from storage
    chrome.storage.local.get(["fluency_serverUrl"], (result) => {
      const serverUrl = (result.fluency_serverUrl || "http://localhost:3000")
        .trim()
        .replace(/\/+$/, "");

      fetch(`${serverUrl}/api/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: message.data,
          mimeType: message.mimeType || "audio/webm",
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.text && data.text.trim().length > 0) {
            const text = data.text.trim();

            // Store in chrome.storage for popup to pick up
            chrome.storage.local.set({
              fluency_lastSubtitle: text,
              fluency_lastTimestamp: Date.now(),
              fluency_audioMode: true,
            });

            // Notify popup
            chrome.runtime.sendMessage({
              type: "FLUENCY_TRANSCRIBED",
              text: text,
            }).catch(() => {
              // popup might be closed — that's ok
            });

            console.log("[Fluency BG] Transcribed:", text.slice(0, 60));
          } else {
            // No speech detected — notify popup
            chrome.runtime.sendMessage({
              type: "FLUENCY_TRANSCRIBED",
              text: "",
              info: data.message || "No speech detected",
            }).catch(() => {});
          }
          transcriptionPending = false;
        })
        .catch((err) => {
          console.error("[Fluency BG] Transcription failed:", err.message);
          transcriptionPending = false;

          // Notify popup about error
          chrome.runtime.sendMessage({
            type: "FLUENCY_TRANSCRIBED",
            text: "",
            error: err.message,
          }).catch(() => {});
        });
    });

    sendResponse({ status: "processing" });
    return true; // async response
  }

  // ── Forward audio status from content script to popup ──
  if (message.type === "FLUENCY_AUDIO_STATUS") {
    // Already stored in storage by content script — just forward
    chrome.runtime.sendMessage(message).catch(() => {});
    return false;
  }
});
