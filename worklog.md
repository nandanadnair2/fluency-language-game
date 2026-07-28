---
Task ID: 1-20
Agent: main-developer
Task: Build LinguaScout MVP - Immersive Language-Learning Web App

Work Log:
- Installed dependencies: dexie, canvas-confetti, @phosphor-icons/react
- Updated globals.css with full LinguaScout cozy gamer theme (cream, coral, sage, butter palette)
- Updated layout.tsx with Fraunces + Inter fonts, ThemeProvider
- Created Zustand game-state store with XP, streak, quests, levels
- Created Dexie.js vocabulary database for IndexedDB caching
- Updated Prisma schema for User/Progress/ScannedWord models
- Built CameraScanner component with vignette overlay, pulsating reticle, capture
- Built TranslationCards with 3 stacked spring-animated cards (Original, Translation, Romanized)
- Built XPSprout with plant-growing XP bar and leafy gradients
- Built DynamicIsland with floating pill that expands to full translation card
- Built StreakCard with 7-day stamp card (fire/star/leaf stamps)
- Built QuestBoard with 5 daily quests (Word Hunter, Bookworm, Couch Learner, etc.)
- Built LootDeck with search, expandable word details, delete
- Built LevelUpModal with quiz, timer, confetti, scoring
- Built XPBadge with floating "+5 XP" animation
- Built ScannerTab, WatchtowerTab, ProfileTab as tab views
- Built main page.tsx with tab navigation, sticky header, footer
- Created API routes: /api/scan, /api/translate, /api/srt
- Created WebSocket mini-service on port 3004 for streaming sync
- Created Chrome Extension (manifest.json, content.js, popup.html)
- Fixed Phosphor Icons v2 icon names (Scanner→Scan, Sprout→Plant)
- Fixed canvas-confetti SSR issue with dynamic import
- Fixed useRef import missing in LevelUpModal
- All lint checks pass

Stage Summary:
- Complete LinguaScout MVP with 3 tabs: Scanner, Watchtower, Profile
- Camera scanner with full viewport, vignette, animated reticle
- Demo scan works with mock Japanese translations
- Translation cards with spring animations and word saving
- Watchtower mode with room code generation and SRT upload
- Profile with XP sprout bar, streak card, quest board, loot deck, quiz
- IndexedDB vocabulary caching via Dexie.js
- Zustand state management with persist
- WebSocket mini-service for streaming sync
- Chrome Extension for subtitle scraping
