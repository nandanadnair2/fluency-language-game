"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { motion } from "framer-motion";
import {
  MagnifyingGlassPlus,
  Camera,
  CameraSlash,
} from "@phosphor-icons/react";

interface CameraScannerProps {
  onCapture: (imageData: string) => void;
  isScanning: boolean;
  setIsScanning: (scanning: boolean) => void;
  detected?: boolean;
}

export default function CameraScanner({
  onCapture,
  isScanning,
  setIsScanning,
  detected = false,
}: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          // AbortError is common when play() is interrupted by a new load
          // (e.g., rapid camera toggling) — non-critical, camera still works
          if ((playErr as DOMException).name !== 'AbortError') {
            console.warn('Camera play error:', playErr);
          }
        }
      }
      setCameraActive(true);
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError(
        "Camera access denied. Please allow camera permissions and try again."
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setIsScanning(true);
    onCapture(imageData);
  }, [onCapture, setIsScanning]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-3xl overflow-hidden bg-charcoal/5">
      {/* Camera feed */}
      <video
        ref={videoRef}
        className={`w-full h-full object-cover transition-all duration-500 ${
          cameraActive ? "opacity-100" : "opacity-0"
        }`}
        playsInline
        muted
      />

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Vignette overlay */}
      {cameraActive && (
        <div className="absolute inset-0 vignette-overlay pointer-events-none" />
      )}

      {/* Reticle - center */}
      {cameraActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            className="relative flex items-center justify-center"
            animate={detected ? { scale: 1.1 } : { scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
          >
            {/* Pulsating ring */}
            <div
              className={`absolute w-32 h-32 rounded-full border-2 transition-colors duration-500 ${
                detected
                  ? "border-mint/80"
                  : "border-white/30"
              }`}
              style={{
                animation: "pulse-ring 2s ease-in-out infinite",
              }}
            />
            {/* Second ring */}
            <div
              className={`absolute w-24 h-24 rounded-full border transition-colors duration-500 ${
                detected
                  ? "border-mint/50"
                  : "border-white/20"
              }`}
              style={{
                animation: "pulse-ring 2s ease-in-out infinite 0.5s",
              }}
            />
            {/* Magnifying glass icon */}
            <motion.div
              className="w-14 h-14 rounded-full glass-card flex items-center justify-center shadow-xl"
              animate={{
                y: detected ? [0, -4, 0] : [0, -8, 0],
              }}
              transition={{
                duration: detected ? 0.5 : 1.5,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
            >
              <MagnifyingGlassPlus
                size={28}
                weight="duotone"
                className={`${
                  detected ? "text-sage" : "text-charcoal/60"
                }`}
              />
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* Scanning indicator */}
      {isScanning && (
        <motion.div
          className="absolute top-4 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="px-4 py-2 rounded-full glass-card shadow-lg flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-coral animate-pulse" />
            <span className="text-sm font-medium text-charcoal">
              Analyzing...
            </span>
          </div>
        </motion.div>
      )}

      {/* Camera not active state */}
      {!cameraActive && !cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
          <motion.div
            className="w-20 h-20 rounded-full bg-coral/10 flex items-center justify-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Camera size={40} weight="duotone" className="text-coral" />
          </motion.div>
          <p className="text-muted-foreground text-center text-sm max-w-[240px]">
            Point your camera at text to scan and translate it instantly
          </p>
          <button
            onClick={startCamera}
            className="px-6 py-3 rounded-full bg-coral text-white font-medium shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center gap-2"
          >
            <Camera size={20} weight="bold" />
            Open Camera
          </button>
        </div>
      )}

      {/* Camera error state */}
      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
          <motion.div
            className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <CameraSlash size={40} weight="duotone" className="text-destructive" />
          </motion.div>
          <p className="text-muted-foreground text-center text-sm max-w-[240px]">
            {cameraError}
          </p>
          <button
            onClick={startCamera}
            className="px-6 py-3 rounded-full bg-secondary text-charcoal font-medium shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Bottom capture button */}
      {cameraActive && (
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={captureFrame}
            disabled={isScanning}
            className="w-16 h-16 rounded-full bg-coral text-white flex items-center justify-center shadow-2xl hover:shadow-[0_0_30px_rgba(255,123,90,0.4)] transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              animation: isScanning
                ? "glow-pulse 1s ease-in-out infinite"
                : "none",
            }}
          >
            {isScanning ? (
              <motion.div
                className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <Camera size={28} weight="bold" />
            )}
          </button>
        </motion.div>
      )}

      {/* Close camera button */}
      {cameraActive && (
        <button
          onClick={stopCamera}
          className="absolute top-4 right-4 w-10 h-10 rounded-full glass-card shadow-lg flex items-center justify-center hover:bg-white/60 transition-all active:scale-95"
        >
          <CameraSlash size={20} weight="bold" className="text-charcoal/60" />
        </button>
      )}
    </div>
  );
}
