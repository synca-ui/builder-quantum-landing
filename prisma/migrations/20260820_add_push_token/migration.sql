-- Migration: Expo-Push-Tokens fuer die Betreiber-App
-- Datum: 2026-08-20
-- Zweck: Neue Reservierungsanfragen sollen die Maitr-App per Push erreichen.
--        Ein Token gehoert dem NUTZERKONTO (User), nicht dem Betrieb - wer in
--        mehreren Betrieben Mitglied ist, bekommt auf demselben Geraet die
--        Anfragen aller seiner Betriebe. Der Versand aufloest zur Sendezeit
--        Betrieb -> BusinessMember -> PushToken (server/services/push.ts).
--        "token" ist unique: meldet sich auf einem Geraet ein anderes Konto an,
--        wandert das Token per Upsert mit - sonst bekaeme der Vorgaenger die
--        Pushes des Nachfolgers.
--
-- Erzeugt mit (lokal, OHNE Datenbankverbindung - die Produktionsdatenbank wurde
-- nicht angefasst):
--   npx prisma migrate diff --from-schema-datamodel <schema vor PushToken> \
--                           --to-schema-datamodel prisma/schema.prisma --script

-- CreateTable
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'unknown',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
CREATE INDEX "PushToken_userId_idx" ON "PushToken"("userId");

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
