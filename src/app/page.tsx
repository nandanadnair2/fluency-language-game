"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Scan,
  Television,
  User,
} from "@phosphor-icons/react";
import ScannerTab from "@/components/ScannerTab";
import WatchtowerTab from "@/components/WatchtowerTab";
import ProfileTab from "@/components/ProfileTab";
import { useGameStore } from "@/lib/game-state";

type TabId = "scanner" | "watchtower" | "profile";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "scanner", label: "Scanner", icon: Scan },
  { id: "watchtower", label: "Watchtower", icon: Television },
  { id: "profile", label: "Profile", icon: User },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("scanner");
  const xp = useGameStore((s) => s.xp);
  const level = useGameStore((s) => s.level);
  const totalWordsLearned = useGameStore((s) => s.totalWordsLearned);

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      {/* Top bar with branding */}
      <header className="sticky top-0 z-40 bg-cream/80 backdrop-blur-md border-b border-border/30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              className="w-8 h-8 rounded-xl bg-coral/10 flex items-center justify-center"
              whileHover={{ rotate: 15 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <span className="text-lg">🎯</span>
            </motion.div>
            <div>
              <h1 className="font-serif text-base font-bold text-charcoal leading-tight">
                Fluency
              </h1>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Learn languages like a game
              </p>
            </div>
          </div>

          {/* Mini stats */}
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-full bg-sage/10 flex items-center gap-1">
              <span className="text-xs font-bold text-sage">Lv.{level}</span>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-coral/10 flex items-center gap-1">
              <span className="text-[10px]">⚡</span>
              <span className="text-xs font-bold text-coral">{xp}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {activeTab === "scanner" && <ScannerTab />}
          {activeTab === "watchtower" && <WatchtowerTab />}
          {activeTab === "profile" && <ProfileTab />}
        </motion.div>
      </main>

      {/* Bottom navigation */}
      <nav className="sticky bottom-0 z-40 bg-cream/80 backdrop-blur-md border-t border-border/30">
        <div className="max-w-lg mx-auto px-4 py-2">
          <div className="flex items-center justify-around">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex flex-col items-center gap-0.5 py-2 px-4 rounded-2xl transition-all active:scale-95"
                >
                  <div
                    className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                      isActive
                        ? "bg-coral/15 shadow-lg shadow-coral/10"
                        : "bg-transparent"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-2xl bg-coral/15"
                        layoutId="activeTab"
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 30,
                        }}
                      />
                    )}
                    <Icon
                      size={22}
                      weight={isActive ? "fill" : "regular"}
                      className={`relative z-10 ${
                        isActive ? "text-coral" : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-medium transition-colors ${
                      isActive ? "text-coral" : "text-muted-foreground"
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <footer className="bg-cream/90 backdrop-blur-sm border-t border-border/20 mt-auto">
        <div className="max-w-lg mx-auto px-4 py-3 text-center">
          <p className="text-[10px] text-muted-foreground">
            Fluency MVP • Built with Next.js, Framer Motion & 🧡
          </p>
        </div>
      </footer>
    </div>
  );
}
