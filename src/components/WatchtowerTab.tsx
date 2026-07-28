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
  CheckCircle,
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
  const [subtitle, setSubtitle] = useState<TranslationResponse | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [subtitles, setSubtitles] = useState<ParsedSubtitle[]>([]);
  const [currentSubIndex, setCurrentSubIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const addXP = useGameStore((s) => s.addXP);
  const scanWord = useGameStore((s) => s.scanWord);

  const generateRoomCode = useCallback(() => {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setRoomCode(code);
    setIsRoomActive(true);
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
      // Create mock translation for the subtitle text
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
    <div className="flex flex-col gap-4 h-full">
      {/* Room code section */}
      <div className="p-6 rounded-3xl bg-card shadow-xl border border-border/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-coral/10 flex items-center justify-center">
            <Television size={24} weight="duotone" className="text-coral" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-charcoal">
              Watchtower Mode
            </h2>
            <p className="text-xs text-muted-foreground">
              Sync subtitles from your shows
            </p>
          </div>
        </div>

        {!isRoomActive ? (
          <div className="space-y-3">
            <button
              onClick={generateRoomCode}
              className="w-full py-3 rounded-2xl bg-coral text-white font-medium shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
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
                {isUploading ? "Parsing..." : "Upload .SRT File"}
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
            <p className="text-xs text-center text-muted-foreground">
              Enter this code in the Chrome Extension to sync subtitles
            </p>
            <button
              onClick={() => {
                setIsRoomActive(false);
                setSubtitles([]);
                setCurrentSubIndex(0);
                setIsPlaying(false);
                setSubtitle(null);
              }}
              className="w-full py-2 rounded-xl bg-secondary text-sm font-medium text-muted-foreground hover:bg-secondary/80 transition-all active:scale-[0.98]"
            >
              Disconnect
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

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-secondary mb-3 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-coral"
              animate={{
                width: `${((currentSubIndex + 1) / subtitles.length) * 100}%`,
              }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <button
              onClick={() => {
                setCurrentSubIndex((prev) => Math.max(0, prev - 1));
              }}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-all active:scale-90"
            >
              <SkipForward
                size={18}
                weight="bold"
                className="text-charcoal rotate-180"
              />
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
              onClick={() => {
                setCurrentSubIndex((prev) =>
                  Math.min(subtitles.length - 1, prev + 1)
                );
              }}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-all active:scale-90"
            >
              <SkipForward size={18} weight="bold" className="text-charcoal" />
            </button>
          </div>

          {/* Current subtitle preview */}
          {subtitles[currentSubIndex] && (
            <div className="p-3 rounded-2xl bg-secondary/50 text-center">
              <p className="text-sm text-charcoal">
                {subtitles[currentSubIndex].text}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Instructions for Chrome Extension */}
      {isRoomActive && subtitles.length === 0 && (
        <motion.div
          className="p-6 rounded-3xl bg-card shadow-xl border border-border/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-butter/20 flex items-center justify-center shrink-0 mt-0.5">
              <Television size={16} weight="fill" className="text-butter" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-charcoal font-serif">
                How to Sync
              </h3>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-coral/10 text-coral flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  Open Netflix or YouTube in your browser
                </p>
                <p className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-coral/10 text-coral flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  Start a video with subtitles enabled
                </p>
                <p className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-coral/10 text-coral flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  Enter room code in the Chrome Extension popup
                </p>
              </div>
            </div>
          </div>
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
