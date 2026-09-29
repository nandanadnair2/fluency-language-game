import Dexie, { type EntityTable } from "dexie";

export type WordContext = 
  | "scanner" 
  | "stories" 
  | "watchtower" 
  | "restaurant" 
  | "street" 
  | "anime" 
  | "book" 
  | "shopping" 
  | "home" 
  | "work"
  | "other";

export interface VocabularyWord {
  id?: number;
  original: string;
  directTranslation: string;
  romanized: string;
  sourceLanguage: string;
  targetLanguage: string;
  savedAt: Date;
  xpEarned: number;
  reviewCount: number;
  context?: WordContext;
}

export interface CachedTranslation {
  id?: number;
  originalText: string;
  directTranslation: string;
  romanized: string;
  sourceLanguage: string;
  targetLanguage: string;
  cachedAt: Date;
}

class FluencyDB extends Dexie {
  vocabulary!: EntityTable<VocabularyWord, "id">;
  cache!: EntityTable<CachedTranslation, "id">;

  constructor() {
    super("FluencyDB");
    // Note: Adding 'context' column requires migration in production
    // For now we use version 2
    this.version(2).stores({
      vocabulary: "++id, original, directTranslation, savedAt, sourceLanguage, context",
      cache: "++id, originalText, cachedAt",
    });
  }
}

export const db = new FluencyDB();

// Vocabulary operations
export async function saveWord(word: Omit<VocabularyWord, "id">) {
  return await db.vocabulary.add(word);
}

export async function updateWordContext(id: number, context: WordContext) {
  return await db.vocabulary.update(id, { context });
}

export async function getAllWords(): Promise<VocabularyWord[]> {
  return await db.vocabulary.orderBy("savedAt").reverse().toArray();
}

export async function getWordsByContext(context: WordContext): Promise<VocabularyWord[]> {
  return await db.vocabulary.where("context").equals(context).sortBy("savedAt");
}

export async function deleteWord(id: number) {
  return await db.vocabulary.delete(id);
}

export async function getWordCount(): Promise<number> {
  return await db.vocabulary.count();
}

// Cache operations
export async function getCachedTranslation(
  originalText: string,
  targetLang: string
): Promise<CachedTranslation | undefined> {
  return await db.cache
    .where("originalText")
    .equals(originalText)
    .first();
}

export async function cacheTranslation(
  translation: Omit<CachedTranslation, "id">
) {
  return await db.cache.add(translation);
}

export async function clearOldCache(daysOld: number = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);
  return await db.cache.where("cachedAt").below(cutoff).delete();
}

// Context helpers
export const CONTEXT_LABELS: Record<WordContext, { label: string; icon: string; color: string }> = {
  scanner: { label: "Scanner", icon: "📷", color: "bg-coral/15 text-coral" },
  stories: { label: "Stories", icon: "📖", color: "bg-sage/15 text-sage" },
  watchtower: { label: "Watchtower", icon: "🎬", color: "bg-butter/20 text-butter" },
  restaurant: { label: "Restaurant", icon: "🍜", color: "bg-orange-100 text-orange-700" },
  street: { label: "Street", icon: "🚶", color: "bg-blue-100 text-blue-700" },
  anime: { label: "Anime", icon: "⛩️", color: "bg-pink-100 text-pink-700" },
  book: { label: "Book", icon: "📚", color: "bg-purple-100 text-purple-700" },
  shopping: { label: "Shopping", icon: "🛍️", color: "bg-green-100 text-green-700" },
  home: { label: "Home", icon: "🏠", color: "bg-yellow-100 text-yellow-700" },
  work: { label: "Work", icon: "💼", color: "bg-gray-100 text-gray-700" },
  other: { label: "Other", icon: "📝", color: "bg-secondary text-muted-foreground" },
};

export const CONTEXT_FILTERS: (WordContext | "all")[] = [
  "all", "scanner", "stories", "watchtower", "restaurant", "street", 
  "anime", "book", "shopping", "home", "work", "other"
];
