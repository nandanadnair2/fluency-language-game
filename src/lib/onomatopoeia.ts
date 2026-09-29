export interface OnomatopoeiaEntry {
  word: string;
  reading: string;
  type: "giongo" | "gitaigo" | "gitaigo";
  englishMeaning: string;
  mood: "excited" | "calm" | "sad" | "energetic" | "eerie" | "peaceful" | "sudden" | "gentle" | "noisy" | "soft";
  moodColor: string;
  category: string; // sound, emotion, appearance, movement
  exampleSentence?: string;
  exampleReading?: string;
}
