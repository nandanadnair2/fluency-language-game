"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendUp,
  Calendar,
  Clock,
  ChartLine,
  Trophy,
  Star,
  Flame,
  Brain,
} from "@phosphor-icons/react";
import { useGameStore } from "@/lib/game-state";
import { getAllWords, type VocabularyWord } from "@/lib/db-vocabulary";

interface DailyStats {
  date: string;
  wordsLearned: number;
  xpEarned: number;
  practiceMinutes: number;
}

interface AnalyticsData {
  dailyStats: DailyStats[];
  totalXP: number;
  totalWords: number;
  avgDailyWords: number;
  bestStreak: number;
  currentStreak: number;
  contextBreakdown: { context: string; count: number; percentage: number }[];
}

const COLORS = {
  coral: "#E56515",
  sage: "#7C9A6E",
  butter: "#FBA45C",
  charcoal: "#2D2A24",
  cream: "#F8F8F8",
  secondary: "#CDCDCB",
};

// Helper to format date for display
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

const formatShortDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { weekday: "short" });
};

export default function ProgressAnalytics() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  
  const streakHistory = useGameStore((s) => s.streakHistory);
  const todayWordsLearned = useGameStore((s) => s.todayWordsLearned);
  const totalWordsLearned = useGameStore((s) => s.totalWordsLearned);
  const currentStreak = useGameStore((s) => s.currentStreak);
  const longestStreak = useGameStore((s) => s.longestStreak);
  const xp = useGameStore((s) => s.xp);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    
    try {
      const words = await getAllWords();
      
      // Generate daily stats for the past 30 days
      const dailyMap = new Map<string, { words: number; xp: number }>();
      
      // Initialize last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        dailyMap.set(dateStr, { words: 0, xp: 0 });
      }
      
      // Populate from vocabulary
      words.forEach((word) => {
        const dateStr = new Date(word.savedAt).toISOString().split("T")[0];
        const existing = dailyMap.get(dateStr);
        if (existing) {
          existing.words += 1;
          existing.xp += word.xpEarned || 0;
        }
      });
      
      // Add today's data
      const today = new Date().toISOString().split("T")[0];
      const todayData = dailyMap.get(today);
      if (todayData) {
        todayData.words += todayWordsLearned;
      }
      
      const dailyStats: DailyStats[] = Array.from(dailyMap.entries())
        .map(([date, stats]) => ({
          date,
          wordsLearned: stats.words,
          xpEarned: stats.xp,
          practiceMinutes: Math.round(stats.words * 2), // Estimate 2 min per word
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      // Context breakdown
      const contextCount = new Map<string, number>();
      words.forEach((word) => {
        const ctx = word.context || "other";
        contextCount.set(ctx, (contextCount.get(ctx) || 0) + 1);
      });
      
      const totalContextWords = words.length || 1;
      const contextBreakdown = Array.from(contextCount.entries())
        .map(([context, count]) => ({
          context,
          count,
          percentage: Math.round((count / totalContextWords) * 100),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
      
      // Calculate averages
      const wordsDays = dailyStats.filter(d => d.wordsLearned > 0);
      const avgDailyWords = wordsDays.length > 0 
        ? Math.round(wordsDays.reduce((sum, d) => sum + d.wordsLearned, 0) / wordsDays.length)
        : 0;
      
      setData({
        dailyStats,
        totalXP: xp,
        totalWords: words.length,
        avgDailyWords,
        bestStreak: longestStreak,
        currentStreak,
        contextBreakdown,
      });
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [todayWordsLearned, xp, longestStreak, currentStreak]);

  const openAnalytics = useCallback(async () => {
    setIsOpen(true);
    await loadAnalytics();
  }, [loadAnalytics]);

  // Mini chart component for daily words
  const MiniChart = ({ stats }: { stats: DailyStats[] }) => {
    const maxWords = Math.max(...stats.map(s => s.wordsLearned), 1);
    const visibleStats = stats.slice(-14); // Last 14 days
    
    return (
      <div className="flex items-end gap-1 h-24 w-full">
        {visibleStats.map((day, idx) => {
          const height = Math.max((day.wordsLearned / maxWords) * 100, 4);
          const isToday = idx === visibleStats.length - 1;
          
          return (
            <div key={day.date} className="flex flex-col items-center flex-1 gap-1">
              <div 
                className={`w-full rounded-t transition-all ${
                  isToday ? "bg-coral" : "bg-sage/60"
                }`}
                style={{ height: `${height}%` }}
              />
              <span className="text-[9px] text-muted-foreground">
                {formatShortDate(day.date)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // XP Chart
  const XPChart = ({ stats }: { stats: DailyStats[] }) => {
    const maxXP = Math.max(...stats.map(s => s.xpEarned), 1);
    const visibleStats = stats.slice(-14);
    
    // Build path for line chart
    const points = visibleStats.map((day, idx) => {
      const x = (idx / (visibleStats.length - 1)) * 100;
      const y = 100 - (day.xpEarned / maxXP) * 80; // Leave 20% padding at top
      return `${x},${y}`;
    }).join(" ");
    
    return (
      <div className="relative h-32 w-full">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          {/* Grid lines */}
          <line x1="0" y1="20" x2="100" y2="20" stroke={COLORS.secondary} strokeWidth="0.5" opacity="0.3" />
          <line x1="0" y1="50" x2="100" y2="50" stroke={COLORS.secondary} strokeWidth="0.5" opacity="0.3" />
          <line x1="0" y1="80" x2="100" y2="80" stroke={COLORS.secondary} strokeWidth="0.5" opacity="0.3" />
          
          {/* Area fill */}
          <polygon 
            points={`0,100 ${points} 100,100`}
            fill={COLORS.coral}
            opacity="0.1"
          />
          
          {/* Line */}
          <polyline 
            points={points}
            fill="none"
            stroke={COLORS.coral}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Data points */}
          {visibleStats.map((day, idx) => {
            const x = (idx / (visibleStats.length - 1)) * 100;
            const y = 100 - (day.xpEarned / maxXP) * 80;
            return (
              <circle
                key={day.date}
                cx={x}
                cy={y}
                r="2"
                fill={COLORS.coral}
                opacity={idx === visibleStats.length - 1 ? 1 : 0.6}
              />
            );
          })}
        </svg>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-1 px-1">
          <span className="text-[9px] text-muted-foreground">14d ago</span>
          <span className="text-[9px] text-muted-foreground">Today</span>
        </div>
      </div>
    );
  };

  if (!isOpen) {
    return (
      <motion.button
        onClick={openAnalytics}
        className="w-full mt-3 py-3.5 rounded-2xl bg-gradient-to-r from-sage to-teal-500 text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <ChartLine size={18} weight="fill" />
        View Progress Analytics
      </motion.button>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-cream flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/30 bg-cream/95 backdrop-blur sticky top-0 z-10">
        <button
          onClick={() => setIsOpen(false)}
          className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-all"
        >
          <span className="text-lg">✕</span>
        </button>
        <h2 className="font-serif text-base font-bold text-charcoal">Progress Analytics</h2>
        <div className="w-10" />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-coral/20 border-t-coral rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading your progress...</p>
          </div>
        </div>
      ) : data ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-card shadow-sm border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Brain size={20} weight="fill" className="text-coral" />
                <span className="text-xs text-muted-foreground">Total Words</span>
              </div>
              <p className="text-2xl font-bold text-charcoal">{data.totalWords}</p>
            </div>
            
            <div className="p-4 rounded-2xl bg-card shadow-sm border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Star size={20} weight="fill" className="text-butter" />
                <span className="text-xs text-muted-foreground">Total XP</span>
              </div>
              <p className="text-2xl font-bold text-charcoal">{data.totalXP}</p>
            </div>
            
            <div className="p-4 rounded-2xl bg-card shadow-sm border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Flame size={20} weight="fill" className="text-orange-500" />
                <span className="text-xs text-muted-foreground">Best Streak</span>
              </div>
              <p className="text-2xl font-bold text-charcoal">{data.bestStreak} days</p>
            </div>
            
            <div className="p-4 rounded-2xl bg-card shadow-sm border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={20} weight="fill" className="text-sage" />
                <span className="text-xs text-muted-foreground">Avg/Day</span>
              </div>
              <p className="text-2xl font-bold text-charcoal">{data.avgDailyWords}</p>
            </div>
          </div>

          {/* Words Learned Chart */}
          <div className="p-4 rounded-2xl bg-card shadow-sm border border-border/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-base font-bold text-charcoal flex items-center gap-2">
                <TrendUp size={18} className="text-coral" />
                Words Learned (Last 14 Days)
              </h3>
            </div>
            <MiniChart stats={data.dailyStats} />
          </div>

          {/* XP Trend Chart */}
          <div className="p-4 rounded-2xl bg-card shadow-sm border border-border/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-base font-bold text-charcoal flex items-center gap-2">
                <Trophy size={18} className="text-butter" />
                XP Progress
              </h3>
            </div>
            <XPChart stats={data.dailyStats} />
          </div>

          {/* Context Breakdown */}
          <div className="p-4 rounded-2xl bg-card shadow-sm border border-border/30">
            <h3 className="font-serif text-base font-bold text-charcoal mb-4 flex items-center gap-2">
              <ChartLine size={18} className="text-sage" />
              Learning Contexts
            </h3>
            <div className="space-y-3">
              {data.contextBreakdown.map((ctx) => (
                <div key={ctx.context} className="flex items-center gap-3">
                  <span className="text-sm w-24 text-charcoal capitalize">{ctx.context}</span>
                  <div className="flex-1 h-2 rounded-full bg-secondary/30 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-coral to-butter"
                      initial={{ width: 0 }}
                      animate={{ width: `${ctx.percentage}%` }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {ctx.count} ({ctx.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Practice Insights */}
          <div className="p-4 rounded-2xl bg-sage/10 border border-sage/20">
            <h3 className="font-serif text-base font-bold text-charcoal mb-3 flex items-center gap-2">
              <Clock size={18} className="text-sage" />
              Practice Insights
            </h3>
            <div className="space-y-2 text-sm">
              <p className="text-charcoal/80">
                📊 You&apos;ve learned <span className="font-bold text-coral">{data.totalWords}</span> words across <span className="font-bold">{data.dailyStats.filter(d => d.wordsLearned > 0).length}</span> practice days
              </p>
              <p className="text-charcoal/80">
                🎯 Your best streak was <span className="font-bold text-orange-500">{data.bestStreak} days</span> — keep it going!
              </p>
              <p className="text-charcoal/80">
                ⭐ Average of <span className="font-bold text-butter">{data.avgDailyWords}</span> words per practice day
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">No data available yet. Start learning to see your progress!</p>
        </div>
      )}
    </motion.div>
  );
}
