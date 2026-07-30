"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Television,
  Copy,
  Upload,
  Link,
  Play,
  Pause,
  SkipForward,
  PuzzlePiece,
  ArrowRight,
  Info,
  WifiHigh,
  WifiSlash,
  SpinnerGap,
  Translate,
  Keyboard,
  FileText,
  CaretDown,
} from "@phosphor-icons/react";
import DynamicIsland from "@/components/DynamicIsland";
import { useGameStore } from "@/lib/game-state";
import type { TranslationResponse } from "@/lib/translation-utils";

interface ParsedSubtitle {
  index: number;
  text: string;
}

export default function WatchtowerTab() {
  const [manualText, setManualText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  const [roomCode, setRoomCode] = useState<string>("");
  const [isRoomActive, setIsRoomActive] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketConnecting, setSocketConnecting] = useState(false);
  const [subtitle, setSubtitle] = useState<TranslationResponse | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [subtitles, setSubtitles] = useState<ParsedSubtitle[]>([]);
  const [currentSubIndex, setCurrentSubIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showExtensionSection, setShowExtensionSection] = useState(false);
  const [socketModule, setSocketModule] = useState<{io: any; Socket: any} | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<any>(null);

  const addXP = useGameStore((s) => s.addXP);
  const scanWord = useGameStore((s) => s.scanWord);

  // ─── Manual Text Translation ───
  const handleManualTranslate = useCallback(async () => {
    const text = manualText.trim();
    if (!text) return;

    setIsTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const translated = await res.json();
      setSubtitle({
        original: text,
        directTranslation: translated.directTranslation || text,
        romanized: translated.romanized || text,
        sourceLanguage: translated.sourceLanguage || "ja",
        targetLanguage: translated.targetLanguage || "en",
        confidence: 0.90,
      });
      setIsExpanded(true);
    } catch {
      setSubtitle({
        original: text,
        directTranslation: `[Could not translate: ${text}]`,
        romanized: text,
        sourceLanguage: "auto",
        targetLanguage: "en",
        confidence: 0.5,
      });
      setIsExpanded(true);
    } finally {
      setIsTranslating(false);
    }
  }, [manualText]);

  // Dynamically load socket.io-client only when needed (saves memory)
  const loadSocketIO = useCallback(async () => {
    if (socketModule) return socketModule;
    try {
      const mod = await import("socket.io-client");
      setSocketModule({ io: mod.io, Socket: mod.Socket });
      return { io: mod.io, Socket: mod.Socket };
    } catch (err) {
      console.error("Failed to load socket.io-client:", err);
      return null;
    }
  }, [socketModule]);

  // ─── Socket.io Connection Management ───
  const connectSocket = useCallback(
    async (code: string) => {
      const mod = await loadSocketIO();
      if (!mod) return;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      setSocketConnecting(true);
      setConnectionError(null);

      const socket = mod.io("/?XTransformPort=3004", {
        path: "/",
        transports: ["websocket", "polling"],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("[Watchtower] Socket connected:", socket.id);
        setSocketConnected(true);
        setSocketConnecting(false);
        setConnectionError(null);

        socket.emit("join-room", code, (response: any) => {
          console.log("[Watchtower] Joined room:", code, response);
        });
      });

      socket.on("disconnect", (reason) => {
        console.log("[Watchtower] Socket disconnected:", reason);
        setSocketConnected(false);
        setSocketConnecting(false);
        if (reason === "io server disconnect") {
          setConnectionError("Server disconnected. Try generating a new room code.");
        }
      });

      socket.on("connect_error", (err) => {
        console.error("[Watchtower] Connection error:", err.message);
        setSocketConnected(false);
        setSocketConnecting(false);
        setConnectionError("Connection failed. Make sure the WebSocket service is running.");
      });

      socket.on("subtitle", async (data: { code: string; text: string; translation: any }) => {
        console.log("[Watchtower] Received subtitle:", data.text?.slice(0, 50));

        if (data.translation && data.translation.directTranslation) {
          setSubtitle({
            original: data.text,
            directTranslation: data.translation.directTranslation,
            romanized: data.translation.romanized || data.translation.directTranslation,
            sourceLanguage: data.translation.sourceLanguage || "ja",
            targetLanguage: data.translation.targetLanguage || "en",
            confidence: 0.90,
          });
        } else {
          setIsTranslating(true);
          try {
            const res = await fetch("/api/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: data.text }),
            });
            const translated = await res.json();
            setSubtitle({
              original: data.text,
              directTranslation: translated.directTranslation || data.text,
              romanized: translated.romanized || data.text,
              sourceLanguage: translated.sourceLanguage || "ja",
              targetLanguage: translated.targetLanguage || "en",
              confidence: 0.90,
            });
          } catch {
            setSubtitle({
              original: data.text,
              directTranslation: data.text,
              romanized: data.text,
              sourceLanguage: "auto",
              targetLanguage: "en",
              confidence: 0.5,
            });
          } finally {
            setIsTranslating(false);
          }
        }
        setIsExpanded(true);
      });

      socket.on("member-joined", (data: any) => {
        console.log("[Watchtower] Member joined:", data);
      });

      socket.on("member-left", (data: any) => {
        console.log("[Watchtower] Member left:", data);
      });
    },
    []
  );

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const generateRoomCode = useCallback(async () => {
    try {
      const res = await fetch("/api/watchtower", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-room" }),
      });
      const data = await res.json();
      if (data.code) {
        setRoomCode(data.code);
        setIsRoomActive(true);
        connectSocket(data.code);
        return;
      }
    } catch {
      // Fallback
    }

    const code = String(Math.floor(1000 + Math.random() * 9000));
    setRoomCode(code);
    setIsRoomActive(true);
    connectSocket(code);
  }, [connectSocket]);

  const disconnectRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRoomActive(false);
    setSocketConnected(false);
    setSocketConnecting(false);
    setConnectionError(null);
    setSubtitles([]);
    setCurrentSubIndex(0);
    setIsPlaying(false);
    setSubtitle(null);
  }, []);

  const handleSRTUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      const text = await file.text();
      try {
        const res = await fetch("/api/srt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ srtContent: text }),
        });
        const data = await res.json();
        if (data.subtitles && data.subtitles.length > 0) {
          setSubtitles(data.subtitles);
          setCurrentSubIndex(0);
          setRoomCode("SRT-LOADED");
          setIsRoomActive(true);
        }
      } catch (err) {
        console.error("SRT upload failed:", err);
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  // Auto-play subtitles
  useEffect(() => {
    if (isPlaying && subtitles.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentSubIndex((prev) => {
          if (prev + 1 >= subtitles.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 3000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, subtitles]);

  // Translate current SRT subtitle when index changes
  useEffect(() => {
    if (subtitles.length > 0 && currentSubIndex < subtitles.length && roomCode === "SRT-LOADED") {
      const sub = subtitles[currentSubIndex];
      setIsTranslating(true);

      fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sub.text }),
      })
        .then((r) => r.json())
        .then((translated) => {
          setSubtitle({
            original: sub.text,
            directTranslation: translated.directTranslation || `[${sub.text}]`,
            romanized: translated.romanized || `[${sub.text}]`,
            sourceLanguage: translated.sourceLanguage || "auto",
            targetLanguage: translated.targetLanguage || "en",
            confidence: 0.90,
          });
        })
        .catch(() => {
          setSubtitle({
            original: sub.text,
            directTranslation: `[${sub.text}]`,
            romanized: `[${sub.text}]`,
            sourceLanguage: "auto",
            targetLanguage: "en",
            confidence: 0.5,
          });
        })
        .finally(() => setIsTranslating(false));
    }
  }, [currentSubIndex, subtitles, roomCode]);

  const handleSave = useCallback(
    (word: TranslationResponse) => {
      import("@/lib/db-vocabulary").then(({ saveWord }) => {
        saveWord({
          original: word.original,
          directTranslation: word.directTranslation,
          romanized: word.romanized,
          sourceLanguage: word.sourceLanguage,
          targetLanguage: word.targetLanguage,
          savedAt: new Date(),
          xpEarned: 3,
          reviewCount: 1,
        });
      });
      addXP(3);
      scanWord();
    },
    [addXP, scanWord]
  );

  const handleDismiss = useCallback(() => {
    setSubtitle(null);
    setIsExpanded(false);
  }, []);

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar pb-4">
      {/* Header card */}
      <div className="p-6 rounded-3xl bg-card shadow-xl border border-border/50">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-coral/10 flex items-center justify-center">
            <Television size={24} weight="duotone" className="text-coral" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-charcoal">
              Watchtower Mode
            </h2>
            <p className="text-xs text-muted-foreground">
              Translate Japanese from shows, subtitles & text
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Type or paste Japanese text, upload subtitles, or sync with our Chrome Extension
          for live translation while watching shows!
        </p>
      </div>

      {/* ─── Quick Translate (Manual Input) ─── */}
      <motion.div
        className="p-6 rounded-3xl bg-gradient-to-br from-coral/5 to-butter/10 shadow-xl border border-coral/20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-coral/15 flex items-center justify-center">
            <Keyboard size={18} weight="fill" className="text-coral" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-charcoal">
              Quick Translate
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Type or paste any Japanese text
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Type or paste Japanese text here... e.g. こんにちは、世界！"
            className="w-full p-4 rounded-2xl bg-card border-2 border-border/50 text-base text-charcoal placeholder:text-muted-foreground/50 focus:outline-none focus:border-coral/50 resize-none transition-colors min-h-[80px]"
            rows={3}
          />
          <button
            onClick={handleManualTranslate}
            disabled={!manualText.trim() || isTranslating}
            className="w-full py-3 rounded-2xl bg-coral text-white font-medium shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isTranslating ? (
              <SpinnerGap size={18} className="animate-spin" />
            ) : (
              <Translate size={18} weight="bold" />
            )}
            {isTranslating ? "Translating with AI..." : "Translate"}
          </button>
        </div>

        {/* Quick examples */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["こんにちは", "ありがとう", "いただきます", "大丈夫です"].map((phrase) => (
            <button
              key={phrase}
              onClick={() => setManualText(phrase)}
              className="px-3 py-1 rounded-full bg-card/80 text-xs text-muted-foreground hover:text-coral hover:bg-card transition-all active:scale-95"
            >
              {phrase}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ─── SRT Upload ─── */}
      {!isRoomActive && (
        <motion.div
          className="p-6 rounded-3xl bg-card shadow-xl border border-border/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-sage/15 flex items-center justify-center">
              <FileText size={18} weight="fill" className="text-sage" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-charcoal">
                Subtitle File
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Upload an .SRT file to translate line-by-line
              </p>
            </div>
          </div>

          <label className="w-full py-3.5 rounded-2xl bg-sage/10 hover:bg-sage/20 cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2 border border-sage/20">
            <Upload size={18} weight="duotone" className="text-sage" />
            <span className="text-sm font-medium text-sage">
              {isUploading ? "Parsing SRT..." : "Upload .SRT File"}
            </span>
            <input
              type="file"
              accept=".srt"
              onChange={handleSRTUpload}
              className="hidden"
            />
          </label>
        </motion.div>
      )}

      {/* ─── Chrome Extension + Room Code (Collapsible Advanced Section) ─── */}
      <motion.div
        className="rounded-3xl bg-card shadow-xl border border-border/50 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {/* Section header — always visible, clickable to expand */}
        <button
          onClick={() => {
            if (showExtensionSection) {
              setShowExtensionSection(false);
            } else {
              setShowExtensionSection(true);
            }
          }}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-butter/20 flex items-center justify-center">
              <PuzzlePiece size={18} weight="fill" className="text-butter" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-charcoal">
                Chrome Extension Sync
              </h3>
              <p className="text-[10px] text-muted-foreground">
                For live subtitles from Netflix/YouTube
              </p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: showExtensionSection ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <CaretDown size={18} weight="bold" className="text-muted-foreground" />
          </motion.div>
        </button>

        {/* Collapsible content */}
        <AnimatePresence>
          {showExtensionSection && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-4 border-t border-border/30 pt-4">
                {/* Setup guide */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-coral text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-charcoal">
                        Install the Extension
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Load the <span className="font-medium text-coral">Fluency</span> extension from{" "}
                        <code className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono">browser-extension/</code>
                      </p>
                      <div className="mt-1.5 p-2.5 rounded-xl bg-secondary/60">
                        <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                          <ArrowRight size={10} weight="bold" className="text-coral shrink-0 mt-0.5" />
                          Chrome → <code className="px-1 py-0.5 rounded bg-card text-[10px] font-mono">chrome://extensions</code> → Developer mode → Load unpacked
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-coral text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-charcoal">
                        Generate a Room Code
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Click the button below to create a sync room
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-coral text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-charcoal">
                        Open YouTube/Netflix → click extension → enter code → done!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Self-hosting guide link */}
                <div className="p-4 rounded-xl bg-butter/10 border border-butter/20 space-y-3">
                  <div className="flex items-start gap-2">
                    <Info size={14} weight="fill" className="text-butter shrink-0 mt-0.5" />
                    <span className="text-[11px] text-muted-foreground">
                      <span className="font-medium text-butter">Self-hosting required for extension sync.</span> You need to run Fluency on your own machine.
                    </span>
                  </div>
                  <a
                    href="/setup"
                    className="block w-full py-2.5 rounded-xl bg-butter text-charcoal text-xs font-semibold hover:bg-butter/90 transition-all active:scale-[0.98] text-center no-underline cursor-pointer"
                  >
                    📥 Download &amp; Setup Guide
                  </a>
                  <p className="text-[10px] text-muted-foreground italic text-center">
                    Or use Quick Translate / SRT upload above for this demo.
                  </p>
                </div>

                {/* Room code generation */}
                {!isRoomActive ? (
                  <button
                    onClick={generateRoomCode}
                    disabled={socketConnecting}
                    className="w-full py-3 rounded-2xl bg-sage text-white font-medium shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {socketConnecting ? (
                      <SpinnerGap size={18} className="animate-spin" />
                    ) : (
                      <Link size={18} weight="bold" />
                    )}
                    {socketConnecting ? "Connecting..." : "Generate Room Code"}
                  </button>
                ) : (
                  <div className="space-y-3">
                    {/* Room code display */}
                    <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-sage/10 border border-sage/20">
                      <div className={`w-3 h-3 rounded-full animate-pulse ${socketConnected ? "bg-sage" : "bg-yellow-500"}`} />
                      <span className="text-sm text-muted-foreground">
                        Room Code:
                      </span>
                      <span className="text-2xl font-bold font-serif text-charcoal tracking-widest">
                        {roomCode}
                      </span>
                      <button
                        onClick={() => navigator.clipboard.writeText(roomCode)}
                        className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center hover:bg-sage/30 transition-all active:scale-90"
                      >
                        <Copy size={14} weight="bold" className="text-sage" />
                      </button>
                    </div>

                    {/* Connection status */}
                    <AnimatePresence mode="wait">
                      {socketConnecting && (
                        <motion.div
                          key="connecting"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-yellow-50 border border-yellow-200"
                        >
                          <SpinnerGap size={16} weight="bold" className="text-yellow-600 animate-spin" />
                          <span className="text-xs font-medium text-yellow-700">
                            Connecting to WebSocket...
                          </span>
                        </motion.div>
                      )}

                      {socketConnected && !socketConnecting && (
                        <motion.div
                          key="connected"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sage/10 border border-sage/30"
                        >
                          <WifiHigh size={16} weight="fill" className="text-sage" />
                          <span className="text-xs font-medium text-sage">
                            Connected — Waiting for subtitles from extension
                          </span>
                        </motion.div>
                      )}

                      {!socketConnected && !socketConnecting && connectionError && (
                        <motion.div
                          key="error"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 border border-red-200"
                        >
                          <WifiSlash size={16} weight="fill" className="text-red-500" />
                          <span className="text-xs font-medium text-red-600">
                            {connectionError}
                          </span>
                        </motion.div>
                      )}

                      {!socketConnected && !socketConnecting && !connectionError && roomCode === "SRT-LOADED" && (
                        <motion.div
                          key="srt"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sage/10 border border-sage/30"
                        >
                          <WifiHigh size={16} weight="fill" className="text-sage" />
                          <span className="text-xs font-medium text-sage">
                            SRT file loaded — use the Subtitle Player below
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      onClick={disconnectRoom}
                      className="w-full py-2.5 rounded-2xl bg-secondary text-xs font-medium text-muted-foreground hover:bg-secondary/80 transition-all active:scale-[0.98]"
                    >
                      Disconnect Room
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Subtitle player (for SRT files) */}
      {subtitles.length > 0 && (
        <motion.div
          className="p-6 rounded-3xl bg-card shadow-xl border border-border/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-charcoal font-serif">
              Subtitle Player
            </h3>
            <span className="text-sm text-muted-foreground">
              {currentSubIndex + 1} / {subtitles.length}
            </span>
          </div>

          <div className="h-2 rounded-full bg-secondary mb-4 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-coral"
              animate={{
                width: `${((currentSubIndex + 1) / subtitles.length) * 100}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={() => setCurrentSubIndex((prev) => Math.max(0, prev - 1))}
              className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-all active:scale-90"
            >
              <SkipForward size={20} weight="bold" className="text-charcoal rotate-180" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-14 h-14 rounded-full bg-coral text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all active:scale-90"
            >
              {isPlaying ? (
                <Pause size={24} weight="fill" />
              ) : (
                <Play size={24} weight="fill" />
              )}
            </button>
            <button
              onClick={() => setCurrentSubIndex((prev) => Math.min(subtitles.length - 1, prev + 1))}
              className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-all active:scale-90"
            >
              <SkipForward size={20} weight="bold" className="text-charcoal" />
            </button>
          </div>

          {subtitles[currentSubIndex] && (
            <div className="p-4 rounded-2xl bg-secondary/50 text-center">
              <p className="text-base text-charcoal leading-relaxed">
                {subtitles[currentSubIndex].text}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Translating indicator */}
      {isTranslating && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-48 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-full glass-card shadow-lg"
        >
          <SpinnerGap size={14} className="text-coral animate-spin" />
          <span className="text-xs font-medium text-charcoal">
            Translating with AI...
          </span>
        </motion.div>
      )}

      {/* Dynamic Island */}
      <DynamicIsland
        subtitle={subtitle}
        expanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
        onDismiss={handleDismiss}
        onSave={handleSave}
      />
    </div>
  );
}
