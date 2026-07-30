"use client";

import React, { useState } from "react";
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
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[92vw] max-w-md"
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
            className="glass-card rounded-full px-6 py-4 shadow-2xl flex items-center gap-3 hover:shadow-[0_0_40px_rgba(255,123,90,0.2)] transition-all active:scale-95 max-w-full"
            whileHover={{ scale: 1.02 }}
            layout
          >
            <div className="w-2.5 h-2.5 rounded-full bg-coral animate-pulse shrink-0" />
            <span className="text-base font-medium text-charcoal truncate">
              {subtitle.original}
            </span>
            <ArrowUp size={18} weight="bold" className="text-muted-foreground shrink-0" />
          </motion.button>
        )}

        {/* Expanded card mode */}
        {expanded && (
          <motion.div
            className="glass-card rounded-3xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Header with dismiss */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-coral/10 flex items-center justify-center">
                  <SpeakerHigh size={16} weight="fill" className="text-coral" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Translation
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss?.();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 hover:bg-charcoal/10 active:scale-95 transition-all cursor-pointer"
              >
                <X size={14} weight="bold" className="text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Close</span>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="px-5 pb-5 overflow-y-auto max-h-[60vh] space-y-3">
              {/* Original */}
              <div className="p-4 rounded-2xl bg-secondary/50">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  📝 Original Text
                </span>
                <p className="font-serif text-xl font-bold text-charcoal mt-1.5 break-words leading-relaxed">
                  {subtitle.original}
                </p>
              </div>

              {/* English Translation — prominent */}
              <div className="p-4 rounded-2xl bg-coral/8 border border-coral/25">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-coral uppercase tracking-wider">
                    🗣️ English Translation
                  </span>
                  <button
                    onClick={() => handleCopy(subtitle.directTranslation)}
                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-coral transition-colors"
                  >
                    <Copy size={12} weight="bold" />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-lg font-semibold text-charcoal mt-1.5 break-words leading-relaxed">
                  {subtitle.directTranslation}
                </p>
              </div>

              {/* Pronunciation / Romanized */}
              <div className="p-4 rounded-2xl bg-butter/5 border border-butter/20">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  🔊 Pronunciation
                </span>
                <p className="text-base font-normal text-sage mt-1.5 break-words leading-relaxed italic">
                  {subtitle.romanized}
                </p>
              </div>

              {/* Save button */}
              <button
                onClick={() => onSave?.(subtitle)}
                className="w-full py-3 rounded-full bg-coral text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                <Star size={16} weight="fill" />
                Save to Loot Deck
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
