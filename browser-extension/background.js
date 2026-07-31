/**
 * Fluency Background Service Worker v3
 * Handles audio transcription by calling the Fluency API.
 * Routes PING messages from popup to content scripts on YouTube/Netflix tabs.
 *
 * v3: Added tab message routing for PING/PONG diagnostic system.
 */

let transcriptionPending = false;
let transcriptionCount = 0;

// ── Listen for messages from content scripts and popup ──────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // ── PING from popup → forward to all matching tabs ──
  if (message.type === "FLUENCY_PING") {
    // Query all tabs and send PING to YouTube/Netflix tabs
    chrome.tabs.query({ url: ["*://*.youtube.com/*", "*://*.netflix.com/*"] }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        // No YouTube/Netflix tab open
        sendResponse({
          type: "FLUENCY_PONG",
          contentScriptActive: false,
          error: "No YouTube or Netflix tab found — open a video page first",
          timestamp: Date.now(),
        });
        return;
      }

      let responded = false;
      const timeout = setTimeout(() => {
        if (!responded) {
          responded = true;
          sendResponse({
            type: "FLUENCY_PONG",
            contentScriptActive: false,
            error: "Content script not responding — try refreshing the video page",
            tabFound: true,
            tabUrl: tabs[0].url,
            timestamp: Date.now(),
          });
        }
      }, 3000);

      // Send PING to first matching tab
      chrome.tabs.sendMessage(tabs[0].id, { type: "FLUENCY_PING" }, (response) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          // Content script not injected in this tab
          if (!responded) {
            responded = true;
            sendResponse({
              type: "FLUENCY_PONG",
              contentScriptActive: false,
              error: "Content script not loaded — refresh the video page with extension enabled",
              tabFound: true,
              tabUrl: tabs[0].url,
              timestamp: Date.now(),
            });
          }
          return;
        }
        if (response && !responded) {
          responded = true;
          sendResponse(response);
        }
      });
    });
    return true; // async sendResponse
  }

  // ── Audio chunk → transcribe via API ──
  if (message.type === "FLUENCY_AUDIO_CHUNK_BG") {
    if (transcriptionPending) {
      sendResponse({ status: "busy" });
      return true;
    }

    transcriptionPending = true;
    transcriptionCount++;
    const chunkId = message.chunkId || transcriptionCount;

    console.log(`[Fluency BG] Chunk #${chunkId} (${(message.data || "").length} chars)`);

    chrome.storage.local.get(["fluency_serverUrl"], (result) => {
      const serverUrl = (result.fluency_serverUrl || "http://localhost:3000").trim().replace(/\/+$/, "");

      fetch(`${serverUrl}/api/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: message.data,
          mimeType: message.mimeType || "audio/webm;codecs=opus",
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
          return res.json();
        })
        .then((data) => {
          transcriptionPending = false;

          if (data.error) {
            console.error("[Fluency BG] API error:", data.error);
            chrome.runtime.sendMessage({
              type: "FLUENCY_TRANSCRIBED",
              text: "",
              error: data.error,
            }).catch(() => {});
            return;
          }

          if (data.text && data.text.trim().length > 0) {
            const text = data.text.trim();
            chrome.storage.local.set({
              fluency_lastSubtitle: text,
              fluency_lastTimestamp: Date.now(),
              fluency_audioMode: true,
            });
            chrome.runtime.sendMessage({
              type: "FLUENCY_TRANSCRIBED",
              text: text,
              success: true,
            }).catch(() => {});
            console.log(`[Fluency BG] OK #${chunkId}: "${text.slice(0, 60)}"`);
          } else {
            console.log(`[Fluency BG] Empty #${chunkId}`);
            chrome.runtime.sendMessage({
              type: "FLUENCY_TRANSCRIBED",
              text: "",
              info: data.message || "No speech detected",
            }).catch(() => {});
          }
        })
        .catch((err) => {
          console.error("[Fluency BG] Fetch failed:", err.message);
          transcriptionPending = false;
          chrome.runtime.sendMessage({
            type: "FLUENCY_TRANSCRIBED",
            text: "",
            error: "API failed: " + err.message,
          }).catch(() => {});
          chrome.storage.local.set({
            fluency_lastError: "Transcription failed: " + err.message,
            fluency_lastTimestamp: Date.now(),
          });
        });
    });

    sendResponse({ status: "processing" });
    return true;
  }

  // ── Forward audio status from content script to popup ──
  if (message.type === "FLUENCY_AUDIO_STATUS") {
    chrome.storage.local.set({
      fluency_audioStatus: message.status,
      fluency_audioError: message.error || null,
      fluency_audioCodec: message.codec || null,
      fluency_audioChunksProduced: message.chunksProduced || 0,
      fluency_audioElapsed: message.elapsed || null,
    });
    chrome.runtime.sendMessage(message).catch(() => {});
    return false;
  }
});
