// @vitest-environment node
/**
 * Schutz gegen Rückfälle bei der Zugriffskontrolle.
 *
 * Anlass (28.07.2026, beide gegen Produktion verifiziert):
 *  - POST /api/preview/:session lief ohne requireAuth, und der Handler las
 *    req.params.id — bei diesem Routennamen also undefined. Zusammen mit dem
 *    fehlenden userId kollabierte der Prisma-Filter zu findFirst({ where: {} })
 *    und lieferte JEDEM Anfragenden die erste Konfiguration der Tabelle aus:
 *    HTTP 200 mit 50 Feldern inkl. userId und reservationNotificationEmail.
 *  - POST /api/subdomains/reserve lief ohne requireAuth und nahm die userId aus
 *    dem Request-Body; das abschließende configuration.update hatte keinen
 *    userId-Filter — Schreibzugriff auf jede fremde Konfiguration.
 *
 * Der Test geht über die ECHTE Express-App: Er schickt Requests ohne
 * Authorization-Header und besteht nur, wenn 401 zurückkommt. Ein Handler, der
 * die DB anfasst, käme hier nie an — es gibt keine DB-Verbindung im Test.
 */
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createServer } from "../index";

const app = createServer();

/** Routen, die ohne Token nichts als 401 tun dürfen. */
const PROTECTED = [
  { method: "post" as const, path: "/api/preview/some-id" },
  { method: "post" as const, path: "/api/configurations/some-id/preview" },
  { method: "post" as const, path: "/api/subdomains/reserve" },
  { method: "post" as const, path: "/api/webapps/apps/publish" },
  { method: "get" as const, path: "/api/webapps/apps" },
  { method: "post" as const, path: "/api/media/upload" },
  // Speisekarten-Erkennung: ruft eine Adresse ab, die der Aufrufer bestimmt,
  // und startet eine kostenpflichtige Erkennung. Ohne Anmeldung wäre das ein
  // offener Netzwerk-Späher auf fremde Rechnung.
  { method: "post" as const, path: "/api/menu/extract" },
  // Der Abfrage-Endpunkt gibt das Ergebnis heraus – ohne Token nichts.
  { method: "get" as const, path: "/api/menu/extract/some-job" },
  // Ruft ebenfalls eine Adresse ab, die der Aufrufer bestimmt.
  { method: "post" as const, path: "/api/site/details" },
  // Scraper: Diese drei gaben zu jeder bekannten URL E-Mail, Telefon und die
  // vollständige Analyse heraus — ohne jede Anmeldung.
  { method: "get" as const, path: "/api/scraper-job/full?websiteUrl=https://x.de" },
  { method: "get" as const, path: "/api/scraper-jobs/some-id" },
  { method: "post" as const, path: "/api/scraper" },
  { method: "get" as const, path: "/api/scraper/some-id" },
];

describe("Zugriffskontrolle: keine Route gibt ohne Token Daten heraus", () => {
  it.each(PROTECTED)("$method $path → 401 ohne Token", async ({ method, path }) => {
    const res = await request(app)[method](path).send({});

    expect(
      res.status,
      `${method.toUpperCase()} ${path} antwortete ${res.status} statt 401. ` +
        `Body: ${JSON.stringify(res.body).slice(0, 300)}`,
    ).toBe(401);
  });

  it("der Score bleibt bewusst öffentlich — die Landingpage braucht ihn vor der Anmeldung", async () => {
    // Gegenprobe zur Liste oben: Hier ist 401 das FALSCHE Ergebnis. Der
    // Endpunkt liefert ausschließlich Kennzahl, Status und Zeitstempel, keine
    // Kontakt- oder Analysedaten.
    const res = await request(app).get(
      "/api/scraper-job/score?websiteUrl=https://example.de",
    );

    expect(res.status).not.toBe(401);
  });

  it("die Preview-Route verrät auch mit Body-userId nichts", async () => {
    // Früher bestimmte der Client seine eigene Identität über den Body.
    const res = await request(app)
      .post("/api/subdomains/reserve")
      .send({
        subdomain: "irgendwas",
        userId: "00000000-0000-0000-0000-000000000000",
        configId: "00000000-0000-0000-0000-000000000000",
      });

    expect(res.status).toBe(401);
  });
});

describe("Entfernte Routen bleiben entfernt", () => {
  it("GET /api/instagram antwortet nicht mehr", async () => {
    // Anlass (03.08.2026, gegen Produktion verifiziert): Die Route nahm einen
    // profileUrl-Parameter und rief ihn ungeprüft serverseitig ab — jede
    // Eingabe mit http:// oder https:// ging unverändert an fetch(). Ohne
    // Allowlist, ohne Sperre privater Netze, ohne Anmeldung.
    // ?profileUrl=https://example.com lieferte HTTP 200; über den
    // og:image-Rückfall floss fremder Inhalt zurück, und schon 200 gegen 500
    // verriet, welche internen Hosts antworten.
    //
    // Geliefert hat sie dabei nie etwas: Alle Auslesewege hingen an
    // window._sharedData und window.__additionalDataLoaded, die Instagram vor
    // Jahren aus dem Markup genommen hat. Käme sie zurück, käme die Lücke mit.
    const res = await request(app).get(
      "/api/instagram?profileUrl=https://example.com",
    );

    expect(
      res.status,
      `/api/instagram antwortete ${res.status} statt 404 — die Route ist wieder da.`,
    ).toBe(404);
  });
});
