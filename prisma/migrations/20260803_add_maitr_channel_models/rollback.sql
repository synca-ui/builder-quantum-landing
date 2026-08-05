-- Rueckweg zur Migration 20260803_add_maitr_channel_models
-- Datum: 2026-08-03
--
-- Nur anwenden, wenn die Maitr-Kanaele wieder entfernt werden sollen. Die
-- Reihenfolge ist umgekehrt zur Migration: erst die Tabellen mit Fremdschluessel
-- auf Business, dann die Spalten, dann die Enums.
--
-- ACHTUNG: DROP TABLE loescht die enthaltenen Daten unwiderruflich. Zum Zeitpunkt
-- des Einspielens waren alle fuenf Tabellen leer, ein sofortiger Rueckweg kostet
-- also nichts. Sobald echte Kanalverbindungen bestehen, ist das anders - dann
-- enthaelt ChannelConnection die verschluesselten OAuth-Token, und ein DROP
-- zwingt jedes Restaurant zum Neuverbinden.
--
-- Die vier Business-Spalten zu entfernen ist ebenfalls verlustbehaftet, sobald
-- sie gepflegt werden (timezone weicht dann pro Betrieb ab). Wer nur die
-- Kanaele zurueckbauen will, sollte die Spalten stehen lassen - sie stoeren
-- nicht und haben Vorgabewerte.

DROP TABLE IF EXISTS "InsightsCache";
DROP TABLE IF EXISTS "ChannelConnection";
DROP TABLE IF EXISTS "MaitrEngagementPoint";
DROP TABLE IF EXISTS "MaitrReview";
DROP TABLE IF EXISTS "MaitrGuest";

ALTER TABLE "Business"
  DROP COLUMN IF EXISTS "averageCheck",
  DROP COLUMN IF EXISTS "profileSignals",
  DROP COLUMN IF EXISTS "tags",
  DROP COLUMN IF EXISTS "timezone";

DROP TYPE IF EXISTS "ConnectionStatus";
DROP TYPE IF EXISTS "ChannelProvider";
