import React, { useEffect, useState, useRef } from "react";

interface MaitrScoreCircleProps {
  score: number;      // 0 wenn noch kein Score
  isLoading: boolean; // true während n8n läuft
}

export default function MaitrScoreCircle({ score, isLoading }: MaitrScoreCircleProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const animationRef = useRef<number | null>(null);

  const RADIUS = 48;
  const STROKE = 7;
  const SIZE = 160;
  const circumference = 2 * Math.PI * RADIUS;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    if (isLoading || score <= 0) {
      setDisplayScore(0);
      setProgress(0);
      setHasAnimated(false);
      return;
    }

    setHasAnimated(true);
    const duration = 1600;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out

      setDisplayScore(Math.round(eased * score));
      setProgress(eased * score);

      if (t < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [score, isLoading]);

  const isEmpty = !isLoading && score <= 0;

  return (
    <div className="flex justify-center items-center py-8">
      <div style={{ position: "relative", width: SIZE, height: SIZE }}>

        {/* SVG Ring */}
        <svg width={SIZE} height={SIZE} style={{ display: "block" }}>
          <defs>
            <linearGradient id="maitrGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
            <filter id="arcGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={isEmpty ? "#f0f0f0" : "#e5e7eb"}
            strokeWidth={isEmpty ? 5 : STROKE}
            style={{ transition: "stroke 0.4s ease, stroke-width 0.4s ease" }}
          />

          {/* Progress arc — nur wenn Score vorhanden */}
          {hasAnimated && (
            <g style={{ transform: "rotate(-90deg)", transformOrigin: `${SIZE / 2}px ${SIZE / 2}px` }}>
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="url(#maitrGradient)"
                strokeWidth={STROKE}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                filter="url(#arcGlow)"
                style={{ transition: "stroke-dashoffset 0.08s linear" }}
              />
            </g>
          )}
        </svg>

        {/* Center overlay */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ pointerEvents: "none" }}
        >
          {/* LOADING */}
          {isLoading && (
            <div style={{
              width: "24px",
              height: "24px",
              border: "2.5px solid #e5e7eb",
              borderTop: "2.5px solid #06b6d4",
              borderRadius: "50%",
              animation: "maitrSpin 0.6s linear infinite",
            }} />
          )}

          {/* EMPTY — kein Score vorhanden */}
          {isEmpty && (
            <>
              <div className="text-4xl font-bold text-gray-300" style={{ lineHeight: 1 }}>0</div>
              <div className="text-xs font-medium text-gray-400 mt-1">Maitr Score</div>
            </>
          )}

          {/* SCORE — animiert */}
          {hasAnimated && (
            <>
              <div
                className="text-5xl font-black bg-gradient-to-r from-cyan-500 to-orange-500 bg-clip-text text-transparent"
                style={{
                  lineHeight: 1,
                  opacity: 1,
                  transform: "scale(1)",
                  transition: "opacity 0.45s ease, transform 0.45s ease",
                }}
              >
                {displayScore}
              </div>
              <div className="text-xs font-medium text-gray-500 mt-1">Maitr Score</div>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes maitrSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}