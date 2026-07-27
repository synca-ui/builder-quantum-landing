/**
 * GoogleProfileSection.tsx
 *
 * Eigenständiger Abschnitt auf der Startseite (maitr.de), der die zweite
 * Maitr-App beschreibt: die Verwaltung des Google Unternehmensprofils von
 * Cafés und Restaurants.
 *
 * WICHTIG: Der Text ist mit Google abgestimmt (OAuth-Verification für den
 * Scope "business.manage") und darf NICHT umformuliert werden.
 *
 * Der identische Text liegt zusätzlich als statisches HTML in index.html,
 * damit er bereits im initial ausgelieferten HTML steht und nicht erst nach
 * JS-Ausführung im DOM landet. Beide Kopien speisen sich aus derselben Quelle
 * (shared/googleProfileCopy.ts) und werden von
 * client/__tests__/googleProfileCopy.test.ts synchron gehalten.
 */
import { CalendarClock, MessageSquareReply, ShieldCheck } from "lucide-react";
import {
  GOOGLE_PROFILE_BODY,
  GOOGLE_PROFILE_HEADING,
  GOOGLE_PROFILE_SECTION_ID,
} from "@shared/googleProfileCopy";

export default function GoogleProfileSection() {
  return (
    <section
      id={GOOGLE_PROFILE_SECTION_ID}
      aria-labelledby={`${GOOGLE_PROFILE_SECTION_ID}-heading`}
      className="py-20 md:py-28 bg-gradient-to-br from-teal-50 via-white to-teal-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto rounded-3xl border-2 border-[#0d9488]/20 bg-white shadow-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#0d9488] to-teal-400"></div>

          <div className="p-8 sm:p-10 md:p-14 text-center">
            <div className="mb-6 flex justify-center">
              <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0d9488] to-teal-400 shadow-lg">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
            </div>

            <h2
              id={`${GOOGLE_PROFILE_SECTION_ID}-heading`}
              className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-6 font-display"
            >
              {GOOGLE_PROFILE_HEADING}
            </h2>

            <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">
              {GOOGLE_PROFILE_BODY}
            </p>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-teal-50 to-white p-5">
                <MessageSquareReply className="w-5 h-5 text-[#0d9488]" />
                <div className="mt-3 text-sm font-bold text-gray-900">
                  Bewertungen
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-teal-50 to-white p-5">
                <CalendarClock className="w-5 h-5 text-[#0d9488]" />
                <div className="mt-3 text-sm font-bold text-gray-900">
                  Öffnungszeiten
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-teal-50 to-white p-5">
                <ShieldCheck className="w-5 h-5 text-[#0d9488]" />
                <div className="mt-3 text-sm font-bold text-gray-900">
                  Freigabe durch Inhaber
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
