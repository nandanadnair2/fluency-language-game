"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Timer,
  Trophy,
  Lightning,
  CheckCircle,
  XCircle,
  Play,
  ArrowCounterClockwise,
  Flame,
} from "@phosphor-icons/react";
import { useGameStore } from "@/lib/game-state";
import type { VocabularyWord } from "@/lib/db-vocabulary";

interface ChallengeState {
  status: "idle" | "playing" | "finished";
  currentQuestion: number;
  score: number;
  timeLeft: number;
  correctAnswers: number;
  wrongAnswers: number;
  streak: number;
  maxStreak: number;
}

interface Question {
  word: VocabularyWord;
  options: string[];
  correctIndex: number;
}

const CHALLENGE_CONFIG = {
  totalWords: 10,
  timeLimit: 180, // 3 minutes in seconds
  baseXP: 50,
  timeBonusMultiplier: 0.5, // extra XP per second remaining
  streakBonus: 5, // extra XP per streak combo
};

export default function ChallengeMode() {
  const [isOpen, setIsOpen] = useState(false);
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [challenge, setChallenge] = useState<ChallengeState>({
    status: "idle",
    currentQuestion: 0,
    score: 0,
    timeLeft: CHALLENGE_CONFIG.timeLimit,
    correctAnswers: 0,
    wrongAnswers: 0,
    streak: 0,
    maxStreak: 0,
  });
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addXP = useGameStore((s) => s.addXP);
  const playQuiz = useGameStore((s) => s.playQuiz);

  // Load words when opening
  const openChallenge = useCallback(async () => {
    const { getAllWords } = await import("@/lib/db-vocabulary");
    const allWords = await getAllWords();
    
    if (allWords.length < 4) {
      alert("You need at least 4 saved words to start a challenge!");
      return;
    }

    setWords(allWords);
    setIsOpen(true);
  }, []);

  // Generate questions
  const generateQuestions = useCallback((wordList: VocabularyWord[]): Question[] => {
    if (wordList.length === 0) return [];
    
    const shuffled = [...wordList].sort(() => Math.random() - 0.5);
    // Use all available words, or up to totalWords if we have more
    const selected = shuffled.slice(0, Math.min(CHALLENGE_CONFIG.totalWords, shuffled.length));
    
    // Build a map of all unique translations for fallback distractors
    const allTranslations = [...new Set(wordList.map(w => w.directTranslation))];
    
    // Generic fallback options if we run out of real translations
    const genericDistractors = [
      "Goodbye",
      "Please",
      "Thank you",
      "Sorry",
      "Yes",
      "No",
      "Hello",
      "Good morning",
      "Welcome",
      "Excuse me"
    ];
    
    return selected.map((word, wordIndex) => {
      // Get unique distractors from other words, excluding the correct answer
      const otherWords = wordList.filter(w => w.id !== word.id);
      const uniqueDistractors = new Set<string>();
      
      for (const other of otherWords) {
        if (other.directTranslation !== word.directTranslation && uniqueDistractors.size < 3) {
          uniqueDistractors.add(other.directTranslation);
        }
      }
      
      // Collect available fallback translations
      const availableFalls = allTranslations.filter(t => 
        t !== word.directTranslation && !uniqueDistractors.has(t)
      );
      
      // Collect generic fallbacks not yet used
      const usedGeneric = Array.from(uniqueDistractors).concat(availableFalls);
      const genericFallback = genericDistractors.filter(g => !usedGeneric.includes(g));
      
      // Build final options array
      const finalDistractors = Array.from(uniqueDistractors).slice(0, 3);
      const missingCount = Math.max(0, 3 - finalDistractors.length);
      const additionalDistractors = [...availableFalls.slice(0, missingCount), ...genericFallback.slice(0, missingCount)];
      
      const options = [...finalDistractors, ...additionalDistractors, word.directTranslation];
      
      // Ensure we have at least 2 options (correct + at least 1 wrong)
      if (options.length < 2) {
        const fallback = genericDistractors.find(g => g !== word.directTranslation);
        if (fallback) {
          options.unshift(fallback);
        }
      }
      
      // Shuffle options using Fisher-Yates
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      
      const correctIndex = options.indexOf(word.directTranslation);
      
      return { word, options, correctIndex };
    });
  }, []);

  // Start challenge
  const startChallenge = useCallback(() => {
    if (words.length < 4) return;
    
    const qs = generateQuestions(words);
    setQuestions(qs);
    setChallenge({
      status: "playing",
      currentQuestion: 0,
      score: 0,
      timeLeft: CHALLENGE_CONFIG.timeLimit,
      correctAnswers: 0,
      wrongAnswers: 0,
      streak: 0,
      maxStreak: 0,
    });
    setSelectedAnswer(null);
    setShowFeedback(false);
    
    // Start timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setChallenge(prev => {
        if (prev.timeLeft <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return { ...prev, status: "finished" };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
  }, [words, generateQuestions]);

  // Answer question
  const answerQuestion = useCallback((answerIndex: number) => {
    if (showFeedback || challenge.status !== "playing") return;
    
    const isCorrect = answerIndex === questions[challenge.currentQuestion].correctIndex;
    setSelectedAnswer(answerIndex);
    setShowFeedback(true);
    
    setChallenge(prev => {
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      return {
        ...prev,
        correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
        wrongAnswers: isCorrect ? prev.wrongAnswers : prev.wrongAnswers + 1,
        streak: newStreak,
        maxStreak: Math.max(prev.maxStreak, newStreak),
      };
    });
    
    // Move to next question after delay
    setTimeout(() => {
      setSelectedAnswer(null);
      setShowFeedback(false);
      setChallenge(prev => {
        if (prev.currentQuestion >= questions.length - 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return { ...prev, status: "finished" };
        }
        return { ...prev, currentQuestion: prev.currentQuestion + 1 };
      });
    }, 800);
  }, [showFeedback, challenge.status, questions]);

  // Handle completion
  useEffect(() => {
    if (challenge.status === "finished") {
      const xpEarned = calculateXP(challenge);
      addXP(xpEarned);
      playQuiz();
    }
  }, [challenge.status]);

  const calculateXP = (state: ChallengeState): number => {
    const base = CHALLENGE_CONFIG.baseXP;
    const timeBonus = Math.round(state.timeLeft * CHALLENGE_CONFIG.timeBonusMultiplier);
    const streakBonus = state.maxStreak * CHALLENGE_CONFIG.streakBonus;
    const accuracyBonus = Math.round((state.correctAnswers / CHALLENGE_CONFIG.totalWords) * 25);
    return base + timeBonus + streakBonus + accuracyBonus;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!isOpen) {
    return (
      <motion.button
        onClick={openChallenge}
        className="w-full mt-3 py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-coral text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Lightning size={18} weight="fill" />
        Challenge Mode: 10 Words in 3 Minutes
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
          onClick={() => {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsOpen(false);
          }}
          className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-all"
        >
          <XCircle size={20} weight="bold" className="text-muted-foreground" />
        </button>
        <h2 className="font-serif text-base font-bold text-charcoal">
          {challenge.status === "idle" ? "Ready?" : 
           challenge.status === "playing" ? "Challenge Mode" : "Complete!"}
        </h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 py-6">
        <AnimatePresence mode="wait">
          {/* Idle State */}
          {challenge.status === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center gap-6"
            >
              <motion.div
              className="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              >
              <Lightning size={48} weight="fill" className="text-purple-500" />
              </motion.div>
              
              <div className="text-center space-y-2">
                <h3 className="font-serif text-2xl font-bold text-charcoal">
                  Speed Challenge
                </h3>
                <p className="text-muted-foreground">
                  Translate as many words as you can in 3 minutes!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="p-4 rounded-2xl bg-sage/10 text-center">
                  <p className="text-2xl font-bold text-sage">10</p>
                  <p className="text-xs text-muted-foreground">Words</p>
                </div>
                <div className="p-4 rounded-2xl bg-coral/10 text-center">
                  <p className="text-2xl font-bold text-coral">3:00</p>
                  <p className="text-xs text-muted-foreground">Minutes</p>
                </div>
                <div className="p-4 rounded-2xl bg-butter/10 text-center">
                  <p className="text-2xl font-bold text-butter">50+</p>
                  <p className="text-xs text-muted-foreground">Base XP</p>
                </div>
                <div className="p-4 rounded-2xl bg-purple-100 text-center">
                  <p className="text-2xl font-bold text-purple-500">🔥</p>
                  <p className="text-xs text-muted-foreground">Streak Bonus</p>
                </div>
              </div>

              <motion.button
                onClick={startChallenge}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-coral text-white font-bold text-base shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Play size={20} weight="fill" />
                Start Challenge
              </motion.button>
            </motion.div>
          )}

          {/* Playing State */}
          {challenge.status === "playing" && questions[challenge.currentQuestion] && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col gap-4"
            >
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Question {challenge.currentQuestion + 1}/{questions.length}</span>
                  <span className="flex items-center gap-1">
                    <Timer size={12} />
                    {formatTime(challenge.timeLeft)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-coral rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${((challenge.currentQuestion + 1) / questions.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Timer Bar */}
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    challenge.timeLeft < 30 ? "bg-red-500" : 
                    challenge.timeLeft < 60 ? "bg-yellow-500" : "bg-sage"
                  }`}
                  animate={{ width: `${(challenge.timeLeft / CHALLENGE_CONFIG.timeLimit) * 100}%` }}
                  transition={{ duration: 1, ease: "linear" }}
                />
              </div>

              {/* Stats Row */}
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle size={16} className="text-sage" />
                    <span className="text-sm font-bold text-sage">{challenge.correctAnswers}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <XCircle size={16} className="text-coral" />
                    <span className="text-sm font-bold text-coral">{challenge.wrongAnswers}</span>
                  </div>
                </div>
                {challenge.streak >= 2 && (
                  <motion.div
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-coral/10"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <Flame size={14} weight="fill" className="text-coral" />
                    <span className="text-sm font-bold text-coral">{challenge.streak}</span>
                  </motion.div>
                )}
              </div>

              {/* Question Card */}
              <div className="flex-1 flex flex-col items-center justify-center gap-6">
                <div className="text-center space-y-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    What does this mean?
                  </p>
                  <motion.div
                    key={`${challenge.currentQuestion}-${questions[challenge.currentQuestion].word.original}`}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="font-serif text-4xl font-bold text-charcoal"
                  >
                    {questions[challenge.currentQuestion].word.original}
                  </motion.div>
                  {questions[challenge.currentQuestion].word.romanized && (
                    <p className="text-sm text-muted-foreground italic">
                      {questions[challenge.currentQuestion].word.romanized}
                    </p>
                  )}
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 gap-3 w-full">
                  {questions[challenge.currentQuestion].options.map((option, idx) => {
                    const isCorrect = idx === questions[challenge.currentQuestion].correctIndex;
                    const isSelected = selectedAnswer === idx;
                    const showCorrect = showFeedback && isCorrect;
                    const showWrong = showFeedback && isSelected && !isCorrect;
                    
                    return (
                      <motion.button
                        key={idx}
                        onClick={() => answerQuestion(idx)}
                        disabled={showFeedback}
                        className={`p-4 rounded-2xl text-left font-medium transition-all ${
                          showCorrect 
                            ? "bg-sage text-white border-2 border-sage" 
                            : showWrong
                            ? "bg-coral text-white border-2 border-coral"
                            : "bg-card border-2 border-border hover:border-coral/50"
                        }`}
                        whileTap={!showFeedback ? { scale: 0.98 } : {}}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            showCorrect ? "bg-white/20" : showWrong ? "bg-white/20" : "bg-secondary"
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span>{option}</span>
                          {showCorrect && <CheckCircle size={16} className="ml-auto" />}
                          {showWrong && <XCircle size={16} className="ml-auto" />}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Finished State */}
          {challenge.status === "finished" && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center gap-6"
            >
              <motion.div
                className="w-24 h-24 rounded-full bg-butter/20 flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Trophy size={48} weight="fill" className="text-butter" />
              </motion.div>

              <div className="text-center space-y-2">
                <h3 className="font-serif text-2xl font-bold text-charcoal">
                  Challenge Complete!
                </h3>
                <p className="text-muted-foreground">
                  Great job! Here&apos;s how you did:
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="p-4 rounded-2xl bg-sage/10 text-center">
                  <p className="text-2xl font-bold text-sage">{challenge.correctAnswers}</p>
                  <p className="text-xs text-muted-foreground">Correct</p>
                </div>
                <div className="p-4 rounded-2xl bg-coral/10 text-center">
                  <p className="text-2xl font-bold text-coral">{challenge.wrongAnswers}</p>
                  <p className="text-xs text-muted-foreground">Wrong</p>
                </div>
                <div className="p-4 rounded-2xl bg-butter/10 text-center">
                  <p className="text-2xl font-bold text-butter">{challenge.maxStreak}</p>
                  <p className="text-xs text-muted-foreground">Best Streak</p>
                </div>
                <div className="p-4 rounded-2xl bg-purple-100 text-center">
                  <p className="text-2xl font-bold text-purple-500">
                    {Math.round((challenge.correctAnswers / CHALLENGE_CONFIG.totalWords) * 100)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Accuracy</p>
                </div>
              </div>

              <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-coral text-white text-center">
                <p className="text-xs opacity-80 mb-1">XP Earned</p>
                <p className="text-3xl font-bold">{calculateXP(challenge)}</p>
                <p className="text-xs opacity-60 mt-1">
                  +{Math.round(challenge.timeLeft * CHALLENGE_CONFIG.timeBonusMultiplier)} time bonus • {challenge.maxStreak > 0 ? `+${challenge.maxStreak * CHALLENGE_CONFIG.streakBonus} streak bonus` : ""}
                </p>
              </div>

              <div className="flex gap-3 w-full">
                <motion.button
                  onClick={() => {
                    setChallenge(prev => ({ ...prev, status: "idle" }));
                    setTimeout(startChallenge, 100);
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-coral text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ArrowCounterClockwise size={16} weight="bold" />
                  Play Again
                </motion.button>
                <motion.button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-3.5 rounded-2xl bg-secondary text-charcoal font-bold text-sm hover:bg-secondary/80 transition-all active:scale-95"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Done
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
