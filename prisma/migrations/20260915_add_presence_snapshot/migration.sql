-- Migration: PresenceSnapshot - oeffentliche Praesenz eines Betriebs
-- Datum: 2026-09-15
-- Zweck: Traegertabelle fuer den Praesenz-Workflow (server/maitr/praesenz/):
--        Google-Places-Eintrag (Schnitt, Anzahl, fuenf Bewertungen, Fotos,
--        Oeffnungszeiten, Telefon, Website) und Website-Pruefung je Betrieb -
--        alles OHNE Google-Freigabe erhoben. Gespeichert werden nur die
--        Rohdaten der beiden Fremdabrufe; der Praesenzbericht wird bei jedem
--        Lesen neu gerechnet (packages/core/src/analytics/oeffentlichePraesenz.ts).
--
-- Erzeugt mit (lokal, OHNE Datenbankverbindung - die Produktionsdatenbank wurde
-- nicht angefasst):
--   npx prisma migrate diff --from-schema-datamodel <schema auf HEAD> \
--                           --to-schema-datamodel prisma/schema.prisma --script
--
-- Rein additiv: eine neue Tabelle, zwei Indizes, ein Fremdschluessel. Keine
-- bestehende Tabelle wird angefasst, keine Spalte geaendert, keine Zeile
-- geschrieben - ein Datenverlust ist ausgeschlossen.
--
-- ANWENDEN: Migration VOR dem Deploy einspielen (docs/STAND.md). Der Code
-- uebersteht die fehlende Tabelle trotzdem: server/maitr/praesenz/index.ts
-- faengt Lese- und Schreibfehler ab, GET /presence antwortet dann mit dem
-- ungespeicherten Stand, das Briefing rechnet wie zuvor ohne Google-Daten.

-- CreateTable
CREATE TABLE "PresenceSnapshot" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "placeId" TEXT,
    "status" TEXT NOT NULL,
    "fehler" TEXT,
    "google" JSONB,
    "website" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PresenceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PresenceSnapshot_businessId_key" ON "PresenceSnapshot"("businessId");

-- CreateIndex
CREATE INDEX "PresenceSnapshot_fetchedAt_idx" ON "PresenceSnapshot"("fetchedAt");

-- AddForeignKey
ALTER TABLE "PresenceSnapshot" ADD CONSTRAINT "PresenceSnapshot_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

