"use client";

import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Book,
  BookOpen,
  SpeakerHigh,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Star,
  Trophy,
  Table,
  X,
} from "@phosphor-icons/react";
import { useGameStore } from "@/lib/game-state";
import type { TranslationResponse } from "@/lib/translation-utils";

interface StoryWord {
  japanese: string;
  romaji: string;
  english: string;
}

interface StoryChapter {
  title: string;
  content: (StoryWord & { naturalTranslation?: string })[][]; // Array of sentences, each sentence is an array of words
}

interface Story {
  id: string;
  title: string;
  titleJp: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced";
  chapters: StoryChapter[];
  comprehensionQuestions: {
    question: string;
    questionJp: string;
    options: string[];
    correctIndex: number;
  }[];
  xpReward: number;
}

// Natural translations for each story sentence
const STORY_TRANSLATIONS: Record<string, Record<number, Record<number, string>>> = {
  "cafe-order": {
    0: { 0: "I would like to place an order.", 1: "Excuse me, I'd like a coffee, please." },
    1: { 0: "How much is it?", 1: "It's 500 yen." },
  },
  "train-ride": {
    0: { 0: "I want to go to Tokyo Station.", 1: "Which line should I take?" },
    1: { 0: "The next station is Shinjuku.", 1: "Thank you very much." },
  },
  "restaurant": {
    0: { 0: "A table is fine.", 1: "Is there also a counter?" },
    1: { 0: "What is your recommendation?", 1: "The sushi is delicious." },
    2: { 0: "Itadakimasu! (Let's eat!)", 1: "Gochisousama deshita. (Thank you for the meal.)" },
  },
  "weather": {
    0: { 0: "Today is sunny.", 1: "The temperature is 25 degrees." },
    1: { 0: "Tomorrow will be rainy.", 1: "Please take an umbrella with you." },
  },
  "shopping": {
    0: { 0: "How much is this?", 1: "How much is it?" },
    1: { 0: "Can you make it cheaper?", 1: "Do you give discounts?" },
    2: { 0: "I'll take it!", 1: "Thank you very much!" },
  },
  "introduction": {
    0: { 0: "Nice to meet you.", 1: "My name is Tanaka." },
    1: { 0: "I came from Japan.", 1: "My hobby is reading." },
  },
};

const STORIES: Story[] = [
  {
    id: "cafe-order",
    title: "Cafe Order",
    titleJp: "カフェでの注文",
    description: "Order your favorite drink at a Tokyo cafe",
    level: "beginner",
    xpReward: 30,
    chapters: [
      {
        title: "Welcome",
        content: [
          [
            { japanese: "こんにちは", romaji: "konnichiwa", english: "Hello" },
            { japanese: "、", romaji: "", english: "" },
            { japanese: "注文", romaji: "chūmon", english: "order" },
            { japanese: "を", romaji: "o", english: "" },
            { japanese: "します", romaji: "shimasu", english: "will do" },
          ],
          [
            { japanese: "すみません", romaji: "sumimasen", english: "Excuse me" },
            { japanese: "、", romaji: "", english: "" },
            { japanese: "コーヒー", romaji: "kōhī", english: "coffee" },
            { japanese: "を", romaji: "o", english: "" },
            { japanese: "ください", romaji: "kudasai", english: "please give" },
          ],
        ],
      },
      {
        title: "Payment",
        content: [
          [
            { japanese: "いくら", romaji: "ikura", english: "how much" },
            { japanese: "ですか", romaji: "desu ka", english: "is it" },
          ],
          [
            { japanese: "五百円", romaji: "go-hyaku-en", english: "500 yen" },
            { japanese: "です", romaji: "desu", english: "is" },
          ],
        ],
      },
    ],
    comprehensionQuestions: [
      {
        questionJp: "何を購入しましたか？",
        question: "What did they order?",
        options: ["Tea", "Coffee", "Juice", "Water"],
        correctIndex: 1,
      },
      {
        questionJp: "値段はいくらでしたか？",
        question: "How much was it?",
        options: ["300 yen", "500 yen", "700 yen", "1000 yen"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "train-ride",
    title: "Train Ride",
    titleJp: "電車での旅",
    description: "Navigate the Tokyo subway system",
    level: "beginner",
    xpReward: 35,
    chapters: [
      {
        title: "At the Station",
        content: [
          [
            { japanese: "東京駅", romaji: "Tōkyō-eki", english: "Tokyo Station" },
            { japanese: "まで", romaji: "made", english: "to" },
            { japanese: "行きたい", romaji: "ikitai", english: "want to go" },
          ],
          [
            { japanese: "どの線", romaji: "donosen", english: "which line" },
            { japanese: "に乗りますか", romaji: "norimasu ka", english: "should I take" },
          ],
        ],
      },
      {
        title: "On the Train",
        content: [
          [
            { japanese: "次の駅", romaji: "tsugi-no-eki", english: "next station" },
            { japanese: "は", romaji: "wa", english: "" },
            { japanese: "新宿です", romaji: "Shinjuku desu", english: "is Shinjuku" },
          ],
          [
            { japanese: "ありがとう", romaji: "arigatou", english: "thank you" },
            { japanese: "ございます", romaji: "gozaimasu", english: "" },
          ],
        ],
      },
    ],
    comprehensionQuestions: [
      {
        questionJp: "どこに行きたいですか？",
        question: "Where do they want to go?",
        options: ["Osaka", "Kyoto", "Tokyo", "Nagoya"],
        correctIndex: 2,
      },
      {
        questionJp: "次の駅はどこですか？",
        question: "What is the next station?",
        options: ["Shibuya", "Shinjuku", "Akihabara", "Ueno"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "restaurant",
    title: "At a Restaurant",
    titleJp: "レストランで",
    description: "Enjoy a meal at a traditional izakaya",
    level: "intermediate",
    xpReward: 45,
    chapters: [
      {
        title: "Seating",
        content: [
          [
            { japanese: "テーブル", romaji: "tēburu", english: "table" },
            { japanese: "で", romaji: "de", english: "" },
            { japanese: "いいです", romaji: "ii desu", english: "that's fine" },
          ],
          [
            { japanese: "カウンター", romaji: "kauntā", english: "counter" },
            { japanese: "も", romaji: "mo", english: "also" },
            { japanese: "ありますか", romaji: "arimasu ka", english: "is there" },
          ],
        ],
      },
      {
        title: "Ordering",
        content: [
          [
            { japanese: "のおすすめ", romaji: "no-osusume", english: "recommendation" },
            { japanese: "は何ですか", romaji: "wa nandesu ka", english: "what is" },
          ],
          [
            { japanese: "お寿司", romaji: "oshii", english: "sushi" },
            { japanese: "が", romaji: "ga", english: "" },
            { japanese: "美味しいです", romaji: "oishii desu", english: "is delicious" },
          ],
        ],
      },
      {
        title: "Enjoying the Meal",
        content: [
          [
            { japanese: "いただきます", romaji: "itadakimasu", english: "let's eat" },
          ],
          [
            { japanese: "ごちそうさまでした", romaji: "gochisousama deshita", english: "thank you for the meal" },
          ],
        ],
      },
    ],
    comprehensionQuestions: [
      {
        questionJp: "何が好きですか？",
        question: "What food do they recommend?",
        options: ["Ramen", "Sushi", "Udon", "Tempura"],
        correctIndex: 1,
      },
      {
        questionJp: "何を言いますか？食事前",
        question: "What do they say before eating?",
        options: ["Sayonara", "Itadakimasu", "Arigatou", "Konnichiwa"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "weather",
    title: "Weather Report",
    titleJp: "天気予報",
    description: "Learn about the seasons in Japan",
    level: "beginner",
    xpReward: 25,
    chapters: [
      {
        title: "Today's Weather",
        content: [
          [
            { japanese: "今日は", romaji: "kyou wa", english: "today" },
            { japanese: "晴れです", romaji: "hare desu", english: "is sunny" },
          ],
          [
            { japanese: "気温", romaji: "kin'on", english: "temperature" },
            { japanese: "は", romaji: "wa", english: "" },
            { japanese: "25度", romaji: "nijuu-go do", english: "is 25 degrees" },
          ],
        ],
      },
      {
        title: "Tomorrow",
        content: [
          [
            { japanese: "明日", romaji: "ashita", english: "tomorrow" },
            { japanese: "は", romaji: "wa", english: "" },
            { japanese: "雨です", romaji: "ame desu", english: "is rainy" },
          ],
          [
            { japanese: "傘", romaji: "kasa", english: "umbrella" },
            { japanese: "を", romaji: "o", english: "" },
            { japanese: "持って行ってください", romaji: "motte itte kudasai", english: "please take with you" },
          ],
        ],
      },
    ],
    comprehensionQuestions: [
      {
        questionJp: "今日はどういう天気ですか？",
        question: "What's the weather like today?",
        options: ["Rainy", "Cloudy", "Sunny", "Snowy"],
        correctIndex: 2,
      },
      {
        questionJp: "明日は何が要りますか？",
        question: "What do you need tomorrow?",
        options: ["Sunglasses", "Umbrella", "Jacket", "Hat"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "shopping",
    title: "Shopping",
    titleJp: "買い物",
    description: "Bargain at a Tokyo market",
    level: "intermediate",
    xpReward: 40,
    chapters: [
      {
        title: "At the Market",
        content: [
          [
            { japanese: "これ", romaji: "kore", english: "this" },
            { japanese: "はいくらか", romaji: "wa ikura ka", english: "how much is" },
          ],
          [
            { japanese: "いくら", romaji: "ikura", english: "how much" },
            { japanese: "ですか", romaji: "desu ka", english: "" },
          ],
        ],
      },
      {
        title: "Bargaining",
        content: [
          [
            { japanese: "安くできますか", romaji: "yasuku dekimasu ka", english: "can you make it cheaper?" },
          ],
          [
            { japanese: "値引き", romaji: "nebiki", english: "discount" },
            { japanese: "しますか", romaji: "shimasu ka", english: "do you give" },
          ],
        ],
      },
      {
        title: "Purchase",
        content: [
          [
            { japanese: "いきます", romaji: "ikimasu", english: "I'll take it" },
          ],
          [
            { japanese: "ありがとうございました", romaji: "arigatou gozaimashita", english: "thank you very much" },
          ],
        ],
      },
    ],
    comprehensionQuestions: [
      {
        questionJp: "何を頼んでいますか？",
        question: "What are they asking about?",
        options: ["Size", "Price", "Color", "Brand"],
        correctIndex: 1,
      },
      {
        questionJp: "最後に何を言いますか？",
        question: "What do they say at the end?",
        options: ["Hello", "Sorry", "Thank you", "Goodbye"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "introduction",
    title: "Self Introduction",
    titleJp: "自己紹介",
    description: "Learn to introduce yourself in Japanese",
    level: "beginner",
    xpReward: 30,
    chapters: [
      {
        title: "Greeting",
        content: [
          [
            { japanese: "はじめまして", romaji: "hajimemashite", english: "nice to meet you" },
          ],
          [
            { japanese: "私の名前は", romaji: "watashi-no-namae wa", english: "my name is" },
            { japanese: "田中です", romaji: "Tanaka desu", english: "Tanaka" },
          ],
        ],
      },
      {
        title: "Background",
        content: [
          [
            { japanese: "日本から", romaji: "Nihon kara", english: "from Japan" },
            { japanese: "来ました", romaji: "kimashita", english: "came" },
          ],
          [
            { japanese: "趣味は", romaji: "shumi wa", english: "hobby is" },
            { japanese: "読書です", romaji: "dokusho desu", english: "reading" },
          ],
        ],
      },
    ],
    comprehensionQuestions: [
      {
        questionJp: "誰の名前ですか？",
        question: "What is the person's name?",
        options: ["Suzuki", "Tanaka", "Yamamoto", "Sato"],
        correctIndex: 1,
      },
      {
        questionJp: "趣味は何ですか？",
        question: "What is their hobby?",
        options: ["Cooking", "Reading", "Traveling", "Sports"],
        correctIndex: 1,
      },
    ],
  },
];

export default function StoriesTab() {
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [currentSentence, setCurrentSentence] = useState(0);
  const [showTranslation, setShowTranslation] = useState<Set<number>>(new Set());
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [completedStories, setCompletedStories] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [showCharTable, setShowCharTable] = useState(false);
  const [quizSelections, setQuizSelections] = useState<Record<number, number>>({});

  const addXP = useGameStore((s) => s.addXP);
  const playQuiz = useGameStore((s) => s.playQuiz);

  const handleStartStory = useCallback((story: Story) => {
    setSelectedStory(story);
    setCurrentChapter(0);
    setCurrentSentence(0);
    setShowTranslation(new Set());
    setQuizAnswered(false);
    setQuizScore(0);
    setShowQuiz(false);
  }, []);

  const handleNextSentence = useCallback(() => {
    if (!selectedStory) return;
    const chapter = selectedStory.chapters[currentChapter];
    if (currentSentence < chapter.content.length - 1) {
      setCurrentSentence(currentSentence + 1);
      setCurrentWordIndex(0);
    } else if (currentChapter < selectedStory.chapters.length - 1) {
      setCurrentChapter(currentChapter + 1);
      setCurrentSentence(0);
      setCurrentWordIndex(0);
    }
  }, [selectedStory, currentChapter, currentSentence]);

  const handlePrevSentence = useCallback(() => {
    if (!selectedStory) return;
    if (currentSentence > 0) {
      setCurrentSentence(currentSentence - 1);
      setCurrentWordIndex(0);
    } else if (currentChapter > 0) {
      setCurrentChapter(currentChapter - 1);
      const prevChapter = selectedStory.chapters[currentChapter - 1];
      setCurrentSentence(prevChapter.content.length - 1);
      setCurrentWordIndex(0);
    }
  }, [selectedStory, currentChapter, currentSentence]);

  const handleToggleTranslation = useCallback((index: number) => {
    setShowTranslation((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handlePlayAudio = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.7;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const handleCompleteQuiz = useCallback((index: number, questionIndex: number) => {
    if (!selectedStory || quizAnswered) return;

    // Save the selection
    setQuizSelections(prev => ({ ...prev, [questionIndex]: index }));

    const isCorrect = index === selectedStory.comprehensionQuestions[questionIndex].correctIndex;
    if (isCorrect) {
      setQuizScore((prev) => prev + 1);
    }

    const allAnswered = questionIndex === selectedStory.comprehensionQuestions.length - 1;
    if (allAnswered) {
      setQuizAnswered(true);
      if (selectedStory) {
        addXP(selectedStory.xpReward);
        playQuiz();
        setCompletedStories((prev) => new Set(prev).add(selectedStory.id));
        
        // Save story words with context
        saveStoryWords(selectedStory);
      }
    }
  }, [selectedStory, quizAnswered, addXP, playQuiz]);

  const saveStoryWords = useCallback((story: Story) => {
    import("@/lib/db-vocabulary").then(({ saveWord }) => {
      const context = story.id === "cafe-order" ? "restaurant" :
                      story.id === "restaurant" ? "restaurant" :
                      story.id === "shopping" ? "shopping" :
                      story.id === "train-ride" ? "street" :
                      story.id === "weather" ? "home" :
                      story.id === "introduction" ? "other" : "stories";
      
      story.chapters.forEach(chapter => {
        chapter.content.forEach(sentence => {
          sentence.forEach(word => {
            if (word.japanese && word.english) {
              saveWord({
                original: word.japanese,
                directTranslation: word.english,
                romanized: word.romaji,
                sourceLanguage: "ja",
                targetLanguage: "en",
                savedAt: new Date(),
                xpEarned: 2,
                reviewCount: 1,
                context: context as any,
              });
            }
          });
        });
      });
    });
  }, []);

  const handleCloseStory = useCallback(() => {
    setSelectedStory(null);
    setCurrentChapter(0);
    setCurrentSentence(0);
    setShowTranslation(new Set());
    setQuizAnswered(false);
    setQuizScore(0);
    setShowQuiz(false);
  }, []);

  const currentChapterData = selectedStory?.chapters[currentChapter];
  const currentSentenceData = currentChapterData?.content[currentSentence];

  // Get natural translation for current sentence
  const getNaturalTranslation = () => {
    if (!selectedStory) return null;
    const storyTrans = STORY_TRANSLATIONS[selectedStory.id];
    if (!storyTrans) return null;
    const chapterTrans = storyTrans[currentChapter];
    if (!chapterTrans) return null;
    return chapterTrans[currentSentence] || null;
  };

  if (!selectedStory) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-coral/10 to-butter/10 shadow-xl border border-coral/20">
          <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-serif text-lg font-bold text-charcoal">
              Interactive Stories
            </h2>
            <p className="text-xs text-muted-foreground">
              Read, listen, and learn through stories
            </p>
          </div>
          <button
            onClick={() => setShowCharTable(!showCharTable)}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1 ${
              showCharTable
                ? 'bg-coral text-white'
                : 'bg-secondary text-muted-foreground hover:text-coral'
            }`}
          >
            <Table size={14} />
            {showCharTable ? 'Hide Reference' : 'Reference'}
          </button>
        </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Choose a story below to start your reading adventure. Each story includes Japanese text with English translations, audio narration, and comprehension quizzes.
          </p>
          {showCharTable && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-4 rounded-2xl bg-card border border-border/30"
            >
              <HiraganaKatakanaTable />
            </motion.div>
          )}
        </div>

        {/* Story List */}
        <div className="space-y-3">
          {STORIES.map((story) => (
            <motion.div
              key={story.id}
              className="p-5 rounded-3xl bg-card shadow-lg border border-border/50 cursor-pointer hover:shadow-xl transition-all active:scale-[0.98]"
              whileHover={{ y: -2 }}
              onClick={() => handleStartStory(story)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-serif text-base font-bold text-charcoal">
                      {story.title}
                    </h3>
                    {completedStories.has(story.id) && (
                      <CheckCircle size={16} weight="fill" className="text-sage" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{story.titleJp}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  story.level === "beginner" ? "bg-sage/15 text-sage" :
                  story.level === "intermediate" ? "bg-butter/20 text-butter" :
                  "bg-coral/15 text-coral"
                }`}>
                  {story.level}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{story.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{story.chapters.length} chapters</span>
                  <span>{story.comprehensionQuestions.length} questions</span>
                </div>
                <div className="flex items-center gap-1 text-coral">
                  <Star size={14} weight="fill" />
                  <span className="text-xs font-semibold">{story.xpReward} XP</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Story Header */}
      <div className="p-5 rounded-3xl bg-card shadow-xl border border-border/50">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleCloseStory}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-coral transition-colors"
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <div className="text-xs text-muted-foreground">
            Chapter {currentChapter + 1} / {selectedStory.chapters.length}
          </div>
        </div>
        <h2 className="font-serif text-xl font-bold text-charcoal mb-1">
          {selectedStory.title}
        </h2>
        <p className="text-sm text-muted-foreground mb-3">{selectedStory.titleJp}</p>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            selectedStory.level === "beginner" ? "bg-sage/15 text-sage" :
            selectedStory.level === "intermediate" ? "bg-butter/20 text-butter" :
            "bg-coral/15 text-coral"
          }`}>
            {selectedStory.level}
          </span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star size={12} className="text-coral" />
            <span>{selectedStory.xpReward} XP</span>
          </div>
        </div>
      </div>

      {/* Chapter Title */}
      <div className="px-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {currentChapterData?.title}
        </h3>
      </div>

      {/* Story Content */}
      <div className="p-5 rounded-3xl bg-card shadow-xl border border-border/50 space-y-4">
        {currentSentenceData?.map((word, wordIndex) => (
          <div key={wordIndex} className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleToggleTranslation(currentSentence * 100 + wordIndex)}
                className={`px-3 py-2 rounded-xl transition-all active:scale-95 ${
                  showTranslation.has(currentSentence * 100 + wordIndex)
                    ? "bg-coral/15 border-coral/30"
                    : "bg-secondary/50 hover:bg-secondary"
                } border`}
              >
                <span className="text-lg font-serif font-medium text-charcoal">
                  {word.japanese}
                </span>
              </button>
              
              {showTranslation.has(currentSentence * 100 + wordIndex) && (
                <motion.span
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm text-muted-foreground"
                >
                  {word.english}
                </motion.span>
              )}
              
              <button
                onClick={() => handlePlayAudio(word.japanese)}
                className="p-2 rounded-full bg-coral/10 hover:bg-coral/20 transition-all active:scale-90"
              >
                <SpeakerHigh size={16} weight="fill" className="text-coral" />
              </button>
            </div>
            
            {showTranslation.has(currentSentence * 100 + wordIndex) && (
              <p className="text-xs text-muted-foreground italic pl-1">
                {word.romaji}
              </p>
            )}
          </div>
        ))}

        {/* Full sentence translation */}
        {showTranslation.has(currentSentence * 100 + 99) && currentSentenceData && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl bg-sage/10 border border-sage/20"
          >
            <p className="text-xs font-semibold text-sage mb-1">Natural Translation:</p>
            <p className="text-sm text-charcoal leading-relaxed">
              {getNaturalTranslation() || currentSentenceData.map((word: any) => word.english).join(" ").trim() || "—"}
            </p>
          </motion.div>
        )}
      </div>

      {/* Sentence toggle button */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => handleToggleTranslation(currentSentence * 100 + 99)}
          className={`px-4 py-2 rounded-full text-xs font-medium transition-all active:scale-95 ${
            showTranslation.has(currentSentence * 100 + 99)
              ? "bg-coral text-white"
              : "bg-secondary text-muted-foreground hover:text-coral"
          }`}
        >
          {showTranslation.has(currentSentence * 100 + 99) ? "Hide Translation" : "Show Full Translation"}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-2">
        <button
          onClick={handlePrevSentence}
          disabled={currentChapter === 0 && currentSentence === 0}
          className="flex items-center gap-1 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft size={16} />
          Previous
        </button>
        
        <button
          onClick={() => handlePlayAudio(currentSentenceData?.map(w => w.japanese).join("") || "")}
          className="flex items-center gap-1 px-4 py-2 rounded-xl bg-coral/10 hover:bg-coral/20 transition-all active:scale-95"
        >
          <Play size={16} className="text-coral" />
          <span className="text-xs font-medium text-coral">Listen</span>
        </button>
        
        <button
          onClick={handleNextSentence}
          disabled={
            currentChapter === selectedStory.chapters.length - 1 &&
            currentSentence === (currentChapterData?.content.length ?? 0) - 1
          }
          className="flex items-center gap-1 px-4 py-2 rounded-xl bg-coral hover:bg-coral/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white"
        >
          Next
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Quiz Section */}
      {showQuiz && !quizAnswered && (
        <div className="p-5 rounded-3xl bg-card shadow-xl border border-border/50 space-y-4">
          <h3 className="font-serif text-base font-bold text-charcoal flex items-center gap-2">
            <Trophy size={20} className="text-coral" />
            Comprehension Quiz
          </h3>
          <p className="text-xs text-muted-foreground">
            Complete the quiz to earn XP and learn words from this story.
          </p>
          
          {selectedStory.comprehensionQuestions.map((q, qIndex) => (
            <div key={qIndex} className="space-y-2">
              <p className="text-sm font-medium text-charcoal">{q.question}</p>
              <p className="text-xs text-muted-foreground">{q.questionJp}</p>
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((option, optIndex) => {
                  const isSelected = quizSelections[qIndex] === optIndex;
                  const isCorrect = optIndex === q.correctIndex;
                  const answered = quizSelections[qIndex] !== undefined;

                  let buttonClass = "py-2 px-3 rounded-xl text-sm transition-all active:scale-95 ";
                  if (answered) {
                    if (isCorrect) {
                      buttonClass += "bg-sage/20 border-sage text-sage font-semibold";
                    } else if (isSelected && !isCorrect) {
                      buttonClass += "bg-coral/20 border-coral text-coral font-semibold";
                    } else {
                      buttonClass += "bg-secondary/50 text-muted-foreground";
                    }
                  } else {
                    buttonClass += "bg-secondary hover:bg-secondary/80 text-charcoal";
                  }

                  return (
                    <button
                      key={optIndex}
                      onClick={() => handleCompleteQuiz(optIndex, qIndex)}
                      className={buttonClass}
                      disabled={answered}
                    >
                      {option}
                      {answered && isCorrect && " ✓"}
                      {answered && isSelected && !isCorrect && " ✗"}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quiz Results */}
      {quizAnswered && (
        <motion.div
          className="p-5 rounded-3xl bg-card shadow-xl border border-border/50 text-center space-y-3"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-16 h-16 rounded-full bg-coral/10 flex items-center justify-center mx-auto">
            <Trophy size={32} weight="fill" className="text-coral" />
          </div>
          <h3 className="font-serif text-lg font-bold text-charcoal">
            Quiz Complete!
          </h3>
          <p className="text-sm text-muted-foreground">
            You scored {quizScore}/{selectedStory.comprehensionQuestions.length}
          </p>
          <div className="flex items-center justify-center gap-1 text-coral">
            <Star size={16} weight="fill" />
            <span className="text-sm font-semibold">+{selectedStory.xpReward} XP earned</span>
          </div>
          <button
            onClick={() => {
              setShowQuiz(true);
              setQuizAnswered(false);
              setQuizScore(0);
              setQuizSelections({});
            }}
            className="w-full py-3 rounded-2xl bg-coral text-white font-medium hover:bg-coral/90 transition-all active:scale-95"
          >
            Try Again
          </button>
          <button
            onClick={handleCloseStory}
            className="w-full py-3 rounded-2xl bg-secondary text-charcoal font-medium hover:bg-secondary/80 transition-all active:scale-95"
          >
            Back to Stories
          </button>
        </motion.div>
      )}

      {/* Start Quiz Button */}
      {!showQuiz && !quizAnswered && currentChapter === selectedStory.chapters.length - 1 && currentSentence === (currentChapterData?.content.length ?? 0) - 1 && (
        <button
          onClick={() => setShowQuiz(true)}
          className="w-full py-4 rounded-2xl bg-coral text-white font-bold text-base shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Trophy size={20} />
          Start Comprehension Quiz
        </button>
      )}
    </div>
  );
}

// Character Reference Table
function HiraganaKatakanaTable() {
  const hiragana = [
    ['あ', 'い', 'う', 'え', 'お'], ['か', 'き', 'く', 'け', 'こ'],
    ['さ', 'し', 'す', 'せ', 'そ'], ['た', 'ち', 'つ', 'て', 'と'],
    ['な', 'に', 'ぬ', 'ね', 'の'], ['は', 'ひ', 'ふ', 'へ', 'ほ'],
    ['ま', 'み', 'む', 'め', 'も'], ['や', '', 'ゆ', '', 'よ'],
    ['ら', 'り', 'る', 'れ', 'ろ'], ['わ', '', '', '', 'を'],
  ];
  const katakana = [
    ['ア', 'イ', 'ウ', 'エ', 'オ'], ['カ', 'キ', 'ク', 'ケ', 'コ'],
    ['サ', 'シ', 'ス', 'セ', 'ソ'], ['タ', 'チ', 'ツ', 'テ', 'ト'],
    ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'], ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ'],
    ['マ', 'ミ', 'ム', 'メ', 'モ'], ['ヤ', '', 'ユ', '', 'ヨ'],
    ['ラ', 'リ', 'ル', 'レ', 'ロ'], ['ワ', '', '', '', 'ヲ'],
  ];
  const hiraganaRomaji = [
    ['a', 'i', 'u', 'e', 'o'], ['ka', 'ki', 'ku', 'ke', 'ko'],
    ['sa', 'shi', 'su', 'se', 'so'], ['ta', 'chi', 'tsu', 'te', 'to'],
    ['na', 'ni', 'nu', 'ne', 'no'], ['ha', 'hi', 'fu', 'he', 'ho'],
    ['ma', 'mi', 'mu', 'me', 'mo'], ['ya', '', 'yu', '', 'yo'],
    ['ra', 'ri', 'ru', 're', 'ro'], ['wa', '', '', '', 'wo'],
  ];
  const katakanaRomaji = hiraganaRomaji; // Same pronunciation

  return (
    <div className="space-y-6">
      {/* Hiragana */}
      <div>
        <h3 className="text-base font-bold text-charcoal mb-3 flex items-center gap-2">
          <span className="text-2xl font-serif">あ</span>
          Hiragana (ひらがな)
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {hiragana.map((row, rowIdx) =>
            row.map((char, colIdx) => (
              <div
                key={rowIdx * 5 + colIdx}
                className="flex flex-col items-center p-2 rounded-lg bg-card border border-border/30"
              >
                <span className="text-xl font-serif text-charcoal">{char || '—'}</span>
                <span className="text-xs text-muted-foreground">{hiraganaRomaji[rowIdx]?.[colIdx] || ''}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Katakana */}
      <div>
        <h3 className="text-base font-bold text-charcoal mb-3 flex items-center gap-2">
          <span className="text-2xl font-serif">ア</span>
          Katakana (カタカナ)
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {katakana.map((row, rowIdx) =>
            row.map((char, colIdx) => (
              <div
                key={rowIdx * 5 + colIdx}
                className="flex flex-col items-center p-2 rounded-lg bg-card border border-border/30"
              >
                <span className="text-xl font-serif text-charcoal">{char || '—'}</span>
                <span className="text-xs text-muted-foreground">{katakanaRomaji[rowIdx]?.[colIdx] || ''}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Common Words */}
      <div>
        <h3 className="text-base font-bold text-charcoal mb-3">Common Greetings</h3>
        <div className="space-y-2">
          {[
            { jp: 'こんにちは', romaji: 'konnichiwa', en: 'Hello' },
            { jp: 'ありがとう', romaji: 'arigatou', en: 'Thank you' },
            { jp: 'すみません', romaji: 'sumimasen', en: 'Excuse me' },
            { jp: 'おはよう', romaji: 'ohayou', en: 'Good morning' },
            { jp: 'さようなら', romaji: 'sayounara', en: 'Goodbye' },
            { jp: 'お願いします', romaji: 'onegai shimasu', en: 'Please' },
          ].map((word, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/30">
              <span className="text-lg font-serif text-charcoal w-24">{word.jp}</span>
              <span className="text-sm text-muted-foreground italic flex-1">{word.romaji}</span>
              <span className="text-sm text-charcoal">{word.en}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Export for use in page.tsx or standalone
export { HiraganaKatakanaTable };
