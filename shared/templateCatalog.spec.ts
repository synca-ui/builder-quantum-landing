/**
 * Vertragstest um den Vorlagenkatalog.
 *
 * Anlass: Vier Stellen führten je eine eigene Vorlagenliste — der Picker im
 * Konfigurator, prisma/seed.ts, ein zweites nie aufgerufenes
 * prisma/seed-templates.ts und die TemplateRegistry, aus der auch
 * GET /api/templates gespeist wurde. Sie liefen auseinander, und niemand
 * merkte es: Der Picker bot presse, kiosk, izakaya und morgen an, die
 * Datenbank kannte stylish und cozy. Wer eine der neuen Vorlagen wählte,
 * bekam beim Speichern 400 "Invalid template" (server/routes/configurations.ts)
 * und veröffentlichte einen Betrieb ohne Vorlagenbezug
 * (BusinessService.ensureUserBusiness).
 *
 * Seither gibt es nur noch shared/templateCatalog.ts. Diese Datei prüft, dass
 * das so bleibt: gegen den GERENDERTEN Picker, gegen die Zeilen, die der Seed
 * schreibt, gegen die Registry-Form und gegen das, was die API daraus wieder
 * ausliest. Kein Netz, keine Datenbank.
 */
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ALLE_TEMPLATE_IDS,
  PICKER_TEMPLATES,
  STANDARD_TEMPLATE_ID,
  TEMPLATE_DATENBANK_ZEILEN,
  TEMPLATE_KATALOG,
  TEMPLATE_REGISTRY,
  istBekanntesTemplate,
  templateBeschreibungsKey,
  templateNameKey,
} from "./templateCatalog";
import { suggestedConfigToDraft } from "./suggestedConfig";
import {
  TEMPLATE_IDS,
  getTemplateTokens,
} from "../client/lib/templateTokens";
import { EIGENE_TEMPLATES } from "../client/lib/templateLayout";
import { TemplateStep } from "../client/components/configurator/steps/TemplateStep";
import { useConfiguratorStore } from "../client/store/configuratorStore";
import de from "../client/i18n/locales/de.json";
import en from "../client/i18n/locales/en.json";

const WURZEL = resolve(__dirname, "..");
const lies = (p: string) => readFileSync(resolve(WURZEL, p), "utf8");

describe("Katalog — Grundform", () => {
  it("führt jede ID genau einmal", () => {
    expect(new Set(ALLE_TEMPLATE_IDS).size).toBe(ALLE_TEMPLATE_IDS.length);
  });

  it("führt genau die Vorlagen, für die es eine Palette gibt", () => {
    // client/lib/templateTokens.ts leitet TEMPLATE_IDS aus seinen Paletten ab;
    // der Paritätstest (templateParitaet.test.tsx) prüft jede davon. Beide
    // Listen müssen dieselben sein: Eine Palette ohne Katalogeintrag bekäme
    // keine Zeile in der Datenbank, ein Katalogeintrag ohne Palette bekäme
    // über getTemplateTokens still die von "minimalist".
    expect([...ALLE_TEMPLATE_IDS].sort()).toEqual([...TEMPLATE_IDS].sort());
  });

  it("enthält jede Vorlage mit eigenem Layout", () => {
    for (const id of EIGENE_TEMPLATES) {
      expect(istBekanntesTemplate(id)).toBe(true);
    }
  });

  it("hat eine gültige Standardvorlage", () => {
    expect(istBekanntesTemplate(STANDARD_TEMPLATE_ID)).toBe(true);
  });
});

describe("Picker — was der Konfigurator anbietet", () => {
  beforeEach(() => {
    useConfiguratorStore.getState().resetConfig();
  });

  it("zeigt genau die Vorlagen des Katalogs mit imPicker, in dessen Reihenfolge", () => {
    const { container } = render(
      React.createElement(TemplateStep, {
        nextStep: () => {},
        prevStep: () => {},
      }),
    );

    // Ohne initialisiertes i18n liefert t() den Schlüssel zurück. Das reicht:
    // geprüft wird, WELCHE Vorlagen dastehen und in welcher Reihenfolge.
    // Gelesen wird das Kartenraster, nicht die ganze Seite — die Fußleiste
    // nennt die gewählte Vorlage ein zweites Mal.
    const karten = Array.from(container.querySelectorAll(".grid > div h3")).map(
      (el) => el.textContent?.trim(),
    );

    expect(karten).toEqual(PICKER_TEMPLATES.map((e) => templateNameKey(e.id)));

    // Und keine, die nicht im Picker stehen soll.
    for (const eintrag of TEMPLATE_KATALOG.filter((e) => !e.imPicker)) {
      expect(karten).not.toContain(templateNameKey(eintrag.id));
    }
  });

  it("baut seine Karten aus dem Katalog statt aus einer eigenen Liste", () => {
    const quelle = lies(
      "client/components/configurator/steps/TemplateStep.tsx",
    );
    expect(quelle).toContain("PICKER_TEMPLATES");
    // Eine wieder eingeführte Handliste erkennt man an eigenen ID-Literalen.
    for (const id of ALLE_TEMPLATE_IDS) {
      expect(quelle).not.toContain(`id: "${id}"`);
    }
  });
});

describe("Seed — was in der Tabelle Template landet", () => {
  it("schreibt genau die Vorlagen des Katalogs", () => {
    expect(TEMPLATE_DATENBANK_ZEILEN.map((z) => z.id)).toEqual(
      ALLE_TEMPLATE_IDS,
    );
  });

  it("übernimmt Paletten aus templateTokens.ts, statt sie zu kopieren", () => {
    for (const zeile of TEMPLATE_DATENBANK_ZEILEN) {
      expect(zeile.tokens).toBe(getTemplateTokens(zeile.id));
    }
  });

  it("führt auch den Alt-Bestand, damit alte Konfigurationen speicherbar bleiben", () => {
    // server/routes/configurations.ts lehnt das Speichern mit 400 ab, wenn
    // die gewählte Vorlage keine Zeile hat — auch eine, die nur noch in einer
    // bestehenden Konfiguration steht.
    for (const id of ["stylish", "cozy", "nocturne", "riviera", "verde"]) {
      expect(TEMPLATE_DATENBANK_ZEILEN.some((z) => z.id === id)).toBe(true);
    }
  });

  it("hat keine eigene Liste in prisma/seed.ts", () => {
    const quelle = lies("prisma/seed.ts");
    expect(quelle).toContain("TEMPLATE_DATENBANK_ZEILEN");
    for (const id of ALLE_TEMPLATE_IDS) {
      expect(quelle).not.toContain(`id: "${id}"`);
    }
  });
});

describe("Registry — was Site.tsx und das Demo-Dashboard lesen", () => {
  it("führt genau die Vorlagen des Katalogs", () => {
    expect(TEMPLATE_REGISTRY.map((t) => t.id)).toEqual(ALLE_TEMPLATE_IDS);
  });

  it("nimmt Farben aus templateTokens.ts", () => {
    for (const eintrag of TEMPLATE_REGISTRY) {
      const farben = getTemplateTokens(eintrag.id).colors;
      expect(eintrag.style.background).toBe(farben.background);
      expect(eintrag.style.accent).toBe(farben.primary);
      expect(eintrag.style.text).toBe(farben.text);
      expect(eintrag.style.secondary).toBe(farben.secondary);
    }
  });

  it("wird von den Verbrauchern aus dem Katalog bezogen", () => {
    for (const datei of [
      "client/pages/Site.tsx",
      "client/components/demo/DemoCreativeStudio.tsx",
      "client/components/demo/MobileCreativeStudio.tsx",
    ]) {
      const quelle = lies(datei);
      expect(quelle).toContain("TEMPLATE_REGISTRY");
      expect(quelle).not.toContain("defaultTemplates");
    }
  });
});

describe("Route — was GET /api/templates aus den Seed-Zeilen macht", () => {
  it("liefert dieselben Vorlagen wie Picker und Registry", async () => {
    // server/db/prisma.ts wirft ohne DATABASE_URL schon beim Import. Hier
    // steht statt der Datenbank genau das, was der Seed hineinschreibt —
    // geprüft wird die Abbildung Zeile -> API-Antwort.
    vi.doMock("../server/db/prisma", () => {
      const zeilen = TEMPLATE_DATENBANK_ZEILEN.map((z) => ({
        ...z,
        downloads: 0,
        avgRating: 0,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      }));
      const client = {
        template: {
          findMany: async ({ where }: any = {}) =>
            where?.category
              ? zeilen.filter((z) => z.category === where.category)
              : zeilen,
          findUnique: async ({ where }: any) =>
            zeilen.find((z) => z.id === where.id) ?? null,
        },
      };
      return { default: client, prisma: client };
    });

    const { templateEngine } =
      await import("../server/services/TemplateEngine");
    const geliefert = await templateEngine.getAll();

    expect(geliefert.map((t) => t.id)).toEqual(ALLE_TEMPLATE_IDS);

    for (const geliefertesTemplate of geliefert) {
      const erwartet = TEMPLATE_REGISTRY.find(
        (t) => t.id === geliefertesTemplate.id,
      )!;
      expect(geliefertesTemplate.name).toBe(erwartet.name);
      expect(geliefertesTemplate.description).toBe(erwartet.description);
      expect(geliefertesTemplate.preview).toBe(erwartet.preview);
      expect(geliefertesTemplate.businessTypes).toEqual(erwartet.businessTypes);
      expect(geliefertesTemplate.features).toEqual(erwartet.features);
      expect(geliefertesTemplate.style).toMatchObject(erwartet.style);
    }

    // Der Filter nach Betriebsart arbeitet auf denselben Listen.
    const nurBar = await templateEngine.getAll({ businessType: "bar" });
    expect(nurBar.map((t) => t.id)).toEqual(
      TEMPLATE_KATALOG.filter((e) => e.businessTypes.includes("bar")).map(
        (e) => e.id,
      ),
    );

    vi.doUnmock("../server/db/prisma");
  });
});

describe("Übersetzungen und Zulieferer", () => {
  it("hat zu jeder Vorlage Name und Beschreibung in beiden Sprachen", () => {
    for (const id of ALLE_TEMPLATE_IDS) {
      for (const [sprache, texte] of Object.entries({ de, en })) {
        const t = (texte as any).templates;
        expect(
          t[id],
          `${templateNameKey(id)} fehlt in ${sprache}.json`,
        ).toBeTruthy();
        expect(
          t[`${id}Desc`],
          `${templateBeschreibungsKey(id)} fehlt in ${sprache}.json`,
        ).toBeTruthy();
      }
    }
  });

  it("nennt im Englischen denselben Namen wie die Datenbank", () => {
    for (const eintrag of TEMPLATE_KATALOG) {
      expect((en as any).templates[eintrag.id]).toBe(eintrag.name);
      expect((en as any).templates[`${eintrag.id}Desc`]).toBe(
        eintrag.description,
      );
    }
  });

  it("übersetzt Flow-Vorlagennamen nur auf Vorlagen, die es gibt", () => {
    for (const name of [
      "minimalist",
      "bold",
      "classic",
      "bistrokarte",
      "gibtsnicht",
    ]) {
      const ziel = suggestedConfigToDraft({
        businessName: "Test",
        template: name,
      } as any)?.design.template;
      expect(istBekanntesTemplate(ziel)).toBe(true);
    }
  });
});
