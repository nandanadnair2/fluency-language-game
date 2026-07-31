"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SpeakerHigh,
  ArrowUp,
  X,
  Star,
  Copy,
} from "@phosphor-icons/react";
import type { TranslationResponse } from "@/lib/translation-utils";

interface DynamicIslandProps {
  subtitle: TranslationResponse | null;
  expanded: boolean;
  onToggleExpand: () => void;
  onDismiss?: () => void;
  onSave?: (word: TranslationResponse) => void;
}

const LANGUAGE_NAMES: Record<string, string> = {
  ja: "Japanese",
  en: "English",
  ko: "Korean",
  zh: "Chinese",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  it: "Italian",
  ru: "Russian",
  ar: "Arabic",
  hi: "Hindi",
  auto: "Detected",
};

const LANGUAGE_FLAGS: Record<string, string> = {
  ja: "🇯🇵",
  en: "🇺🇸",
  ko: "🇰🇷",
  zh: "🇨🇳",
  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
  pt: "🇧🇷",
  it: "🇮🇹",
  ru: "🇷🇺",
  ar: "🇸🇦",
  hi: "🇮🇳",
  auto: "🌐",
};

export default function DynamicIsland({
  subtitle,
  expanded,
  onToggleExpand,
  onDismiss,
  onSave,
}: DynamicIslandProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleDismiss = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDismiss?.();
    },
    [onDismiss]
  );

  // Dynamic labels based on detected language
  const labels = useMemo(() => {
    const src = subtitle?.sourceLanguage || "auto";
    const tgt = subtitle?.targetLanguage || "en";

    const srcName = LANGUAGE_NAMES[src] || src.toUpperCase();
    const tgtName = LANGUAGE_NAMES[tgt] || tgt.toUpperCase();
    const srcFlag = LANGUAGE_FLAGS[src] || "🌐";
    const tgtFlag = LANGUAGE_FLAGS[tgt] || "🌐";

    // If source is English, translation goes TO Japanese etc.
    // Label the translation section with the TARGET language name
    const isSourceEnglish = src === "en";

    return {
      originalLabel: `${srcFlag} Original Text (${srcName})`,
      translationLabel: `${tgtFlag} ${tgtName} Translation`,
      pronunciationLabel: isSourceEnglish
        ? "🔤 Writing Practice"
        : "🔊 Pronunciation",
      pronunciationText: isSourceEnglish ? subtitle?.romanized : subtitle?.romanized,
      langPair: `${src.toUpperCase()} → ${tgt.toUpperCase()}`,
    };
  }, [subtitle]);

  return (
    <AnimatePresence mode="wait">
      {subtitle && (
        <motion.div
          key="dynamic-island"
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Click-outside backdrop to dismiss */}
          {expanded && (
            <motion.div
              className="absolute inset-0 bg-black/20 pointer-events-auto"
              onClick={handleDismiss}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}

          <motion.div
            className="relative w-[92vw] max-w-md pointer-events-auto mb-4 sm:mb-0"
            initial={{ y: 80, opacity: 0, scale: 0.85 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.85 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
            }}
          >
            {/* Pill mode */}
            {!expanded && (
              <motion.button
                onClick={onToggleExpand}
                className="glass-card rounded-full px-6 py-4 shadow-2xl flex items-center gap-3 hover:shadow-[0_0_40px_rgba(255,123,90,0.2)] transition-all active:scale-95 max-w-full"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-coral animate-pulse shrink-0" />
                <span className="text-base font-medium text-charcoal truncate">
                  {subtitle.original}
                </span>
                <span className="text-sm text-coral font-semibold shrink-0">
                  {subtitle.directTranslation}
                </span>
                <ArrowUp
                  size={18}
                  weight="bold"
                  className="text-muted-foreground shrink-0"
                />
              </motion.button>
            )}

            {/* Expanded card mode */}
            {expanded && (
              <motion.div
                className="glass-card rounded-3xl shadow-2xl overflow-hidden border border-coral/15"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                {/* Header with dismiss */}
                <div className="flex items-center justify-between px-5 pt-4 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-coral/15 flex items-center justify-center">
                      <SpeakerHigh
                        size={18}
                        weight="fill"
                        className="text-coral"
                      />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Translation
                    </span>
                  </div>
                  <button
                    onClick={handleDismiss}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-charcoal/8 hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all cursor-pointer group"
                    aria-label="Close translation"
                  >
                    <X
                      size={16}
                      weight="bold"
                      className="text-muted-foreground group-hover:text-red-500 transition-colors"
                    />
                    <span className="text-xs font-semibold text-muted-foreground group-hover:text-red-500 transition-colors">
                      Close
                    </span>
                  </button>
                </div>

                {/* Scrollable content */}
                <div className="px-5 pb-5 overflow-y-auto max-h-[60vh] space-y-3">
                  {/* Original */}
                  <div className="p-4 rounded-2xl bg-secondary/50">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      📝 {labels.originalLabel}
                    </span>
                    <p className="font-serif text-xl font-bold text-charcoal mt-1.5 break-words leading-relaxed">
                      {subtitle.original}
                    </p>
                  </div>

                  {/* Translation — MOST PROMINENT */}
                  <div className="p-5 rounded-2xl bg-coral/10 border-2 border-coral/30 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-coral uppercase tracking-widest">
                        🗣️ {labels.translationLabel}
                      </span>
                      <button
                        onClick={() => handleCopy(subtitle.directTranslation)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold text-coral/70 hover:text-coral hover:bg-coral/10 transition-colors"
                      >
                        <Copy size={11} weight="bold" />
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p className="text-2xl font-bold text-charcoal mt-2 break-words leading-relaxed">
                      {subtitle.directTranslation}
                    </p>
                  </div>

                  {/* Pronunciation / Romanized */}
                  <div className="p-4 rounded-2xl bg-butter/8 border border-butter/25">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {labels.pronunciationLabel}
                    </span>
                    <p className="text-lg font-medium text-sage mt-1.5 break-words leading-relaxed italic">
                      {subtitle.romanized}
                    </p>
                  </div>

                  {/* Language info */}
                  <div className="flex items-center justify-center gap-2 py-1">
                    <span className="text-[10px] text-muted-foreground">
                      {labels.langPair}
                    </span>
                  </div>

                  {/* Save button */}
                  <button
                    onClick={() => onSave?.(subtitle)}
                    className="w-full py-3.5 rounded-full bg-coral text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:bg-coral/90 transition-all active:scale-95 cursor-pointer"
                  >
                    <Star size={16} weight="fill" />
                    Save to Loot Deck
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
