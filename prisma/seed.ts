/**
 * Füllt die Tabelle `Template` (prisma/schema.prisma) — aufgerufen über
 * `npm run prisma db seed` bzw. das Feld `prisma.seed` in package.json.
 *
 * Die Vorlagen selbst stehen NICHT hier, sondern in shared/templateCatalog.ts:
 * derselben Liste, aus der der Konfigurator-Picker seine Karten baut, aus der
 * client/pages/Site.tsx seine Rückfallfarben nimmt und aus der
 * GET /api/templates antwortet. Vorher pflegte diese Datei eine eigene Liste
 * mit vier Vorlagen (minimalist, modern, stylish, cozy) und eigenen Farben,
 * daneben lag mit prisma/seed-templates.ts eine zweite, nirgends aufgerufene
 * Liste derselben vier Vorlagen mit wieder anderen Farben.
 *
 * Was daran kaputt war und nicht nur unsauber: Wer im Picker eine der
 * Papier-Vorlagen wählte, hatte keine Zeile in `Template`. Das ließ
 * server/routes/configurations.ts das Speichern mit 400 "Invalid template"
 * ablehnen und ließ BusinessService.ensureUserBusiness den Betrieb ohne
 * Vorlagenbezug anlegen.
 *
 * Zeilen werden nur angelegt und aktualisiert, nie gelöscht: `templateId` ist
 * ein Fremdschlüssel aus Business und Configuration. Eine Vorlage aus dem
 * Katalog zu nehmen, darf bestehende Betriebe nicht mitreißen.
 */
import { PrismaClient } from "@prisma/client";
import { TEMPLATE_DATENBANK_ZEILEN } from "../shared/templateCatalog";

const prisma = new PrismaClient();

async function seed() {
  console.log(`Start seeding: ${TEMPLATE_DATENBANK_ZEILEN.length} Vorlagen`);

  try {
    for (const zeile of TEMPLATE_DATENBANK_ZEILEN) {
      const felder = {
        name: zeile.name,
        description: zeile.description,
        category: zeile.category,
        isPremium: zeile.isPremium,
        creator: zeile.creator,
        version: zeile.version,
        layout: zeile.layout,
        tokens: zeile.tokens,
        preview: zeile.preview,
      };

      await prisma.template.upsert({
        where: { id: zeile.id },
        update: felder,
        create: { id: zeile.id, ...felder },
      });
      console.log(`  Upserted ${zeile.id} (${zeile.name})`);
    }
    console.log("Seeding finished.");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
