/**
 * Fluency Audio Capture v3
 * Injected into the MAIN world of YouTube / Netflix pages.
 * Captures audio from <video> elements using captureStream() + MediaRecorder,
 * converts to WAV format, then sends base64-encoded chunks to content script.
 *
 * v3: Convert WebM/Opus → WAV before sending. The ASR API requires WAV format.
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
    window.postMessage({ type: "FLUENCY_AUDIO_STATUS", status, ...extra }, "*");
  }

  // ── WAV Encoding ───────────────────────────────────────────────
  // Converts Float32Array PCM audio data to WAV base64 string.
  // WAV is universally supported by ASR APIs (unlike WebM/Opus).
  function encodeWavBase64(float32Array, sampleRate) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const numSamples = float32Array.length;
    const dataSize = numSamples * blockAlign;
    const bufferSize = 44 + dataSize;

    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // RIFF header
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, "WAVE");

    // fmt sub-chunk
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);        // Sub-chunk size (PCM)
    view.setUint16(20, 1, true);         // Audio format (PCM = 1)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data sub-chunk
    writeString(view, 36, "data");
    view.setUint32(40, dataSize, true);

    // Write PCM samples (float32 → int16)
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += bytesPerSample;
    }

    // Convert ArrayBuffer → base64
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function writeString(view, offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // ── AudioContext-based recording (bypasses MediaRecorder entirely) ──
  // This gives us direct PCM access → no format conversion issues.
  let audioContext = null;
  let sourceNode = null;
  let processorNode = null;
  let recordBuffer = [];
  let recordInterval = null;
  const CHUNK_DURATION_MS = 4000; // 4-second chunks
  const TARGET_SAMPLE_RATE = 16000; // 16kHz ideal for ASR

  // ── Chunk Production Monitor ────────────────────────────────────
  function startChunkMonitor() {
    stopChunkMonitor();
    lastChunkTime = Date.now();
    chunksProduced = 0;

    chunkMonitorTimer = setInterval(() => {
      const elapsed = (Date.now() - lastChunkTime) / 1000;
      if (isActive && elapsed > 20 && chunksProduced === 0) {
        console.warn("[Fluency Audio] No chunks in", elapsed.toFixed(0), "s — video may be muted/DRM-blocked");
        notifyStatus("no_data", {
          error: "No audio data captured — is the video unmuted?",
          elapsed: Math.round(elapsed),
        });
      }
    }, 5000);
  }

  function stopChunkMonitor() {
    if (chunkMonitorTimer) { clearInterval(chunkMonitorTimer); chunkMonitorTimer = null; }
  }

  function onChunkProduced() {
    chunksProduced++;
    lastChunkTime = Date.now();
    if (chunksProduced === 1) {
      console.log("[Fluency Audio] First WAV chunk produced!");
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
      return;
    }
    if (video.muted || video.volume === 0) {
      console.warn("[Fluency Audio] Video appears muted");
      notifyStatus("muted", { error: "Video is muted — unmute for audio capture" });
    }

    try {
      const rawStream = video.captureStream ? video.captureStream() : video.mozCaptureStream();
      if (!rawStream) {
        notifyStatus("error", { error: "captureStream() returned null" });
        return;
      }

      const audioTracks = rawStream.getAudioTracks();
      if (audioTracks.length === 0) {
        notifyStatus("error", { error: "No audio tracks — video may be muted or DRM-blocked" });
        return;
      }

      console.log(`[Fluency Audio] ${audioTracks.length} audio track(s), creating AudioContext…`);

      // Create AudioContext with target sample rate
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: TARGET_SAMPLE_RATE,
      });

      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(new MediaStream(audioTracks));

      // Use ScriptProcessorNode (deprecated but works in all browsers including injected contexts)
      // bufferSize=4096 gives good resolution at 16kHz
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      recordBuffer = [];

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Copy into recording buffer
        const copy = new Float32Array(inputData.length);
        copy.set(inputData);
        recordBuffer.push(copy);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      audioContext = audioCtx;
      sourceNode = source;
      processorNode = processor;

      // Flush buffer as WAV chunks every 4 seconds
      recordInterval = setInterval(() => {
        flushWavChunk();
      }, CHUNK_DURATION_MS);

      isActive = true;
      startChunkMonitor();

      notifyStatus("active", {
        codec: "WAV (PCM 16-bit)",
        sampleRate: TARGET_SAMPLE_RATE,
        audioTracks: audioTracks.length,
        intervalMs: CHUNK_DURATION_MS,
      });
      console.log("[Fluency Audio] Capture started — recording 4s WAV chunks at 16kHz");

    } catch (err) {
      console.error("[Fluency Audio] Failed:", err);
      notifyStatus("error", { error: err.message });
    }
  }

  // ── Flush recorded audio as a WAV chunk ─────────────────────────
  function flushWavChunk() {
    if (recordBuffer.length === 0) return;
    if (pendingTranscription) return; // wait for previous transcription to finish

    // Merge all buffered Float32Arrays
    let totalLength = 0;
    for (const buf of recordBuffer) totalLength += buf.length;

    if (totalLength < 400) return; // Skip if less than ~25ms of audio

    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const buf of recordBuffer) {
      merged.set(buf, offset);
      offset += buf.length;
    }

    // Clear buffer
    recordBuffer = [];

    // Encode as WAV
    const sampleRate = audioContext ? audioContext.sampleRate : 16000;
    const base64 = encodeWavBase64(merged, sampleRate);

    if (base64 && base64.length > 100) {
      pendingTranscription = true;
      console.log(`[Fluency Audio] WAV chunk ${chunksProduced + 1}: ${(totalLength / sampleRate).toFixed(1)}s, ${base64.length} chars base64`);
      onChunkProduced();
      window.postMessage(
        { type: "FLUENCY_AUDIO_CHUNK", data: base64, mimeType: "audio/wav" },
        "*"
      );
    }
  }

  // ── Stop Audio Capture ──────────────────────────────────────────
  function stopCapture() {
    // Flush any remaining audio
    if (isActive && recordBuffer.length > 0) {
      flushWavChunk();
    }

    if (recordInterval) { clearInterval(recordInterval); recordInterval = null; }
    if (processorNode && sourceNode) {
      try {
        processorNode.disconnect();
        sourceNode.disconnect();
      } catch (_) { /* ignore */ }
    }
    if (audioContext && audioContext.state !== "closed") {
      try { audioContext.close(); } catch (_) { /* ignore */ }
    }
    processorNode = null;
    sourceNode = null;
    audioContext = null;
    recordBuffer = [];
    isActive = false;
    pendingTranscription = false;
    stopChunkMonitor();
    notifyStatus("stopped");
  }

  // ── Lifecycle Hooks ─────────────────────────────────────────────
  document.addEventListener("play", (e) => {
    if (e.target?.tagName === "VIDEO") {
      setTimeout(() => { if (!isActive) startCapture(); }, 2500);
    }
  }, true);

  document.addEventListener("pause", (e) => {
    if (e.target?.tagName === "VIDEO") stopCapture();
  }, true);
  document.addEventListener("ended", (e) => {
    if (e.target?.tagName === "VIDEO") stopCapture();
  }, true);
  document.addEventListener("seeked", (e) => {
    if (e.target?.tagName === "VIDEO") {
      stopCapture();
      setTimeout(startCapture, 1000);
    }
  }, true);

  // Start immediately if video already playing
  setTimeout(() => {
    const video = findVideo();
    if (video && !video.paused && !video.ended) startCapture();
  }, 4000);

  // Listen for control messages from content script
  window.addEventListener("message", (e) => {
    if (e.data?.type === "FLUENCY_AUDIO_CONTROL") {
      if (e.data.action === "start") startCapture();
      if (e.data.action === "stop") stopCapture();
    }
    if (e.data?.type === "FLUENCY_TRANSCRIPTION_DONE") {
      pendingTranscription = false;
    }
  });
})();
