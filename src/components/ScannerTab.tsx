"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Image as ImageIcon,
  Check,
  Lightning,
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

  const addXP = useGameStore((s) => s.addXP);
  const scanWord = useGameStore((s) => s.scanWord);

  const handleCapture = useCallback(async (imageData: string) => {
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData, language: "ja" }),
      });
      const data = await res.json();
      if (data.original) {
        setDetected(true);
        setTimeout(() => setDetected(false), 2000);
        setTranslation(data);
      }
    } catch (err) {
      console.error("Scan failed:", err);
    } finally {
      setIsScanning(false);
    }
  }, []);

  const handleSaveWord = useCallback(
    async (word: TranslationResponse) => {
      // Save to IndexedDB
      const { saveWord, db } = await import("@/lib/db-vocabulary");
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

      // Award XP
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
        setIsScanning(true);
        try {
          const res = await fetch("/api/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64, language: "ja" }),
          });
          const data = await res.json();
          if (data.original) {
            setTranslation(data);
          }
        } catch (err) {
          console.error("Upload scan failed:", err);
        } finally {
          setIsScanning(false);
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    },
    []
  );

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

      {/* Upload fallback */}
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
          onClick={() => {
            // Quick demo: generate mock translation
            setIsScanning(true);
            setTimeout(async () => {
              const res = await fetch("/api/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: "demo", language: "ja" }),
              });
              const data = await res.json();
              if (data.original) {
                setTranslation(data);
              }
              setIsScanning(false);
            }, 800);
          }}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-coral/10 hover:bg-coral/20 cursor-pointer transition-all active:scale-[0.98]"
        >
          <Camera size={18} weight="duotone" className="text-coral" />
          <span className="text-sm font-medium text-coral">Demo Scan</span>
        </button>
      </div>

      {/* Translation Cards */}
      <AnimatePresence mode="wait">
        {translation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <TranslationCards
              translation={translation}
              onSaveWord={handleSaveWord}
              savedWordId={savedWordId}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* XP Badge */}
      <XPBadge show={showXPBadge} amount={5} />
    </div>
  );
}
