/**
 * Fluency Audio Capture v1
 * Injected into the MAIN world of YouTube / Netflix pages.
 * Captures audio from <video> elements using captureStream() + MediaRecorder,
 * then sends base64-encoded chunks to the content script via window.postMessage.
 *
 * This enables transcription of videos WITHOUT closed captions.
 */
(function () {
  "use strict";

  // Prevent double-injection
  if (window.__fluencyAudioCapture) return;
  window.__fluencyAudioCapture = true;

  let mediaRecorder = null;
  let isActive = false;
  let pendingTranscription = false;

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
      const audioStream = new MediaStream(audioTracks);

      // Use opus codec in webm container — great for speech
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      mediaRecorder = new MediaRecorder(audioStream, {
        mimeType,
        audioBitsPerSecond: 16000, // 16 kbps — enough for speech
      });

      // When a chunk is ready, convert to base64 and forward to content script
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size < 100) return; // skip empty/tiny chunks

        if (pendingTranscription) return; // don't queue if previous is still processing

        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result || "").split(",")[1];
          if (base64) {
            pendingTranscription = true;
            window.postMessage(
              { type: "FLUENCY_AUDIO_CHUNK", data: base64, mimeType },
              "*"
            );
          }
        };
        reader.readAsDataURL(e.data);
      };

      // Collect data every 4 seconds — good balance for speech segments
      mediaRecorder.start(4000);
      isActive = true;

      notifyStatus("active", {
        codec: mimeType,
        sampleRate: 16000,
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
