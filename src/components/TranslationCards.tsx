"use client";

import React from "react";
import { motion } from "framer-motion";
import { SpeakerHigh, Heart, FloppyDisk } from "@phosphor-icons/react";
import type { TranslationResponse } from "@/lib/translation-utils";

interface TranslationCardsProps {
  translation: TranslationResponse | null;
  onSaveWord?: (word: TranslationResponse) => void;
  savedWordId?: number | null;
}

export default function TranslationCards({
  translation,
  onSaveWord,
  savedWordId,
}: TranslationCardsProps) {
  if (!translation) return null;

  const cards = [
    {
      id: "original",
      label: "📝 Original Text",
      text: translation.original,
      fontClass: "font-serif text-2xl font-bold",
      textColor: "text-charcoal",
      icon: null,
    },
    {
      id: "translation",
      label: "🗣️ Say this",
      text: translation.directTranslation,
      fontClass: "font-sans text-xl font-medium",
      textColor: "text-charcoal",
      icon: null,
    },
    {
      id: "romanized",
      label: "🔊 Pronounce it",
      text: translation.romanized,
      fontClass: "font-sans text-lg font-normal",
      textColor: "text-sage",
      icon: translation.sourceLanguage === "ja" ? (
        <button
          onClick={() => {
            if ('speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(translation.original);
              utterance.lang = 'ja-JP';
              utterance.rate = 0.8;
              window.speechSynthesis.speak(utterance);
            }
          }}
          className="w-8 h-8 rounded-full bg-coral/10 flex items-center justify-center hover:bg-coral/20 transition-all active:scale-90 cursor-pointer"
        >
          <SpeakerHigh size={18} weight="fill" className="text-coral" />
        </button>
      ) : null,
    },
  ];

  return (
    <div className="w-full max-w-md mx-auto">
      {/* key on outer div forces full remount — no AnimatePresence, no overlap possible */}
      <motion.div
        key={`${translation.original}::${translation.directTranslation}`}
        className="flex flex-col gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
        }}
      >
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: index * 0.12,
            }}
            className="glass-card rounded-3xl p-4 shadow-xl transition-all hover:shadow-2xl group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {card.label}
              </span>
              <div className="flex items-center gap-1">
                {card.icon}
                {index === 0 && onSaveWord && (
                  <motion.button
                    onClick={() => onSaveWord(translation)}
                    className="w-8 h-8 rounded-full bg-sage/10 flex items-center justify-center hover:bg-sage/20 transition-all active:scale-90"
                    whileTap={{ scale: 0.85 }}
                  >
                    <Heart
                      size={16}
                      weight={savedWordId ? "fill" : "regular"}
                      className={
                        savedWordId
                          ? "text-butter"
                          : "text-charcoal/40 group-hover:text-coral"
                      }
                    />
                  </motion.button>
                )}
                {index === 0 && savedWordId && (
                  <div className="w-8 h-8 rounded-full bg-butter/20 flex items-center justify-center">
                    <FloppyDisk
                      size={16}
                      weight="fill"
                      className="text-butter"
                    />
                  </div>
                )}
              </div>
            </div>
            <p className={`${card.fontClass} ${card.textColor} break-words`}>
              {card.text}
            </p>
            {index === 0 && translation.confidence > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1 flex-1 rounded-full bg-sage/20 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-sage"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${translation.confidence * 100}%`,
                    }}
                    transition={{
                      duration: 0.8,
                      delay: 0.5,
                      ease: "easeOut",
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round(translation.confidence * 100)}% match
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
