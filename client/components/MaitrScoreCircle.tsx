import React, { useEffect, useState } from "react";

interface MaitrScoreCircleProps {
  score?: number;
  isLoading?: boolean;
}

export default function MaitrScoreCircle({ score = 0, isLoading = false }: MaitrScoreCircleProps) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (!isLoading && score > 0) {
      let current = 0;
      const increment = score / 50;
      const interval = setInterval(() => {
        current += increment;
        if (current >= score) {
          setDisplayScore(Math.round(score));
          clearInterval(interval);
        } else {
          setDisplayScore(Math.round(current));
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [score, isLoading]);

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="relative w-full flex justify-center items-center py-8">
      {/* Score circle with smooth fade-in */}
      <div className="flex flex-col items-center transition-all duration-500 opacity-100">
        <svg width="160" height="160" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r="45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          {/* Progress circle with gradient */}
          <defs>
            <linearGradient id="maitrGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
          <circle
            cx="80"
            cy="80"
            r="45"
            fill="none"
            stroke="url(#maitrGradient)"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>

        {/* Counter in the center */}
        <div className="absolute flex flex-col items-center justify-center">
          <div className="text-5xl font-black bg-gradient-to-r from-cyan-500 to-orange-500 bg-clip-text text-transparent">
            {displayScore}
          </div>
          <div className="text-xs font-medium text-gray-500 mt-1">Maitr Score</div>
        </div>
      </div>
    </div>
  );
}
