// Japanese to Romaji romanization mapping
const ROMAJI_MAP: Record<string, string> = {
  // Hiragana - vowels
  "あ": "a", "い": "i", "う": "u", "え": "e", "お": "o",
  // K row
  "か": "ka", "き": "ki", "く": "ku", "け": "ke", "こ": "ko",
  // S row
  "さ": "sa", "し": "shi", "す": "su", "せ": "se", "そ": "so",
  // T row
  "た": "ta", "ち": "chi", "つ": "tsu", "て": "te", "と": "to",
  // N row
  "な": "na", "に": "ni", "ぬ": "nu", "ね": "ne", "の": "no",
  // H row
  "は": "ha", "ひ": "hi", "ふ": "fu", "へ": "he", "ほ": "ho",
  // M row
  "ま": "ma", "み": "mi", "む": "mu", "め": "me", "も": "mo",
  // Y row
  "や": "ya", "ゆ": "yu", "よ": "yo",
  // R row
  "ら": "ra", "り": "ri", "る": "ru", "れ": "re", "ろ": "ro",
  // W row
  "わ": "wa", "を": "wo", "ん": "n",
};

// Common particles - these override the general mapping
const PARTICLE_MAP: Record<string, string> = {
  "は": "wa",
  "を": "wo",
  "へ": "e",
  "と": "to",
  "から": "kara",
  "まで": "made",
  "より": "yori",
  "も": "mo",
  "や": "ya",
};

// Common Japanese phrases with romaji and English translations
const PHRASES: Array<{jp: string; romaji: string; en: string}> = [
  {jp: "こんにちは", romaji: "kon-nichi-wa", en: "Hello / Good afternoon"},
  {jp: "こんばんは", romaji: "kon-ban-wa", en: "Good evening"},
  {jp: "おはよう", romaji: "o-hayou", en: "Good morning"},
  {jp: "おはようございます", romaji: "o-hayou go-zai-masu", en: "Good morning (polite)"},
  {jp: "さようなら", romaji: "sayou-nara", en: "Goodbye"},
  {jp: "ありがとう", romaji: "a-ri-ga-tou", en: "Thank you"},
  {jp: "ありがとうございます", romaji: "a-ri-ga-tou go-zai-masu", en: "Thank you very much"},
  {jp: "すみません", romaji: "su-mi-ma-sen", en: "Excuse me / Sorry"},
  {jp: "ごめんなさい", romaji: "go-men-na-sai", en: "I'm sorry"},
  {jp: "はい", romaji: "hai", en: "Yes"},
  {jp: "いいえ", romaji: "ii-e", en: "No"},
  {jp: "だいじょうぶ", romaji: "dai-jo-u-bu", en: "It's okay / No problem"},
  {jp: "お願いします", romaji: "onega-i shi-masu", en: "Please"},
  {jp: "はじめまして", romaji: "hajimemashite", en: "Nice to meet you"},
  {jp: "また", romaji: "mata", en: "Again / See you"},
  {jp: "どうも", romaji: "dou-mo", en: "Thank you / Nice to meet you"},
  {jp: "どういたしまして", romaji: "dou-i-ta-shi-ma-sen", en: "You're welcome"},
  {jp: "いただきます", romaji: "ita-da-ki-ma-su", en: "I humbly receive (before eating)"},
  {jp: "ごちそうさま", romaji: "go-chi-sou-sa-ma", en: "Thank you for the meal"},
  {jp: "お疲れ様です", romaji: "o-tska-re-sama desu", en: "Good work"},
  {jp: "おめでとうございます", romaji: "omedetou gozaimasu", en: "Congratulations"},
  {jp: "頑張って", romaji: "gan-ba-tte", en: "Do your best / Good luck"},
  {jp: "気をつけて", romaji: "ki-o tsu-ke-te", en: "Be careful"},
  {jp: "嬉しい", romaji: "u-reshi", en: "Happy / Glad"},
  {jp: "悲しい", romaji: "ka-na-shi", en: "Sad"},
  {jp: "怒っている", romaji: "i-ka-te i-ru", en: "Angry"},
  {jp: "怖い", romaji: "ko-wa-i", en: "Scary / Scared"},
  {jp: "面白い", romaji: "o-mo-ro-i", en: "Interesting / Fun"},
  {jp: "難しい", romaji: "mu-zu-kashi", en: "Difficult"},
  {jp: "簡単", romaji: "kan-tan", en: "Easy"},
  {jp: "楽しい", romaji: "tanoshii", en: "Fun / Enjoyable"},
  {jp: "今", romaji: "i-ma", en: "Now"},
  {jp: "今日", romaji: "kyou", en: "Today"},
  {jp: "昨日", romaji: "kinou", en: "Yesterday"},
  {jp: "明日", romaji: "ashita", en: "Tomorrow"},
  {jp: "毎日", romaji: "mainichi", en: "Every day"},
  {jp: "時々", romaji: "tokidoki", en: "Sometimes"},
  {jp: "よく", romaji: "yoku", en: "Often"},
  {jp: "大きい", romaji: "ookii", en: "Big / Large"},
  {jp: "小さい", romaji: "chiisai", en: "Small"},
  {jp: "新しい", romaji: "atarashii", en: "New"},
  {jp: "古い", romaji: "furui", en: "Old"},
  {jp: "良い", romaji: "ii", en: "Good"},
  {jp: "悪い", romaji: "warui", en: "Bad"},
  {jp: "高い", romaji: "takai", en: "Expensive / Tall"},
  {jp: "安い", romaji: "yasui", en: "Cheap"},
  {jp: "暑い", romaji: "atsui", en: "Hot (weather)"},
  {jp: "寒い", romaji: "samui", en: "Cold"},
  {jp: "好き", romaji: "suki", en: "Like"},
  {jp: "嫌い", romaji: "kirai", en: "Dislike"},
  {jp: "食べる", romaji: "ta-be-ru", en: "To eat"},
  {jp: "飲む", romaji: "no-mu", en: "To drink"},
  {jp: "行く", romaji: "i-ku", en: "To go"},
  {jp: "来る", romaji: "ku-ru", en: "To come"},
  {jp: "見る", romaji: "mi-ru", en: "To see / To watch"},
  {jp: "聞く", romaji: "ki-ku", en: "To hear / To listen"},
  {jp: "話す", romaji: "hana-su", en: "To speak"},
  {jp: "読む", romaji: "yo-mu", en: "To read"},
  {jp: "書く", romaji: "ka-ku", en: "To write"},
  {jp: "買う", romaji: "ka-u", en: "To buy"},
  {jp: "待つ", romaji: "ma-tsu", en: "To wait"},
  {jp: "使う", romaji: "tsu-ka-u", en: "To use"},
  {jp: "持つ", romaji: "mo-tsu", en: "To hold / To have"},
  {jp: "知る", romaji: "shi-ru", en: "To know"},
  {jp: "思う", romaji: "omo-u", en: "To think"},
  {jp: "言う", romaji: "iu", en: "To say"},
  {jp: "ある", romaji: "a-ru", en: "To exist (things)"},
  {jp: "いる", romaji: "i-ru", en: "To exist (living things)"},
  {jp: "できる", romaji: "de-ki-ru", en: "To be able to"},
  {jp: "わかる", romaji: "wa-ka-ru", en: "To understand"},
];

export function romanizeJapanese(text: string): string {
  // Check exact match first
  const phrase = PHRASES.find(p => p.jp === text);
  if (phrase) return phrase.romaji;
  
  // Try simple character-by-character romanization for unknown phrases
  let result = text;
  
  // First apply particle overrides
  for (const [jp, rom] of Object.entries(PARTICLE_MAP)) {
    result = result.replace(new RegExp(jp + '$'), rom);
  }
  
  // Then apply general mappings
  for (const [jp, rom] of Object.entries(ROMAJI_MAP)) {
    result = result.replace(new RegExp(jp, 'g'), rom);
  }
  
  // If no matches found, return placeholder
  if (result === text) return "[pronunciation]";
  return result;
}

export function translateJapanese(text: string): string {
  // Check exact match
  const phrase = PHRASES.find(p => p.jp === text);
  if (phrase) return phrase.en;
  
  // Try partial match for common patterns
  for (const p of PHRASES) {
    if (text.includes(p.jp)) return p.en;
  }
  
  return "[translation]";
}
