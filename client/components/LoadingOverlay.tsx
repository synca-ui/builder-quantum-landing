import React, { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";

interface Props {
  visible: boolean;
  messages?: string[];
  onCancel?: () => void;
}

export default function LoadingOverlay({ visible, messages = [], onCancel }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setIndex(0);
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % Math.max(1, messages.length));
    }, 2000);
    return () => clearInterval(interval);
  }, [visible, messages.length]);

  const progress = useMemo(() => {
    if (messages.length === 0) return 0;
    const pct = Math.round(((index + 1) / messages.length) * 100);
    return pct;
  }, [index, messages.length]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={visible}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-white/50 via-white/40 to-gray-100/50 backdrop-blur-md"
    >
      <style>{`
        @keyframes pulse-star {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.85; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .pulse-star {
          animation: pulse-star 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .shimmer-effect {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 2s infinite;
        }
      `}</style>

      <div className="max-w-md w-full mx-4 p-8 bg-white/95 rounded-3xl shadow-2xl border border-white/40 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-32 h-32 bg-gradient-to-br from-teal-400 to-transparent rounded-full blur-2xl" />
          <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-gradient-to-br from-orange-400 to-transparent rounded-full blur-2xl" />
        </div>

        <div className="flex flex-col items-center text-center gap-6 relative z-10">
          {/* Star Icon with enhanced pulse */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-100 to-orange-100 rounded-full opacity-20 blur-lg" />
            <div className="pulse-star">
              <Star className="w-20 h-20 text-gradient" strokeWidth={1.5} />
            </div>
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gradient-to-r from-teal-400 to-purple-400 rounded-full animate-bounce shadow-lg" />
          </div>

          {/* Headline */}
          <div>
            <h3 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-teal-600 via-purple-600 to-orange-600 bg-clip-text text-transparent">
              Maitr analysiert…
            </h3>
            <p className="text-xs md:text-sm text-gray-500 mt-2 font-medium">
              Dies kann einige Sekunden dauern
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full space-y-3">
            <div className="relative h-2 rounded-full bg-gradient-to-r from-gray-200 to-gray-100 overflow-hidden">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-cyan-400 via-purple-400 to-orange-400 shadow-lg shadow-orange-400/30 transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Status Message */}
            <div className="h-8 flex items-center justify-center">
              <div
                key={index}
                className="text-sm font-medium text-gray-700 animate-in fade-in duration-300"
              >
                {messages.length > 0 ? messages[index] : "Analysiere…"}
              </div>
            </div>
          </div>

          {/* Cancel Button */}
          <button
            onClick={onCancel}
            className="mt-2 px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            aria-label="Cancel analysis"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
