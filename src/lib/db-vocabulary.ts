import Dexie, { type EntityTable } from "dexie";

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

class LinguaScoutDB extends Dexie {
  vocabulary!: EntityTable<VocabularyWord, "id">;
  cache!: EntityTable<CachedTranslation, "id">;

  constructor() {
    super("LinguaScoutDB");
    this.version(1).stores({
      vocabulary: "++id, original, directTranslation, savedAt, sourceLanguage",
      cache: "++id, originalText, cachedAt",
    });
  }
}

export const db = new LinguaScoutDB();

// Vocabulary operations
export async function saveWord(word: Omit<VocabularyWord, "id">) {
  return await db.vocabulary.add(word);
}

export async function getAllWords(): Promise<VocabularyWord[]> {
  return await db.vocabulary.orderBy("savedAt").reverse().toArray();
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
