"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  User,
  Brain,
  Flame,
  Trash,
  Gear,
  ArrowUp,
  ArrowDown,
  JapaneseFlag,
  DownloadSimple,
} from "@phosphor-icons/react";
import XPSprout from "@/components/XPSprout";
import StreakCard from "@/components/StreakCard";
import QuestBoard from "@/components/QuestBoard";
import LootDeck from "@/components/LootDeck";
import LevelUpModal from "@/components/LevelUpModal";
import { useGameStore } from "@/lib/game-state";
import type { VocabularyWord } from "@/lib/db-vocabulary";

export default function ProfileTab() {
  const xp = useGameStore((s) => s.xp);
  const level = useGameStore((s) => s.level);
  const currentStreak = useGameStore((s) => s.currentStreak);
  const longestStreak = useGameStore((s) => s.longestStreak);
  const streakHistory = useGameStore((s) => s.streakHistory);
  const quests = useGameStore((s) => s.quests);
  const completeQuest = useGameStore((s) => s.completeQuest);
  const totalWordsLearned = useGameStore((s) => s.totalWordsLearned);
  const todayWordsLearned = useGameStore((s) => s.todayWordsLearned);
  const resetForTesting = useGameStore((s) => s.resetForTesting);

  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Load words from IndexedDB
  useEffect(() => {
    import("@/lib/db-vocabulary").then(({ getAllWords }) => {
      getAllWords().then(setWords);
    });
  }, [isQuizOpen]); // refresh after quiz

  const handleDeleteWord = useCallback(async (id: number) => {
    const { deleteWord } = await import("@/lib/db-vocabulary");
    await deleteWord(id);
    setWords((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const handleQuizComplete = useCallback(
    (score: number, total: number) => {
      const addXP = useGameStore.getState().addXP;
      const playQuiz = useGameStore.getState().playQuiz;
      addXP(score * 5);
      playQuiz();
    },
    []
  );

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar pb-4">
      {/* Profile header */}
      <div className="p-6 rounded-3xl bg-card shadow-xl border border-border/50">
        <div className="flex items-center gap-4 mb-4">
          <motion.div
            className="w-16 h-16 rounded-full bg-coral/10 flex items-center justify-center"
            animate={{ rotate: [0, -3, 3, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <User size={32} weight="duotone" className="text-coral" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-xl font-bold text-charcoal truncate">
              Fluency Learner
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-muted-foreground">
                Level {level}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-sm text-muted-foreground">
                {totalWordsLearned} words
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-sm text-muted-foreground">🇯🇵</span>
            </div>
          </div>
          {/* Settings toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-all active:scale-90"
          >
            <Gear size={20} weight={showSettings ? "fill" : "regular"} className="text-muted-foreground" />
          </button>
        </div>

        {/* XP Sprout */}
        <XPSprout xp={xp} level={level} />

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="p-3 rounded-2xl bg-sage/10 text-center">
            <Flame size={20} weight="fill" className="text-coral mx-auto mb-1" />
            <p className="text-lg font-bold text-charcoal">{currentStreak}</p>
            <p className="text-[10px] text-muted-foreground">Day Streak</p>
          </div>
          <div className="p-3 rounded-2xl bg-butter/10 text-center">
            <User
              size={20}
              weight="fill"
              className="text-butter mx-auto mb-1"
            />
            <p className="text-lg font-bold text-charcoal">{level}</p>
            <p className="text-[10px] text-muted-foreground">Level</p>
          </div>
          <div className="p-3 rounded-2xl bg-coral/10 text-center">
            <Brain size={20} weight="fill" className="text-coral mx-auto mb-1" />
            <p className="text-lg font-bold text-charcoal">{words.length}</p>
            <p className="text-[10px] text-muted-foreground">Saved Words</p>
          </div>
        </div>

        {/* Quiz Button */}
        <motion.button
          onClick={() => setIsQuizOpen(true)}
          className="w-full mt-4 py-3.5 rounded-2xl bg-gradient-to-r from-coral to-soft-pink text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          🧠 Take the Tongue Twister Trial (🇯🇵 Japanese)
        </motion.button>
      </div>

      {/* Settings Panel (collapsible) */}
      {showSettings && (
        <motion.div
          className="p-6 rounded-3xl bg-card shadow-xl border border-border/50"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Gear size={16} weight="fill" className="text-coral" />
            <h3 className="font-serif text-base font-bold text-charcoal">
              Settings
            </h3>
          </div>

          {/* Language info */}
          <div className="p-3 rounded-2xl bg-secondary/50 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🇯🇵</span>
              <div>
                <p className="text-sm font-medium text-charcoal">
                  Learning: Japanese
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Source: Japanese (ja) → English (en)
                </p>
              </div>
            </div>
          </div>

          {/* Self-hosting download */}
          <div className="p-4 rounded-2xl bg-coral/8 border border-coral/20 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">🖥️</span>
              <p className="text-sm font-semibold text-charcoal">
                Self-Host Fluency
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
              Download the project to run on your own machine. Required for Chrome Extension subtitle sync.
            </p>
            <a
              href="/fluency-project.zip"
              download="fluency-project.zip"
              className="w-full py-2.5 rounded-xl bg-coral text-white text-xs font-semibold hover:bg-coral/90 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer no-underline"
            >
              <DownloadSimple size={14} weight="bold" />
              Download Project (ZIP)
            </a>
            <div className="mt-2.5 space-y-0.5">
              <p className="text-[9px] text-muted-foreground font-medium">Setup steps:</p>
              <p className="text-[9px] text-muted-foreground">1. Extract ZIP → open folder in terminal</p>
              <p className="text-[9px] text-muted-foreground">2. Run <code className="bg-secondary px-1 rounded text-[9px]">bun install</code></p>
              <p className="text-[9px] text-muted-foreground">3. Run <code className="bg-secondary px-1 rounded text-[9px]">bun run dev</code></p>
              <p className="text-[9px] text-muted-foreground">4. Open <code className="bg-secondary px-1 rounded text-[9px]">localhost:3000</code></p>
            </div>
          </div>

          {/* Storage info */}
          <div className="p-3 rounded-2xl bg-secondary/50 mb-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-charcoal">{totalWordsLearned}</span> total words scanned •{" "}
              <span className="font-medium text-charcoal">{words.length}</span> saved in Loot Deck
            </p>
          </div>

          {/* Reset button */}
          <button
            onClick={() => {
              if (window.confirm("Reset all progress? This cannot be undone.")) {
                resetForTesting();
                setWords([]);
              }
            }}
            className="w-full py-2.5 rounded-xl bg-destructive/10 text-xs font-medium text-destructive hover:bg-destructive/20 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
          >
            <Trash size={12} weight="bold" />
            Reset All Progress
          </button>
        </motion.div>
      )}

      {/* Streak Card */}
      <StreakCard
        currentStreak={currentStreak}
        longestStreak={longestStreak}
        streakHistory={streakHistory}
        todayWordsLearned={todayWordsLearned}
      />

      {/* Quest Board */}
      <QuestBoard quests={quests} onCompleteQuest={completeQuest} />

      {/* Loot Deck */}
      <LootDeck words={words} onDeleteWord={handleDeleteWord} />

      {/* Level Up Modal */}
      <LevelUpModal
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        onQuizComplete={handleQuizComplete}
      />
    </div>
  );
}
