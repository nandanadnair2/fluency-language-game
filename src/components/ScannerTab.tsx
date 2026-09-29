"use client";

import React, { useState, useCallback } from "react";
import CameraScanner from "@/components/CameraScanner";
import TranslationCards from "@/components/TranslationCards";
import XPBadge from "@/components/XPBadge";
import { useGameStore } from "@/lib/game-state";
import type { TranslationResponse } from "@/lib/translation-utils";
import type { WordContext } from "@/lib/db-vocabulary";

export default function ScannerTab() {
  const [isScanning, setIsScanning] = useState(false);
  const [translation, setTranslation] = useState<TranslationResponse | null>(null);
  const [savedWordId, setSavedWordId] = useState<number | null>(null);
  const [showXPBadge, setShowXPBadge] = useState(false);
  const [selectedContext, setSelectedContext] = useState<WordContext>("scanner");

  const addXP = useGameStore((s) => s.addXP);
  const scanWord = useGameStore((s) => s.scanWord);

  const performScan = useCallback(async () => {
    setIsScanning(true);
    
    // Use local fallback for demo scan (no API call)
    setTimeout(() => {
      const demoTranslations = [
        { original: "こんにちは", directTranslation: "Hello / Good afternoon", romanized: "kon-nee-chee-WAH", sourceLanguage: "ja", targetLanguage: "en", confidence: 0.95 },
        { original: "ありがとう", directTranslation: "Thank you", romanized: "a-ri-ga-tou", sourceLanguage: "ja", targetLanguage: "en", confidence: 0.92 },
        { original: "すみません", directTranslation: "Excuse me / Sorry", romanized: "su-mi-ma-sen", sourceLanguage: "ja", targetLanguage: "en", confidence: 0.90 },
        { original: "おはよう", directTranslation: "Good morning", romanized: "o-ha-you", sourceLanguage: "ja", targetLanguage: "en", confidence: 0.88 },
        { original: "さようなら", directTranslation: "Goodbye", romanized: "sa-you-na-ra", sourceLanguage: "ja", targetLanguage: "en", confidence: 0.87 },
      ];
      
      const randomTranslation = demoTranslations[Math.floor(Math.random() * demoTranslations.length)];
      setTranslation(randomTranslation);
      setIsScanning(false);
    }, 800);
  }, []);

  const handleSaveWord = useCallback(
    async (word: TranslationResponse) => {
      const { saveWord } = await import("@/lib/db-vocabulary");
      const id = await saveWord({
        original: word.original,
        directTranslation: word.directTranslation,
        romanized: word.romanized,
        sourceLanguage: word.sourceLanguage,
        targetLanguage: word.targetLanguage,
        savedAt: new Date(),
        xpEarned: 5,
        reviewCount: 1,
        context: selectedContext,
      });
      setSavedWordId(id as number);
      addXP(5);
      scanWord();
      setShowXPBadge(true);
      setTimeout(() => setShowXPBadge(false), 1500);
    },
    [addXP, scanWord, selectedContext]
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Camera scanner */}
      <div className="relative flex-1 min-h-0 rounded-3xl overflow-hidden shadow-xl">
        <CameraScanner
          onCapture={() => performScan()}
          isScanning={isScanning}
          setIsScanning={setIsScanning}
        />
      </div>

      {/* Demo Scan button */}
      <div className="flex items-center justify-center px-2">
        <button
          onClick={performScan}
          disabled={isScanning}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-coral/10 hover:bg-coral/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-sm font-medium text-coral">
            {isScanning ? "Scanning..." : "Demo Scan"}
          </span>
        </button>
      </div>

      {/* Context Selector */}
      <div className="px-2">
        <p className="text-xs text-muted-foreground mb-2">Tag this word with:</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "scanner", label: "Scanner", icon: "📷" },
            { id: "restaurant", label: "Cafe", icon: "🍜" },
            { id: "street", label: "Street", icon: "🚶" },
            { id: "anime", label: "Anime", icon: "⛩️" },
            { id: "shopping", label: "Shop", icon: "🛍️" },
            { id: "home", label: "Home", icon: "🏠" },
            { id: "work", label: "Work", icon: "💼" },
            { id: "other", label: "Other", icon: "📝" },
          ].map((ctx) => (
            <button
              key={ctx.id}
              onClick={() => setSelectedContext(ctx.id as WordContext)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
                selectedContext === ctx.id
                  ? "bg-coral text-white shadow-sm"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {ctx.icon} {ctx.label}
            </button>
          ))}
        </div>
      </div>

      {/* Translation Cards */}
      {translation && (
        <TranslationCards
          translation={translation}
          onSaveWord={handleSaveWord}
          savedWordId={savedWordId}
        />
      )}

      {/* XP Badge */}
      <XPBadge show={showXPBadge} amount={5} />
    </div>
  );
}
