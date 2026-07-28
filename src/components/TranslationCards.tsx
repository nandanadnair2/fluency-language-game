"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SpeakerHigh, Heart, FloppyDisk } from "@phosphor-icons/react";
import type { TranslationResponse } from "@/lib/translation-utils";

interface TranslationCardsProps {
  translation: TranslationResponse | null;
  onSaveWord?: (word: TranslationResponse) => void;
  savedWordId?: number | null;
}

const cardVariants = {
  hidden: { y: 100, opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
      delay: i * 0.15,
    },
  }),
  exit: {
    y: 80,
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.3 },
  },
};

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
      icon: <SpeakerHigh size={18} weight="fill" className="text-coral" />,
    },
    {
      id: "romanized",
      label: "🔊 Pronounce it",
      text: translation.romanized,
      fontClass: "font-sans text-lg font-normal",
      textColor: "text-sage",
      icon: null,
    },
  ];

  return (
    <div className="w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {translation && (
          <motion.div
            key={translation.original}
            className="flex flex-col gap-3"
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {cards.map((card, index) => (
              <motion.div
                key={card.id}
                custom={index}
                variants={cardVariants}
                className={`glass-card rounded-3xl p-4 shadow-xl transition-all hover:shadow-2xl group`}
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
        )}
      </AnimatePresence>
    </div>
  );
}
