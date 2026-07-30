"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  DownloadSimple,
  Terminal,
  Globe,
  PuzzlePiece,
  CaretRight,
} from "@phosphor-icons/react";

export default function SetupGuide() {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-cream/80 backdrop-blur-md border-b border-border/30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-coral/10 flex items-center justify-center">
            <span className="text-lg">🎯</span>
          </div>
          <div>
            <h1 className="font-serif text-base font-bold text-charcoal">
              Self-Hosting Guide
            </h1>
            <p className="text-[10px] text-muted-foreground">
              Run Fluency on your own machine
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">
        {/* Why self-host? */}
        <div className="p-5 rounded-3xl bg-card shadow-lg border border-border/50">
          <h2 className="font-serif text-lg font-bold text-charcoal mb-2">
            Why Self-Host?
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The <strong>Chrome Extension</strong> needs to connect to a server
            running on <strong>your machine</strong>. This sandbox preview runs in
            the cloud — the extension can&apos;t reach it. Self-hosting lets you use
            live subtitle sync from Netflix &amp; YouTube.
          </p>
        </div>

        {/* Prerequisites */}
        <div className="p-5 rounded-3xl bg-card shadow-lg border border-border/50 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-coral/15 flex items-center justify-center text-sm font-bold text-coral">
              0
            </div>
            <h2 className="font-serif text-base font-bold text-charcoal">
              Prerequisites
            </h2>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-secondary/50">
              <p className="text-xs font-semibold text-charcoal mb-1">
                Install Bun (JavaScript runtime)
              </p>
              <div className="bg-charcoal rounded-xl p-2.5 overflow-x-auto">
                <code className="text-[11px] text-coral font-mono">
                  powershell -c &quot;irm bun.sh/install.ps1 | iex&quot;
                </code>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Run in <strong>PowerShell as Administrator</strong>. Then close
                and reopen PowerShell.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-secondary/50">
              <p className="text-xs font-semibold text-charcoal mb-1">
                Install Git (optional, for easy updates)
              </p>
              <div className="bg-charcoal rounded-xl p-2.5 overflow-x-auto">
                <code className="text-[11px] text-coral font-mono">
                  winget install Git.Git
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Download */}
        <div className="p-5 rounded-3xl bg-card shadow-lg border border-border/50 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-coral/15 flex items-center justify-center text-sm font-bold text-coral">
              1
            </div>
            <h2 className="font-serif text-base font-bold text-charcoal">
              Download Project
            </h2>
          </div>

          <div className="p-4 rounded-2xl bg-coral/10 border border-coral/25">
            <p className="text-xs text-charcoal mb-3">
              Click the button below. Your browser will download{" "}
              <code className="bg-secondary px-1 rounded text-[10px]">
                fluency-project.zip
              </code>{" "}
              (1.5 MB).
            </p>
            <a
              href="/api/download-zip"
              download="fluency-project.zip"
              className="w-full py-3 rounded-xl bg-coral text-white text-sm font-semibold hover:bg-coral/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer no-underline"
            >
              <DownloadSimple size={16} weight="bold" />
              Download fluency-project.zip
            </a>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              If download doesn&apos;t start, click &quot;Open in New Tab&quot; above
              the Preview Panel and try from there.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-secondary/50">
            <p className="text-xs font-semibold text-charcoal mb-1">
              Extract the ZIP
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Right-click the ZIP → <strong>Extract All</strong> → extract into
              your chosen folder. Example:
            </p>
            <div className="bg-charcoal rounded-xl p-2.5 mt-1.5 overflow-x-auto">
              <code className="text-[11px] text-coral font-mono">
                D:\Fluency
              </code>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">
              Use a simple folder name without spaces or special characters
              like &amp; to avoid PowerShell issues.
            </p>
          </div>
        </div>

        {/* Step 2: Install */}
        <div className="p-5 rounded-3xl bg-card shadow-lg border border-border/50 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-coral/15 flex items-center justify-center text-sm font-bold text-coral">
              2
            </div>
            <h2 className="font-serif text-base font-bold text-charcoal">
              Install Dependencies
            </h2>
          </div>

          <div className="p-3 rounded-2xl bg-secondary/50">
            <p className="text-xs font-semibold text-charcoal mb-2">
              Open terminal and run:
            </p>
            <div className="bg-charcoal rounded-xl p-2.5 overflow-x-auto space-y-1">
              <p className="text-[10px] text-muted-foreground font-mono">
                # Navigate to your project folder
              </p>
              <code className="text-[11px] text-coral font-mono block">
                cd D:\Fluency
              </code>
              <p className="text-[10px] text-muted-foreground font-mono mt-2">
                # Install all packages
              </p>
              <code className="text-[11px] text-coral font-mono block">
                bun install
              </code>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              This downloads all required packages. Wait for it to finish.
            </p>
          </div>
        </div>

        {/* Step 3: Start */}
        <div className="p-5 rounded-3xl bg-card shadow-lg border border-border/50 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-coral/15 flex items-center justify-center text-sm font-bold text-coral">
              3
            </div>
            <h2 className="font-serif text-base font-bold text-charcoal">
              Start the App
            </h2>
          </div>

          <div className="p-3 rounded-2xl bg-secondary/50 space-y-3">
            <div>
              <p className="text-[10px] text-muted-foreground font-mono mb-1">
                # Terminal 1: Start the web app
              </p>
              <div className="bg-charcoal rounded-xl p-2.5 overflow-x-auto">
                <code className="text-[11px] text-coral font-mono">
                  bun run dev
                </code>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Opens at <strong>http://localhost:3000</strong>
              </p>
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground font-mono mb-1">
                # Terminal 2 (new window): Start WebSocket service
              </p>
              <div className="bg-charcoal rounded-xl p-2.5 overflow-x-auto">
                <code className="text-[11px] text-coral font-mono">
                  cd D:\Fluency\mini-services\ws-service
                </code>
              </div>
              <div className="bg-charcoal rounded-xl p-2.5 overflow-x-auto mt-1">
                <code className="text-[11px] text-coral font-mono">
                  bun run dev
                </code>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                WebSocket on <strong>port 3004</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Step 4: Use it */}
        <div className="p-5 rounded-3xl bg-card shadow-lg border border-border/50 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-coral/15 flex items-center justify-center text-sm font-bold text-coral">
              4
            </div>
            <h2 className="font-serif text-base font-bold text-charcoal">
              Use It!
            </h2>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Globe size={16} className="text-coral shrink-0 mt-0.5" />
              <p className="text-xs text-charcoal">
                Open{" "}
                <code className="bg-secondary px-1 rounded">
                  http://localhost:3000
                </code>{" "}
                in Chrome
              </p>
            </div>
            <div className="flex items-start gap-2">
              <PuzzlePiece size={16} className="text-coral shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-charcoal">Load the Chrome Extension</p>
                <p className="text-[10px] text-muted-foreground">
                  Go to{" "}
                  <code className="bg-secondary px-1 rounded">
                    chrome://extensions
                  </code>{" "}
                  → Enable Developer Mode → Load Unpacked → select the{" "}
                  <code className="bg-secondary px-1 rounded">
                    browser-extension
                  </code>{" "}
                  folder
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Terminal size={16} className="text-coral shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-charcoal">Connect the Extension</p>
                <p className="text-[10px] text-muted-foreground">
                  In the extension popup, enter{" "}
                  <code className="bg-secondary px-1 rounded">
                    http://localhost:3004
                  </code>{" "}
                  as the Server URL. Go to Watchtower tab → generate a room code →
                  enter it in the extension.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="p-5 rounded-3xl bg-butter/15 border border-butter/30 space-y-3">
          <h2 className="font-serif text-base font-bold text-charcoal flex items-center gap-2">
            <span>🔧</span> Troubleshooting
          </h2>

          <div className="space-y-2.5">
            <div className="flex items-start gap-2">
              <CaretRight
                size={12}
                className="text-muted-foreground shrink-0 mt-1"
              />
              <p className="text-[11px] text-muted-foreground">
                <strong className="text-charcoal">
                  &quot;bun not recognized&quot;
                </strong>{" "}
                → Run{" "}
                <code className="bg-secondary px-1 rounded text-[10px]">
                  powershell -c &quot;irm bun.sh/install.ps1 | iex&quot;
                </code>{" "}
                as Administrator, then restart PowerShell.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CaretRight
                size={12}
                className="text-muted-foreground shrink-0 mt-1"
              />
              <p className="text-[11px] text-muted-foreground">
                <strong className="text-charcoal">Path with &amp; fails</strong>{" "}
                → Use quotes:{" "}
                <code className="bg-secondary px-1 rounded text-[10px]">
                  cd &quot;D:\ponnu &amp; kunju\...&quot;
                </code>{" "}
                or rename to a simpler path like{" "}
                <code className="bg-secondary px-1 rounded text-[10px]">
                  D:\Fluency
                </code>
                .
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CaretRight
                size={12}
                className="text-muted-foreground shrink-0 mt-1"
              />
              <p className="text-[11px] text-muted-foreground">
                <strong className="text-charcoal">Port 3000 in use</strong> →
                Another app is using it. Change the port in{" "}
                <code className="bg-secondary px-1 rounded text-[10px]">
                  package.json
                </code>
                .
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CaretRight
                size={12}
                className="text-muted-foreground shrink-0 mt-1"
              />
              <p className="text-[11px] text-muted-foreground">
                <strong className="text-charcoal">
                  Extension &quot;websocket error&quot;
                </strong>{" "}
                → Make sure BOTH servers are running (web app on 3000 AND
                ws-service on 3004).
              </p>
            </div>
          </div>
        </div>

        {/* Back link */}
        <button
          onClick={() => (window.location.href = "/")}
          className="w-full py-3 rounded-xl bg-secondary text-charcoal text-sm font-medium hover:bg-secondary/80 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft size={16} weight="bold" />
          Back to Fluency
        </button>
      </main>
    </div>
  );
}
