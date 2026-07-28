import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Quest {
  id: string;
  title: string;
  description: string;
  icon: "book" | "chat" | "tv" | "scan" | "quiz";
  xpReward: number;
  target: number;
  progress: number;
  completed: boolean;
  completedAt?: Date;
}

export interface GameState {
  // Player
  xp: number;
  level: number;
  totalWordsLearned: number;
  todayWordsLearned: number;

  // Streak
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  streakHistory: string[];

  // Quests
  quests: Quest[];

  // Actions
  addXP: (amount: number) => void;
  scanWord: () => void;
  practiceToday: () => void;
  completeQuest: (questId: string) => void;
  resetDailyQuests: () => void;
  playQuiz: () => void;
  resetForTesting: () => void;
}

const generateDailyQuests = (): Quest[] => [
  {
    id: "scan-5",
    title: "Word Hunter",
    description: "Scan 5 words with the camera",
    icon: "scan",
    xpReward: 25,
    target: 5,
    progress: 0,
    completed: false,
  },
  {
    id: "learn-10",
    title: "Bookworm",
    description: "Learn 10 new words",
    icon: "book",
    xpReward: 50,
    target: 10,
    progress: 0,
    completed: false,
  },
  {
    id: "watchtower-1",
    title: "Couch Learner",
    description: "Watch a subtitled video for 1 session",
    icon: "tv",
    xpReward: 30,
    target: 1,
    progress: 0,
    completed: false,
  },
  {
    id: "quiz-3",
    title: "Quick Thinker",
    description: "Complete 3 quiz rounds",
    icon: "quiz",
    xpReward: 40,
    target: 3,
    progress: 0,
    completed: false,
  },
  {
    id: "chat-5",
    title: "Chatterbox",
    description: "Practice pronunciation 5 times",
    icon: "chat",
    xpReward: 20,
    target: 5,
    progress: 0,
    completed: false,
  },
];

const getTodayString = () => new Date().toISOString().split("T")[0];

const XP_PER_LEVEL = 100;

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      xp: 0,
      level: 1,
      totalWordsLearned: 0,
      todayWordsLearned: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastPracticeDate: null,
      streakHistory: [],
      quests: generateDailyQuests(),

      addXP: (amount: number) => {
        const state = get();
        const newXP = state.xp + amount;
        const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1;
        set({
          xp: newXP,
          level: newLevel,
        });
      },

      scanWord: () => {
        const state = get();
        const today = getTodayString();
        set({
          totalWordsLearned: state.totalWordsLearned + 1,
          todayWordsLearned:
            state.lastPracticeDate === today
              ? state.todayWordsLearned + 1
              : 1,
        });
        // Update scan quest
        const quests = state.quests.map((q) => {
          if (q.id === "scan-5" && !q.completed) {
            const newProgress = Math.min(q.progress + 1, q.target);
            return { ...q, progress: newProgress, completed: newProgress >= q.target };
          }
          return q;
        });
        // Update learn quest
        const updatedQuests = quests.map((q) => {
          if (q.id === "learn-10" && !q.completed) {
            const newProgress = Math.min(q.progress + 1, q.target);
            return { ...q, progress: newProgress, completed: newProgress >= q.target };
          }
          return q;
        });
        set({ quests: updatedQuests });
        get().practiceToday();
      },

      practiceToday: () => {
        const state = get();
        const today = getTodayString();

        if (state.lastPracticeDate !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];

          let newStreak = 1;
          if (
            state.lastPracticeDate === yesterdayStr ||
            state.lastPracticeDate === today
          ) {
            newStreak = state.currentStreak + 1;
          }

          set({
            currentStreak: newStreak,
            longestStreak: Math.max(newStreak, state.longestStreak),
            lastPracticeDate: today,
            streakHistory: [...state.streakHistory, today].slice(-30),
            todayWordsLearned: 0,
            quests: generateDailyQuests(),
          });
        }
      },

      completeQuest: (questId: string) => {
        const state = get();
        const quest = state.quests.find((q) => q.id === questId);
        if (quest && !quest.completed) {
          set({
            quests: state.quests.map((q) =>
              q.id === questId
                ? { ...q, completed: true, completedAt: new Date() }
                : q
            ),
          });
          get().addXP(quest.xpReward);
        }
      },

      resetDailyQuests: () => {
        set({ quests: generateDailyQuests() });
      },

      playQuiz: () => {
        const state = get();
        const quests = state.quests.map((q) => {
          if (q.id === "quiz-3" && !q.completed) {
            const newProgress = Math.min(q.progress + 1, q.target);
            return { ...q, progress: newProgress, completed: newProgress >= q.target };
          }
          return q;
        });
        set({ quests });
        get().addXP(10);
      },

      resetForTesting: () => {
        set({
          xp: 0,
          level: 1,
          totalWordsLearned: 0,
          todayWordsLearned: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastPracticeDate: null,
          streakHistory: [],
          quests: generateDailyQuests(),
        });
      },
    }),
    {
      name: "linguascout-game-state",
    }
  )
);
