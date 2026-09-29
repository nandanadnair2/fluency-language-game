# Fluency — Learn Languages Like a Game

A full-stack gamified language-learning app for Japanese. Scan real-world objects, read interactive stories, play kana games, and level up with XP — built with Next.js, Prisma, and SQLite.

## Features

- **Object Scanner** — point your camera at anything; COCO-SSD identifies the object and returns the word in Japanese with audio and a live AR tagging overlay
- **Watchtower** — paste any text for word-by-word translation with audio narration
- **Interactive Stories** — 6 stories, 14 chapters, with Japanese text, English translations, and comprehension quizzes
- **Language Games** — Hiragana/Katakana quizzes and speed modes across 92 characters, onomatopoeia cards, and a 10-word / 3-minute challenge mode
- **Spaced-Repetition Loot Deck** — vocabulary cards resurface by context to reinforce learning
- **Social** — accounts (custom session auth), friends, shared decks, reviews, and a leaderboard
- **Progress Analytics** — daily words, XP trends, level-ups, streaks, and context breakdowns

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Next.js API routes, 23 endpoints |
| Database | Prisma ORM + SQLite (8 relational models) |
| Auth | Custom session auth (bcrypt + HttpOnly session tokens, 7-day expiry) |
| ML | TensorFlow.js + COCO-SSD (~80 object classes, runs in-browser) |
| Client storage | Dexie (IndexedDB) for vocabulary history |

## Getting Started

```bash
# Install dependencies
bun install

# Set up the database (create prisma/dev.db from prisma/schema.prisma)
cp .env.example .env
bun run db:push

# Run the dev server
bun run dev        # http://localhost:3000
```

## Production

```bash
# The build script also copies static assets into the standalone output
npm run build

# Serve the standalone build
HOSTNAME=0.0.0.0 NODE_ENV=production bun .next/standalone/server.js
```

## Project Structure

```
src/
  app/          Pages, layout, and 23 API routes (auth, decks, friends, stats, scan…)
  components/   UI components (ScannerTab, WatchtowerTab, StoriesTab, SocialTab, …)
  lib/          Auth context, game state (Zustand), Dexie vocab DB, helpers
prisma/
  schema.prisma Database schema (users, sessions, friends, decks, reviews)
mini-services/  Companion WebSocket service
```

## Notes

- The AI scan/transcribe endpoints require a `z-ai-config` file; without it they fall back to demo mode so the UI never breaks.
- Japanese audio narration uses the Web Speech API (`ja-JP`).