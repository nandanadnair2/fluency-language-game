export interface TranslationResponse {
  original: string;
  directTranslation: string;
  romanized: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

// Mock translations for immediate UI feedback
export const MOCK_TRANSLATIONS: { [key: string]: TranslationResponse } = {
  hola: {
    original: "Hola",
    directTranslation: "Hello",
    romanized: "OH-lah",
    sourceLanguage: "es",
    targetLanguage: "en",
    confidence: 0.99,
  },
  gracias: {
    original: "Gracias",
    directTranslation: "Thank you",
    romanized: "GRAH-see-ahs",
    sourceLanguage: "es",
    targetLanguage: "en",
    confidence: 0.99,
  },
  agua: {
    original: "Agua",
    directTranslation: "Water",
    romanized: "AH-gwah",
    sourceLanguage: "es",
    targetLanguage: "en",
    confidence: 0.98,
  },
  bonjour: {
    original: "Bonjour",
    directTranslation: "Hello / Good day",
    romanized: "bohn-ZHOOR",
    sourceLanguage: "fr",
    targetLanguage: "en",
    confidence: 0.99,
  },
  merci: {
    original: "Merci",
    directTranslation: "Thank you",
    romanized: "mehr-SEE",
    sourceLanguage: "fr",
    targetLanguage: "en",
    confidence: 0.99,
  },
};

const MOCK_WORDS = [
  {
    original: "Konnichiwa",
    directTranslation: "Hello / Good afternoon",
    romanized: "kon-nee-chee-WAH",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.95,
  },
  {
    original: "Arigatou gozaimasu",
    directTranslation: "Thank you very much",
    romanized: "ah-ree-GAH-toh goh-zah-ee-MAHS",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.97,
  },
  {
    original: "Sumimasen",
    directTranslation: "Excuse me / I'm sorry",
    romanized: "soo-mee-MAH-sen",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.96,
  },
  {
    original: "Ohayou gozaimasu",
    directTranslation: "Good morning",
    romanized: "oh-hah-YOH goh-zah-ee-MAHS",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.95,
  },
  {
    original: "Itadakimasu",
    directTranslation: "Let's eat (polite)",
    romanized: "ee-tah-dah-kee-MAHS",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.93,
  },
  {
    original: "Kore wa nan desu ka",
    directTranslation: "What is this?",
    romanized: "KOH-reh wah nahn DEH-soo kah",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.94,
  },
];

let mockIndex = 0;

export function getMockTranslation(): TranslationResponse {
  const word = MOCK_WORDS[mockIndex % MOCK_WORDS.length];
  mockIndex++;
  return word;
}

export const LANGUAGE_PAIRS: Record<
  string,
  { source: string; target: string }
> = {
  "es-en": { source: "Spanish", target: "English" },
  "fr-en": { source: "French", target: "English" },
  "ja-en": { source: "Japanese", target: "English" },
  "de-en": { source: "German", target: "English" },
  "it-en": { source: "Italian", target: "English" },
  "zh-en": { source: "Chinese", target: "English" },
};
