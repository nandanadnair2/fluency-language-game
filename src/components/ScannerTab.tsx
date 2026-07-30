"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  Camera,
  Image as ImageIcon,
} from "@phosphor-icons/react";
import CameraScanner from "@/components/CameraScanner";
import TranslationCards from "@/components/TranslationCards";
import XPBadge from "@/components/XPBadge";
import { useGameStore } from "@/lib/game-state";
import type { TranslationResponse } from "@/lib/translation-utils";

export default function ScannerTab() {
  const [isScanning, setIsScanning] = useState(false);
  const [translation, setTranslation] = useState<TranslationResponse | null>(null);
  const [savedWordId, setSavedWordId] = useState<number | null>(null);
  const [showXPBadge, setShowXPBadge] = useState(false);
  const [detected, setDetected] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const scanCounterRef = useRef(0); // Prevent stale responses

  const addXP = useGameStore((s) => s.addXP);
  const scanWord = useGameStore((s) => s.scanWord);

  // Core scan function — validates scan counter to prevent stale responses
  const performScan = useCallback(async (imageData: string) => {
    const currentScan = ++scanCounterRef.current;
    setIsScanning(true);
    setDetected(false);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData, language: "ja" }),
      });
      const data = await res.json();

      // Only update if this is still the latest scan (no race condition)
      if (data.original && currentScan === scanCounterRef.current) {
        setTranslation(data);
        setDetected(true);
        setTimeout(() => setDetected(false), 3000);
      }
    } catch (err) {
      console.error("Scan failed:", err);
    } finally {
      if (currentScan === scanCounterRef.current) {
        setIsScanning(false);
      }
    }
  }, []);

  const handleCapture = useCallback((imageData: string) => {
    performScan(imageData);
  }, [performScan]);

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
      });
      setSavedWordId(id as number);
      addXP(5);
      scanWord();
      setShowXPBadge(true);
      setTimeout(() => setShowXPBadge(false), 1500);
    },
    [addXP, scanWord]
  );

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        performScan(base64);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    },
    [performScan]
  );

  const handleDemoScan = useCallback(() => {
    performScan("demo");
  }, [performScan]);

  // Build a stable key from all translation fields to prevent stale renders
  const translationKey = translation
    ? `${translation.original}|${translation.directTranslation}|${translation.romanized}`
    : "";

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Camera scanner */}
      <div className="relative flex-1 min-h-0 rounded-3xl overflow-hidden shadow-xl">
        <CameraScanner
          onCapture={handleCapture}
          isScanning={isScanning}
          setIsScanning={setIsScanning}
          detected={detected}
        />
      </div>

      {/* Upload fallback + Demo Scan */}
      <div className="flex items-center gap-3 px-2">
        <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-secondary hover:bg-secondary/80 cursor-pointer transition-all active:scale-[0.98]">
          <ImageIcon size={18} weight="duotone" className="text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {isUploading ? "Uploading..." : "Upload Image"}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>
        <button
          onClick={handleDemoScan}
          disabled={isScanning}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-coral/10 hover:bg-coral/20 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera size={18} weight="duotone" className="text-coral" />
          <span className="text-sm font-medium text-coral">
            {isScanning ? "Scanning..." : "Demo Scan"}
          </span>
        </button>
      </div>

      {/* Translation Cards — no outer AnimatePresence, let the inner one handle it */}
      {translation && (
        <TranslationCards
          key={translationKey}
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
