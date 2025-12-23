import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";

interface Props {
  visible: boolean;
  messages?: string[];
  onCancel?: () => void;
}

export default function LoadingOverlay({ visible, messages = [], onCancel }: Props) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setMessageIndex(0);
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % Math.max(1, messages.length));
    }, 2000);
    return () => clearInterval(interval);
  }, [visible, messages.length]);

  return (
    <>
      <style>{`
        @keyframes rotate-star {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }

        @keyframes fade-text {
          0% {
            opacity: 0;
            transform: translateY(4px);
          }
          50% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-4px);
          }
        }

        .star-rotate {
          animation: rotate-star 4s linear infinite;
        }

        .glow-pulse {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .text-fade {
          animation: fade-text 2s ease-in-out infinite;
        }
      `}</style>

      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-500 ${
          visible ? "opacity-100 backdrop-blur-sm" : "opacity-0 pointer-events-none"
        }`}
        style={{
          backgroundColor: visible ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0)",
        }}
      >
        <div
          className={`flex flex-col items-center gap-8 transition-all duration-500 ${
            visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          {/* Rotating Star with Cyan-Orange Glow */}
          <div className="relative w-32 h-32 flex items-center justify-center">
            {/* Outer glow ring - cyan to orange gradient */}
            <div className="absolute inset-0 rounded-full glow-pulse bg-gradient-to-br from-cyan-400 via-purple-400 to-orange-400 blur-2xl opacity-40" />

            {/* Middle glow */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-300 to-orange-300 blur-lg opacity-20" />

            {/* Star icon rotating */}
            <Star
              className="star-rotate w-16 h-16 text-cyan-500 relative z-10"
              fill="currentColor"
              strokeWidth={0.5}
            />
          </div>

          {/* Animated Text Loop */}
          <div className="h-12 flex items-center justify-center">
            <div
              key={messageIndex}
              className="text-center text-lg font-semibold bg-gradient-to-r from-cyan-600 to-orange-500 bg-clip-text text-transparent animate-in fade-in-0 duration-300"
            >
              {messages.length > 0 ? messages[messageIndex] : "Maitr is analyzing…"}
            </div>
          </div>

          {/* Optional Cancel Button */}
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100/50 rounded-lg transition-all duration-200 backdrop-blur-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </>
  );
}
