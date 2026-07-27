/**
 * googleProfileCopy.ts
 *
 * Kanonischer Text für den Abschnitt "Maitr – dein digitaler Gastgeber für
 * Google" auf der Startseite.
 *
 * ⚠️  NICHT UMFORMULIEREN.
 * Dieser Wortlaut ist mit Google im Rahmen der OAuth-Verification für den
 * Scope "https://www.googleapis.com/auth/business.manage" abgestimmt. Die als
 * Startseite hinterlegte URL (https://maitr.de) muss diesen Text enthalten.
 *
 * Der Text existiert an zwei Stellen:
 *   1. client/components/sections/GoogleProfileSection.tsx  (React-Render)
 *   2. index.html, statisch in <div id="root">              (initiales HTML)
 *
 * Grund für (2): die Seite ist eine reine Client-SPA. Ohne die statische Kopie
 * stünde der Text erst nach JS-Ausführung im DOM und wäre im view-source nicht
 * auffindbar. React verwirft die statische Kopie beim Mount (createRoot),
 * es entsteht also keine doppelte Anzeige.
 *
 * client/__tests__/googleProfileCopy.test.ts stellt sicher, dass beide Kopien
 * wortgleich bleiben.
 */

/** Stabile Anker-ID – erlaubt Deeplinks auf https://maitr.de/#google-profil */
export const GOOGLE_PROFILE_SECTION_ID = "google-profil";

/** Achtung: Gedankenstrich ist ein EN DASH (U+2013), kein Bindestrich. */
export const GOOGLE_PROFILE_HEADING =
  "Maitr – dein digitaler Gastgeber für Google";

export const GOOGLE_PROFILE_BODY =
  "Maitr hilft Cafés und Restaurants, ihr Google Unternehmensprofil aktuell zu halten. Mit ausdrücklicher Zustimmung des Inhabers beantwortet Maitr Google-Bewertungen, veröffentlicht Beiträge auf dem Profil und pflegt Öffnungszeiten und Kontaktdaten. Jede Aktion wird vor der Veröffentlichung vom Inhaber freigegeben.";
