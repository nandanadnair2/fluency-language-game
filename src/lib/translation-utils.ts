export interface TranslationResponse {
  original: string;
  directTranslation: string;
  romanized: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

// Japanese-only mock translations — focused learning experience
const MOCK_WORDS: TranslationResponse[] = [
  {
    original: "こんにちは",
    directTranslation: "Hello / Good afternoon",
    romanized: "kon-nee-chee-WAH",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.95,
  },
  {
    original: "ありがとうございます",
    directTranslation: "Thank you very much",
    romanized: "ah-ree-GAH-toh goh-zah-ee-MAHS",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.97,
  },
  {
    original: "すみません",
    directTranslation: "Excuse me / I'm sorry",
    romanized: "soo-mee-MAH-sen",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.96,
  },
  {
    original: "おはようございます",
    directTranslation: "Good morning (polite)",
    romanized: "oh-hah-YOH goh-zah-ee-MAHS",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.95,
  },
  {
    original: "いただきます",
    directTranslation: "Let's eat (said before meals)",
    romanized: "ee-tah-dah-kee-MAHS",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.93,
  },
  {
    original: "これはなんですか",
    directTranslation: "What is this?",
    romanized: "koh-reh WAH nahn DEH-soo-kah",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.94,
  },
  {
    original: "お元気ですか",
    directTranslation: "How are you?",
    romanized: "oh-GEN-kee DEH-soo-kah",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.96,
  },
  {
    original: "大丈夫です",
    directTranslation: "It's okay / I'm fine",
    romanized: "dai-joh-BU DEH-soo",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.93,
  },
  {
    original: "美味しいです",
    directTranslation: "It's delicious!",
    romanized: "oh-ee-shee-DEH-soo",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.95,
  },
  {
    original: "待ってください",
    directTranslation: "Please wait",
    romanized: "MAT-teh koo-dah-sai",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.94,
  },
  {
    original: "駅はどこですか",
    directTranslation: "Where is the station?",
    romanized: "EH-kee WAH doh-ko DEH-soo-kah",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.92,
  },
  {
    original: "いらっしゃいませ",
    directTranslation: "Welcome (shop greeting)",
    romanized: "ee-RAH-shah-ee-mah-seh",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.91,
  },
  {
    original: "お疲れ様です",
    directTranslation: "Good work / Thanks for your effort",
    romanized: "oh-TSU-kah-reh-sah-mah DEH-soo",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.93,
  },
  {
    original: "勉強しています",
    directTranslation: "I am studying",
    romanized: "ben-kyoh-SHEE-teh ee-mah-soo",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.92,
  },
  {
    original: "日本語が話せます",
    directTranslation: "I can speak Japanese",
    romanized: "nee-HON-goh GAH hah-seh-mah-soo",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.90,
  },
  {
    original: "気をつけて",
    directTranslation: "Take care / Be careful",
    romanized: "kee oh TSOO-keh-teh",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.91,
  },
  {
    original: "お願いします",
    directTranslation: "Please (requesting something)",
    romanized: "oh-neh-gah-ee SHEE-mah-soo",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.95,
  },
  {
    original: "分かりません",
    directTranslation: "I don't understand",
    romanized: "wah-kah-ree-mah-SEN",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.96,
  },
  {
    original: "しあわせです",
    directTranslation: "I am happy",
    romanized: "shee-ah-wah-seh DEH-soo",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.94,
  },
  {
    original: "頑張ってください",
    directTranslation: "Do your best / Keep it up!",
    romanized: "gan-BAH-tteh koo-dah-sai",
    sourceLanguage: "ja",
    targetLanguage: "en",
    confidence: 0.95,
  },
];

let mockIndex = 0;

export function getMockTranslation(): TranslationResponse {
  const word = MOCK_WORDS[mockIndex % MOCK_WORDS.length];
  mockIndex++;
  return { ...word };
}

// Get a random translation (for variety)
export function getRandomTranslation(): TranslationResponse {
  const word = MOCK_WORDS[Math.floor(Math.random() * MOCK_WORDS.length)];
  return { ...word };
}

export const LANGUAGE_PAIRS: Record<
  string,
  { source: string; target: string }
> = {
  "ja-en": { source: "Japanese", target: "English" },
};

export const DEFAULT_LANGUAGE = "ja-en";
