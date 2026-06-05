import { X, Sparkles, Clock, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ComingSoonModalProps {
  open: boolean;
  onClose: () => void;
}

export function ComingSoonModal({ open, onClose }: ComingSoonModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">

        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Schließen"
          className="absolute top-3 right-3 z-20 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Animated gradient header */}
        <div className="relative h-36 bg-gradient-to-br from-purple-500 via-violet-500 to-orange-400 flex items-center justify-center overflow-hidden">
          {/* decorative blobs */}
          <div className="absolute -top-6 -left-6 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-4 -right-4 w-28 h-28 rounded-full bg-orange-300/30 blur-2xl" />

          <div className="relative flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg ring-2 ring-white/30">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <span className="text-white text-xs font-semibold tracking-widest uppercase opacity-90">
              Kommt demnächst
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pt-5 pb-6">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-1">
            Automatischer Konfigurator
          </h2>
          <p className="text-sm text-gray-500 text-center leading-relaxed mb-5">
            Wir arbeiten mit Hochdruck daran. Bald kannst du deine Website-URL
            eingeben — und Maitr erledigt den Rest für dich.
          </p>

          {/* Feature teaser */}
          <ul className="space-y-2.5 mb-6">
            {[
              "Automatische Extraktion von Name, Adresse & Öffnungszeiten",
              "KI-generiertes Design auf Basis deiner Marke",
              "Sofort veröffentlichungsfertige Web-App",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-xs text-gray-600">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-orange-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </span>
                {f}
              </li>
            ))}
          </ul>

          {/* ETD badge */}
          <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5 mb-5">
            <Clock className="w-4 h-4 text-purple-500 shrink-0" />
            <span className="text-xs text-purple-700 font-medium">
              Verfügbar in Kürze · Q3 2025
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              className="w-full bg-gradient-to-r from-purple-500 to-orange-500 hover:from-purple-600 hover:to-orange-600 text-white font-bold rounded-xl"
              onClick={() => {
                // Could wire up a waitlist email form later
                onClose();
              }}
            >
              <Bell className="w-3.5 h-3.5 mr-1.5" />
              Benachrichtigung erhalten
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-gray-400 hover:text-gray-600 text-xs"
              onClick={onClose}
            >
              Schließen
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
