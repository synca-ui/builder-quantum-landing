/**
 * Serverseitige Pfade der WebApp-Endpunkte, an einer Stelle gebündelt.
 *
 * Hintergrund: webAppsRouter ist in server/routes/index.ts unter "/webapps"
 * gemountet, seine Routen heißen intern "/apps/...". Der vollständige Pfad ist
 * dadurch /api/webapps/apps/... – doppelt gemoppelt, aber so gebaut.
 *
 * Die Clients riefen dagegen /api/apps/... auf. Gegen Produktion gemessen:
 *
 *   POST /api/apps/publish          -> HTTP 404
 *   POST /api/webapps/apps/publish  -> HTTP 401  (existiert, verlangt Anmeldung)
 *
 * Veröffentlichen war damit vollständig kaputt – auch im manuellen
 * Konfigurator, dessen PublishStep über client/lib/deployment.ts genau diesen
 * Pfad benutzt. Die Konstanten liegen hier, damit Client und Server nicht
 * erneut unbemerkt auseinanderlaufen.
 *
 * Aufräum-Kandidat: den Router serverseitig auf "/apps" mounten und die Pfade
 * hier nachziehen. Das ist ein Eingriff mit größerer Reichweite (mögliche
 * externe Konsumenten), deshalb bewusst getrennt gehalten.
 */
export const API_PATHS = {
  /** POST – veröffentlicht eine Konfiguration unter einer Subdomain */
  publishApp: "/api/webapps/apps/publish",
  /** GET – listet die Web-Apps des angemeldeten Nutzers */
  listApps: "/api/webapps/apps",
  /** GET/PUT – eine einzelne Web-App des angemeldeten Nutzers */
  appById: (id: string) => `/api/webapps/apps/${encodeURIComponent(id)}`,
} as const;
