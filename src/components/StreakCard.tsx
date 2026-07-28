"use client";

import React from "react";
import { motion } from "framer-motion";
import { Fire, Star, Leaf } from "@phosphor-icons/react";

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  streakHistory: string[];
}

export default function StreakCard({
  currentStreak,
  longestStreak,
  streakHistory,
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
            Keep your streak alive!
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
            {currentStreak}
          </span>
        </motion.div>
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
                  ? "bg-coral/5 border-2 border-coral/30"
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
