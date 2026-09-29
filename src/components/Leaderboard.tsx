"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Crown,
  Medal,
  MapPin,
  Globe,
  Users,
  CaretDown,
  Fire,
  Star,
} from "@phosphor-icons/react";
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
  region: string;
  streak: number;
}

const NEARBY_REGIONS = [
  "Tokyo",
  "Osaka",
  "Seoul",
  "Bangkok",
  "Singapore",
  "Mumbai",
  "Dubai",
  "London",
  "New York",
  "Sydney",
];

const NEARBY_PLAYERS = [
  { name: "Sakura", avatar: "🌸", region: "Tokyo" },
  { name: "Haruto", avatar: "⚡", region: "Osaka" },
  { name: "Yuki", avatar: "❄️", region: "Seoul" },
  { name: "Ren", avatar: "🗡️", region: "Bangkok" },
  { name: "Aoi", avatar: "🌊", region: "Singapore" },
  { name: "Kaito", avatar: "🌙", region: "Mumbai" },
  { name: "Hana", avatar: "🌺", region: "Dubai" },
  { name: "Sora", avatar: "☁️", region: "London" },
  { name: "Mei", avatar: "🍡", region: "New York" },
  { name: "Ryu", avatar: "🐉", region: "Sydney" },
  { name: "Luna", avatar: "🌙", region: "Tokyo" },
  { name: "Kai", avatar: "🌻", region: "Seoul" },
];

type LeaderboardView = "nearby" | "global";

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export default function Leaderboard() {
  const playerName = useGameStore((s) => s.playerName);
  const playerAvatar = useGameStore((s) => s.playerAvatar);
  const playerXP = useGameStore((s) => s.xp);
  const playerLevel = useGameStore((s) => s.level);
  const playerStreak = useGameStore((s) => s.currentStreak);
  const [view, setView] = useState<LeaderboardView>("nearby");
  const [showAll, setShowAll] = useState(false);

  const entries = useMemo(() => {
    const playerEntry: LeaderboardEntry = {
      rank: 0,
      name: playerName,
      avatar: playerAvatar || "/logo.svg",
      level: playerLevel,
      xp: playerXP,
      weeklyXP: Math.floor(playerXP * 0.3),
      isPlayer: true,
      region: "Your Area",
      streak: playerStreak,
    };

    const today = new Date();
    const weekSeed =
      today.getFullYear() * 100 +
      today.getMonth() * 10 +
      Math.floor(today.getDate() / 7);

    const playersToUse =
      view === "nearby"
        ? NEARBY_PLAYERS.slice(0, 7)
        : NEARBY_PLAYERS;

    const simulated = playersToUse.map((p, i) => {
      const xpOffset =
        Math.floor((seededRandom(weekSeed + i * 7) - 0.4) * XP_PER_LEVEL * 3);
      const simXP = Math.max(0, playerXP + xpOffset);
      const simLevel = Math.floor(simXP / XP_PER_LEVEL) + 1;
      const weeklyXP = Math.floor(
        seededRandom(weekSeed + i * 13 + 100) * 200 + 50
      );
      const streak = Math.floor(seededRandom(weekSeed + i * 31 + 200) * 30 + 1);
      return {
        rank: 0,
        name: p.name,
        avatar: p.avatar,
        level: simLevel,
        xp: simXP,
        weeklyXP,
        isPlayer: false,
        region: p.region,
        streak,
      };
    });

    const all = [playerEntry, ...simulated];
    all.sort((a, b) => b.weeklyXP - a.weeklyXP);
    all.forEach((e, i) => {
      e.rank = i + 1;
    });

    return all;
  }, [playerName, playerAvatar, playerXP, playerLevel, playerStreak, view]);

  const displayedEntries = showAll ? entries : entries.slice(0, 5);

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
    if (rank === 1) return "bg-yellow-500/20 border-yellow-500/30";
    if (rank === 2) return "bg-gray-100 border-gray-200/50";
    if (rank === 3) return "bg-amber-50 border-amber-200/50";
    return "bg-card border-border/30";
  };

  return (
    <div className="rounded-3xl bg-card shadow-xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Trophy size={20} weight="fill" className="text-butter" />
            <h3 className="font-serif text-base font-bold text-charcoal">
              Leaderboard
            </h3>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-secondary/50 rounded-full p-0.5">
            <button
              onClick={() => { setView("nearby"); setShowAll(false); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                view === "nearby"
                  ? "bg-white text-charcoal shadow-sm"
                  : "text-muted-foreground hover:text-charcoal"
              }`}
            >
              <MapPin size={11} weight="fill" />
              Nearby
            </button>
            <button
              onClick={() => { setView("global"); setShowAll(false); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                view === "global"
                  ? "bg-white text-charcoal shadow-sm"
                  : "text-muted-foreground hover:text-charcoal"
              }`}
            >
              <Globe size={11} weight="fill" />
              Global
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Fire size={13} weight="fill" className="text-coral" />
          <p className="text-[11px] text-muted-foreground">
            Weekly Rankings
            {view === "nearby" && (
              <span className="text-[10px] text-sage ml-1">
                • {entries.length} learners near you
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Rankings list */}
      <div className="px-4 pb-3 flex flex-col gap-1.5">
        <AnimatePresence mode="popLayout">
          {displayedEntries.map((entry, idx) => (
            <motion.div
              key={entry.isPlayer ? "player" : entry.name}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{
                duration: 0.25,
                delay: idx * 0.04,
                ease: "easeOut",
              }}
              className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-colors ${getRankBg(
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

              {/* Name + region/level */}
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
                <div className="flex items-center gap-1.5 mt-0.5">
                  {!entry.isPlayer && (
                    <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                      <MapPin size={8} weight="fill" />
                      {entry.region}
                    </span>
                  )}
                  {entry.isPlayer && (
                    <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                      <Star size={8} weight="fill" className="text-coral" />
                      Level {entry.level}
                    </span>
                  )}
                </div>
              </div>

              {/* XP + weekly gain */}
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold text-charcoal">
                  {entry.weeklyXP.toLocaleString()}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  weekly XP
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Show more/less */}
      {entries.length > 5 && (
        <div className="px-4 pb-4">
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2 rounded-xl bg-secondary/50 hover:bg-secondary/80 text-xs font-medium text-muted-foreground flex items-center justify-center gap-1 transition-all active:scale-[0.98]"
          >
            {showAll ? (
              <>
                Show Less
                <CaretDown
                  size={12}
                  weight="bold"
                  className="rotate-180"
                />
              </>
            ) : (
              <>
                <Users size={12} weight="bold" />
                Show {entries.length - 5} more learners
                <CaretDown size={12} weight="bold" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
