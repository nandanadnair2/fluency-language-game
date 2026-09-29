"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Trash,
  SpeakerHigh,
  MagnifyingGlass,
  SortAscending,
  Heart,
  Funnel,
} from "@phosphor-icons/react";
import type { VocabularyWord } from "@/lib/db-vocabulary";
import type { TranslationResponse } from "@/lib/translation-utils";
import {
  CONTEXT_LABELS,
  CONTEXT_FILTERS,
  type WordContext,
} from "@/lib/db-vocabulary";

interface LootDeckProps {
  words: VocabularyWord[];
  onDeleteWord: (id: number) => void;
}

export default function LootDeck({ words, onDeleteWord }: LootDeckProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [contextFilter, setContextFilter] = useState<WordContext | "all">("all");

  const filteredWords = words.filter((w) => {
    const matchesSearch =
      w.original.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.directTranslation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesContext =
      contextFilter === "all" || w.context === contextFilter;
    return matchesSearch && matchesContext;
  });

  // Count words per context
  const contextCounts = CONTEXT_FILTERS.filter(c => c !== "all").reduce((acc, ctx) => {
    acc[ctx] = words.filter(w => w.context === ctx).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="w-full p-6 rounded-3xl bg-card shadow-xl border border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-serif text-lg font-bold text-charcoal">
            Loot Deck
          </h3>
          <p className="text-xs text-muted-foreground">
            Your collected vocabulary ({words.length} words)
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-butter/10 flex items-center justify-center">
          <BookOpen size={20} weight="duotone" className="text-butter" />
        </div>
      </div>

      {/* Context Filter */}
      {words.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Funnel size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Filter by context:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setContextFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                contextFilter === "all"
                  ? "bg-coral text-white"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              All ({words.length})
            </button>
            {CONTEXT_FILTERS.filter(c => c !== "all").map((ctx) => {
              const label = CONTEXT_LABELS[ctx];
              const count = contextCounts[ctx] || 0;
              if (count === 0) return null;
              return (
                <button
                  key={ctx}
                  onClick={() => setContextFilter(ctx)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    contextFilter === ctx
                      ? "bg-coral text-white"
                      : `${label.color} hover:opacity-80`
                  }`}
                >
                  {label.icon} {label.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      {words.length > 0 && (
        <div className="relative mb-3">
          <MagnifyingGlass
            size={16}
            weight="bold"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search your deck..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-secondary text-sm text-charcoal placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-coral/30 transition-all"
          />
        </div>
      )}

      {/* Word list */}
      <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
        {filteredWords.length === 0 ? (
          <motion.div
            className="flex flex-col items-center justify-center py-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-3">
              <BookOpen size={28} weight="duotone" className="text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground">
              {words.length === 0
                ? "No words saved yet! Scan some text to start building your deck."
                : "No words match your search."}
            </p>
          </motion.div>
        ) : (
          filteredWords.map((word, index) => {
            const contextLabel = word.context ? CONTEXT_LABELS[word.context] : null;
            return (
              <motion.div
                key={word.id}
                className="rounded-2xl bg-secondary/50 hover:bg-secondary transition-all cursor-pointer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() =>
                  setExpandedId(expandedId === word.id ? null : word.id!)
                }
              >
                <div className="flex items-center gap-3 p-3">
                  <div className="w-8 h-8 rounded-xl bg-coral/10 flex items-center justify-center shrink-0">
                    <Heart size={16} weight="fill" className="text-coral" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-charcoal truncate">
                        {word.original}
                      </span>
                      <span className="text-xs text-muted-foreground">→</span>
                      <span className="text-sm font-medium text-charcoal/70 truncate">
                        {word.directTranslation}
                      </span>
                    </div>
                    <span className="text-xs text-sage font-medium">
                      {word.romanized}
                    </span>
                  </div>

                  {/* Context badge */}
                  {contextLabel && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${contextLabel.color} flex-shrink-0`}>
                      {contextLabel.icon}
                    </span>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteWord(word.id!);
                    }}
                    className="w-7 h-7 rounded-full hover:bg-destructive/10 flex items-center justify-center transition-all active:scale-90 shrink-0"
                  >
                    <Trash size={14} weight="bold" className="text-muted-foreground/50 hover:text-destructive" />
                  </button>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                  {expandedId === word.id && (
                    <motion.div
                      className="px-3 pb-3 pt-0"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="p-3 rounded-xl bg-card border border-border/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Languages
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {word.sourceLanguage.toUpperCase()} →{" "}
                            {word.targetLanguage.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Saved
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(word.savedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {contextLabel && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              Context
                            </span>
                            <span className={`text-xs font-medium ${contextLabel.color}`}>
                              {contextLabel.icon} {contextLabel.label}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <SpeakerHigh size={12} weight="fill" className="text-coral" />
                          <span className="text-xs text-muted-foreground">
                            Reviewed {word.reviewCount} times
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
