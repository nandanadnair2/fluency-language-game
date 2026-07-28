"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightning } from "@phosphor-icons/react";

interface XPBadgeProps {
  show: boolean;
  amount: number;
  position?: { x: number; y: number };
}

export default function XPBadge({ show, amount, position }: XPBadgeProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed z-50 pointer-events-none"
          initial={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}
          animate={{
            opacity: 0,
            scale: 0.6,
            y: -80,
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 1.2,
            ease: "easeOut",
          }}
          style={{
            left: position?.x ?? "50%",
            top: position?.y ?? "50%",
          }}
        >
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-butter/90 shadow-lg">
            <Lightning size={14} weight="fill" className="text-charcoal" />
            <span className="text-sm font-bold text-charcoal">+{amount} XP</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
