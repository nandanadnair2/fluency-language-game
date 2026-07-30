"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SpeakerHigh,
  ArrowUp,
  ArrowDown,
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

export default function DynamicIsland({
  subtitle,
  expanded,
  onToggleExpand,
  onDismiss,
  onSave,
}: DynamicIslandProps) {
  const [copied, setCopied] = useState(false);

  if (!subtitle) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        initial={{ y: 100, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.8 }}
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
            className="glass-card rounded-full px-5 py-3 shadow-2xl flex items-center gap-3 hover:shadow-[0_0_40px_rgba(255,123,90,0.2)] transition-all active:scale-95 max-w-[90vw]"
            whileHover={{ scale: 1.02 }}
            layout
          >
            <div className="w-2 h-2 rounded-full bg-coral animate-pulse" />
            <span className="text-sm font-medium text-charcoal truncate max-w-[200px]">
              {subtitle.original}
            </span>
            <ArrowUp size={16} weight="bold" className="text-muted-foreground shrink-0" />
          </motion.button>
        )}

        {/* Expanded card mode */}
        {expanded && (
          <motion.div
            className="glass-card rounded-3xl p-5 shadow-2xl w-[90vw] max-w-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-coral/10 flex items-center justify-center">
                  <SpeakerHigh size={14} weight="fill" className="text-coral" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Live Subtitle
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={onDismiss}
                  className="w-7 h-7 rounded-full hover:bg-secondary flex items-center justify-center transition-all active:scale-90"
                >
                  <X size={14} weight="bold" className="text-muted-foreground" />
                </button>
                <button
                  onClick={onToggleExpand}
                  className="w-7 h-7 rounded-full hover:bg-secondary flex items-center justify-center transition-all active:scale-90"
                >
                  <ArrowDown size={14} weight="bold" className="text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Original */}
            <div className="mb-3 p-3 rounded-2xl bg-secondary/50">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                📝 Original
              </span>
              <p className="font-serif text-lg font-bold text-charcoal mt-1 break-words">
                {subtitle.original}
              </p>
            </div>

            {/* Translation */}
            <div className="mb-3 p-3 rounded-2xl bg-sage/5 border border-sage/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  🗣️ Translation
                </span>
                <button
                  onClick={() => handleCopy(subtitle.directTranslation)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-coral transition-colors"
                >
                  <Copy size={10} weight="bold" />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-base font-medium text-charcoal mt-1 break-words">
                {subtitle.directTranslation}
              </p>
            </div>

            {/* Romanized */}
            <div className="mb-4 p-3 rounded-2xl bg-butter/5 border border-butter/20">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                🔊 Pronunciation
              </span>
              <p className="text-base font-normal text-sage mt-1 break-words">
                {subtitle.romanized}
              </p>
            </div>

            {/* Save button */}
            <button
              onClick={() => onSave?.(subtitle)}
              className="w-full py-2.5 rounded-full bg-coral text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              <Star size={16} weight="fill" />
              Save to Loot Deck
            </button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
