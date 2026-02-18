import React, { useEffect, useRef, useState } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";

// ── Adjust these import paths to wherever you store your Lottie JSON files ──
import loaderData from "../assets/Loader.json";
import loaderCatData from "../assets/Loadercat.json";
import prepareFoodData from "../assets/PrepareFood.json"

interface Props {
  visible: boolean;
  messages?: string[];
  onCancel?: () => void;
}

const ANIMATIONS = [loaderData, loaderCatData, prepareFoodData];

function randomIndex(exclude?: number): number {
  const pool = ANIMATIONS.map((_, i) => i).filter((i) => i !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function LoadingOverlay({ visible, messages = [], onCancel }: Props) {
  const [animIndex, setAnimIndex] = useState<number>(() => randomIndex());
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [fadeAnim, setFadeAnim] = useState(true);
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    if (!visible) {
      setProgress(0);
      setMessageIndex(0);
      return;
    }

    setAnimIndex(randomIndex());
    setFadeAnim(true);

    // Progress bar — stalls at ~92 % until real completion
    let p = 0;
    const progressInterval = setInterval(() => {
      p += Math.random() * 2.5 + 0.4;
      if (p >= 92) { p = 92; clearInterval(progressInterval); }
      setProgress(p);
    }, 110);

    // Message rotation
    setMessageIndex(0);
    const msgInterval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % Math.max(1, messages.length));
    }, 2400);

    // Animation rotation — crossfade every 4 s
    const animInterval = setInterval(() => {
      setFadeAnim(false);
      setTimeout(() => {
        setAnimIndex((prev) => randomIndex(prev));
        setFadeAnim(true);
      }, 350);
    }, 4000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(msgInterval);
      clearInterval(animInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, messages.length]);

  return (
    <>
      <style>{`
        @keyframes bar-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes bar-glow {
          0%, 100% { box-shadow: 0 0 8px 2px rgba(6,182,212,0.45), 0 0 22px 5px rgba(249,115,22,0.18); }
          50%       { box-shadow: 0 0 16px 4px rgba(6,182,212,0.65), 0 0 32px 9px rgba(249,115,22,0.32); }
        }
        @keyframes msg-slide {
          0%   { opacity: 0; transform: translateY(6px);  }
          12%  { opacity: 1; transform: translateY(0);    }
          88%  { opacity: 1; transform: translateY(0);    }
          100% { opacity: 0; transform: translateY(-6px); }
        }

        .bar-fill {
          background: linear-gradient(90deg, #06b6d4 0%, #818cf8 45%, #f97316 80%, #06b6d4 100%);
          background-size: 200% auto;
          animation: bar-shimmer 1.8s linear infinite, bar-glow 2.2s ease-in-out infinite;
        }
        .bar-track {
          background: linear-gradient(180deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%);
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.10), inset 0 -1px 2px rgba(255,255,255,0.8);
        }
        .msg-cycle {
          animation: msg-slide 2.4s ease-in-out infinite;
        }
        .lottie-wrap {
          transition: opacity 0.35s ease;
        }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-500 ${visible
          ? "opacity-100 backdrop-blur-sm pointer-events-auto"
          : "opacity-0 pointer-events-none"
          }`}
        style={{ backgroundColor: visible ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0)" }}
      >
        <div
          className={`flex flex-col items-center gap-8 w-80 transition-all duration-500 ${visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
        >

          {/* ── Lottie ── */}
          <div
            className="lottie-wrap w-52 h-52 flex items-center justify-center"
            style={{ opacity: fadeAnim ? 1 : 0 }}
          >
            <Lottie
              key={animIndex}
              lottieRef={lottieRef}
              animationData={ANIMATIONS[animIndex]}
              loop
              autoplay
              style={{ width: "100%", height: "100%" }}
            />
          </div>

          {/* ── Progress Bar ── */}
          <div className="w-full flex flex-col gap-2 px-1">
            {/* Track */}
            <div className="relative w-full h-5 rounded-full bar-track overflow-hidden">
              {/* Fill */}
              <div
                className="absolute left-0 top-0 h-full rounded-full bar-fill transition-all duration-300 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              >
                {/* 3-D top highlight */}
                <div
                  className="absolute top-1 left-2 right-3 h-1.5 rounded-full opacity-35"
                  style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.95), transparent)" }}
                />
                {/* Leading-edge glow cap */}
                <div
                  className="absolute right-0 top-0 w-5 h-full rounded-full"
                  style={{ background: "radial-gradient(ellipse at center, rgba(255,255,255,0.85) 0%, transparent 70%)" }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px] font-semibold px-0.5">
              <span className="text-gray-400 tracking-widest uppercase">Analyzing</span>
              <span className="bg-gradient-to-r from-cyan-500 to-orange-400 bg-clip-text text-transparent tabular-nums">
                {Math.round(progress)}%
              </span>
            </div>
          </div>

          {/* ── Cycling Message ── */}
          {messages.length > 0 && (
            <div className="h-6 flex items-center justify-center overflow-hidden w-full">
              <p
                key={messageIndex}
                className="msg-cycle text-sm text-gray-500 font-medium text-center"
              >
                {messages[messageIndex]}
              </p>
            </div>
          )}

          {/* ── Cancel ── */}
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-2 text-sm font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-100/60 rounded-lg transition-all duration-200"
            >
              Cancel
            </button>
          )}

        </div>
      </div>
    </>
  );
}