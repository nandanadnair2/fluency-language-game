# Interactive Stories Feature

## Overview
A new "Stories" tab in the Fluency app where users can read interactive Japanese stories with translations, audio, and comprehension quizzes.

## Files Created
- `src/components/StoriesTab.tsx` - Main stories component (782 lines)

## Features Implemented

### 1. Story List View
- 6 pre-built stories with varying difficulty levels
- Each story shows: title, Japanese title, description, level badge, chapter count, quiz count, XP reward
- Stories:
  - Cafe Order (カフェでの注文) - beginner, 30 XP
  - Train Ride (電車での旅) - beginner, 35 XP
  - At a Restaurant (レストランで) - intermediate, 45 XP
  - Weather Report (天気予報) - beginner, 25 XP
  - Shopping (買い物) - intermediate, 40 XP
  - Self Introduction (自己紹介) - beginner, 30 XP

### 2. Story Reader
- Chapter-by-chapter navigation
- Word-by-word display with clickable Japanese characters
- Toggle translation visibility per word
- Romaji pronunciation shown below translated words
- Previous/Next sentence navigation
- Audio playback button using Web Speech API (Japanese voice)
- Full sentence translation toggle

### 3. Comprehension Quiz
- 2 questions per story
- Multiple choice options
- XP rewards on completion (added to game state)
- Score tracking
- "Try Again" and "Back to Stories" options

### 4. Game Integration
- XP rewards for completing stories
- Quiz completion tracked in game state
- Completed stories marked with checkmark icon

## Navigation
- New "Stories" tab added to bottom navigation (between Watchtower and Profile)
- Book icon from @phosphor-icons/react

## Tech Stack
- React with TypeScript
- Framer Motion for animations
- Web Speech API for Japanese TTS
- Zustand for game state management

## Usage
1. Click "Stories" tab in bottom navigation
2. Select a story from the list
3. Read through chapters by clicking word buttons to reveal translations
4. Click speaker icon to hear pronunciation
5. Complete the comprehension quiz at the end
6. Earn XP for each story completed
