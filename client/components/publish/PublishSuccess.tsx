/**
 * Die Erfolgsansicht des Veröffentlichens – Fortschritt, Konfetti, QR-Code.
 *
 * Diese Bausteine standen ursprünglich nur lokal in PublishStep.tsx. Der
 * automatische Modus veröffentlicht inzwischen ebenfalls und braucht dieselbe
 * Ansicht. Eine zweite Nachbildung dort liefe unweigerlich auseinander – genau
 * diese Fehlerklasse (Vorschau zeigt etwas anderes als die veröffentlichte
 * Seite) hat dieses Projekt schon einmal teuer bezahlt. Deshalb liegt die
 * Ansicht hier und wird von beiden Wegen importiert.
 *
 * Verhalten unverändert übernommen: Das QR-Modal blendet sich 1,5 Sekunden
 * nach dem Erfolg von selbst ein ("direkt fürs Handy"), das Konfetti nach
 * 4 Sekunden aus.
 */
import { useState, useEffect, memo } from "react";
import {
  Rocket,
  Check,
  Eye,
  Home,
  AlertCircle,
  ExternalLink,
  Copy,
  Share2,
  Sparkles,
  Globe,
  Database,
  Route,
  PartyPopper,
  Smartphone,
  X,
} from "lucide-react";
import QRCode from "@/components/qr/QRCode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DeploymentStage } from "@/lib/deployment";

// Progress stage configuration
export const PUBLISH_STAGES: {
  stage: DeploymentStage;
  label: string;
  icon: React.ReactNode;
}[] = [
    {
      stage: "validating",
      label: "Daten werden versiegelt...",
      icon: <Database className="w-5 h-5" />,
    },
    {
      stage: "checking_subdomain",
      label: "Subdomain wird geprüft...",
      icon: <Globe className="w-5 h-5" />,
    },
    {
      stage: "persisting",
      label: "Konfiguration wird gespeichert...",
      icon: <Database className="w-5 h-5" />,
    },
    {
      stage: "routing",
      label: "Subdomain wird geroutet...",
      icon: <Route className="w-5 h-5" />,
    },
    {
      stage: "complete",
      label: "Deine Web-App geht live!",
      icon: <Sparkles className="w-5 h-5" />,
    },
  ];

// Confetti component
export const Confetti = memo(function Confetti() {
  const [particles, setParticles] = useState<
    Array<{
      id: number;
      x: number;
      delay: number;
      color: string;
      size: number;
    }>
  >([]);

  useEffect(() => {
    const colors = [
      "#14b8a6",
      "#a855f7",
      "#f97316",
      "#22c55e",
      "#3b82f6",
      "#ec4899",
    ];
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: `${p.x}%`,
            top: "-20px",
            animationDelay: `${p.delay}s`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
});

// Publishing progress component
export const PublishingProgress = memo(function PublishingProgress({
  currentStage,
  error,
}: {
  currentStage: DeploymentStage;
  error?: string;
}) {
  const currentIndex = PUBLISH_STAGES.findIndex(
    (s) => s.stage === currentStage,
  );
  const progress =
    currentStage === "error"
      ? 0
      : ((currentIndex + 1) / PUBLISH_STAGES.length) * 100;

  return (
    <Card className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-2xl">
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-teal-500 to-purple-500 flex items-center justify-center animate-pulse">
          <Rocket className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Web-App wird veröffentlicht</h3>
        <p className="text-slate-400">Bitte warte einen Moment...</p>
      </div>

      <div className="space-y-4 mb-8">
        {PUBLISH_STAGES.filter((s) => s.stage !== "error").map(
          (stage, index) => {
            const isActive = stage.stage === currentStage;
            const isComplete = currentIndex > index;
            const isPending = currentIndex < index;

            return (
              <div
                key={stage.stage}
                className={`flex items-center gap-4 p-3 rounded-lg transition-all duration-300 ${isActive
                    ? "bg-white/10 scale-105"
                    : isComplete
                      ? "bg-green-500/20"
                      : "bg-white/5 opacity-50"
                  }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isComplete
                      ? "bg-green-500"
                      : isActive
                        ? "bg-gradient-to-r from-teal-500 to-purple-500 animate-pulse"
                        : "bg-slate-600"
                    }`}
                >
                  {isComplete ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <span className={isActive ? "animate-spin-slow" : ""}>
                      {stage.icon}
                    </span>
                  )}
                </div>
                <span
                  className={`font-medium ${isActive ? "text-white" : isComplete ? "text-green-400" : "text-slate-400"}`}
                >
                  {stage.label}
                </span>
              </div>
            );
          },
        )}
      </div>

      <Progress value={progress} className="h-2 bg-slate-700" />

      {error && (
        <div className="mt-6 p-4 bg-red-500/20 rounded-lg border border-red-500/30">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
      `}</style>
    </Card>
  );
});

// ── QR Modal: glassmorphism bubble, auto-appears 1.5s after success ──────────
export const QRModal = memo(function QRModal({
  publishedUrl,
  onClose,
}: {
  publishedUrl: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── Subtle light glass backdrop ── */}
      <div
        className="absolute inset-0 animate-in fade-in duration-400 bg-white/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* ── Glass bubble card ── */}
      <div
        className="relative z-10 w-full max-w-[360px] rounded-[2.5rem] overflow-hidden animate-in zoom-in-50 fade-in duration-500 shadow-[0_20px_60px_-15px_rgba(20,184,166,0.2)]"
        style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(24px) saturate(150%)",
          WebkitBackdropFilter: "blur(24px) saturate(150%)",
          border: "1px solid rgba(20, 184, 166, 0.15)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Schließen"
          className="absolute top-4 right-4 z-20 p-2 rounded-full transition-colors bg-teal-50/50 hover:bg-teal-100 text-teal-600/60 hover:text-teal-600"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header text */}
        <div className="px-8 pt-10 pb-4 text-center">
          <p className="text-slate-800 font-bold text-xl tracking-tight leading-tight">
            Live auf dem Handy
          </p>
          <p className="text-slate-500 text-sm mt-1">
            Scanne & erlebe deine App
          </p>
        </div>

        {/* QR Code – pure white inset glass */}
        <div className="flex justify-center px-8 pb-4">
          <div
            className="p-4 rounded-3xl bg-white shadow-[inset_0_1px_3px_rgba(0,0,0,0.05),0_8px_30px_rgba(0,0,0,0.08)]"
          >
            <QRCode value={publishedUrl} size={200} />
          </div>
        </div>

        {/* URL + close */}
        <div className="px-8 pt-2 pb-8 text-center flex flex-col gap-4">
          <p
            className="font-mono text-sm font-semibold break-all bg-gradient-to-r from-teal-600 to-purple-600 bg-clip-text text-transparent"
          >
            {publishedUrl}
          </p>
          <button
            onClick={onClose}
            className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
});

// ── Success view ──────────────────────────────────────────────────────────────
export const SuccessView = memo(function SuccessView({
  publishedUrl,
  businessName,
  onCopy,
  copied,
}: {
  publishedUrl: string;
  businessName: string;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const [showConfetti, setShowConfetti] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    // Confetti fades out after 4s
    const t1 = setTimeout(() => setShowConfetti(false), 4000);
    // QR modal pops up after 1.5s
    const t2 = setTimeout(() => setShowQRModal(true), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <>
      {showConfetti && <Confetti />}
      {showQRModal && (
        <QRModal publishedUrl={publishedUrl} onClose={() => setShowQRModal(false)} />
      )}

      <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
        {/* Icon */}
        <div className="relative">
          <div className="w-32 h-32 mx-auto bg-gradient-to-r from-green-400 to-teal-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30">
            <PartyPopper className="w-16 h-16 text-white" />
          </div>
          <div className="absolute inset-0 w-32 h-32 mx-auto bg-green-400/30 rounded-full animate-ping" />
        </div>

        <div className="space-y-2">
          <h3 className="text-4xl font-bold bg-gradient-to-r from-green-500 via-teal-500 to-purple-500 bg-clip-text text-transparent">
            🎉 Herzlichen Glückwunsch!
          </h3>
          <p className="text-xl text-gray-600">Deine Web-App ist jetzt online!</p>
        </div>

        {/* Live URL Card */}
        <Card className="p-8 bg-gradient-to-r from-green-50 via-teal-50 to-purple-50 border-2 border-green-200 max-w-2xl mx-auto shadow-xl">
          <p className="text-sm text-gray-600 mb-4 font-medium">
            Deine Web-App ist erreichbar unter:
          </p>
          <div className="bg-white rounded-xl p-4 border border-green-200 mb-6">
            <a
              href={publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xl md:text-2xl font-bold text-green-700 hover:text-green-800 hover:underline flex items-center justify-center gap-2"
            >
              {publishedUrl}
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => window.open(publishedUrl, "_blank")}
              size="lg"
              className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white shadow-lg"
            >
              <Eye className="mr-2 w-5 h-5" />
              Web-App ansehen
            </Button>
            <Button
              onClick={() => onCopy(publishedUrl)}
              variant="outline"
              size="lg"
              className="border-2"
            >
              {copied ? (
                <Check className="mr-2 w-5 h-5 text-green-500" />
              ) : (
                <Copy className="mr-2 w-5 h-5" />
              )}
              {copied ? "Kopiert!" : "Link kopieren"}
            </Button>
            <Button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: businessName, url: publishedUrl });
                } else {
                  onCopy(publishedUrl);
                }
              }}
              variant="outline"
              size="lg"
              className="border-2"
            >
              <Share2 className="mr-2 w-5 h-5" />
              Teilen
            </Button>
          </div>

          {/* Re-open QR hint */}
          <button
            onClick={() => setShowQRModal(true)}
            className="mt-5 flex items-center justify-center gap-1.5 mx-auto text-xs text-gray-400 hover:text-teal-600 transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5" />
            QR-Code anzeigen
          </button>
        </Card>

        <div className="pt-2">
          <Button
            onClick={() => (window.location.href = "/")}
            variant="ghost"
            size="lg"
            className="text-gray-600 hover:text-gray-900"
          >
            <Home className="mr-2 w-5 h-5" />
            Zum Dashboard
          </Button>
        </div>
      </div>
    </>
  );
});
