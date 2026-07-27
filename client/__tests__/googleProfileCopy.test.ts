// @vitest-environment node
//
// Bewusst node statt jsdom: dieser Test liest nur Dateien und braucht kein DOM.
// (Die jsdom-Umgebung des Repos ist unter Node 22 aktuell defekt – siehe
// html-encoding-sniffer/ERR_REQUIRE_ESM. Dieser Test laeuft davon unabhaengig.)
//
// Schutz für den mit Google abgestimmten Text auf der Startseite.
//
// Der Abschnitt "Maitr – dein digitaler Gastgeber für Google" existiert zweimal:
// als React-Komponente (für Nutzer) und als statisches HTML in index.html (damit
// der Text bereits im ausgelieferten HTML steht, nicht erst nach JS-Ausführung).
//
// Wenn dieser Test rot wird, ist mit hoher Wahrscheinlichkeit die Google-OAuth-
// Verification für den Scope "business.manage" betroffen.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  GOOGLE_PROFILE_BODY,
  GOOGLE_PROFILE_HEADING,
  GOOGLE_PROFILE_SECTION_ID,
} from "@shared/googleProfileCopy";

const repoRoot = path.resolve(__dirname, "../..");
const read = (rel: string) =>
  fs.readFileSync(path.join(repoRoot, rel), "utf-8");

const indexHtml = read("index.html");
const sectionSource = read(
  "client/components/sections/GoogleProfileSection.tsx",
);
const landingSource = read("client/pages/Index.tsx");

describe("statische Kopie in index.html", () => {
  it("enthält die Überschrift wörtlich", () => {
    expect(indexHtml).toContain(GOOGLE_PROFILE_HEADING);
  });

  it("enthält den Fließtext wörtlich und ununterbrochen (grep-fähig)", () => {
    expect(indexHtml).toContain(GOOGLE_PROFILE_BODY);
  });

  it("trägt die stabile Anker-ID", () => {
    expect(indexHtml).toContain(`id="${GOOGLE_PROFILE_SECTION_ID}"`);
  });

  it("steht innerhalb von #root, damit React sie beim Mount ersetzt", () => {
    const rootStart = indexHtml.indexOf('<div id="root">');
    const scriptTag = indexHtml.indexOf('<script type="module"');
    const sectionStart = indexHtml.indexOf(
      `<section id="${GOOGLE_PROFILE_SECTION_ID}"`,
    );

    expect(rootStart).toBeGreaterThan(-1);
    expect(sectionStart).toBeGreaterThan(rootStart);
    expect(sectionStart).toBeLessThan(scriptTag);
  });

  it("versteckt den Text nicht (kein display:none / sr-only)", () => {
    const sectionStart = indexHtml.indexOf(
      `<section id="${GOOGLE_PROFILE_SECTION_ID}"`,
    );
    const block = indexHtml.slice(sectionStart, sectionStart + 2500);

    expect(block).not.toMatch(/display\s*:\s*none/i);
    expect(block).not.toMatch(/visibility\s*:\s*hidden/i);
    expect(block).not.toContain("sr-only");
  });

  it("nennt den Kerntext auch in der meta description", () => {
    const description = indexHtml.match(
      /<meta name="description"[\s\S]*?content="([\s\S]*?)"/,
    )?.[1];

    expect(description).toBeDefined();
    expect(description).toContain("Google Unternehmensprofil");
    // Die bestehende Builder-Positionierung muss vorne stehen bleiben.
    expect(description!.indexOf("Web-Apps")).toBeLessThan(
      description!.indexOf("Google Unternehmensprofil"),
    );
  });
});

describe("React-Abschnitt", () => {
  it("bezieht den Text aus der kanonischen Quelle statt ihn zu duplizieren", () => {
    expect(sectionSource).toContain("@shared/googleProfileCopy");
    expect(sectionSource).toContain("GOOGLE_PROFILE_HEADING");
    expect(sectionSource).toContain("GOOGLE_PROFILE_BODY");
    // Kein hartkodierter Zweitwortlaut, der auseinanderlaufen könnte.
    expect(sectionSource).not.toContain(GOOGLE_PROFILE_BODY);
  });

  it("ist auf der Startseite eingebunden", () => {
    expect(landingSource).toContain("GoogleProfileSection");
    expect(landingSource).toContain("<GoogleProfileSection />");
  });
});
