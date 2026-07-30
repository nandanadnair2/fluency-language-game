"use client";

import React from "react";
import { motion } from "framer-motion";
import { Plant, Star, Lightning } from "@phosphor-icons/react";

interface XPSproutProps {
  xp: number;
  level: number;
  xpPerLevel?: number;
}

export default function XPSprout({
  xp,
  level,
  xpPerLevel = 100,
}: XPSproutProps) {
  const currentXP = xp % xpPerLevel;
  const progressPercent = (currentXP / xpPerLevel) * 100;
  const totalXPEarned = xp;
  const nextLevelXP = xpPerLevel - currentXP;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center"
            animate={{ rotate: [0, -5, 5, -5, 0] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Plant size={18} weight="fill" className="text-sage" />
          </motion.div>
          <div>
            <span className="text-sm font-bold text-charcoal font-serif">
              Level {level}
            </span>
            <span className="text-xs text-muted-foreground ml-1">
              Plantling
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Lightning size={14} weight="fill" className="text-coral" />
          <span className="text-sm font-bold text-coral">{xp} XP</span>
        </div>
      </div>

      {/* XP Bar with leafy gradient */}
      <div className="relative h-4 rounded-full bg-secondary overflow-hidden shadow-inner">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-20">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-3 rounded-full bg-sage/40"
              style={{ left: `${(i + 1) * 12.5}%`, top: "50%", transform: "translateY(-50%)" }}
            />
          ))}
        </div>

        {/* Progress fill */}
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full xp-gradient"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{
            type: "spring",
            stiffness: 120,
            damping: 20,
          }}
        >
          {/* Leaf decorations on progress bar */}
          {progressPercent > 20 && (
            <motion.div
              className="absolute right-1 top-1/2 -translate-y-1/2"
              initial={{ scale: 0, rotate: -45 }}
              animate={{
                scale: 1,
                rotate: progressPercent > 50 ? 0 : -20,
              }}
              transition={{ delay: 0.5 }}
            >
              <Plant size={10} weight="fill" className="text-white/80" />
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Progress label */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-muted-foreground">
          {currentXP} / {xpPerLevel} XP
        </span>
        <span className="text-xs text-sage font-medium flex items-center gap-1">
          <Star size={10} weight="fill" />
          {nextLevelXP} XP to Level {level + 1}
        </span>
      </div>

      {/* Total XP badge */}
      {totalXPEarned > 0 && (
        <motion.div
          className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-butter/10 w-fit"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Lightning size={12} weight="fill" className="text-butter" />
          <span className="text-xs font-medium text-charcoal/70">
            Total earned: {totalXPEarned} XP
          </span>
        </motion.div>
      )}
    </div>
  );
}
