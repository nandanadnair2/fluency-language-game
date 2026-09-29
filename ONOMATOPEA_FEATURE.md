# Onomatopoeia Scanner Feature

## What It Does
When scanning text in Japanese, the app now automatically detects onomatopoeic words (オノマトペ) and displays them as beautiful, interactive cards.

## Technical Architecture
1. `src/lib/onomatopoeia.ts` — TypeScript type for onomatopoeia entries
2. `src/app/api/onomatopoeia/route.ts` — LLM-powered detection endpoint
3. `src/components/OnomatopoeiaCard.tsx` — Interactive card component with expand/collapse
4. Integrated into `ScannerTab.tsx` — automatically calls detection after translation

## Data Flow
```
Scan Image → VLM Extract Text → LLM Translate → LLM Detect Onomatopoeia → Show Cards
```

## UI Features
- Color-coded mood badges (excited=coral, calm=sage, etc.)
- Expandable cards showing example sentences
- Type badges: Giongo (sound) vs Gitaigo (state)
- Category tags: sound, emotion, appearance, movement
- "Add to Vocabulary" button for saving

## Example Output Format
```json
{
  "word": "わくわく",
  "reading": "waku-waku",
  "type": "gitaigo",
  "englishMeaning": "excited, thrilled, looking forward to something",
  "mood": "excited",
  "moodColor": "#FF7B5A",
  "category": "emotion",
  "exampleSentence": "旅行のことがわくわくして眠れない！",
  "exampleReading": "ryokou no koto ga waku-waku shite nemurenai!"
}
```

## How to Test
1. Run `bun run dev`
2. Go to Scanner tab
3. Click "Demo Scan" (no camera needed)
4. Look for purple-themed onomatopoeia cards below the translation cards
5. Click a card to expand and see example sentence
