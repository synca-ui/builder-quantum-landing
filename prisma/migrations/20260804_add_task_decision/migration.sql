-- Migration: TaskDecision - die Entscheidung ueber eine Briefing-Aufgabe
-- Datum: 2026-08-04
-- Zweck: Traegertabelle fuer "Aufgabe freigeben" (POST /briefing/tasks/:id/approve)
--        und "Entwurf anpassen" (PATCH /briefing/tasks/:id). Bis hierher hatten
--        beide Endpunkte nichts, worauf sie schreiben konnten - Aufgaben werden von
--        buildInsights bei jedem Aufruf neu berechnet und sind nirgends gespeichert.
--
-- Gespeichert wird bewusst NICHT die Aufgabe, sondern die Entscheidung darueber
-- (Begruendung im Modellkommentar in prisma/schema.prisma). Deshalb gibt es keinen
-- Fremdschluessel auf MaitrReview o. ae.: "taskId" ist eine abgeleitete Kennung aus
-- dem Insights-Motor und zeigt je nach Art auf verschiedene Tabellen oder auf keine.
--
-- Erzeugt mit (lokal, ohne Datenbankverbindung):
--   npx prisma migrate diff --from-schema-datamodel <schema auf HEAD> \
--                           --to-schema-datamodel prisma/schema.prisma --script
--
-- Rein additiv: ein neuer Enum, eine neue Tabelle, zwei Indizes, zwei
-- Fremdschluessel. Keine bestehende Tabelle wird angefasst, keine Spalte geaendert,
-- keine Zeile geschrieben - ein Datenverlust ist ausgeschlossen.
--
-- ANWENDEN: Dieses Repo fuehrt KEINE gueltige Prisma-Migrationshistorie
-- (prisma/migrations enthaelt eine lose .sql und Ordner ohne Zeitstempel-Format),
-- "prisma migrate deploy" laeuft hier also nicht. Diese Datei ist zum Nachvollziehen
-- und zum manuellen Einspielen gedacht. Sie wurde NICHT ausgefuehrt.

-- CreateEnum
CREATE TYPE "TaskDecisionState" AS ENUM ('OPEN', 'APPROVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "TaskDecision" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "state" "TaskDecisionState" NOT NULL DEFAULT 'OPEN',
    "draft" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" TEXT,
    "reopenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskDecision_businessId_state_idx" ON "TaskDecision"("businessId", "state");

-- CreateIndex
-- Der Riegel gegen zwei widerspruechliche Entscheidungen zur selben Aufgabe: der
-- Schreibpfad ist ein Upsert auf genau diesem Schluessel. Mandantengebunden, damit
-- dieselbe abgeleitete Kennung in jedem Betrieb existieren darf.
CREATE UNIQUE INDEX "TaskDecision_businessId_taskId_key" ON "TaskDecision"("businessId", "taskId");

-- AddForeignKey
ALTER TABLE "TaskDecision" ADD CONSTRAINT "TaskDecision_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
-- SET NULL statt CASCADE: Die Entscheidung gehoert dem Betrieb. Loescht der
-- freigebende Mitarbeiter sein Konto, bleibt die Freigabe bestehen und verliert nur
-- den Namen dahinter - sonst tauchten laengst erledigte Aufgaben wieder als offen auf.
ALTER TABLE "TaskDecision" ADD CONSTRAINT "TaskDecision_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
