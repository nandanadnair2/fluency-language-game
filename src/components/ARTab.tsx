"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  X,
  Sparkle,
  MapPin,
  Star,
  Plus,
  Check,
  DeviceMobile,
  Car,
  PottedPlant,
  Dog,
  Cat,
  Clock,
  Chair,
  Video,
  Laptop,
  Keyboard,
  Mouse,
  AppleLogo,
  SpeakerHigh,
} from "@phosphor-icons/react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import { useGameStore } from "@/lib/game-state";

// COCO class label -> Japanese word mapping
// Only the most common everyday objects get a word; the rest stay in English.
const JP_MAP: Record<string, { jp: string; romaji: string; color: string; icon?: React.ElementType | null }> = {
  person: { jp: "人", romaji: "hito", color: "bg-gray-medium", icon: null },
  bicycle: { jp: "自転車", romaji: "jitensha", color: "bg-sage", icon: null },
  car: { jp: "車", romaji: "kuruma", color: "bg-sage", icon: Car },
  motorbike: { jp: "バイク", romaji: "baiku", color: "bg-gray", icon: null },
  airplane: { jp: "飛行機", romaji: "hikōki", color: "bg-mint", icon: null },
  bus: { jp: "バス", romaji: "basu", color: "bg-butter", icon: null },
  train: { jp: "電車", romaji: "densha", color: "bg-gray-medium", icon: null },
  truck: { jp: "トラック", romaji: "torakku", color: "bg-coral", icon: null },
  boat: { jp: "船", romaji: "fune", color: "bg-mint", icon: null },
  cat: { jp: "猫", romaji: "neko", color: "bg-soft-pink", icon: Cat },
  dog: { jp: "犬", romaji: "inu", color: "bg-butter", icon: Dog },
  horse: { jp: "馬", romaji: "uma", color: "bg-butter", icon: null },
  sheep: { jp: "羊", romaji: "hitsuji", color: "bg-sage", icon: null },
  cow: { jp: "牛", romaji: "ushi", color: "bg-gray", icon: null },
  elephant: { jp: "象", romaji: "zō", color: "bg-gray-medium", icon: null },
  bear: { jp: "くま", romaji: "kuma", color: "bg-butter", icon: null },
  zebra: { jp: "シマウマ", romaji: "shimāma", color: "bg-gray-medium", icon: null },
  giraffe: { jp: "キリン", romaji: "kirin", color: "bg-butter", icon: null },
  bird: { jp: "鳥", romaji: "tori", color: "bg-mint", icon: null },
  bottle: { jp: "瓶", romaji: "bin", color: "bg-mint", icon: null },
  "wine glass": { jp: "グラス", romaji: "gurasu", color: "bg-soft-pink", icon: null },
  cup: { jp: "カップ", romaji: "kappu", color: "bg-coral", icon: null },
  fork: { jp: "フォーク", romaji: "fōku", color: "bg-gray-medium", icon: null },
  knife: { jp: "ナイフ", romaji: "naifu", color: "bg-gray", icon: null },
  spoon: { jp: "スプーン", romaji: "supūn", color: "bg-gray-medium", icon: null },
  bowl: { jp: "ボウル", romaji: "bōru", color: "bg-butter", icon: null },
  banana: { jp: "バナナ", romaji: "banana", color: "bg-butter", icon: null },
  apple: { jp: "りんご", romaji: "ringo", color: "bg-coral", icon: AppleLogo },
  sandwich: { jp: "サンドイッチ", romaji: "sandoitchi", color: "bg-butter", icon: null },
  "orange juice": { jp: "オレンジジュース", romaji: "orenji juusu", color: "bg-coral", icon: null },
  cheese: { jp: "チーズ", romaji: "chīzu", color: "bg-butter", icon: null },
  pizza: { jp: "ピザ", romaji: "piza", color: "bg-coral", icon: null },
  donut: { jp: "ドーナツ", romaji: "dōnatsu", color: "bg-coral", icon: null },
  cake: { jp: "ケーキ", romaji: "kēki", color: "bg-soft-pink", icon: null },
  chair: { jp: "椅子", romaji: "isu", color: "bg-butter", icon: Chair },
  couch: { jp: "ソファ", romaji: "sofa", color: "bg-mint", icon: null },
  "potted plant": { jp: "植物", romaji: "shokutsu", color: "bg-sage", icon: PottedPlant },
  bed: { jp: "ベッド", romaji: "beddo", color: "bg-soft-pink", icon: null },
  "dining table": { jp: "食卓", romaji: "shokutaku", color: "bg-butter", icon: null },
  toilet: { jp: "トイレ", romaji: "toire", color: "bg-gray", icon: null },
  television: { jp: "テレビ", romaji: "terebi", color: "bg-gray", icon: Video },
  laptop: { jp: "ノートパソコン", romaji: "nōto pasokon", color: "bg-mint", icon: Laptop },
  mouse: { jp: "マウス", romaji: "māsu", color: "bg-gray-medium", icon: Mouse },
  remote: { jp: "リモコン", romaji: "rimokon", color: "bg-gray-medium", icon: null },
  keyboard: { jp: "キーボード", romaji: "kībōdo", color: "bg-gray", icon: Keyboard },
  "cell phone": { jp: "携帯電話", romaji: "keitai denwa", color: "bg-gray", icon: DeviceMobile },
  microwave: { jp: "電子レンジ", romaji: "denshi renji", color: "bg-gray-medium", icon: null },
  oven: { jp: "オーブン", romaji: "ōbun", color: "bg-coral", icon: null },
  toaster: { jp: "トースター", romaji: "tōsuta", color: "bg-butter", icon: null },
  sink: { jp: "流し", romaji: "nagashi", color: "bg-mint", icon: null },
  refrigerator: { jp: "冷蔵庫", romaji: "reiko", color: "bg-mint", icon: null },
  clock: { jp: "時計", romaji: "tokei", color: "bg-butter", icon: Clock },
  vase: { jp: "花瓶", romaji: "kabin", color: "bg-soft-pink", icon: null },
  scissors: { jp: "はさみ", romaji: "hasami", color: "bg-gray-medium", icon: null },
  "teddy bear": { jp: "クマ", romaji: "kuma", color: "bg-butter", icon: Dog },
  "hair drier": { jp: "ヘアドライヤー", romaji: "heado-raiā", color: "bg-coral", icon: null },
  toothbrush: { jp: "歯ブラシ", romaji: "ha-burashi", color: "bg-mint", icon: null },
};

interface Detection {
  label: string;
  score: number;
  bbox: [number, number, number, number]; // x, y, w, h (pixels)
  jp?: string;
  romaji?: string;
  color?: string;
  icon?: React.ElementType;
}

interface SavedWord {
  id: string;
  label: string;
  jp: string;
  romaji: string;
  color: string;
  icon?: React.ElementType;
  savedAt: Date;
}

export default function ARTab() {
  const { addXP } = useGameStore();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const [arMode, setArMode] = useState<"scan" | "discover">("scan");
  const [showingEmpty, setShowingEmpty] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const detectLoopRef = useRef<number | null>(null);
  const savedLabelsRef = useRef<Set<string>>(new Set());

  // Speak a word in Japanese (Web Speech API, same as Watchtower)
  const speakJapanese = useCallback((text: string | undefined) => {
    if ("speechSynthesis" in window && text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ja-JP";
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Load the model
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setModelLoading(true);
      try {
        await tf.setBackend("webgl");
        await tf.ready();
        const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
        if (cancelled) return;
        modelRef.current = model;
        setModelReady(true);
      } catch (e) {
        console.error("COCO-SSD load failed", e);
      } finally {
        if (!cancelled) setModelLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Real detection loop
  const runDetection = useCallback(async () => {
    const video = videoRef.current;
    const model = modelRef.current;
    if (!video || !model || video.readyState < 2) return;
    try {
      const preds = await model.detect(video, 15, 0.55);
      const mapped: Detection[] = preds.map((p) => {
        const m = JP_MAP[p.class];
        return {
          label: p.class,
          score: p.score,
          bbox: p.bbox as [number, number, number, number],
          jp: m?.jp ?? p.class,
          romaji: m?.romaji ?? p.class,
          color: m?.color ?? "bg-gray-medium",
          icon: m?.icon ?? Star,
        };
      });
      setShowingEmpty(mapped.length === 0);
      setDetections(mapped);
    } catch (e) {
      // ignore per-frame errors
    }
  }, []);

  const startDetectionLoop = () => {
    if (detectLoopRef.current) clearInterval(detectLoopRef.current);
    detectLoopRef.current = window.setInterval(runDetection, 1200);
  };

  const stopDetectionLoop = () => {
    if (detectLoopRef.current) {
      clearInterval(detectLoopRef.current);
      detectLoopRef.current = null;
    }
  };

  const startCamera = async () => {
    try {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      // Wait for video to have a frame before attaching
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        if (modelReady) startDetectionLoop();
      });
    } catch (e) {
      console.error("Camera error", e);
      alert("Could not access camera. Please allow camera permission and retry.");
    }
  };

  const stopCamera = () => {
    stopDetectionLoop();
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setIsCameraActive(false);
    setDetections([]);
  };

  // When model becomes ready and camera is on, start detecting
  useEffect(() => {
    if (modelReady && isCameraActive) startDetectionLoop();
  }, [modelReady, isCameraActive, runDetection]);

  useEffect(() => {
    return () => stopDetectionLoop();
  }, []);

  const saveWord = (d: Detection) => {
    if (savedLabelsRef.current.has(d.label)) return;
    savedLabelsRef.current.add(d.label);
    const w: SavedWord = {
      id: Math.random().toString(36).substring(7),
      label: d.label,
      jp: d.jp!,
      romaji: d.romaji!,
      color: d.color!,
      icon: d.icon,
      savedAt: new Date(),
    };
    setSavedWords((prev) => [w, ...prev]);
    addXP(25);
  };

  // Compute % positions from pixel bbox
  const toPercent = (bbox: [number, number, number, number], vw: number, vh: number) => ({
    left: `${(bbox[0] / vw) * 100}%`,
    top: `${(bbox[1] / vh) * 100}%`,
    width: `${(bbox[2] / vw) * 100}%`,
    height: `${(bbox[3] / vh) * 100}%`,
  });

  const getDims = () => {
    const v = videoRef.current;
    if (!v) return { vw: 16, vh: 10 };
    return { vw: v.videoWidth || 16, vh: v.videoHeight || 10 };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkle size={28} className="text-accent" />
          AR Discovery
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setArMode("scan")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              arMode === "scan" ? "bg-accent text-background" : "bg-muted text-muted-foreground"
            }`}
          >
            <Camera size={16} className="inline mr-1" />
            Scan
          </button>
          <button
            onClick={() => setArMode("discover")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              arMode === "discover" ? "bg-accent text-background" : "bg-muted text-muted-foreground"
            }`}
          >
            <MapPin size={16} className="inline mr-1" />
            Discovered ({savedWords.length})
          </button>
        </div>
      </div>

      {arMode === "scan" ? (
        <div className="space-y-4">
          {/* Camera View */}
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4] max-h-[420px]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {isCameraActive && (
              <>
                {/* Corner brackets */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-3 left-3 w-10 h-10 border-l-2 border-t-2 border-accent/60" />
                  <div className="absolute top-3 right-3 w-10 h-10 border-r-2 border-t-2 border-accent/60" />
                  <div className="absolute bottom-3 left-3 w-10 h-10 border-l-2 border-b-2 border-accent/60" />
                  <div className="absolute bottom-3 right-3 w-10 h-10 border-r-2 border-b-2 border-accent/60" />
                </div>

                {/* Detection boxes */}
                {detections.map((d, i) => {
                  const { vw, vh } = getDims();
                  const pos = toPercent(d.bbox, vw, vh);
                  const IconComp = d.icon ?? Star;
                  return (
                    <div
                      key={`${d.label}-${i}`}
                      className="absolute pointer-events-none"
                      style={pos}
                    >
                      <div className="h-full border-2 border-white/80 rounded" />
                      <div
                        className={`${d.color} text-white px-2 py-1 rounded-lg shadow-lg flex items-center gap-1.5 text-sm -translate-y-6`}
                      >
                        <IconComp size={14} weight="bold" />
                        <span className="font-medium">{d.jp}</span>
                        <span className="opacity-75 text-xs">{Math.round(d.score * 100)}%</span>
                      </div>
                    </div>
                  );
                })}

                {/* Empty state */}
                {showingEmpty && modelReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                      No objects detected yet — try a chair, plant, book, or pet!
                    </div>
                  </div>
                )}

                {!modelReady && modelLoading && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs">
                    Loading AI model…
                  </div>
                )}
              </>
            )}

            {!isCameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
                <Camera size={56} className="text-accent" />
                <p className="text-lg font-medium">Real AI object detection</p>
                <p className="text-sm opacity-70 max-w-[80%] text-center">
                  Point your camera at real things — chairs, plants, pets, laptops — and Japanese words appear.
                </p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            {!isCameraActive ? (
              <button
                onClick={startCamera}
                className="flex-1 py-3.5 bg-accent text-background rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <Camera size={22} />
                Start AR Scan
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="flex-1 py-3.5 bg-charcoal text-cream rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <X size={22} />
                Stop Camera
              </button>
            )}
          </div>

          {/* Model status */}
          {modelLoading && (
            <p className="text-xs text-muted-foreground text-center">
              First run downloads the detection model (~5&nbsp;MB). One time only.
            </p>
          )}

          {/* Detected now */}
          {detections.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Check size={18} className="text-sage" />
                Detected Now — tap to save
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {detections.map((d, i) => {
                  const saved = savedWords.some((w) => w.label === d.label);
                  const IconComp = d.icon ?? Star;
                  return (
                    <div
                      key={`${d.label}-${i}`}
                      className={`p-3 rounded-xl transition-colors ${
                        saved ? "bg-mint/40 border border-sage/50 opacity-90" : "bg-muted hover:bg-muted/70"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${d.color}`}>
                          {saved ? <Check size={16} /> : <IconComp size={16} />}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); speakJapanese(d.jp); }}
                          title="Listen"
                          className="text-muted-foreground hover:text-accent transition-colors"
                        >
                          <SpeakerHigh size={18} />
                        </button>
                      </div>
                      <p className="text-sm font-medium">{d.jp}</p>
                      <p className="text-xs text-muted-foreground mb-2">{d.romaji}</p>
                      <button
                        onClick={() => saveWord(d)}
                        disabled={saved}
                        className={`w-full py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          saved
                            ? "bg-sage/20 text-charcoal cursor-default"
                            : "bg-accent text-background hover:opacity-90"
                        }`}
                      >
                        {saved ? "Saved" : "Save (+25 XP)"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="font-semibold">Your Discovered Words ({savedWords.length})</h3>
          {savedWords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkle size={44} className="mx-auto mb-3 opacity-50" />
              <p>No words discovered yet</p>
              <p className="text-sm">Scan real objects to discover Japanese words!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedWords.map((w) => {
                const IconComp = w.icon ?? Star;
                return (
                  <motion.div
                    key={w.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${w.color}`}>
                      <IconComp size={22} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{w.jp}</p>
                      <p className="text-sm text-muted-foreground">{w.romaji} · {w.label}</p>
                    </div>
                    <button
                      onClick={() => speakJapanese(w.jp)}
                      className="p-2.5 rounded-xl bg-coral/10 hover:bg-coral/20 transition-colors active:scale-95"
                      aria-label="Listen to pronunciation"
                    >
                      <SpeakerHigh size={20} weight="fill" className="text-coral" />
                    </button>
                    <span className="text-xs text-accent font-medium">+25 XP</span>
                  </motion.div>
                );
              })}
              <button
                onClick={() => {
                  setSavedWords([]);
                  savedLabelsRef.current = new Set();
                }}
                className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear Discovery History
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
