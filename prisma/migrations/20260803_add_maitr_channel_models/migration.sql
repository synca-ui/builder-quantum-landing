-- Migration: Maitr-Kanalmodelle und Business-Erweiterungen
-- Datum: 2026-08-03
-- Zweck: Tabellen fuer die Anbindung von Google Business Profile und Meta
--        (Bewertungen, Reichweite, verschluesselte OAuth-Token, Insights-Cache),
--        die server/maitr und packages/core voraussetzen.
--
-- Erzeugt mit:
--   prisma migrate diff --from-schema-datamodel <schema auf main> \
--                       --to-schema-datamodel prisma/schema.prisma --script
--
-- Rein additiv: keine DROP-Anweisung, keine Aenderung bestehender Spalten.
-- Die vier neuen Business-Spalten haben Vorgabewerte oder sind nullbar, ein
-- Datenverlust ist also ausgeschlossen. Bestandszeilen bekommen
-- timezone='Europe/Berlin', averageCheck=9, tags='{}', profileSignals=NULL.
--
-- ANWENDEN: Dieses Repo fuehrt KEINE gueltige Prisma-Migrationshistorie
-- (prisma/migrations enthaelt eine lose .sql und einen Ordner ohne
-- Zeitstempel), "prisma migrate deploy" laeuft hier also nicht. Diese Datei
-- ist zum Nachvollziehen und zum manuellen Einspielen gedacht. Solange das
-- Backend nicht gemountet ist, wird sie von nichts gebraucht.

-- CreateEnum
CREATE TYPE "ChannelProvider" AS ENUM ('GOOGLE', 'META');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "averageCheck" DOUBLE PRECISION NOT NULL DEFAULT 9,
ADD COLUMN     "profileSignals" JSONB,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Europe/Berlin';

-- CreateTable
CREATE TABLE "MaitrGuest" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "firstVisit" TIMESTAMP(3) NOT NULL,
    "lastVisit" TIMESTAMP(3) NOT NULL,
    "visits" INTEGER NOT NULL DEFAULT 1,
    "noShows" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaitrGuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaitrReview" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "createdAtSource" TIMESTAMP(3) NOT NULL,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaitrReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaitrEngagementPoint" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "actions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MaitrEngagementPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelConnection" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "provider" "ChannelProvider" NOT NULL,
    "accountId" TEXT NOT NULL,
    "encAccessToken" TEXT NOT NULL,
    "encRefreshToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsightsCache" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" JSONB NOT NULL,

    CONSTRAINT "InsightsCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaitrGuest_businessId_lastVisit_idx" ON "MaitrGuest"("businessId", "lastVisit");

-- CreateIndex
CREATE INDEX "MaitrReview_businessId_createdAtSource_idx" ON "MaitrReview"("businessId", "createdAtSource");

-- CreateIndex
CREATE UNIQUE INDEX "MaitrReview_businessId_source_externalId_key" ON "MaitrReview"("businessId", "source", "externalId");

-- CreateIndex
CREATE INDEX "MaitrEngagementPoint_businessId_at_idx" ON "MaitrEngagementPoint"("businessId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "MaitrEngagementPoint_businessId_source_at_key" ON "MaitrEngagementPoint"("businessId", "source", "at");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelConnection_businessId_provider_key" ON "ChannelConnection"("businessId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "InsightsCache_businessId_key" ON "InsightsCache"("businessId");

-- AddForeignKey
ALTER TABLE "MaitrGuest" ADD CONSTRAINT "MaitrGuest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaitrReview" ADD CONSTRAINT "MaitrReview_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaitrEngagementPoint" ADD CONSTRAINT "MaitrEngagementPoint_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelConnection" ADD CONSTRAINT "ChannelConnection_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsightsCache" ADD CONSTRAINT "InsightsCache_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

