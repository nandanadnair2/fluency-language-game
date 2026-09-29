"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  BookOpen,
  Play,
  Check,
  X,
  Star,
  Trophy,
  ArrowLeft,
  SpeakerHigh,
  Lightning,
} from "@phosphor-icons/react";
import { useGameStore } from "@/lib/game-state";

// Japanese character sets
const HIRAGANA = [
  { char: "あ", romaji: "a", meaning: "wind" },
  { char: "い", romaji: "i", meaning: "hill" },
  { char: "う", romaji: "u", meaning: "frog" },
  { char: "え", romaji: "e", meaning: "cherry blossom" },
  { char: "お", romaji: "o", meaning: "entrance" },
  { char: "か", romaji: "ka", meaning: "tree" },
  { char: "き", romaji: "ki", meaning: "horse" },
  { char: "く", romaji: "ku", meaning: "corner" },
  { char: "け", romaji: "ke", meaning: "chestnut" },
  { char: "こ", romaji: "ko", meaning: "pine tree" },
  { char: "さ", romaji: "sa", meaning: "sand" },
  { char: "し", romaji: "shi", meaning: "fish" },
  { char: "す", romaji: "su", meaning: "grass" },
  { char: "せ", romaji: "se", meaning: "mist" },
  { char: "そ", romaji: "so", meaning: "branch" },
  { char: "た", romaji: "ta", meaning: "grain" },
  { char: "ち", romaji: "chi", meaning: "cheese" },
  { char: "つ", romaji: "tsu", meaning: "keyhole" },
  { char: "て", romaji: "te", meaning: "fan" },
  { char: "と", romaji: "to", meaning: "torii gate" },
  { char: "な", romaji: "na", meaning: "saw" },
  { char: "に", romaji: "ni", meaning: "sandcastle" },
  { char: "ぬ", romaji: "nu", meaning: "worm" },
  { char: "ね", romaji: "ne", meaning: "cat" },
  { char: "の", romaji: "no", meaning: "clove" },
  { char: "は", romaji: "ha", meaning: "banana leaf" },
  { char: "ひ", romaji: "hi", meaning: "sun" },
  { char: "ふ", romaji: "fu", meaning: "cloud" },
  { char: "へ", romaji: "he", meaning: "chestnut" },
  { char: "ほ", romaji: "ho", meaning: "straw hat" },
  { char: "ま", romaji: "ma", meaning: "net" },
  { char: "み", romaji: "mi", meaning: "midday" },
  { char: "む", romaji: "mu", meaning: "tulip" },
  { char: "め", romaji: "me", meaning: "eye" },
  { char: "も", romaji: "mo", meaning: "willow" },
  { char: "や", romaji: "ya", meaning: "arrow" },
  { char: "ゆ", romaji: "yu", meaning: "warm sake" },
  { char: "よ", romaji: "yo", meaning: "left hand" },
  { char: "ら", romaji: "ra", meaning: "wasp" },
  { char: "り", romaji: "ri", meaning: "bamboo split" },
  { char: "る", romaji: "ru", meaning: "crab" },
  { char: "れ", romaji: "re", meaning: "garden plant" },
  { char: "ろ", romaji: "ro", meaning: "shell" },
  { char: "わ", romaji: "wa", meaning: "gourd" },
  { char: "を", romaji: "wo", meaning: "particle" },
  { char: "ん", romaji: "n", meaning: "vowel" },
] as const;

const KATAKANA = [
  { char: "ア", romaji: "a", meaning: "wind" },
  { char: "イ", romaji: "i", meaning: "hill" },
  { char: "ウ", romaji: "u", meaning: "frog" },
  { char: "エ", romaji: "e", meaning: "cherry blossom" },
  { char: "オ", romaji: "o", meaning: "entrance" },
  { char: "カ", romaji: "ka", meaning: "tree" },
  { char: "キ", romaji: "ki", meaning: "horse" },
  { char: "ク", romaji: "ku", meaning: "corner" },
  { char: "ケ", romaji: "ke", meaning: "chestnut" },
  { char: "コ", romaji: "ko", meaning: "pine tree" },
  { char: "サ", romaji: "sa", meaning: "sand" },
  { char: "シ", romaji: "shi", meaning: "fish" },
  { char: "ス", romaji: "su", meaning: "grass" },
  { char: "セ", romaji: "se", meaning: "mist" },
  { char: "ソ", romaji: "so", meaning: "branch" },
  { char: "タ", romaji: "ta", meaning: "grain" },
  { char: "チ", romaji: "chi", meaning: "cheese" },
  { char: "ツ", romaji: "tsu", meaning: "keyhole" },
  { char: "テ", romaji: "te", meaning: "fan" },
  { char: "ト", romaji: "to", meaning: "torii gate" },
  { char: "ナ", romaji: "na", meaning: "saw" },
  { char: "ニ", romaji: "ni", meaning: "sandcastle" },
  { char: "ヌ", romaji: "nu", meaning: "worm" },
  { char: "ネ", romaji: "ne", meaning: "cat" },
  { char: "ノ", romaji: "no", meaning: "clove" },
  { char: "ハ", romaji: "ha", meaning: "banana leaf" },
  { char: "ヒ", romaji: "hi", meaning: "sun" },
  { char: "フ", romaji: "fu", meaning: "cloud" },
  { char: "ヘ", romaji: "he", meaning: "chestnut" },
  { char: "ホ", romaji: "ho", meaning: "straw hat" },
  { char: "マ", romaji: "ma", meaning: "net" },
  { char: "ミ", romaji: "mi", meaning: "midday" },
  { char: "ム", romaji: "mu", meaning: "tulip" },
  { char: "メ", romaji: "me", meaning: "eye" },
  { char: "モ", romaji: "mo", meaning: "willow" },
  { char: "ヤ", romaji: "ya", meaning: "arrow" },
  { char: "ユ", romaji: "yu", meaning: "warm sake" },
  { char: "ヨ", romaji: "yo", meaning: "left hand" },
  { char: "ラ", romaji: "ra", meaning: "wasp" },
  { char: "リ", romaji: "ri", meaning: "bamboo split" },
  { char: "ル", romaji: "ru", meaning: "crab" },
  { char: "レ", romaji: "re", meaning: "garden plant" },
  { char: "ロ", romaji: "ro", meaning: "shell" },
  { char: "ワ", romaji: "wa", meaning: "gourd" },
  { char: "ヲ", romaji: "wo", meaning: "particle" },
  { char: "ン", romaji: "n", meaning: "vowel" },
] as const;

type GameType = "hiragana" | "katakana" | "mixed";
type GameMode = "quiz" | "speed";

interface GameQuestion {
  char: string;
  correctRomaji: string;
  options: string[];
  meaning: string;
}

export default function LanguageGamesTab() {
  const { addXP, totalWordsLearned, xp, level, currentStreak } = useGameStore();
  const [selectedSet, setSelectedSet] = useState<GameType>("hiragana");
  const [gameMode, setGameMode] = useState<GameMode>("quiz");
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(null);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [streak_count, setStreakCount] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [timer, setTimer] = useState(30);
  const [correctCount, setCorrectCount] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const getRandomChar = useCallback(() => {
    const set = selectedSet === "mixed" ? [...HIRAGANA, ...KATAKANA] : 
                selectedSet === "hiragana" ? HIRAGANA : KATAKANA;
    return set[Math.floor(Math.random() * set.length)];
  }, [selectedSet]);

  const generateQuestion = useCallback(() => {
    const charData = getRandomChar();
    const allRomaji = selectedSet === "mixed" 
      ? [...HIRAGANA, ...KATAKANA].map(c => c.romaji)
      : (selectedSet === "hiragana" ? HIRAGANA : KATAKANA).map(c => c.romaji);
    
    const wrongOptions = allRomaji
      .filter(r => r !== charData.romaji)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    const options = [...wrongOptions, charData.romaji].sort(() => Math.random() - 0.5);
    
    return {
      char: charData.char,
      correctRomaji: charData.romaji,
      options,
      meaning: charData.meaning,
    };
  }, [getRandomChar, selectedSet]);

  const startGame = () => {
    setGameStarted(true);
    setGameFinished(false);
    setScore(0);
    setTotalAnswered(0);
    setStreakCount(0);
    setMaxStreak(0);
    setCorrectCount(0);
    setXpEarned(0);
    setTimer(gameMode === "speed" ? 60 : 30);
    setCurrentQuestion(generateQuestion());
  };

  useEffect(() => {
    if (!gameStarted || gameFinished || gameMode !== "speed") return;
    
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          setGameFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameStarted, gameFinished, gameMode]);

  const handleAnswer = (optionIndex: number) => {
    if (selectedOption !== null || !currentQuestion) return;
    
    const isCorrectAnswer = optionIndex === currentQuestion.options.indexOf(currentQuestion.correctRomaji);
    setSelectedOption(optionIndex);
    setIsCorrect(isCorrectAnswer);
    setTotalAnswered(prev => prev + 1);
    
    if (isCorrectAnswer) {
      setScore(prev => prev + 1);
      setCorrectCount(prev => prev + 1);
      setStreakCount(prev => {
        const newStreak = prev + 1;
        setMaxStreak(max => Math.max(max, newStreak));
        return newStreak;
      });
    } else {
      setStreakCount(0);
    }
    
    setTimeout(() => {
      if (gameMode === "quiz" && totalAnswered >= 9) {
        setGameFinished(true);
      } else {
        setCurrentQuestion(generateQuestion());
        setSelectedOption(null);
        setIsCorrect(null);
      }
    }, 800);
  };

  useEffect(() => {
    if (gameFinished && xpEarned > 0) {
      addXP(xpEarned);
    }
  }, [gameFinished]);

  // Calculate XP when game finishes
  useEffect(() => {
    if (gameFinished && !xpEarned) {
      const baseXP = 50;
      const accuracyBonus = gameMode === "quiz" 
        ? Math.round((score / 10) * 25) 
        : Math.round((correctCount / (totalAnswered || 1)) * 50);
      const streakBonus = maxStreak * 5;
      const timeBonus = gameMode === "speed" ? timer * 2 : 0;
      const total = baseXP + accuracyBonus + streakBonus + timeBonus;
      setXpEarned(total);
    }
  }, [gameFinished]);

  const getRating = () => {
    const accuracy = totalAnswered > 0 ? score / totalAnswered : 0;
    if (accuracy >= 0.9) return { stars: 3, label: "Perfect!", color: "text-yellow-500" };
    if (accuracy >= 0.7) return { stars: 2, label: "Great Job!", color: "text-green-500" };
    if (accuracy >= 0.5) return { stars: 1, label: "Good Try!", color: "text-blue-500" };
    return { stars: 0, label: "Keep Practicing!", color: "text-gray-500" };
  };

  const chatGPT: "scanner" | "watchtower" | "stories" | "profile" | "social" | "games" = "games";

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setGameStarted(false)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain size={28} className="text-accent" />
          Language Games
        </h2>
      </div>

      {!gameStarted ? (
        <div className="space-y-6">
          {/* Game Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: "hiragana", label: "Hiragana", desc: "Japanese vowel characters", icon: "あ" },
              { id: "katakana", label: "Katakana", desc: "Japanese consonant characters", icon: "ア" },
              { id: "mixed", label: "Mixed", desc: "Mix of both scripts", icon: "あア" },
            ].map((set) => (
              <button
                key={set.id}
                onClick={() => setSelectedSet(set.id as GameType)}
                className={`p-6 rounded-xl border-2 transition-all ${
                  selectedSet === set.id
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <div className="text-4xl mb-3">{set.icon}</div>
                <h3 className="font-semibold text-lg">{set.label}</h3>
                <p className="text-sm text-muted-foreground">{set.desc}</p>
              </button>
            ))}
          </div>

          {/* Game Mode Selection */}
          <div className="flex gap-4">
            <button
              onClick={() => setGameMode("quiz")}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                gameMode === "quiz"
                  ? "border-accent bg-accent/10"
                  : "border-border hover:border-accent/50"
              }`}
            >
              <BookOpen size={32} className="mx-auto mb-2 text-accent" />
              <h3 className="font-semibold">Quiz Mode</h3>
              <p className="text-sm text-muted-foreground">10 questions, no time limit</p>
            </button>
            <button
              onClick={() => setGameMode("speed")}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                gameMode === "speed"
                  ? "border-accent bg-accent/10"
                  : "border-border hover:border-accent/50"
              }`}
            >
              <Lightning size={32} className="mx-auto mb-2 text-accent" />
              <h3 className="font-semibold">Speed Mode</h3>
              <p className="text-sm text-muted-foreground">60 seconds, rapid fire</p>
            </button>
          </div>

          {/* Start Button */}
          <button
            onClick={startGame}
            className="w-full py-4 bg-accent text-background rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Play size={24} />
            Start Game
          </button>

          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <div className="text-2xl font-bold text-accent">{xp}</div>
              <div className="text-sm text-muted-foreground">Total XP</div>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <div className="text-2xl font-bold text-accent">{level}</div>
              <div className="text-sm text-muted-foreground">Level</div>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <div className="text-2xl font-bold text-accent">{currentStreak}</div>
              <div className="text-sm text-muted-foreground">Day Streak</div>
            </div>
          </div>
        </div>
      ) : gameFinished ? (
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <Trophy size={64} className="mx-auto text-yellow-500" />
            <h2 className="text-3xl font-bold">Game Complete!</h2>
            
            <div className={`text-4xl font-bold ${getRating().color}`}>
              {getRating().stars === 3 && "⭐⭐⭐"}
              {getRating().stars === 2 && "⭐⭐"}
              {getRating().stars === 1 && "⭐"}
              {getRating().stars === 0 && "💪"}
            </div>
            <p className="text-xl">{getRating().label}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <div className="text-3xl font-bold">{score}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <div className="text-3xl font-bold">{totalAnswered}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <div className="text-3xl font-bold">{maxStreak}</div>
              <div className="text-sm text-muted-foreground">Best Streak</div>
            </div>
            <div className="p-4 rounded-xl bg-accent/20 text-center">
              <div className="text-3xl font-bold text-accent">+{xpEarned}</div>
              <div className="text-sm text-muted-foreground">XP Earned</div>
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-full py-4 bg-accent text-background rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            Play Again
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-accent"
                initial={{ width: 0 }}
                animate={{ width: `${(totalAnswered / (gameMode === "quiz" ? 10 : totalAnswered || 1)) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {totalAnswered}/{gameMode === "quiz" ? 10 : "∞"}
            </span>
            {gameMode === "speed" && (
              <span className={`text-lg font-bold ${timer <= 10 ? "text-red-500" : ""}`}>
                {timer}s
              </span>
            )}
          </div>

          {/* Question */}
          {currentQuestion && (
            <div className="text-center space-y-6">
              <motion.div
                key={currentQuestion.char}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-8xl font-bold"
              >
                {currentQuestion.char}
              </motion.div>
              
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="px-3 py-1 rounded-full bg-muted text-sm hover:bg-muted/80 transition-colors"
                >
                  {showHint ? "Hide Hint" : "Show Hint"}
                </button>
              </div>

              {showHint && (
                <p className="text-muted-foreground">
                  Sounds like "{currentQuestion.correctRomaji}" — means "{currentQuestion.meaning}"
                </p>
              )}
            </div>
          )}

          {/* Options */}
          {currentQuestion && (
            <div className="grid grid-cols-2 gap-4">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedOption === index;
                const isCorrectOption = option === currentQuestion.correctRomaji;
                
                let buttonClass = "p-4 rounded-xl border-2 text-lg font-semibold transition-all ";
                
                if (selectedOption !== null) {
                  if (isSelected && isCorrectOption) {
                    buttonClass += "border-green-500 bg-green-500/20 text-green-700 dark:text-green-400";
                  } else if (isSelected) {
                    buttonClass += "border-red-500 bg-red-500/20 text-red-700 dark:text-red-400";
                  } else if (isCorrectOption) {
                    buttonClass += "border-green-500/50 bg-green-500/10";
                  } else {
                    buttonClass += "border-muted bg-muted/50 opacity-50";
                  }
                } else {
                  buttonClass += "border-border hover:border-accent hover:bg-accent/10";
                }

                return (
                  <button
                    key={option}
                    onClick={() => handleAnswer(index)}
                    disabled={selectedOption !== null}
                    className={buttonClass}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {selectedOption !== null && isCorrectOption && <Check size={20} className="text-green-500" />}
                      {selectedOption !== null && isSelected && !isCorrectOption && <X size={20} className="text-red-500" />}
                      {option}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Stats */}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Score: {score}/{totalAnswered}</span>
            <span>Streak: {streak_count}</span>
          </div>
        </div>
      )}
    </div>
  );
}
