# Language Games Feature

## Overview
Japanese character recognition games for practicing Hiragana and Katakana.

## Features
- **Three Game Types**: Hiragana, Katakana, Mixed
- **Two Modes**: Quiz (10 questions) and Speed (60 seconds)
- **XP Rewards**: Earn XP based on accuracy, streak, and time
- **Hint System**: Toggle to see romaji and meaning
- **Visual Feedback**: Green checkmark for correct, red X for wrong
- **Star Rating**: 3-star system based on performance

## Game Flow
1. Select character set (Hiragana/Katakana/Mixed)
2. Select game mode (Quiz/Speed)
3. Answer questions by selecting correct romaji
4. See results with XP earned

## XP Calculation
- Base: 50 XP
- Accuracy bonus: (correct/total) × 50 XP
- Streak bonus: max_streak × 5 XP
- Time bonus (speed mode): remaining_seconds × 2 XP

## Files
- `src/components/LanguageGamesTab.tsx` - Main game component
- Tab added to main page with GameController icon

## Notes
- Uses same color palette as app (#E56515, #FBA45C)
- Integrated with existing XP/streak system
- All 46 Hiragana and Katakana characters included
- Each character has mnemonic meaning for memorization
