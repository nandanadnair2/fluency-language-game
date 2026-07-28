"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  User,
  Brain,
  Flame,
  Trash,
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
  const resetForTesting = useGameStore((s) => s.resetForTesting);

  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [isQuizOpen, setIsQuizOpen] = useState(false);

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
      // Add XP for quiz
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
          <div className="flex-1">
            <h2 className="font-serif text-xl font-bold text-charcoal">
              Language Scout
            </h2>
            <p className="text-sm text-muted-foreground">
              Level {level} • {totalWordsLearned} words learned
            </p>
          </div>
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
          className="w-full mt-4 py-3 rounded-2xl bg-gradient-to-r from-coral to-soft-pink text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          🧠 Take the Tongue Twister Trial
        </motion.button>
      </div>

      {/* Streak Card */}
      <StreakCard
        currentStreak={currentStreak}
        longestStreak={longestStreak}
        streakHistory={streakHistory}
      />

      {/* Quest Board */}
      <QuestBoard quests={quests} onCompleteQuest={completeQuest} />

      {/* Loot Deck */}
      <LootDeck words={words} onDeleteWord={handleDeleteWord} />

      {/* Reset (dev) */}
      <button
        onClick={resetForTesting}
        className="w-full py-2 rounded-xl bg-secondary/50 text-xs text-muted-foreground hover:bg-secondary transition-all active:scale-[0.98] flex items-center justify-center gap-1"
      >
        <Trash size={12} weight="bold" />
        Reset Progress (for testing)
      </button>

      {/* Level Up Modal */}
      <LevelUpModal
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        onQuizComplete={handleQuizComplete}
      />
    </div>
  );
}
