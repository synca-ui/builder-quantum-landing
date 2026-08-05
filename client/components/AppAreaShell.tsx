/**
 * Rahmen für den angemeldeten Bereich: Login, Signup, Modus-Auswahl,
 * Konfigurator, Dashboard, Profil.
 *
 * WARUM eine eigene Route-Ebene:
 * ClerkProvider und I18nextProvider standen bisher in client/App.tsx um die
 * GESAMTE Anwendung, beide als normale (nicht lazy) Importe. Damit lagen
 * @clerk/clerk-react und i18next im statischen Importgraphen des
 * Einstiegsbündels — Vite schrieb sie als <link rel="modulepreload"> ins HTML
 * und der Browser lud sie bei JEDEM Aufruf der Startseite mit, obwohl dort
 * weder eine Anmeldung noch eine Übersetzung vorkommt. Schlimmer als die Bytes:
 * ClerkProvider wurde beim ersten Render ausgeführt, Clerk startete also seine
 * eigene Initialisierung (Skript von clerk.maitr.de, Sitzungsabfrage), bevor
 * die Startseite überhaupt gezeichnet war.
 *
 * Gebraucht wird beides ausschließlich hinter dieser Route-Gruppe:
 * useAuth/useUser/SignIn/SignUp/UserButton kommen nur in Seiten unterhalb
 * dieses Rahmens vor, useTranslation nur im Konfigurator (geprüft per Grep über
 * client/ am 05.08.2026).
 *
 * Als Layout-Route hinter lazy() geladen wandern beide Pakete in einen Chunk,
 * der erst beim ersten Aufruf einer dieser Routen angefordert wird.
 *
 * PREIS, bewusst in Kauf genommen: Der erste Sprung von der Startseite in den
 * App-Bereich braucht jetzt eine zusätzliche Anfrage-Runde (erst dieser Rahmen,
 * dann die Zielseite). Der Rahmen selbst ist winzig; seine Abhängigkeiten holt
 * Vites Preload-Helfer parallel dazu.
 */
import { Outlet } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";

const CLERK_PUBLISHABLE_KEY = import.meta.env
  .VITE_CLERK_PUBLISHABLE_KEY as string;

export default function AppAreaShell() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <I18nextProvider i18n={i18n}>
        <Outlet />
      </I18nextProvider>
    </ClerkProvider>
  );
}
