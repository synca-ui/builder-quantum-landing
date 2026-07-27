import { Star, MessageSquare, Clock } from "lucide-react";

/**
 * GoogleProfileSection
 *
 * Erklärt die Maitr-Mobile-App, die mit Zustimmung des Inhabers das Google
 * Unternehmensprofil verwaltet. Dieser Abschnitt ist die Grundlage für die
 * Google-OAuth-Prüfung des Scopes "business.manage" und muss unter
 * https://maitr.de erreichbar bleiben.
 *
 * WICHTIG: Überschrift und Fließtext sind mit Google abgestimmt und dürfen
 * nicht umformuliert werden. Eine wortgleiche Kopie liegt zusätzlich als
 * <noscript>-Block in index.html, damit der Text auch ohne JavaScript im
 * rohen HTML steht. Beide Fassungen müssen synchron bleiben.
 */
export const GOOGLE_SECTION_HEADING =
  "Maitr – dein digitaler Gastgeber für Google";

export const GOOGLE_SECTION_BODY =
  "Maitr hilft Cafés und Restaurants, ihr Google Unternehmensprofil aktuell zu halten. Mit ausdrücklicher Zustimmung des Inhabers beantwortet Maitr Google-Bewertungen, veröffentlicht Beiträge auf dem Profil und pflegt Öffnungszeiten und Kontaktdaten. Jede Aktion wird vor der Veröffentlichung vom Inhaber freigegeben.";

export default function GoogleProfileSection() {
  return (
    <section
      id="google-profil"
      aria-labelledby="google-profil-titel"
      className="relative border-y border-teal-100 bg-gradient-to-br from-teal-50 via-white to-teal-50/60 py-16 md:py-24"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-center gap-3" aria-hidden="true">
          <span className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-teal-100">
            <Star className="h-5 w-5 text-teal-700" />
          </span>
          <span className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-teal-100">
            <MessageSquare className="h-5 w-5 text-teal-700" />
          </span>
          <span className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-teal-100">
            <Clock className="h-5 w-5 text-teal-700" />
          </span>
        </div>

        <h2
          id="google-profil-titel"
          className="text-center font-display text-3xl font-black leading-tight text-gray-900 sm:text-4xl md:text-5xl"
        >
          {GOOGLE_SECTION_HEADING}
        </h2>

        <p className="mx-auto mt-6 max-w-3xl text-center text-base leading-relaxed text-gray-700 sm:text-lg md:text-xl">
          {GOOGLE_SECTION_BODY}
        </p>
      </div>
    </section>
  );
}
