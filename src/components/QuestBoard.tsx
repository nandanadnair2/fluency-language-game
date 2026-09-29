"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  ChatCircleDots,
  Television,
  Scan,
  Brain,
  CheckCircle,
  Lightning,
} from "@phosphor-icons/react";
import type { Quest } from "@/lib/game-state";

interface QuestBoardProps {
  quests: Quest[];
  onCompleteQuest: (questId: string) => void;
}

const iconMap: Record<string, React.ElementType> = {
  book: BookOpen,
  chat: ChatCircleDots,
  tv: Television,
  scan: Scan,
  quiz: Brain,
};

export default function QuestBoard({
  quests,
  onCompleteQuest,
}: QuestBoardProps) {
  return (
    <div className="w-full p-6 rounded-3xl bg-card shadow-xl border border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-serif text-lg font-bold text-charcoal">
            Daily Harvest
          </h3>
          <p className="text-xs text-muted-foreground">
            Complete quests to earn XP!
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-butter/10 flex items-center gap-1.5">
          <Lightning size={14} weight="fill" className="text-butter" />
          <span className="text-xs font-bold text-charcoal">
            {quests.filter((q) => q.completed).length}/{quests.length}
          </span>
        </div>
      </div>

      {/* Quest list */}
      <div className="space-y-3">
        {quests.map((quest, index) => {
          const Icon = iconMap[quest.icon] || BookOpen;
          const progressPercent = (quest.progress / quest.target) * 100;
          const canComplete = !quest.completed && quest.progress >= quest.target;

          return (
            <motion.div
              key={quest.id}
              className={`p-3 rounded-2xl transition-all ${
                quest.completed
                  ? "bg-sage/5 border border-sage/20"
                  : "bg-secondary/50 hover:bg-secondary"
              }`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    quest.completed
                      ? "bg-sage/20"
                      : "bg-coral/10"
                  }`}
                >
                  {quest.completed ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 15,
                      }}
                    >
                      <CheckCircle
                        size={22}
                        weight="fill"
                        className="text-sage"
                      />
                    </motion.div>
                  ) : (
                    <Icon size={22} weight="duotone" className="text-coral" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-medium ${
                        quest.completed
                          ? "text-sage line-through"
                          : "text-charcoal"
                      }`}
                    >
                      {quest.title}
                    </span>
                    <span className="text-xs font-bold text-coral flex items-center gap-1">
                      <Lightning size={10} weight="fill" />
                      {quest.xpReward}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {quest.description}
                  </p>

                  {/* Progress bar */}
                  {!quest.completed && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-border/50 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-coral"
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {quest.progress}/{quest.target}
                      </span>
                      {canComplete && (
                        <button
                          onClick={() => onCompleteQuest(quest.id)}
                          className="ml-auto px-3 py-1 rounded-full bg-sage text-white text-xs font-semibold hover:bg-sage/90 transition-all active:scale-95"
                        >
                          Claim
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
