import { ArrowRight } from "lucide-react";

/**
 * Standbild der ersten Phase von MaitrWorkflowAnimation.
 *
 * WARUM: MaitrWorkflowAnimation wird per lazy() geladen. Weder renderToString
 * im Prerender noch der erste Render im Browser können auf ein lazy()-Promise
 * warten — beide zeigen den Suspense-Fallback. Das war bisher ein 850px hoher
 * leerer Kasten mit Spinner, direkt unterhalb des Hero-Bereichs: auf vielen
 * Mobilgeräten mehr als eine Bildschirmhöhe Nichts, und genau das, was ein
 * Erstbesucher nach dem Hero als Nächstes sieht.
 *
 * Diese Komponente zeigt stattdessen exakt den Zustand, mit dem die Animation
 * ohnehin startet: leeres Eingabefeld mit Platzhalter und den Knopf daneben.
 * Die Animation beginnt erst eine Sekunde nach dem Mounten zu tippen
 * (MaitrWorkflowAnimation.tsx, InputStage: setTimeout 1000ms) — der Übergang
 * vom Standbild zur geladenen Animation ist deshalb praktisch unsichtbar.
 *
 * NICHT synchron importieren wollte man die Animation selbst: sie bringt
 * framer-motion mit, gemessen 122.516 B roh / 36.114 B Brotli in einem eigenen
 * Chunk. Das wäre mehr Zusatzlast im kritischen Pfad, als der Verzicht auf
 * @clerk/clerk-react dort einspart. Dieses Standbild kommt ohne framer-motion
 * aus und kostet nur sein eigenes Markup.
 *
 * GEOMETRIE: Die Außenmaße müssen zeichengenau denen des geladenen
 * MaitrWorkflowAnimation entsprechen (h-[850px], gleiche Abstände, gleiches
 * pt-20 md:pt-40), sonst springt das Layout beim Nachladen.
 */
export default function MaitrWorkflowStill() {
  return (
    <div className="relative w-full">
      <div
        className="relative w-full max-w-7xl mx-auto h-[850px] md:h-[850px] flex items-start justify-center overflow-hidden pt-20 md:pt-40 bg-gray-50 rounded-3xl border border-gray-200 mt-4 md:mt-8 mb-10 md:mb-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {/*
          aria-hidden: Das Ganze ist eine Vorschau-Grafik ohne Funktion. Ein
          echtes <input>/<button> an dieser Stelle wäre für Tastatur- und
          Screenreader-Nutzung eine Sackgasse — die Animation selbst benutzt
          dort ein readOnly-Feld und einen Knopf ohne onClick.
        */}
        <div
          aria-hidden="true"
          className="flex flex-col sm:flex-row items-center justify-center gap-3 relative w-full max-w-2xl mx-auto px-4 sm:px-0"
        >
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl px-4 sm:px-6 py-4 flex items-center gap-2 sm:gap-3 w-full max-w-[90%] sm:max-w-none sm:min-w-[400px]">
            <span className="text-gray-400 w-full text-sm font-mono">
              Google Maps Link hier einfügen...
            </span>
          </div>

          <div className="bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 text-white rounded-3xl px-6 sm:px-8 py-4 shadow-lg flex items-center justify-center gap-2 font-medium text-sm whitespace-nowrap shrink-0 mt-2 sm:mt-0">
            Jetzt loslegen
            <ArrowRight className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
}
