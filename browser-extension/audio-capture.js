/**
 * Fluency Audio Capture v2
 * Injected into the MAIN world of YouTube / Netflix pages.
 * Captures audio from <video> elements using captureStream() + MediaRecorder,
 * then sends base64-encoded chunks to the content script via window.postMessage.
 *
 * v2: Added chunk production monitoring — detects if captureStream produces
 * no data (muted video, DRM, etc.) and reports status back.
 */

(function () {
  "use strict";

  // Prevent double-injection
  if (window.__fluencyAudioCapture) return;
  window.__fluencyAudioCapture = true;

  let mediaRecorder = null;
  let isActive = false;
  let pendingTranscription = false;
  let chunksProduced = 0;
  let chunkMonitorTimer = null;
  let lastChunkTime = 0;

  // ── Helpers ──────────────────────────────────────────────────────
  function findVideo() {
    const videos = document.querySelectorAll("video");
    for (const v of videos) {
      if (v.readyState >= 2 && v.videoWidth > 200) return v;
    }
    return videos[0] || null;
  }

  function notifyStatus(status, extra) {
    window.postMessage(
      { type: "FLUENCY_AUDIO_STATUS", status, ...extra },
      "*"
    );
  }

  // ── Chunk Production Monitor ────────────────────────────────────
  // If no chunks are produced within 15 seconds of capture start,
  // the audio stream probably has no data (muted video, DRM, etc.)
  function startChunkMonitor() {
    stopChunkMonitor();
    lastChunkTime = Date.now();
    chunksProduced = 0;

    chunkMonitorTimer = setInterval(() => {
      const elapsed = (Date.now() - lastChunkTime) / 1000;
      if (isActive && elapsed > 15 && chunksProduced === 0) {
        console.warn("[Fluency Audio] No chunks produced in", elapsed.toFixed(0), "s — video may be muted or DRM-blocked");
        notifyStatus("no_data", {
          error: "No audio data captured — is the video unmuted?",
          elapsed: Math.round(elapsed),
        });
      }
    }, 5000);
  }

  function stopChunkMonitor() {
    if (chunkMonitorTimer) {
      clearInterval(chunkMonitorTimer);
      chunkMonitorTimer = null;
    }
  }

  function onChunkProduced() {
    chunksProduced++;
    lastChunkTime = Date.now();
    if (chunksProduced === 1) {
      console.log("[Fluency Audio] First chunk produced — audio capture is working!");
      notifyStatus("active_data", { chunksProduced: 1 });
    }
  }

  // ── Start Audio Capture ─────────────────────────────────────────
  function startCapture() {
    if (isActive) return;

    const video = findVideo();
    if (!video) {
      notifyStatus("error", { error: "No video element found" });
      return;
    }
    if (video.paused || video.ended) {
      // Don't start if video isn't playing — will retry on "play" event
      return;
    }

    // Check if video is effectively muted
    if (video.muted || video.volume === 0) {
      console.warn("[Fluency Audio] Video appears to be muted — audio capture may produce silence");
      notifyStatus("muted", { error: "Video is muted — unmute for audio capture" });
    }

    try {
      // captureStream() returns a MediaStream with audio + video tracks
      const rawStream =
        video.captureStream ? video.captureStream() : video.mozCaptureStream();
      if (!rawStream) {
        notifyStatus("error", { error: "captureStream() returned null" });
        return;
      }

      // Extract only audio tracks (saves bandwidth)
      const audioTracks = rawStream.getAudioTracks();
      if (audioTracks.length === 0) {
        notifyStatus("error", { error: "No audio tracks — video may be muted or DRM-blocked" });
        return;
      }

      console.log(`[Fluency Audio] Found ${audioTracks.length} audio track(s)`, audioTracks.map(t => t.label || t.kind));
      const audioStream = new MediaStream(audioTracks);

      // Use opus codec in webm container — great for speech
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/ogg";

      console.log("[Fluency Audio] Using codec:", mimeType);

      mediaRecorder = new MediaRecorder(audioStream, {
        mimeType,
        audioBitsPerSecond: 16000, // 16 kbps — enough for speech
      });

      // When a chunk is ready, convert to base64 and forward to content script
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size < 100) {
          console.log("[Fluency Audio] Skipping tiny chunk:", e.data.size, "bytes");
          return; // skip empty/tiny chunks
        }

        if (pendingTranscription) {
          console.log("[Fluency Audio] Chunk ready but transcription pending — skipping");
          return; // don't queue if previous is still processing
        }

        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result || "").split(",")[1];
          if (base64 && base64.length > 0) {
            pendingTranscription = true;
            console.log(`[Fluency Audio] Chunk ${chunksProduced + 1}: ${e.data.size} bytes, base64 ${base64.length} chars`);
            onChunkProduced();
            window.postMessage(
              { type: "FLUENCY_AUDIO_CHUNK", data: base64, mimeType },
              "*"
            );
          }
        };
        reader.readAsDataURL(e.data);
      };

      mediaRecorder.onerror = (e) => {
        console.error("[Fluency Audio] MediaRecorder error:", e);
        notifyStatus("error", { error: "MediaRecorder error: " + (e.error?.message || "unknown") });
      };

      // Collect data every 4 seconds — good balance for speech segments
      mediaRecorder.start(4000);
      isActive = true;

      startChunkMonitor();

      notifyStatus("active", {
        codec: mimeType,
        audioTracks: audioTracks.length,
        intervalMs: 4000,
      });
      console.log("[Fluency Audio] Capture started — sending 4s chunks for transcription");
    } catch (err) {
      console.error("[Fluency Audio] Failed to start capture:", err);
      notifyStatus("error", { error: err.message });
    }
  }

  // ── Stop Audio Capture ──────────────────────────────────────────
  function stopCapture() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      try {
        mediaRecorder.stop();
      } catch (_) {
        /* ignore */
      }
    }
    mediaRecorder = null;
    isActive = false;
    pendingTranscription = false;
    stopChunkMonitor();
    notifyStatus("stopped");
  }

  // ── Lifecycle Hooks ─────────────────────────────────────────────

  // 1) Auto-start when a video begins playing
  document.addEventListener(
    "play",
    (e) => {
      if (e.target && e.target.tagName === "VIDEO") {
        setTimeout(() => {
          if (!isActive) startCapture();
        }, 2500); // wait 2.5s so the stream is stable
      }
    },
    true // capture phase
  );

  // 2) Pause capture when video pauses / ends
  document.addEventListener(
    "pause",
    (e) => {
      if (e.target && e.target.tagName === "VIDEO") stopCapture();
    },
    true
  );
  document.addEventListener(
    "ended",
    (e) => {
      if (e.target && e.target.tagName === "VIDEO") stopCapture();
    },
    true
  );

  // 3) Restart on seeking (new position = new audio)
  document.addEventListener(
    "seeked",
    (e) => {
      if (e.target && e.target.tagName === "VIDEO") {
        stopCapture();
        setTimeout(startCapture, 1000);
      }
    },
    true
  );

  // 4) Start immediately if a video is already playing (page refresh / navigation)
  setTimeout(() => {
    const video = findVideo();
    if (video && !video.paused && !video.ended) {
      startCapture();
    }
  }, 4000);

  // 5) Listen for control messages from content script
  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "FLUENCY_AUDIO_CONTROL") {
      if (e.data.action === "start") startCapture();
      if (e.data.action === "stop") stopCapture();
    }
    // Content script signals that transcription is done — we can send next chunk
    if (e.data && e.data.type === "FLUENCY_TRANSCRIPTION_DONE") {
      pendingTranscription = false;
    }
  });
})();
