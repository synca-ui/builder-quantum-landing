/**
 * Der dunkle Block unter der Workflow-Animation ("Starte jetzt. Perfektioniere
 * später.", die drei Kacheln, das Problem-Statement).
 *
 * WARUM eine eigene Datei: Dieses Markup stand bisher als CompactStatsSection
 * INNERHALB von MaitrWorkflowAnimation.tsx. Diese Komponente wird per lazy()
 * geladen, weil sie framer-motion mitbringt (122 KB roh / 36 KB Brotli im
 * eigenen Chunk). Der Stats-Block braucht framer-motion nicht — er ist
 * statisches Markup —, hing aber am selben Ladevorgang. Folge: Er fehlte im
 * vorgerenderten HTML komplett, also auch für den ersten, JavaScript-losen
 * Googlebot-Durchgang, und erschien im Browser erst nach dem Nachladen des
 * Animations-Chunks.
 *
 * Hier herausgelöst wird er normal (nicht lazy) von client/pages/Index.tsx
 * importiert, landet damit im vorgerenderten HTML und kostet keinen zusätzlichen
 * Netzwerkzugriff.
 */
export default function WorkflowStatsSection() {
  return (
    <div className="bg-gradient-to-br from-gray-900 via-slate-900 to-black py-20 px-6 relative overflow-hidden w-full">
      {/* Subtle animated glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-purple-500/10 to-orange-500/10 blur-3xl animate-pulse"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Box 1: Perfektion Section - BORDERED */}
        <div className="bg-white/5 backdrop-blur-sm border-2 border-white/20 rounded-3xl p-10 mb-12 hover:bg-white/10 transition-all">
          <h2 className="text-3xl font-black text-white mb-4 text-center leading-tight">
            Starte jetzt. Perfektioniere später.
          </h2>
          <p className="text-lg text-gray-300 text-center font-medium leading-relaxed max-w-3xl mx-auto">
            Warte nicht auf die 'perfekte' Website. Geh heute mit Maitr live,
            teste was deine Gäste lieben, und pass es in Sekunden an.{" "}
            <span className="font-bold text-white">Erfolg ist ein Prozess</span>{" "}
            – wir geben dir den Startschuss.
          </p>
        </div>

        {/* Stats Grid - Glass Morphism on Dark */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-12">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20 flex items-center justify-center hover:bg-white/15 transition-all">
            <div className="text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-teal-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent text-center">
              Volle Tische
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20 flex items-center justify-center hover:bg-white/15 transition-all">
            <div className="text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent text-center">
              5x mehr Buchungen
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20 flex items-center justify-center hover:bg-white/15 transition-all">
            <div className="text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent text-center">
              Mehr Umsatz
            </div>
          </div>
        </div>

        {/* Box 2: Problem Statement - BORDERED */}
        <div className="bg-white/5 backdrop-blur-sm border-2 border-white/20 rounded-3xl p-6 sm:p-10 hover:bg-white/10 transition-all">
          <p className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-5 text-center leading-tight">
            Dein Restaurant verdient volle Tische, keine IT-Probleme.
          </p>
          <p className="text-xl text-gray-300 text-center font-medium">
            Link rein. App raus. Mehr Gäste.
          </p>
        </div>
      </div>
    </div>
  );
}
