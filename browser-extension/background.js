/**
 * Fluency Background Service Worker v2
 * Handles audio transcription by calling the Fluency API
 * on behalf of content scripts (avoids mixed-content HTTPS→HTTP blocks).
 *
 * v2: Better error handling, sends FLUENCY_TRANSCRIBED with detailed status,
 * handles edge cases like empty responses.
 */

let transcriptionPending = false;
let transcriptionCount = 0;

// ── Listen for messages from content scripts ──────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // ── Audio chunk → transcribe via API ──
  if (message.type === "FLUENCY_AUDIO_CHUNK_BG") {
    if (transcriptionPending) {
      sendResponse({ status: "busy" });
      return true;
    }

    transcriptionPending = true;
    transcriptionCount++;

    const chunkId = message.chunkId || transcriptionCount;
    console.log(`[Fluency BG] Processing chunk #${chunkId} (${(message.data || "").length} chars base64)`);

    // Get server URL from storage
    chrome.storage.local.get(["fluency_serverUrl"], (result) => {
      const serverUrl = (result.fluency_serverUrl || "http://localhost:3000")
        .trim()
        .replace(/\/+$/, "");

      const apiUrl = `${serverUrl}/api/transcribe`;
      console.log(`[Fluency BG] Calling: ${apiUrl}`);

      fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: message.data,
          mimeType: message.mimeType || "audio/webm;codecs=opus",
        }),
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`API returned ${res.status}: ${res.statusText}`);
          }
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

            // Store in chrome.storage for popup to pick up
            chrome.storage.local.set({
              fluency_lastSubtitle: text,
              fluency_lastTimestamp: Date.now(),
              fluency_audioMode: true,
            });

            // Notify all listeners (popup, content script)
            chrome.runtime.sendMessage({
              type: "FLUENCY_TRANSCRIBED",
              text: text,
              success: true,
            }).catch(() => {
              // popup might be closed — that's ok
            });

            console.log(`[Fluency BG] Transcribed #${chunkId}: "${text.slice(0, 60)}"`);
          } else {
            // No speech detected — notify but don't error
            console.log(`[Fluency BG] No speech in chunk #${chunkId}`);
            chrome.runtime.sendMessage({
              type: "FLUENCY_TRANSCRIBED",
              text: "",
              info: data.message || "No speech detected",
            }).catch(() => {});
          }
        })
        .catch((err) => {
          console.error("[Fluency BG] Transcription fetch failed:", err.message);
          transcriptionPending = false;

          // Notify about error
          chrome.runtime.sendMessage({
            type: "FLUENCY_TRANSCRIBED",
            text: "",
            error: "API call failed: " + err.message,
          }).catch(() => {});

          // Also store the error info so popup can show it
          chrome.storage.local.set({
            fluency_lastError: "Transcription failed: " + err.message,
            fluency_lastTimestamp: Date.now(),
          });
        });
    });

    // Respond immediately to unblock content script
    sendResponse({ status: "processing" });
    return true; // async response
  }

  // ── Forward audio status from content script to popup ──
  if (message.type === "FLUENCY_AUDIO_STATUS") {
    // Store the status for popup to read on open
    chrome.storage.local.set({
      fluency_audioStatus: message.status,
      fluency_audioError: message.error || null,
      fluency_audioCodec: message.codec || null,
      fluency_audioChunksProduced: message.chunksProduced || 0,
      fluency_audioElapsed: message.elapsed || null,
    });

    // Also forward to popup if it's open
    chrome.runtime.sendMessage({
      type: "FLUENCY_AUDIO_STATUS",
      status: message.status,
      error: message.error,
      codec: message.codec,
      audioTracks: message.audioTracks,
      chunksProduced: message.chunksProduced,
      elapsed: message.elapsed,
    }).catch(() => {});
    return false;
  }
});
