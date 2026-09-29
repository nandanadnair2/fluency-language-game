"use client";

import React from "react";
import { motion } from "framer-motion";
import { Fire, Star, Leaf, CalendarBlank } from "@phosphor-icons/react";

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  streakHistory: string[];
  todayWordsLearned: number;
}

export default function StreakCard({
  currentStreak,
  longestStreak,
  streakHistory,
  todayWordsLearned,
}: StreakCardProps) {
  // Generate the stamp card - last 7 days
  const today = new Date();
  const days = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split("T")[0];
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    const dayNum = date.getDate();
    const isStamped = streakHistory.includes(dateStr);
    const isToday = dateStr === today.toISOString().split("T")[0];

    return { dateStr, dayName, dayNum, isStamped, isToday };
  });

  // Stamp icons cycle
  const stampIcons = [Fire, Star, Leaf];

  return (
    <div className="w-full p-6 rounded-3xl bg-card shadow-xl border border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-serif text-lg font-bold text-charcoal">
            Daily Streak
          </h3>
          <p className="text-xs text-muted-foreground">
            Practice every day to keep your streak alive!
          </p>
        </div>
        <motion.div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-coral/10"
          animate={
            currentStreak > 0
              ? { scale: [1, 1.05, 1] }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Fire size={18} weight="fill" className="text-coral" />
          <span className="text-sm font-bold text-coral">
            {currentStreak} day{currentStreak !== 1 ? "s" : ""}
          </span>
        </motion.div>
      </div>

      {/* Today's Daily Harvest */}
      <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-sage/5 to-butter/5 border border-sage/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-sage/15 flex items-center justify-center">
              <Leaf size={14} weight="fill" className="text-sage" />
            </div>
            <div>
              <p className="text-xs font-bold text-charcoal">Today&apos;s Harvest</p>
              <p className="text-[10px] text-muted-foreground">
                Words learned today
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sage/10">
            <span className="text-sm font-bold text-sage">{todayWordsLearned}</span>
            <span className="text-[10px] text-muted-foreground">words</span>
          </div>
        </div>
        {/* Progress to daily goal (10 words) */}
        <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sage to-sage/70"
            initial={{ width: 0 }}
            animate={{
              width: `${Math.min((todayWordsLearned / 10) * 100, 100)}%`,
            }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {todayWordsLearned >= 10
            ? "🎯 Daily goal reached! Great work!"
            : `${10 - todayWordsLearned} more to reach today's goal`}
        </p>
      </div>

      {/* Stamp Card Grid */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {days.map((day, i) => {
          const IconComponent = stampIcons[i % stampIcons.length];
          return (
            <div
              key={day.dateStr}
              className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${
                day.isToday
                  ? "bg-coral/5 border-2 border-coral/30 shadow-sm"
                  : day.isStamped
                    ? "bg-sage/5"
                    : "bg-secondary/50"
              }`}
            >
              <span className="text-[10px] text-muted-foreground font-medium">
                {day.dayName}
              </span>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  day.isStamped
                    ? "bg-sage/20"
                    : day.isToday
                      ? "bg-coral/10 border-2 border-dashed border-coral/30"
                      : "bg-secondary"
                }`}
              >
                {day.isStamped ? (
                  <motion.div
                    key={`stamp-${day.dateStr}`}
                    initial={{ scale: 0, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 15,
                    }}
                  >
                    <IconComponent
                      size={20}
                      weight="fill"
                      className="text-sage"
                    />
                  </motion.div>
                ) : day.isToday ? (
                  <span className="text-xs text-coral font-bold">?</span>
                ) : (
                  <span className="text-xs text-muted-foreground/40">
                    {day.dayNum}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground mb-2">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-sage/40" />
          <span>Practiced</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-coral/40" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-secondary" />
          <span>Missed</span>
        </div>
      </div>

      {/* Longest streak badge */}
      {longestStreak > 0 && (
        <div className="flex items-center gap-2 justify-center pt-2 border-t border-border/50">
          <Star size={12} weight="fill" className="text-butter" />
          <span className="text-xs text-muted-foreground">
            Best streak:{" "}
            <span className="font-bold text-charcoal">{longestStreak} days</span>
          </span>
        </div>
      )}
    </div>
  );
}
