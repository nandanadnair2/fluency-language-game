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
  playerName: string;
  playerAvatar: string;
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
  lastQuestResetDate: string | null;

  // Actions
  addXP: (amount: number) => void;
  setPlayerName: (name: string) => void;
  setPlayerAvatar: (avatar: string) => void;
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
      playerName: "Learner",
      playerAvatar: "",
      xp: 0,
      level: 1,
      totalWordsLearned: 0,
      todayWordsLearned: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastPracticeDate: null,
      streakHistory: [],
      quests: generateDailyQuests(),
      lastQuestResetDate: null,

      setPlayerName: (name: string) => {
        set({ playerName: name });
      },

      setPlayerAvatar: (avatar: string) => {
        set({ playerAvatar: avatar });
      },

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

        // Check if we need to reset for a new day
        let newCurrentStreak = state.currentStreak;
        let newLongestStreak = state.longestStreak;
        let newStreakHistory = state.streakHistory;
        let newTodayWordsLearned = state.todayWordsLearned + 1;
        let newLastPracticeDate = state.lastPracticeDate;
        let newQuests = state.quests;
        let newLastQuestResetDate = state.lastQuestResetDate;

        if (state.lastPracticeDate !== today) {
          // New day! Update streak
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];

          if (state.lastPracticeDate === yesterdayStr) {
            // Consecutive day
            newCurrentStreak = state.currentStreak + 1;
          } else if (state.lastPracticeDate !== null) {
            // Gap detected — restart streak
            newCurrentStreak = 1;
          } else {
            // First ever practice
            newCurrentStreak = 1;
          }

          newLongestStreak = Math.max(newCurrentStreak, state.longestStreak);
          newLastPracticeDate = today;
          newStreakHistory = [...state.streakHistory, today].slice(-30);
          newTodayWordsLearned = 1; // First word of the day

          // Reset quests for the new day
          if (state.lastQuestResetDate !== today) {
            newQuests = generateDailyQuests();
            newLastQuestResetDate = today;
          }
        }

        // Update scan quest
        newQuests = newQuests.map((q) => {
          if (q.id === "scan-5" && !q.completed) {
            const newProgress = Math.min(q.progress + 1, q.target);
            return { ...q, progress: newProgress, completed: newProgress >= q.target };
          }
          return q;
        });

        // Update learn quest
        newQuests = newQuests.map((q) => {
          if (q.id === "learn-10" && !q.completed) {
            const newProgress = Math.min(q.progress + 1, q.target);
            return { ...q, progress: newProgress, completed: newProgress >= q.target };
          }
          return q;
        });

        set({
          totalWordsLearned: state.totalWordsLearned + 1,
          todayWordsLearned: newTodayWordsLearned,
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
          lastPracticeDate: newLastPracticeDate,
          streakHistory: newStreakHistory,
          quests: newQuests,
          lastQuestResetDate: newLastQuestResetDate,
        });
      },

      practiceToday: () => {
        const state = get();
        const today = getTodayString();

        // Only act if this is the first practice of the day
        if (state.lastPracticeDate !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];

          let newStreak = 1;
          if (state.lastPracticeDate === yesterdayStr) {
            newStreak = state.currentStreak + 1;
          }

          set({
            currentStreak: newStreak,
            longestStreak: Math.max(newStreak, state.longestStreak),
            lastPracticeDate: today,
            streakHistory: [...state.streakHistory, today].slice(-30),
            // Don't reset todayWordsLearned here — scanWord handles it
          });

          // Reset quests only if not already reset today
          if (state.lastQuestResetDate !== today) {
            set({ quests: generateDailyQuests(), lastQuestResetDate: today });
          }
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
        // Also count as a practice day
        get().practiceToday();
      },

      resetForTesting: () => {
        set({
          playerName: "Learner",
          playerAvatar: "",
          xp: 0,
          level: 1,
          totalWordsLearned: 0,
          todayWordsLearned: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastPracticeDate: null,
          streakHistory: [],
          quests: generateDailyQuests(),
          lastQuestResetDate: null,
        });
      },
    }),
    {
      name: "fluency-game-state",
    }
  )
);
