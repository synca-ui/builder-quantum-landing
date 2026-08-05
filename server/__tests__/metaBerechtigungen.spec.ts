// @vitest-environment node
/**
 * DIE META-BERECHTIGUNGEN, FESTGENAGELT.
 *
 * Berechtigungslisten wachsen leise. Man braucht einmal ein Feld, traegt eine
 * Berechtigung nach, das Feld faellt wieder weg - die Berechtigung bleibt. Am
 * Ende fragt der Consent-Screen mehr ab, als die App anfasst: der App Review
 * verlangt fuer jede einzelne einen Screencast, und ein abhandengekommenes
 * Token oeffnet mehr, als es je muesste.
 *
 * Dieser Test macht das Wachsen laut. Er prueft nicht nur, WELCHE Berechtigungen
 * angefragt werden, sondern KOPPELT jede an den Aufruf, der sie braucht - direkt
 * am Quelltext gelesen. Damit schlaegt er in beide Richtungen an:
 *
 *   • Berechtigung ohne Aufruf  -> jemand blaeht die Liste auf.
 *   • Aufruf ohne Berechtigung  -> jemand kuerzt zu weit, und der Sync
 *     zerbraeche erst im Betrieb, denn in allen anderen Tests antwortet eine
 *     Attrappe, die keine Berechtigungen kennt.
 *
 * Der zweite Fall ist der gefaehrlichere und der Grund, warum dieser Test den
 * Quelltext liest statt nur eine Liste mit sich selbst zu vergleichen.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { META_OAUTH, META_SCOPES, metaConnector } from "@maitr/core/integrations";

const wurzel = path.resolve(__dirname, "../..");
const lies = (p: string) => readFileSync(path.resolve(wurzel, p), "utf8");

/** Der Connector selbst: hier stehen /ratings und /insights. */
const CONNECTOR = lies("packages/core/src/integrations/meta.ts");
/** Der Server: hier steht /me/accounts, das die Page-ID aufloest. */
const ROUTEN = lies("server/maitr/routes.ts");
/** Die Vorlage fuer den App Review - sie muss dieselbe Liste tragen. */
const DOKU = lies("docs/integrations/GOOGLE_META_API_ACCESS.md");

/** Genau diese fuenf, in dieser Reihenfolge. Aendern nur mit Begruendung unten. */
const ERWARTET = [
  "instagram_basic",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
  "pages_read_user_content",
];

describe("META_SCOPES - die Liste selbst", () => {
  it("ist genau die erwartete Liste, ohne Zuwachs", () => {
    expect(META_SCOPES).toEqual(ERWARTET);
  });

  it("enthaelt business_management nicht - die Berechtigung ohne Aufruf", () => {
    // Sie oeffnet den gesamten Bestand des Business Managers (Konten, Seiten,
    // Werbekonten). Wer sie zurueckholt, braucht zuerst einen Aufruf, der sie
    // rechtfertigt - und der wuerde unten im Kopplungsteil auffallen.
    expect(META_SCOPES).not.toContain("business_management");
  });

  it("enthaelt keine Schreib-Berechtigung - die Integration liest nur", () => {
    // Es gibt heute keinen Aufruf, der bei Meta etwas veraendert. Taucht hier
    // eine Schreib-Berechtigung auf, ist entweder der Aufruf vergessen worden
    // oder die Berechtigung ist zu viel.
    for (const scope of META_SCOPES) {
      expect(scope).not.toMatch(/manage_(?!insights)|publish|_write|ads_/);
    }
  });

  it("keine Berechtigung steht doppelt drin", () => {
    expect(new Set(META_SCOPES).size).toBe(META_SCOPES.length);
  });
});

describe("Jede Berechtigung haengt an einem Aufruf, der im Quelltext steht", () => {
  it("instagram_basic + instagram_manage_insights <- /insights in fetchEngagement", () => {
    expect(CONNECTOR).toContain("/insights?metric=impressions,reach,profile_views");
    expect(META_SCOPES).toContain("instagram_basic");
    expect(META_SCOPES).toContain("instagram_manage_insights");
  });

  it("pages_show_list <- GET /me/accounts in resolveAccountId", () => {
    // Ohne diesen Aufruf gibt es keine Page-ID, ohne Page-ID keinen Sync.
    expect(ROUTEN).toContain("graph.facebook.com/v21.0/me/accounts");
    expect(META_SCOPES).toContain("pages_show_list");
  });

  it("pages_read_engagement + pages_read_user_content <- /ratings in fetchReviews", () => {
    // Die zweite ist der Stolperstein: Empfehlungen sind von NUTZERN verfasste
    // Inhalte, und die deckt pages_read_engagement nicht mit ab. Solange dieser
    // Aufruf im Code steht, muessen beide angefragt werden - sonst kommt aus
    // /ratings ein 403, und zwar erst beim echten Meta, nie im Test.
    expect(CONNECTOR).toContain("/ratings?fields=created_time,recommendation_type,review_text");
    expect(META_SCOPES).toContain("pages_read_engagement");
    expect(META_SCOPES).toContain("pages_read_user_content");
  });

  it("kein Business-Manager-Aufruf im Code - deshalb auch keine Berechtigung dafuer", () => {
    // Gegenprobe zur Kuerzung: faende sich hier je ein Aufruf auf die
    // Business-Manager-API, waere das Streichen von business_management falsch
    // gewesen und dieser Test der Ort, an dem es auffliegt.
    for (const quelle of [CONNECTOR, ROUTEN]) {
      expect(quelle).not.toMatch(/\/me\/businesses|\/owned_pages|business_id/);
    }
  });
});

describe("Die Liste kommt so beim Nutzer an, wie sie hier steht", () => {
  it("die Autorisierungs-URL traegt genau diese fuenf, kommagetrennt", () => {
    const url = new URL(
      metaConnector.buildAuthorizationUrl(
        { ...META_OAUTH, clientId: "app-id", redirectUri: "https://api.test/cb" },
        "irgendein-state",
      ),
    );

    // Meta trennt mit Komma, nicht mit Leerzeichen - deshalb hier gesplittet
    // geprueft und nicht als Teilstring: ein Leerzeichen faellt so auf.
    expect(url.searchParams.get("scope")!.split(",")).toEqual(ERWARTET);
  });
});

describe("Die Doku bleibt die Wahrheit, nicht ein alter Stand", () => {
  it("jede angefragte Berechtigung steht in der App-Review-Vorlage", () => {
    // Die Doku ist das, was spaeter bei Meta eingereicht wird. Weicht sie ab,
    // begruendet der Antrag entweder zu viel oder zu wenig.
    for (const scope of META_SCOPES) {
      expect(DOKU).toContain(`\`${scope}\``);
    }
  });

  it("die Vorlage fuehrt business_management nicht mehr als angefragt", () => {
    // Sie darf im Fliesstext als bewusst verworfen vorkommen - aber nicht mehr
    // als Zeile in der Tabelle der angefragten Berechtigungen.
    expect(DOKU).not.toMatch(/\|\s*`business_management`\s*\|/);
  });
});
