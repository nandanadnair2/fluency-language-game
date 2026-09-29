"use client";

import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightning,
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  BookOpen,
} from "@phosphor-icons/react";
import type { VocabularyWord } from "@/lib/db-vocabulary";

interface VocabularyQuizProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizComplete: (score: number, total: number) => void;
  words: VocabularyWord[];
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const shuffled = [...arr];
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

const QUIZ_QUESTIONS = [
  { original: "こんにちは", correctTranslation: "Hello / Good afternoon", wrongTranslations: ["Goodbye", "Thank you", "Excuse me"] },
  { original: "ありがとう", correctTranslation: "Thank you", wrongTranslations: ["Sorry", "Hello", "Please"] },
  { original: "すみません", correctTranslation: "Excuse me / Sorry", wrongTranslations: ["Hello", "Thank you", "Goodbye"] },
  { original: "おはよう", correctTranslation: "Good morning", wrongTranslations: ["Good night", "Goodbye", "Hello"] },
  { original: "こんばんは", correctTranslation: "Good evening", wrongTranslations: ["Good morning", "Good night", "Thank you"] },
  { original: "おやすみ", correctTranslation: "Good night", wrongTranslations: ["Good morning", "Hello", "Thank you"] },
  { original: "おいしい", correctTranslation: "Delicious", wrongTranslations: ["Bad", "Expensive", "Cheap"] },
  { original: "高い", correctTranslation: "Expensive / High", wrongTranslations: ["Cheap", "Free", "Low"] },
  { original: "行く", correctTranslation: "To go", wrongTranslations: ["To come", "To eat", "To drink"] },
  { original: "食べる", correctTranslation: "To eat", wrongTranslations: ["To drink", "To go", "To sleep"] },
  { original: "飲む", correctTranslation: "To drink", wrongTranslations: ["To eat", "To go", "To sleep"] },
  { original: "大きい", correctTranslation: "Big / Large", wrongTranslations: ["Small", "Tall", "Long"] },
  { original: "小さい", correctTranslation: "Small / Little", wrongTranslations: ["Big", "Tall", "Short"] },
  { original: "新しい", correctTranslation: "New", wrongTranslations: ["Old", "Young", "Fresh"] },
  { original: "古い", correctTranslation: "Old", wrongTranslations: ["New", "Modern", "Fresh"] },
  { original: "早い", correctTranslation: "Fast / Early", wrongTranslations: ["Slow", "Late", "Quick"] },
  { original: "遅い", correctTranslation: "Slow / Late", wrongTranslations: ["Fast", "Early", "Quick"] },
  { original: "寒い", correctTranslation: "Cold", wrongTranslations: ["Hot", "Warm", "Cool"] },
  { original: "暑い", correctTranslation: "Hot", wrongTranslations: ["Cold", "Warm", "Cool"] },
  { original: "近い", correctTranslation: "Near / Close", wrongTranslations: ["Far", "Distant", "Away"] },
  { original: "遠い", correctTranslation: "Far / Distant", wrongTranslations: ["Near", "Close", "Here"] },
  { original: "楽しい", correctTranslation: "Fun / Enjoyable", wrongTranslations: ["Boring", "Sad", "Angry"] },
  { original: "忙しい", correctTranslation: "Busy", wrongTranslations: ["Free", "Idle", "Lazy"] },
  { original: "難しい", correctTranslation: "Difficult / Hard", wrongTranslations: ["Easy", "Simple", "Simple"] },
  { original: "簡単", correctTranslation: "Easy / Simple", wrongTranslations: ["Hard", "Difficult", "Complex"] },
  { original: "駅", correctTranslation: "Station", wrongTranslations: ["School", "Hospital", "Bank"] },
  { original: "学校", correctTranslation: "School", wrongTranslations: ["Station", "Hospital", "Park"] },
  { original: "病院", correctTranslation: "Hospital", wrongTranslations: ["School", "Station", "Bank"] },
  { original: "図書館", correctTranslation: "Library", wrongTranslations: ["Bookstore", "Museum", "Cafe"] },
  { original: "ホテル", correctTranslation: "Hotel", wrongTranslations: ["Restaurant", "Shop", "Bank"] },
  // More challenging pairs with similar meanings
  { original: "大好き", correctTranslation: "Love / Like very much", wrongTranslations: ["Like", "Hate", "Dislike"] },
  { original: "頑張る", correctTranslation: "Do my best / Try hard", wrongTranslations: ["Give up", "Relax", "Stop"] },
  { original: "待って", correctTranslation: "Wait", wrongTranslations: ["Come", "Go", "Hurry"] },
  { original: "来る", correctTranslation: "To come", wrongTranslations: ["To go", "To stay", "To leave"] },
  { original: "見る", correctTranslation: "To see / To look", wrongTranslations: ["To hear", "To speak", "To read"] },
  { original: "聞く", correctTranslation: "To listen / To hear", wrongTranslations: ["To see", "To speak", "To write"] },
  { original: "話す", correctTranslation: "To speak / To talk", wrongTranslations: ["To listen", "To read", "To write"] },
  { original: "読む", correctTranslation: "To read", wrongTranslations: ["To write", "To speak", "To listen"] },
  { original: "書く", correctTranslation: "To write", wrongTranslations: ["To read", "To speak", "To listen"] },
];

// Additional common translations for generating distractors
const COMMON_TRANSLATIONS = [
  "Hello", "Goodbye", "Thank you", "Sorry", "Please", "Yes", "No", "Okay",
  "Good morning", "Good afternoon", "Good evening", "Good night",
  "Delicious", "Expensive", "Cheap", "Free",
  "Big", "Small", "Tall", "Short", "Long", "Wide",
  "New", "Old", "Young", "Fresh",
  "Fast", "Slow", "Early", "Late", "Quick",
  "Cold", "Hot", "Warm", "Cool",
  "Near", "Far", "Close", "Distant",
  "Fun", "Boring", "Sad", "Happy", "Angry",
  "Busy", "Free", "Idle", "Lazy",
  "Difficult", "Easy", "Hard", "Simple", "Complex",
  "Station", "School", "Hospital", "Bank", "Park", "Hotel", "Restaurant",
  "To go", "To come", "To eat", "To drink", "To sleep", "To walk",
  "To see", "To hear", "To speak", "To listen", "To read", "To write",
  "Love", "Like", "Hate", "Dislike",
  "Work", "Play", "Study", "Rest",
];

export default function VocabularyQuiz({ isOpen, onClose, onQuizComplete, words }: VocabularyQuizProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [timer, setTimer] = useState(20);
  const [mode, setMode] = useState<"japanese-to-english" | "english-to-japanese">("japanese-to-english");
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionCount = useRef(0);

  const generateQuiz = useCallback(() => {
    // Use built-in quiz questions for better variety
    const shuffledQuestions = seededShuffle([...QUIZ_QUESTIONS], Date.now());
    const selectedQuestions = shuffledQuestions.slice(0, Math.min(5, shuffledQuestions.length));
    
    const newQuestions = selectedQuestions.map((q, idx) => {
      // Generate distractors from common translations pool
      const otherTranslations = COMMON_TRANSLATIONS.filter(t => 
        t !== q.correctTranslation && 
        !q.wrongTranslations.includes(t)
      );
      const shuffledDistractors = seededShuffle(otherTranslations, idx + 200);
      const distractors = shuffledDistractors.slice(0, 3);
      
      const allOptions = seededShuffle([q.correctTranslation, ...distractors], idx + 300);
      
      return {
        ...q,
        question: q.original,
        correctAnswer: q.correctTranslation,
        options: allOptions,
      };
    });
    
    setQuestions(newQuestions);
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setQuizFinished(false);
    setTimer(20);
    questionCount.current = 0;
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleAnswer = useCallback((answer: string) => {
    if (showResult) return;
    
    const currentQ = questions[currentQuestion];
    const correct = answer === currentQ.correctAnswer;
    
    setSelectedAnswer(answer);
    setShowResult(true);
    
    if (correct) {
      setScore(s => s + 1);
    }
    
    setTimeout(() => {
      if (timerRef.current) clearInterval(timerRef.current);
      
      if (currentQuestion + 1 >= questions.length) {
        setQuizFinished(true);
        onQuizComplete(correct ? score + 1 : score, questions.length);
      } else {
        setCurrentQuestion(q => q + 1);
        setSelectedAnswer(null);
        setShowResult(false);
        setTimer(20);
        questionCount.current++;
      }
    }, 1500);
  }, [questions, currentQuestion, showResult, score, onQuizComplete]);

  // Initialize quiz when opened
  React.useEffect(() => {
    if (isOpen && questions.length === 0) {
      generateQuiz();
    }
  }, [isOpen]); // Only run when modal opens

  // Start timer when quiz is active
  React.useEffect(() => {
    if (isOpen && !quizFinished && !showResult && questions.length > 0) {
      startTimer();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, quizFinished, showResult, questions.length]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        
        <motion.div
          className="relative w-full max-w-md bg-cream rounded-3xl shadow-2xl overflow-hidden"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-coral to-soft-pink p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={24} weight="fill" className="text-white" />
                <h2 className="font-serif text-white font-bold">Vocabulary Quiz</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all"
              >
                <XCircle size={18} weight="fill" className="text-white" />
              </button>
            </div>
            
            {!quizFinished && (
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-white/80 text-sm">Question</span>
                  <span className="text-white font-bold">{currentQuestion + 1}/{questions.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/80 text-sm">Score</span>
                  <span className="text-white font-bold">{score}</span>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${timer <= 5 ? 'bg-red-500/50' : 'bg-white/20'}`}>
                  <Clock size={16} weight="fill" className="text-white" />
                  <span className="text-white font-bold">{timer}s</span>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 min-h-[400px] flex flex-col">
            {questions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <BookOpen size={48} weight="fill" className="text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">Quiz questions loaded! Start practicing.</p>
                </div>
              </div>
            ) : quizFinished ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <motion.div
                  className="w-24 h-24 rounded-full bg-butter/20 flex items-center justify-center mb-4"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Trophy size={48} weight="fill" className="text-butter" />
                </motion.div>
                
                <h2 className="font-serif text-2xl font-bold text-charcoal mb-2">
                  Quiz Complete!
                </h2>
                <p className="text-muted-foreground mb-4">
                  You scored <span className="font-bold text-coral">{score}/{questions.length}</span> correct!
                </p>
                
                <div className="mb-6 p-4 rounded-2xl bg-secondary/50 w-full">
                  <p className="text-sm text-muted-foreground">
                    {score === questions.length ? "🌟 Perfect score! Amazing!" :
                     score >= questions.length * 0.8 ? "⭐ Great job! Keep it up!" :
                     score >= questions.length * 0.6 ? "👍 Good progress! Practice more!" :
                     "💪 Keep learning! You'll get better!"}
                  </p>
                </div>
                
                <div className="flex gap-3 w-full">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-2xl bg-secondary hover:bg-secondary/80 text-charcoal font-medium transition-all"
                  >
                    Close
                  </button>
                  <button
                    onClick={generateQuiz}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-coral to-soft-pink text-white font-medium hover:shadow-lg transition-all"
                  >
                    Play Again
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {/* Question */}
                <div className="mb-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      {mode === "japanese-to-english" ? "What does this mean?" : "How do you say this?"}
                    </p>
                    <h3 className="font-serif text-3xl font-bold text-charcoal">
                      {questions[currentQuestion]?.question}
                    </h3>
                  </div>
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 gap-3 flex-1">
                  {questions[currentQuestion]?.options.map((option: string, idx: number) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrect = option === questions[currentQuestion]?.correctAnswer;
                    const showCorrect = showResult && isCorrect;
                    const showWrong = showResult && isSelected && !isCorrect;
                    
                    let btnClass = "p-4 rounded-2xl border-2 text-left transition-all ";
                    
                    if (showCorrect) {
                      btnClass += "border-sage bg-sage/10 text-sage";
                    } else if (showWrong) {
                      btnClass += "border-coral bg-coral/10 text-coral";
                    } else if (isSelected) {
                      btnClass += "border-coral bg-coral/10";
                    } else {
                      btnClass += "border-border hover:border-coral/50 hover:bg-coral/5";
                    }
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(option)}
                        disabled={showResult}
                        className={btnClass}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-medium">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="flex-1">{option}</span>
                          {showCorrect && <CheckCircle size={20} weight="fill" className="text-sage" />}
                          {showWrong && <XCircle size={20} weight="fill" className="text-coral" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Timer bar */}
                <div className="mt-4 h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-coral"
                    initial={{ width: "100%" }}
                    animate={{ width: `${(timer / 20) * 100}%` }}
                    transition={{ duration: 1, ease: "linear" }}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
