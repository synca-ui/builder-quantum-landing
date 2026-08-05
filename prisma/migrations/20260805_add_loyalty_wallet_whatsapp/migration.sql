-- Migration: Treue, Wallet und WhatsApp - plus Ortsfelder, Antwortzustand und
--            Mock-Kennzeichen auf den bestehenden Maitr-Tabellen
-- Datum: 2026-08-05
-- Zweck: Traegertabellen fuer Stempelkarten samt Apple/Google Wallet, den
--        WhatsApp-Posteingang und den Nachbarschafts-Benchmark. Erweitert werden
--        ausschliesslich bestehende Modelle - es entsteht KEIN zweites Restaurant-,
--        Kunden-, Bewertungs- oder Kanalmodell.
--
-- Erzeugt mit (lokal, ohne Datenbankverbindung):
--   npx prisma migrate diff --from-schema-datamodel <schema auf HEAD> \
--                           --to-schema-datamodel prisma/schema.prisma --script
--
-- ═══ EINSPIELREIHENFOLGE ══════════════════════════════════════════════════════
-- 1. 20260805_add_whatsapp_provider/migration.sql   (Enum-Wert, eigene Datei)
-- 2. DIESE Datei
-- 3. ERST DANACH der Merge nach main / das Deploy.
-- Begruendung im Kopf von 20260805_add_whatsapp_provider/migration.sql: Der neue
-- Prisma-Client schreibt in jeder Abfrage eine ausgeschriebene Spaltenliste (nie
-- SELECT *). Deployt der Code zuerst, antwortet Postgres auf assembleVenueDataset
-- mit 42703 und GET /briefing/today ist tot, bis jemand die Migration einspielt.
-- Andersherum ist alles unsichtbar fuer den alten Client - das ist der Freibrief.
--
-- ═══ WAS HIER HANDGESCHRIEBEN IST (von migrate diff NICHT abgedeckt) ══════════
-- Vier Anweisungen stehen zusaetzlich im Skript und sind unten jeweils als
-- HANDGESCHRIEBEN gekennzeichnet:
--   - UPDATE "MaitrReview" ... replyStatus = 'PUBLISHED' (Backfill der Bestandsdaten)
--   - CREATE SEQUENCE "wallet_pass_update_seq" (Apple passesUpdatedSince)
--   - CHECK "StampCard_apple_vollstaendig" (Seriennummer nie ohne Geheimnis)
--   - partieller UNIQUE-Index auf ChannelConnection.waPhoneNumberId (nur ACTIVE)
-- Geprueft ist damit NICHT "das erzeugte Skript", sondern dieses hier.
--
-- ═══ SICHERHEIT AUF EINER GEFUELLTEN DATENBANK ════════════════════════════════
-- Grundannahme unabhaengig vom tatsaechlichen Zeilenstand: jede Tabelle als
-- gefuellt behandeln.
-- A. Rein additiv und nullbar (kein Default noetig):
--    Business.postalCode/latitude/longitude, MaitrGuest.phoneE164/email/anonymizedAt,
--    MaitrReview.author/replyText/replyError,
--    ChannelConnection.isVerified/verifiedAt/waPhoneNumberId/wabaId/waDisplayPhone.
-- B. Additiv MIT skalarem Default, deshalb einschrittig auch auf gefuellten
--    Tabellen: die vier isMock-Spalten und MaitrReview.replyStatus.
-- C. Neue Indizes auf Bestandstabellen koennen nicht scheitern:
--    MaitrGuest_businessId_phoneE164_key liegt auf einer brandneuen, ausnahmslos
--    NULL-befuellten Spalte (Postgres: NULLS DISTINCT), ebenso der partielle Index
--    auf waPhoneNumberId; MaitrGuest_businessId_id_key und
--    ChannelConnection_businessId_id_key enthalten den Primaerschluessel; die
--    Business- und wabaId-Indizes sind nicht-eindeutig.
-- D. Kein DROP, kein ALTER COLUMN, kein SET NOT NULL, kein RENAME - im ganzen
--    Skript nicht ein einziges Mal (grep-geprueft).
-- E. Die neun neuen Tabellen sind leer; alle Constraints und Fremdschluessel sind
--    sofort scharf anlegbar, es gibt keinen Validierungsscan ueber Bestandsdaten.
-- F. NICHT hier, sondern als eigenes Skript DANACH: der Backfill von
--    MaitrGuest.phoneE164 aus phone. Reihenfolge: normalisieren -> je Betrieb auf
--    Doubletten pruefen -> zusammenfuehren -> schreiben. Der Unique steht dann
--    schon und weist Doubletten laut ab, statt sie still zusammenzuwerfen. Er
--    gehoert VOR die erste WhatsApp-Verbindung, sonst laufen eingehende Nachrichten
--    bekannter Stammgaeste in ein Gespraech mit guestId = NULL, und das wird nicht
--    rueckwirkend nachgezogen (das Backfill-Skript braucht dafuer einen zweiten Lauf).
--
-- ═══ SPERREN ══════════════════════════════════════════════════════════════════
-- Der Server laeuft waehrend des Einspielens weiter. Jedes ALTER TABLE ... ADD
-- COLUMN verlangt ACCESS EXCLUSIVE; haelt eine gleichzeitige Anfrage auch nur eine
-- leichte Sperre auf Business, wartet das ALTER - und ab diesem Moment stauen sich
-- ALLE nachfolgenden Leseanfragen dahinter, nicht nur die Schreibpfade. Deshalb
-- steht am Anfang ein lock_timeout: im Konfliktfall bricht die Migration nach drei
-- Sekunden mit einem klaren Fehler ab, statt die Anwendung stillzulegen. Sie ist
-- gefahrlos wiederholbar, weil sie in einer Transaktion laeuft.
--
-- ANWENDEN: Dieses Repo fuehrt KEINE gueltige Prisma-Migrationshistorie,
-- "prisma migrate deploy" laeuft hier nicht. Eingespielt wird von Hand
-- (prisma db execute). Diese Datei wurde NICHT ausgefuehrt.

SET lock_timeout = '3s';
SET statement_timeout = '60s';

-- CreateEnum
CREATE TYPE "ReviewReplyStatus" AS ENUM ('NONE', 'DRAFT', 'PUBLISHING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "StampCardStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'REDEEMED', 'EXPIRED', 'VOIDED');

-- CreateEnum
CREATE TYPE "StampEventKind" AS ENUM ('EARNED', 'REDEEMED', 'CORRECTION', 'VOIDED');

-- CreateEnum
CREATE TYPE "StampEventSource" AS ENUM ('QR_SCAN', 'MANUAL', 'IMPORT', 'MOCK');

-- CreateEnum
CREATE TYPE "WhatsAppDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('RECEIVED', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "WhatsAppTemplateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED');

-- CreateEnum
CREATE TYPE "WhatsAppMediaState" AS ENUM ('PENDING', 'STORED', 'FAILED', 'PURGED');

-- CreateEnum
CREATE TYPE "BenchmarkCohort" AS ENUM ('POSTAL_CODE');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "postalCode" TEXT;

-- AlterTable
ALTER TABLE "MaitrGuest" ADD COLUMN     "anonymizedAt" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "isMock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phoneE164" TEXT;

-- AlterTable
ALTER TABLE "MaitrReview" ADD COLUMN     "author" TEXT,
ADD COLUMN     "isMock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "replyError" TEXT,
ADD COLUMN     "replyStatus" "ReviewReplyStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "replyText" TEXT;

-- Backfill (HANDGESCHRIEBEN, nicht von migrate diff erzeugt)
-- Ohne diese Zeile gilt die Regel "repliedAt folgt dem Status" fuer KEINE einzige
-- Bestandszeile: eine vor drei Wochen beantwortete Google-Bewertung traegt
-- repliedAt, bekaeme aber replyStatus = 'NONE'. Der Zustand heilt nicht von selbst,
-- und sobald ein Lesepfad auf replyStatus umgestellt wird - genau dafuer ist die
-- Spalte da -, erscheinen alle historisch beantworteten Bewertungen wieder als
-- unbeantwortet. Gefahrlos in derselben Transaktion: ReviewReplyStatus wird per
-- CREATE TYPE angelegt, die Einschraenkung "neuer Enum-Wert nicht in derselben
-- Transaktion benutzbar" gilt nur fuer ALTER TYPE ... ADD VALUE.
UPDATE "MaitrReview" SET "replyStatus" = 'PUBLISHED' WHERE "repliedAt" IS NOT NULL;

-- AlterTable
ALTER TABLE "MaitrEngagementPoint" ADD COLUMN     "isMock" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ChannelConnection" ADD COLUMN     "isMock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVerified" BOOLEAN,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "waDisplayPhone" TEXT,
ADD COLUMN     "waPhoneNumberId" TEXT,
ADD COLUMN     "wabaId" TEXT;

-- CreateTable
CREATE TABLE "StampProgram" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxStamps" INTEGER NOT NULL DEFAULT 10,
    "rewardText" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "cooldownSeconds" INTEGER NOT NULL DEFAULT 3600,
    "validityDays" INTEGER,
    "applePassTypeIdentifier" TEXT,
    "googleIssuerId" TEXT,
    "googleClassId" TEXT,
    "googleClassCreatedAt" TIMESTAMP(3),
    "designJson" JSONB,
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StampProgram_pkey" PRIMARY KEY ("id")
);

-- CreateSequence (HANDGESCHRIEBEN, nicht von migrate diff erzeugt)
-- StampCard.passUpdateSeq bedient Apples passesUpdatedSince und muss GLOBAL monoton
-- wachsen: das Geraet fragt mit EINEM Wert nach Aenderungen an MEHREREN Paessen.
-- Prisma kann eine geteilte Sequenz nicht ausdruecken, im Schema steht deshalb nur
-- @default(0); den Wert zieht der Stempelpfad per nextval(). Fehlt die Sequenz,
-- endet der erste Stempelvorgang in 42P01 "relation does not exist".
-- AS INTEGER passend zur Spalte (siehe Schemakommentar: BigInt scheidet aus, weil
-- JSON.stringify auf einem JS-BigInt wirft).
CREATE SEQUENCE IF NOT EXISTS "wallet_pass_update_seq" AS INTEGER START WITH 1;

-- CreateTable
CREATE TABLE "StampCard" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "cycle" INTEGER NOT NULL DEFAULT 1,
    "currentStamps" INTEGER NOT NULL DEFAULT 0,
    "maxStamps" INTEGER NOT NULL DEFAULT 10,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "StampCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 0,
    "scanTokenHash" TEXT NOT NULL,
    "encScanToken" TEXT,
    "scanTokenIssuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scanTokenRotatedAt" TIMESTAMP(3),
    "scanTokenRevokedAt" TIMESTAMP(3),
    "serialNumber" TEXT,
    "passTypeIdentifier" TEXT,
    "encAuthToken" TEXT,
    "passUpdateSeq" INTEGER NOT NULL DEFAULT 0,
    "contentChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPassBuiltAt" TIMESTAMP(3),
    "googleObjectId" TEXT,
    "googleClassId" TEXT,
    "googleObjectCreatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StampCard_pkey" PRIMARY KEY ("id")
);

-- AddCheckConstraint (HANDGESCHRIEBEN, nicht von migrate diff erzeugt)
-- serialNumber, passTypeIdentifier und encAuthToken gehoeren zusammen: entweder ist
-- kein Pass ausgestellt (alle drei NULL) oder ein vollstaendiger (alle drei gesetzt).
-- Der Grund ist nicht Ordnungsliebe: /v1/passes/{passTypeIdentifier}/{serialNumber}
-- laeuft OHNE Sitzung, requireVenueAccess kann diese Route strukturell nicht
-- schuetzen, und der einzige Riegel ist der Vergleich des ApplePass-Headers gegen
-- encAuthToken. Eine Karte mit Seriennummer, aber ohne Geheimnis waere ueber Apple
-- adressierbar und liefert bei jeder Implementierung, die "kein Token hinterlegt"
-- nicht als hartes 401 behandelt, Gastname und Stempelstand an jeden aus, der die
-- Seriennummer nennt. Prisma kann einen CHECK nicht ausdruecken, die Migration schon.
ALTER TABLE "StampCard" ADD CONSTRAINT "StampCard_apple_vollstaendig"
  CHECK (num_nonnulls("serialNumber", "passTypeIdentifier", "encAuthToken") IN (0, 3));

-- CreateTable
CREATE TABLE "StampEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "stampCardId" TEXT NOT NULL,
    "kind" "StampEventKind" NOT NULL,
    "delta" INTEGER NOT NULL DEFAULT 1,
    "balanceAfter" INTEGER NOT NULL,
    "source" "StampEventSource" NOT NULL DEFAULT 'QR_SCAN',
    "idempotencyKey" TEXT NOT NULL,
    "staffUserId" TEXT,
    "deviceLabel" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StampEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletDeviceRegistration" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "stampCardId" TEXT NOT NULL,
    "deviceLibraryIdentifier" TEXT NOT NULL,
    "passTypeIdentifier" TEXT NOT NULL,
    "pushToken" TEXT NOT NULL,
    "lastPushAt" TIMESTAMP(3),
    "lastPushError" TEXT,
    "failedPushes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletDeviceRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppConversation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "waId" TEXT NOT NULL,
    "profileName" TEXT,
    "guestId" TEXT,
    "lastInboundAt" TIMESTAMP(3),
    "lastOutboundAt" TIMESTAMP(3),
    "optInAt" TIMESTAMP(3),
    "optInSource" TEXT,
    "optOutAt" TIMESTAMP(3),
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "clientToken" TEXT NOT NULL,
    "direction" "WhatsAppDirection" NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "status" "WhatsAppMessageStatus" NOT NULL,
    "body" TEXT,
    "payload" JSONB,
    "replyToProviderId" TEXT,
    "templateName" TEXT,
    "templateLanguage" TEXT,
    "templateCategory" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorCode" INTEGER,
    "errorTitle" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMedia" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "messageId" TEXT,
    "mediaId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sha256" TEXT,
    "fileSize" INTEGER,
    "caption" TEXT,
    "storagePath" TEXT,
    "state" "WhatsAppMediaState" NOT NULL DEFAULT 'PENDING',
    "downloadError" TEXT,
    "purgeAfter" TIMESTAMP(3),
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "WhatsAppTemplateStatus" NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT,
    "components" JSONB,
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenchmarkSnapshot" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "cohort" "BenchmarkCohort" NOT NULL DEFAULT 'POSTAL_CODE',
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isMock" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BenchmarkSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StampProgram_businessId_isActive_idx" ON "StampProgram"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StampProgram_businessId_name_key" ON "StampProgram"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "StampProgram_businessId_id_key" ON "StampProgram"("businessId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "StampCard_serialNumber_key" ON "StampCard"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StampCard_googleObjectId_key" ON "StampCard"("googleObjectId");

-- CreateIndex
CREATE INDEX "StampCard_businessId_status_idx" ON "StampCard"("businessId", "status");

-- CreateIndex
CREATE INDEX "StampCard_guestId_idx" ON "StampCard"("guestId");

-- CreateIndex
CREATE INDEX "StampCard_passUpdateSeq_idx" ON "StampCard"("passUpdateSeq");

-- CreateIndex
CREATE UNIQUE INDEX "StampCard_businessId_scanTokenHash_key" ON "StampCard"("businessId", "scanTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "StampCard_programId_guestId_cycle_key" ON "StampCard"("programId", "guestId", "cycle");

-- CreateIndex
CREATE UNIQUE INDEX "StampCard_businessId_id_key" ON "StampCard"("businessId", "id");

-- CreateIndex
CREATE INDEX "StampEvent_stampCardId_createdAt_idx" ON "StampEvent"("stampCardId", "createdAt");

-- CreateIndex
CREATE INDEX "StampEvent_businessId_createdAt_idx" ON "StampEvent"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StampEvent_stampCardId_idempotencyKey_key" ON "StampEvent"("stampCardId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "WalletDeviceRegistration_stampCardId_idx" ON "WalletDeviceRegistration"("stampCardId");

-- CreateIndex
CREATE INDEX "WalletDeviceRegistration_deviceLibraryIdentifier_passTypeId_idx" ON "WalletDeviceRegistration"("deviceLibraryIdentifier", "passTypeIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "WalletDeviceRegistration_deviceLibraryIdentifier_passTypeId_key" ON "WalletDeviceRegistration"("deviceLibraryIdentifier", "passTypeIdentifier", "stampCardId");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_businessId_lastInboundAt_idx" ON "WhatsAppConversation"("businessId", "lastInboundAt");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_guestId_idx" ON "WhatsAppConversation"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConversation_businessId_waId_key" ON "WhatsAppConversation"("businessId", "waId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConversation_businessId_id_key" ON "WhatsAppConversation"("businessId", "id");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_conversationId_occurredAt_idx" ON "WhatsAppMessage"("conversationId", "occurredAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_businessId_status_idx" ON "WhatsAppMessage"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_businessId_providerMessageId_key" ON "WhatsAppMessage"("businessId", "providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_businessId_clientToken_key" ON "WhatsAppMessage"("businessId", "clientToken");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_businessId_id_key" ON "WhatsAppMessage"("businessId", "id");

-- CreateIndex
CREATE INDEX "WhatsAppMedia_businessId_mediaId_idx" ON "WhatsAppMedia"("businessId", "mediaId");

-- CreateIndex
CREATE INDEX "WhatsAppMedia_messageId_idx" ON "WhatsAppMedia"("messageId");

-- CreateIndex
CREATE INDEX "WhatsAppMedia_state_createdAt_idx" ON "WhatsAppMedia"("state", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMedia_businessId_messageId_mediaId_key" ON "WhatsAppMedia"("businessId", "messageId", "mediaId");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_businessId_status_idx" ON "WhatsAppTemplate"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_businessId_name_language_key" ON "WhatsAppTemplate"("businessId", "name", "language");

-- CreateIndex
CREATE INDEX "BenchmarkSnapshot_businessId_computedAt_idx" ON "BenchmarkSnapshot"("businessId", "computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BenchmarkSnapshot_businessId_key" ON "BenchmarkSnapshot"("businessId");

-- CreateIndex
CREATE INDEX "Business_postalCode_idx" ON "Business"("postalCode");

-- CreateIndex
CREATE INDEX "Business_latitude_longitude_idx" ON "Business"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "MaitrGuest_businessId_phoneE164_key" ON "MaitrGuest"("businessId", "phoneE164");

-- CreateIndex
CREATE UNIQUE INDEX "MaitrGuest_businessId_id_key" ON "MaitrGuest"("businessId", "id");

-- CreateIndex
CREATE INDEX "ChannelConnection_waPhoneNumberId_idx" ON "ChannelConnection"("waPhoneNumberId");

-- CreateIndex
CREATE INDEX "ChannelConnection_wabaId_idx" ON "ChannelConnection"("wabaId");

-- CreateIndex (HANDGESCHRIEBEN, nicht von migrate diff erzeugt)
-- Metas phone_number_id ist der EINZIGE Anker, an dem ein eingehender Webhook einem
-- Betrieb zugeordnet werden kann: Meta stellt die Webhooks aller Betriebe an EINE
-- App-URL zu, die HMAC beweist nur den Absender, entry[].id ist bloss die WABA.
-- Die Nummer muss deshalb eindeutig genau einem Betrieb gehoeren, sonst landet das
-- Gespraech eines Gastes im falschen Mandanten - ein Leck, das keine Middleware
-- abfaengt, weil es beim SCHREIBEN passiert.
-- TEILBEDINGUNG statt globalem UNIQUE (Prisma kann sie nicht ausdruecken): Eine
-- tote REVOKED-Zeile blockierte sonst dauerhaft die Neuvergabe derselben Nummer an
-- einen anderen Betrieb, obwohl Meta sie laengst weitergereicht hat - das Onboarding
-- des neuen Betriebs schluege fehl oder ein Upsert ueberschriebe den Altdatensatz,
-- und bis dahin liefen dessen Gastnachrichten zum Vorbesitzer.
-- Dazu gehoeren zwei Regeln im Code: waPhoneNumberId wird beim Uebergang auf
-- REVOKED/EXPIRED auf NULL gesetzt, und erst geschrieben, nachdem
-- GET /{phone_number_id} mit dem EIGENEN Token erfolgreich war (isVerified = true).
CREATE UNIQUE INDEX "ChannelConnection_waPhoneNumberId_active_key"
  ON "ChannelConnection"("waPhoneNumberId") WHERE "status" = 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "ChannelConnection_businessId_id_key" ON "ChannelConnection"("businessId", "id");

-- AddForeignKey
ALTER TABLE "StampProgram" ADD CONSTRAINT "StampProgram_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StampCard" ADD CONSTRAINT "StampCard_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StampCard" ADD CONSTRAINT "StampCard_businessId_programId_fkey" FOREIGN KEY ("businessId", "programId") REFERENCES "StampProgram"("businessId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StampCard" ADD CONSTRAINT "StampCard_businessId_guestId_fkey" FOREIGN KEY ("businessId", "guestId") REFERENCES "MaitrGuest"("businessId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StampEvent" ADD CONSTRAINT "StampEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StampEvent" ADD CONSTRAINT "StampEvent_businessId_stampCardId_fkey" FOREIGN KEY ("businessId", "stampCardId") REFERENCES "StampCard"("businessId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StampEvent" ADD CONSTRAINT "StampEvent_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletDeviceRegistration" ADD CONSTRAINT "WalletDeviceRegistration_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletDeviceRegistration" ADD CONSTRAINT "WalletDeviceRegistration_businessId_stampCardId_fkey" FOREIGN KEY ("businessId", "stampCardId") REFERENCES "StampCard"("businessId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_businessId_guestId_fkey" FOREIGN KEY ("businessId", "guestId") REFERENCES "MaitrGuest"("businessId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_businessId_conversationId_fkey" FOREIGN KEY ("businessId", "conversationId") REFERENCES "WhatsAppConversation"("businessId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMedia" ADD CONSTRAINT "WhatsAppMedia_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMedia" ADD CONSTRAINT "WhatsAppMedia_businessId_messageId_fkey" FOREIGN KEY ("businessId", "messageId") REFERENCES "WhatsAppMessage"("businessId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkSnapshot" ADD CONSTRAINT "BenchmarkSnapshot_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

