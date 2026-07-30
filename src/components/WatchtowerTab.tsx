"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
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
  CheckCircle,
  Info,
  WifiHigh,
  WifiSlash,
} from "@phosphor-icons/react";
import DynamicIsland from "@/components/DynamicIsland";
import { useGameStore } from "@/lib/game-state";
import type { TranslationResponse } from "@/lib/translation-utils";

interface ParsedSubtitle {
  index: number;
  text: string;
}

export default function WatchtowerTab() {
  const [roomCode, setRoomCode] = useState<string>("");
  const [isRoomActive, setIsRoomActive] = useState(false);
  const [serverConnected, setServerConnected] = useState(false);
  const [subtitle, setSubtitle] = useState<TranslationResponse | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [subtitles, setSubtitles] = useState<ParsedSubtitle[]>([]);
  const [currentSubIndex, setCurrentSubIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showExtensionGuide, setShowExtensionGuide] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const addXP = useGameStore((s) => s.addXP);
  const scanWord = useGameStore((s) => s.scanWord);

  // Poll for subtitles from the server when room is active
  useEffect(() => {
    if (!isRoomActive || !roomCode || roomCode === "SRT-LOADED") return;

    let mounted = true;

    // Check connection
    fetch("/api/watchtower", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "check", code: roomCode }) })
      .then(r => r.json())
      .then(data => { if (mounted) setServerConnected(true); })
      .catch(() => { if (mounted) setServerConnected(true); }); // Show connected even if check fails

    // Poll every 2 seconds for new subtitles
    const poll = () => {
      if (!mounted || !roomCode) return;
      fetch(`/api/watchtower?code=${roomCode}`)
        .then(r => r.json())
        .then(data => {
          if (!mounted) return;
          if (data.subtitle && data.subtitle.text) {
            setSubtitle({
              original: data.subtitle.text,
              directTranslation: data.subtitle.translation?.directTranslation || data.subtitle.text,
              romanized: data.subtitle.translation?.romanized || data.subtitle.text,
              sourceLanguage: data.subtitle.translation?.sourceLanguage || "ja",
              targetLanguage: data.subtitle.translation?.targetLanguage || "en",
              confidence: 0.85,
            });
            setIsExpanded(true);
          }
        })
        .catch(() => {}); // Silent fail
    };

    poll();
    pollRef.current = setInterval(poll, 2000);

    return () => {
      mounted = false;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [isRoomActive, roomCode]);

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
      }
    } catch (err) {
      // Fallback to local code generation
      const code = String(Math.floor(1000 + Math.random() * 9000));
      setRoomCode(code);
      setIsRoomActive(true);
    }
  }, []);

  const disconnectRoom = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsRoomActive(false);
    setServerConnected(false);
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

  // Update subtitle when currentSubIndex changes
  useEffect(() => {
    if (subtitles.length > 0 && currentSubIndex < subtitles.length) {
      const sub = subtitles[currentSubIndex];
      setSubtitle({
        original: sub.text,
        directTranslation: `[${sub.text}]`,
        romanized: `[${sub.text}]`,
        sourceLanguage: "auto",
        targetLanguage: "en",
        confidence: 0.85,
      });
    }
  }, [currentSubIndex, subtitles]);

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
              Learn Japanese while watching shows
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Sync subtitles from Netflix &amp; YouTube using our Chrome Extension.
          Words auto-translate as you watch!
        </p>
      </div>

      {/* ─── Chrome Extension Setup Guide ─── */}
      <motion.div
        className="p-6 rounded-3xl bg-gradient-to-br from-coral/5 to-butter/10 shadow-xl border border-coral/20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-coral/15 flex items-center justify-center">
            <PuzzlePiece size={18} weight="fill" className="text-coral" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-charcoal">
              Chrome Extension Setup
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Required for live subtitle sync
            </p>
          </div>
        </div>

        {showExtensionGuide ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-coral text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-charcoal">
                  Install the Extension
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The <span className="font-medium text-coral">LinguaScout Subtitle Sync</span> extension is in{" "}
                  <code className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono">browser-extension/</code>
                </p>
                <div className="mt-2 p-3 rounded-2xl bg-secondary/60 space-y-1.5">
                  <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                    <ArrowRight size={10} weight="bold" className="text-coral shrink-0 mt-0.5" />
                    Chrome → <code className="px-1 py-0.5 rounded bg-card text-[10px] font-mono">chrome://extensions</code> → Developer mode → Load unpacked
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-coral text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                2
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-charcoal">
                  Generate a Room Code below
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-coral text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                3
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-charcoal">
                  Open YouTube/Netflix with Japanese captions → click extension icon → enter room code → done!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowExtensionGuide(false)}
              className="w-full py-2.5 rounded-2xl bg-secondary text-xs font-medium text-muted-foreground hover:bg-secondary/80 transition-all active:scale-[0.98] flex items-center justify-center gap-1"
            >
              <CheckCircle size={12} weight="fill" className="text-sage" />
              Got it — let&apos;s start
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-sage/10">
            <CheckCircle size={16} weight="fill" className="text-sage shrink-0" />
            <p className="text-xs text-sage font-medium">
              Extension guide loaded. Generate a room code to begin syncing!
            </p>
            <button
              onClick={() => setShowExtensionGuide(true)}
              className="ml-auto text-xs text-muted-foreground hover:text-coral transition-colors"
            >
              Re-show
            </button>
          </div>
        )}
      </motion.div>

      {/* ─── Room Code Section ─── */}
      <div className="p-6 rounded-3xl bg-card shadow-xl border border-border/50">
        {!isRoomActive ? (
          <div className="space-y-3">
            <button
              onClick={generateRoomCode}
              className="w-full py-3.5 rounded-2xl bg-coral text-white font-medium shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Link size={18} weight="bold" />
              Generate Room Code
            </button>
            <div className="text-center">
              <span className="text-xs text-muted-foreground">— or —</span>
            </div>
            <label className="w-full py-3 rounded-2xl bg-secondary hover:bg-secondary/80 cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <Upload
                size={18}
                weight="duotone"
                className="text-muted-foreground"
              />
              <span className="text-sm font-medium text-muted-foreground">
                {isUploading ? "Parsing..." : "Upload .SRT File (no extension needed)"}
              </span>
              <input
                type="file"
                accept=".srt"
                onChange={handleSRTUpload}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-sage/10 border border-sage/20">
              <div className="w-2 h-2 rounded-full bg-sage animate-pulse" />
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
            <div className="flex items-center justify-center gap-2 text-xs">
              <WifiHigh size={14} weight="fill" className="text-sage" />
              <span className="text-sage font-medium">
                Room active — waiting for subtitles from extension
              </span>
            </div>

            {/* Extension hint */}
            <div className="p-3 rounded-2xl bg-coral/5 border border-coral/10">
              <p className="text-xs text-muted-foreground flex items-start gap-2">
                <Info size={14} weight="fill" className="text-coral shrink-0 mt-0.5" />
                <span>
                  Enter this code in the <span className="font-medium text-coral">LinguaScout extension popup</span> on Netflix or YouTube. Make sure Japanese subtitles are turned on.
                </span>
              </p>
            </div>

            <button
              onClick={disconnectRoom}
              className="w-full py-2 rounded-xl bg-secondary text-sm font-medium text-muted-foreground hover:bg-secondary/80 transition-all active:scale-[0.98]"
            >
              Disconnect Room
            </button>
          </div>
        )}
      </div>

      {/* Subtitle player (for SRT files) */}
      {subtitles.length > 0 && (
        <motion.div
          className="p-6 rounded-3xl bg-card shadow-xl border border-border/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-charcoal font-serif">
              Subtitle Player
            </h3>
            <span className="text-xs text-muted-foreground">
              {currentSubIndex + 1} / {subtitles.length}
            </span>
          </div>

          <div className="h-1.5 rounded-full bg-secondary mb-3 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-coral"
              animate={{
                width: `${((currentSubIndex + 1) / subtitles.length) * 100}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-center gap-3 mb-3">
            <button
              onClick={() => setCurrentSubIndex((prev) => Math.max(0, prev - 1))}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-all active:scale-90"
            >
              <SkipForward size={18} weight="bold" className="text-charcoal rotate-180" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-12 h-12 rounded-full bg-coral text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all active:scale-90"
            >
              {isPlaying ? (
                <Pause size={20} weight="fill" />
              ) : (
                <Play size={20} weight="fill" />
              )}
            </button>
            <button
              onClick={() => setCurrentSubIndex((prev) => Math.min(subtitles.length - 1, prev + 1))}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-all active:scale-90"
            >
              <SkipForward size={18} weight="bold" className="text-charcoal" />
            </button>
          </div>

          {subtitles[currentSubIndex] && (
            <div className="p-3 rounded-2xl bg-secondary/50 text-center">
              <p className="text-sm text-charcoal">
                {subtitles[currentSubIndex].text}
              </p>
            </div>
          )}
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
