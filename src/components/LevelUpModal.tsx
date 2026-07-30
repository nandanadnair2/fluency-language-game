"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightning,
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  Sparkle,
} from "@phosphor-icons/react";

// Lazy-load confetti on client only
let confettiFn: typeof import("canvas-confetti").default | null = null;
async function getConfetti() {
  if (!confettiFn) {
    const mod = await import("canvas-confetti");
    confettiFn = mod.default;
  }
  return confettiFn;
}

interface QuizQuestion {
  original: string;
  correctTranslation: string;
  wrongTranslations: string[];
}

// Japanese-only quiz questions
const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    original: "こんにちは",
    correctTranslation: "Hello / Good afternoon",
    wrongTranslations: ["Goodbye", "Thank you", "Excuse me"],
  },
  {
    original: "ありがとうございます",
    correctTranslation: "Thank you very much",
    wrongTranslations: ["You're welcome", "Excuse me", "Good morning"],
  },
  {
    original: "すみません",
    correctTranslation: "Excuse me / I'm sorry",
    wrongTranslations: ["Hello", "Thank you", "Please"],
  },
  {
    original: "いただきます",
    correctTranslation: "Let's eat (said before meals)",
    wrongTranslations: ["Good night", "Cheers", "I'm full"],
  },
  {
    original: "おはようございます",
    correctTranslation: "Good morning (polite)",
    wrongTranslations: ["Good evening", "Good night", "Goodbye"],
  },
  {
    original: "お元気ですか",
    correctTranslation: "How are you?",
    wrongTranslations: ["What is this?", "Thank you", "Goodbye"],
  },
  {
    original: "大丈夫です",
    correctTranslation: "It's okay / I'm fine",
    wrongTranslations: ["I'm tired", "I'm lost", "I'm hungry"],
  },
  {
    original: "美味しいです",
    correctTranslation: "It's delicious!",
    wrongTranslations: ["It's spicy", "It's cold", "It's expensive"],
  },
  {
    original: "待ってください",
    correctTranslation: "Please wait",
    wrongTranslations: ["Please come", "Please go", "Please help"],
  },
  {
    original: "駅はどこですか",
    correctTranslation: "Where is the station?",
    wrongTranslations: ["Where is the school?", "Where is the hospital?", "Where is the bank?"],
  },
  {
    original: "分かりません",
    correctTranslation: "I don't understand",
    wrongTranslations: ["I know", "I think so", "Maybe"],
  },
  {
    original: "お願いします",
    correctTranslation: "Please (requesting something)",
    wrongTranslations: ["Thank you", "Sorry", "No thanks"],
  },
  {
    original: "お疲れ様です",
    correctTranslation: "Good work / Thanks for your effort",
    wrongTranslations: ["Good luck", "Take care", "Have fun"],
  },
  {
    original: "いらっしゃいませ",
    correctTranslation: "Welcome (shop greeting)",
    wrongTranslations: ["Goodbye", "See you later", "Excuse me"],
  },
  {
    original: "頑張ってください",
    correctTranslation: "Do your best / Keep it up!",
    wrongTranslations: ["Take it easy", "Give up", "Slow down"],
  },
];

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizComplete: (score: number, total: number) => void;
}

// Deterministic shuffle (seeded by a number so it doesn't change on re-render)
function seededShuffle(arr: string[], seed: number): string[] {
  const shuffled = [...arr];
  // Simple LCG pseudo-random
  let s = seed;
  const next = () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s;
  };
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = next() % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function LevelUpModal({
  isOpen,
  onClose,
  onQuizComplete,
}: LevelUpModalProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [timer, setTimer] = useState(15);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [shuffledQuestions, setShuffledQuestions] = useState<QuizQuestion[]>([]);
  // Store a shuffle seed per question so options stay stable across re-renders
  const [optionSeeds, setOptionSeeds] = useState<number[]>([]);

  const TOTAL_QUESTIONS = 5;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  const startQuiz = useCallback(() => {
    const selected = QUIZ_QUESTIONS.sort(() => Math.random() - 0.5).slice(
      0,
      TOTAL_QUESTIONS
    );
    setShuffledQuestions(selected);
    // Generate a stable seed for each question's options
    setOptionSeeds(selected.map(() => Math.floor(Math.random() * 100000)));
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setQuizFinished(false);
    setTimer(15);
    setIsTimerActive(true);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen && shuffledQuestions.length === 0) {
      startQuiz();
    }
  }, [isOpen, shuffledQuestions.length, startQuiz]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Start/stop timer based on isTimerActive
  useEffect(() => {
    if (isTimerActive && !quizFinished) {
      startTimer();
    } else {
      stopTimer();
    }
    return () => stopTimer();
  }, [isTimerActive, quizFinished, startTimer, stopTimer]);

  // Handle timeout when timer reaches 0
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isTimerActive && !quizFinished && timer <= 0) {
      setIsTimerActive(false);
      setShowResult(true);
      setIsCorrect(false);
    }
  }, [isTimerActive, timer, quizFinished]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const advanceQuestion = useCallback(() => {
    setCurrentQuestion((q) => q + 1);
    setSelectedAnswer(null);
    setShowResult(false);
    setTimer(15);
    setIsTimerActive(true);
  }, []);

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    setIsTimerActive(false);
    setSelectedAnswer(answer);
    const correct = answer === shuffledQuestions[currentQuestion].correctTranslation;
    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      setScore((s) => s + 1);
      getConfetti().then((fn) => fn({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.7 },
        colors: ["#FF7B5A", "#7DBD8C", "#FADF7A", "#A8E6CF", "#FFB5A7"],
      }));
    }

    setTimeout(() => {
      if (currentQuestion + 1 >= shuffledQuestions.length) {
        setQuizFinished(true);
        getConfetti().then((fn) => fn({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#FF7B5A", "#7DBD8C", "#FADF7A", "#A8E6CF", "#FFB5A7"],
        }));
      } else {
        advanceQuestion();
      }
    }, 1500);
  };

  const handleClose = () => {
    onQuizComplete(score, shuffledQuestions.length);
    setShuffledQuestions([]);
    onClose();
  };

  // Memoize options so they DON'T reshuffle on every re-render (e.g. timer tick)
  const question = shuffledQuestions[currentQuestion];
  const options = useMemo(() => {
    if (!question || optionSeeds.length === 0) return [];
    const seed = optionSeeds[currentQuestion] ?? 42;
    return seededShuffle(
      [question.correctTranslation, ...question.wrongTranslations],
      seed
    );
  }, [question, optionSeeds, currentQuestion]);

  if (!isOpen || shuffledQuestions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
          onClick={handleClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-sm rounded-3xl bg-cream p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center transition-all active:scale-90 z-10"
          >
            <XCircle size={20} weight="fill" className="text-muted-foreground" />
          </button>

          {/* Quiz finished */}
          {quizFinished ? (
            <motion.div
              className="text-center py-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <motion.div
                className="w-20 h-20 rounded-full bg-butter/20 flex items-center justify-center mx-auto mb-4"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5 }}
              >
                <Trophy size={40} weight="fill" className="text-butter" />
              </motion.div>
              <h2 className="font-serif text-2xl font-bold text-charcoal mb-2">
                Tongue Twister Trial
              </h2>
              <p className="text-muted-foreground mb-1 text-sm">
                🇯🇵 Japanese Quiz Results
              </p>
              <p className="text-muted-foreground mb-4">
                You scored{" "}
                <span className="font-bold text-coral">
                  {score}/{shuffledQuestions.length}
                </span>{" "}
                correct!
              </p>
              <div className="flex gap-3">
                <button
                  onClick={startQuiz}
                  className="flex-1 py-3 rounded-full bg-coral text-white font-medium shadow-lg hover:shadow-xl transition-all active:scale-95"
                >
                  Play Again
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 py-3 rounded-full bg-secondary text-charcoal font-medium shadow-lg hover:shadow-xl transition-all active:scale-95"
                >
                  Close
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkle size={20} weight="fill" className="text-coral" />
                  <h2 className="font-serif text-xl font-bold text-charcoal">
                    Tongue Twister Trial
                  </h2>
                  <Sparkle size={20} weight="fill" className="text-coral" />
                </div>
                <p className="text-xs text-muted-foreground">
                  🇯🇵 Japanese • Question {currentQuestion + 1} of {shuffledQuestions.length}
                </p>
              </div>

              {/* Progress */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: shuffledQuestions.length }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                      i < currentQuestion
                        ? "bg-sage"
                        : i === currentQuestion
                          ? "bg-coral"
                          : "bg-secondary"
                    }`}
                  />
                ))}
              </div>

              {/* Timer */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <Clock
                  size={16}
                  weight="fill"
                  className={timer <= 5 ? "text-destructive" : "text-muted-foreground"}
                />
                <span
                  className={`text-sm font-bold ${
                    timer <= 5 ? "text-destructive" : "text-charcoal"
                  }`}
                >
                  {timer}s
                </span>
              </div>

              {/* Question */}
              <div className="p-4 rounded-2xl bg-secondary mb-4 text-center">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                  What does this mean?
                </p>
                <p className="font-serif text-2xl font-bold text-charcoal">
                  {question?.original}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2 mb-4">
                {options.map((option, i) => {
                  let bgColor = "bg-secondary hover:bg-secondary/80";
                  if (showResult) {
                    if (option === question?.correctTranslation) {
                      bgColor = "bg-sage/20 border-sage/40";
                    } else if (option === selectedAnswer && !isCorrect) {
                      bgColor = "bg-destructive/10 border-destructive/30";
                    } else {
                      bgColor = "bg-secondary/50 opacity-50";
                    }
                  }

                  return (
                    <motion.button
                      key={`${currentQuestion}-${i}`}
                      onClick={() => handleAnswer(option)}
                      className={`w-full p-3 rounded-2xl text-sm font-medium text-charcoal text-left transition-all border border-transparent active:scale-[0.98] ${bgColor}`}
                      disabled={showResult}
                      whileTap={!showResult ? { scale: 0.97 } : {}}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-card flex items-center justify-center text-xs font-bold shrink-0">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="flex-1">{option}</span>
                        {showResult &&
                          option === question?.correctTranslation && (
                            <CheckCircle
                              size={20}
                              weight="fill"
                              className="text-sage shrink-0"
                            />
                          )}
                        {showResult &&
                          option === selectedAnswer &&
                          !isCorrect && (
                            <XCircle
                              size={20}
                              weight="fill"
                              className="text-destructive shrink-0"
                            />
                          )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Score */}
              <div className="flex items-center justify-center gap-2 text-sm">
                <Lightning size={14} weight="fill" className="text-coral" />
                <span className="text-muted-foreground">
                  Score:{" "}
                  <span className="font-bold text-coral">
                    {score}/{currentQuestion + 1}
                  </span>
                </span>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
