"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal } from "@phosphor-icons/react";
import { useGameStore } from "@/lib/game-state";

const XP_PER_LEVEL = 100;

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  level: number;
  xp: number;
  weeklyXP: number;
  isPlayer: boolean;
}

const SIMULATED_PLAYERS = [
  { name: "Sakura", avatar: "🌸" },
  { name: "Haruto", avatar: "⚡" },
  { name: "Yuki", avatar: "❄️" },
  { name: "Ren", avatar: "🗡️" },
  { name: "Aoi", avatar: "🌊" },
  { name: "Kaito", avatar: "🌙" },
  { name: "Hana", avatar: "🌺" },
];

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export default function Leaderboard() {
  const playerName = useGameStore((s) => s.playerName);
  const playerAvatar = useGameStore((s) => s.playerAvatar);
  const playerXP = useGameStore((s) => s.xp);
  const playerLevel = useGameStore((s) => s.level);

  const entries = useMemo(() => {
    const playerEntry: LeaderboardEntry = {
      rank: 0,
      name: playerName,
      avatar: playerAvatar || "🎯",
      level: playerLevel,
      xp: playerXP,
      weeklyXP: Math.floor(playerXP * 0.3),
      isPlayer: true,
    };

    const today = new Date();
    const weekSeed = today.getFullYear() * 100 + today.getMonth() * 10 + Math.floor(today.getDate() / 7);

    const simulated = SIMULATED_PLAYERS.map((p, i) => {
      const xpOffset = Math.floor((seededRandom(weekSeed + i * 7) - 0.4) * XP_PER_LEVEL * 3);
      const simXP = Math.max(0, playerXP + xpOffset);
      const simLevel = Math.floor(simXP / XP_PER_LEVEL) + 1;
      const weeklyXP = Math.floor(seededRandom(weekSeed + i * 13 + 100) * 200 + 50);
      return {
        rank: 0,
        name: p.name,
        avatar: p.avatar,
        level: simLevel,
        xp: simXP,
        weeklyXP,
        isPlayer: false,
      };
    });

    const all = [playerEntry, ...simulated];
    all.sort((a, b) => b.xp - a.xp);
    all.forEach((e, i) => {
      e.rank = i + 1;
    });

    return all;
  }, [playerName, playerAvatar, playerXP, playerLevel]);

  const getRankIcon = (rank: number) => {
    if (rank === 1)
      return <Crown size={18} weight="fill" className="text-yellow-500" />;
    if (rank === 2)
      return <Medal size={18} weight="fill" className="text-gray-400" />;
    if (rank === 3)
      return <Medal size={18} weight="fill" className="text-amber-700" />;
    return (
      <span className="text-sm font-bold text-muted-foreground w-[18px] text-center">
        {rank}
      </span>
    );
  };

  const getRankBg = (rank: number, isPlayer: boolean) => {
    if (isPlayer) return "bg-coral/10 border-coral/30";
    if (rank === 1) return "bg-yellow-500/8 border-yellow-500/20";
    if (rank === 2) return "bg-gray-100 border-gray-200/50";
    if (rank === 3) return "bg-amber-50 border-amber-200/50";
    return "bg-card border-border/30";
  };

  return (
    <div className="rounded-3xl bg-card shadow-xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2 mb-0.5">
          <Trophy size={20} weight="fill" className="text-butter" />
          <h3 className="font-serif text-base font-bold text-charcoal">
            🏆 Leaderboard
          </h3>
        </div>
        <p className="text-[11px] text-muted-foreground">Weekly Rankings</p>
      </div>

      {/* Rankings list */}
      <div className="px-4 pb-4 flex flex-col gap-2">
        {entries.map((entry, idx) => (
          <motion.div
            key={entry.isPlayer ? "player" : entry.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: idx * 0.06,
              ease: "easeOut",
            }}
            className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${getRankBg(
              entry.rank,
              entry.isPlayer
            )}`}
          >
            {/* Rank */}
            <div className="w-6 flex-shrink-0 flex justify-center">
              {getRankIcon(entry.rank)}
            </div>

            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-cream flex items-center justify-center flex-shrink-0 overflow-hidden">
              {entry.isPlayer && entry.avatar !== "🎯" ? (
                <img
                  src={entry.avatar}
                  alt={entry.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-base">{entry.avatar}</span>
              )}
            </div>

            {/* Name + level */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-charcoal truncate">
                  {entry.name}
                </span>
                {entry.isPlayer && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-coral/15 text-coral flex-shrink-0">
                    You
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Level {entry.level}
              </p>
            </div>

            {/* XP + weekly gain */}
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-charcoal">
                {entry.xp.toLocaleString()}
              </p>
              <p className="text-[10px] font-medium text-sage">
                +{entry.weeklyXP} XP
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
