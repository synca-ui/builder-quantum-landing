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
    }, 1600);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm"
    >
      <div className="max-w-md w-full p-8 bg-white/90 rounded-2xl shadow-xl border border-gray-100">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="relative">
            <div className="animate-pulse">
              <Star className="w-20 h-20 text-gradient" />
            </div>
            <div className="absolute -top-2 -right-2 w-3 h-3 bg-gradient-to-r from-teal-400 to-purple-400 rounded-full animate-bounce" />
          </div>

          <div>
            <h3 className="text-2xl font-extrabold">Maitr analysiert...</h3>
            <p className="text-sm text-gray-600 mt-1">Dies kann einige Sekunden dauern — bitte einen Moment Geduld.</p>
          </div>

          <div className="w-full">
            <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-cyan-400 to-orange-400 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-3 text-sm text-gray-700 h-6">
              {messages.length > 0 ? messages[index] : "Analysiere ..."}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="text-sm text-gray-600 underline"
              aria-label="Cancel analysis"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
