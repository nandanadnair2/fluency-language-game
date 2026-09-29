"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkle,
  Waveform,
  Heart,
  BookOpen,
  ChatCircle,
} from "@phosphor-icons/react";
import type { OnomatopoeiaEntry } from "@/lib/onomatopoeia";

interface OnomatopoeiaCardProps {
  entries: OnomatopoeiaEntry[];
  onShowExample?: (entry: OnomatopoeiaEntry) => void;
}

const MOOD_EMOJIS: Record<string, string> = {
  excited: "⚡",
  calm: "🌊",
  sad: "💧",
  energetic: "🔥",
  eerie: "👻",
  peaceful: "☮️",
  sudden: "💥",
  gentle: "🍃",
  noisy: "📢",
  soft: "🪶",
};

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  giongo: { label: "Giongo (Sound)", color: "bg-coral/15 text-coral" },
  gitaigo: { label: "Gitaigo (State)", color: "bg-sage/15 text-sage" },
};

export default function OnomatopoeiaCard({ entries, onShowExample }: OnomatopoeiaCardProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  if (!entries || entries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="w-full rounded-3xl bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 border-2 border-purple-200/50 shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-purple-100/50 bg-white/50">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkle size={20} weight="fill" className="text-purple-500" />
          </motion.div>
          <h3 className="font-serif text-base font-bold text-charcoal">
            Japanese Sound Words
          </h3>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-purple-100 text-xs font-semibold text-purple-700">
            {entries.length} found
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Japanese onomatopoeia enriches expression — click to explore each word
        </p>
      </div>

      {/* Cards */}
      <div className="p-4 space-y-3">
        {entries.map((entry, index) => (
          <motion.div
            key={entry.word}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="rounded-2xl bg-white/80 border border-purple-100/50 overflow-hidden"
          >
            {/* Main card */}
            <button
              onClick={() => setExpandedId(expandedId === entry.word ? null : entry.word)}
              className="w-full p-4 text-left transition-all hover:bg-white/60"
            >
              <div className="flex items-start gap-3">
                {/* Word display */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl font-serif font-bold text-charcoal">
                      {entry.word}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${TYPE_BADGES[entry.type]?.color || "bg-gray-100"}`}>
                      {TYPE_BADGES[entry.type]?.label || entry.type}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        backgroundColor: `${entry.moodColor}20`,
                        color: entry.moodColor,
                      }}
                    >
                      {MOOD_EMOJIS[entry.mood] || "✨"} {entry.mood}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-charcoal/80">
                    {entry.englishMeaning}
                  </p>
                  <p className="text-xs text-sage italic mt-0.5">
                    {entry.reading}
                  </p>
                </div>

                {/* Visual indicator */}
                <div className="flex flex-col items-center gap-1">
                  <motion.div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${entry.moodColor}20` }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.2 }}
                  >
                    <Waveform size={16} weight="fill" className="text-charcoal/60" />
                  </motion.div>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                    {entry.category}
                  </span>
                </div>
              </div>
            </button>

            {/* Expanded details */}
            <AnimatePresence>
              {expandedId === entry.word && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3 border-t border-purple-100/30 pt-3">
                    {/* Category tag */}
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-secondary text-xs font-medium text-charcoal/70">
                        📂 {entry.category}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-secondary text-xs font-medium text-charcoal/70">
                        🎭 {entry.type}
                      </span>
                    </div>

                    {/* Example sentence */}
                    {entry.exampleSentence && (
                      <div className="p-3 rounded-xl bg-secondary/50">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <ChatCircle size={14} weight="fill" className="text-coral" />
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                            Example
                          </span>
                        </div>
                        <p className="text-sm font-medium text-charcoal">
                          {entry.exampleSentence}
                        </p>
                        {entry.exampleReading && (
                          <p className="text-xs text-sage italic mt-1">
                            {entry.exampleReading}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Save button */}
                    <button
                      onClick={() => onShowExample?.(entry)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <BookOpen size={16} weight="fill" />
                      Add to Vocabulary
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
