-- Rueckweg zur Migration 20260805_add_loyalty_wallet_whatsapp
-- Datum: 2026-08-05
--
-- ═══ REIHENFOLGE, UND WARUM SIE NICHT DIE DER VORLAGEN IST ════════════════════
-- Die bisherigen Rollback-Dateien raeumen "erst Tabellen, dann Spalten, dann Typen"
-- ab. Das reicht hier nicht: Die neuen Unique-Indizes MaitrGuest_businessId_id_key
-- und ChannelConnection_businessId_id_key sind ZIELE zusammengesetzter
-- Fremdschluessel aus den neuen Tabellen. Sie lassen sich erst entfernen, nachdem
-- die referenzierenden Tabellen weg sind - und deren Fremdschluessel verschwinden
-- nur mit DROP TABLE. Deshalb streng:
--   1. alle neun neuen Tabellen (damit fallen alle Fremdschluessel),
--   2. die Sequenz,
--   3. die Indizes auf den Bestandstabellen,
--   4. die neuen Spalten der Bestandstabellen,
--   5. die neun neuen Typen.
--
-- ACHTUNG: DROP TABLE loescht unwiderruflich. Zum Zeitpunkt des Einspielens sind
-- alle neun Tabellen leer, ein sofortiger Rueckweg kostet also nichts. Sobald
-- Stempelkarten ausgegeben wurden, ist das anders: StampEvent ist das einzige, was
-- sich am Stempelstand NICHT ausrechnen laesst, und die Paesse in den Wallets der
-- Gaeste verweisen ins Leere. WhatsAppMedia zu loeschen entfernt ausserdem den
-- einzigen Zeiger (storagePath) auf die Dateien im privaten Speicher - die Objekte
-- muessen VOR diesem Rueckbau geloescht werden, sonst liegen Gaestefotos Dritter
-- unauffindbar im Bucket.
--
-- Der Enum-Wert 'WHATSAPP' gehoert zur Schwesterdatei
-- 20260805_add_whatsapp_provider/rollback.sql und bleibt dauerhaft im Typ -
-- PostgreSQL kennt kein "ALTER TYPE ... DROP VALUE".
--
-- Die drei Ortsspalten auf Business und die Mock-Kennzeichen zu entfernen ist
-- verlustbehaftet, sobald sie gepflegt werden. Wer nur die neuen Funktionen
-- zurueckbauen will, laesst Schritt 4 aus - die Spalten stoeren nicht, sind nullbar
-- oder haben Vorgabewerte.
--
-- MaitrReview.replyStatus faellt mit Schritt 4; der Backfill ist damit ebenfalls
-- weg. repliedAt bleibt unangetastet und traegt die Aussage "beantwortet" wieder
-- allein - der Zustand vor dieser Migration.

SET lock_timeout = '3s';
SET statement_timeout = '60s';

-- 1. Neue Tabellen (Reihenfolge innerhalb des Blocks egal, DROP TABLE nimmt die
--    Fremdschluessel mit; von unten nach oben der Kette, damit es auch ohne
--    CASCADE laeuft).
DROP TABLE IF EXISTS "BenchmarkSnapshot";
DROP TABLE IF EXISTS "WhatsAppTemplate";
DROP TABLE IF EXISTS "WhatsAppMedia";
DROP TABLE IF EXISTS "WhatsAppMessage";
DROP TABLE IF EXISTS "WhatsAppConversation";
DROP TABLE IF EXISTS "WalletDeviceRegistration";
DROP TABLE IF EXISTS "StampEvent";
DROP TABLE IF EXISTS "StampCard";
DROP TABLE IF EXISTS "StampProgram";

-- 2. Sequenz (erst nach StampCard, sie wird von dessen Schreibpfad gezogen).
DROP SEQUENCE IF EXISTS "wallet_pass_update_seq";

-- 3. Indizes auf den Bestandstabellen. Jetzt erst moeglich: die zusammengesetzten
--    Fremdschluessel darauf sind mit den Tabellen aus Schritt 1 verschwunden.
DROP INDEX IF EXISTS "MaitrGuest_businessId_phoneE164_key";
DROP INDEX IF EXISTS "MaitrGuest_businessId_id_key";
DROP INDEX IF EXISTS "ChannelConnection_waPhoneNumberId_active_key";
DROP INDEX IF EXISTS "ChannelConnection_waPhoneNumberId_idx";
DROP INDEX IF EXISTS "ChannelConnection_wabaId_idx";
DROP INDEX IF EXISTS "ChannelConnection_businessId_id_key";
DROP INDEX IF EXISTS "Business_postalCode_idx";
DROP INDEX IF EXISTS "Business_latitude_longitude_idx";

-- 4. Neue Spalten der Bestandstabellen (optional, siehe Kopf).
ALTER TABLE "Business"
  DROP COLUMN IF EXISTS "postalCode",
  DROP COLUMN IF EXISTS "latitude",
  DROP COLUMN IF EXISTS "longitude";

ALTER TABLE "MaitrGuest"
  DROP COLUMN IF EXISTS "phoneE164",
  DROP COLUMN IF EXISTS "email",
  DROP COLUMN IF EXISTS "isMock",
  DROP COLUMN IF EXISTS "anonymizedAt";

ALTER TABLE "MaitrReview"
  DROP COLUMN IF EXISTS "author",
  DROP COLUMN IF EXISTS "replyText",
  DROP COLUMN IF EXISTS "replyStatus",
  DROP COLUMN IF EXISTS "replyError",
  DROP COLUMN IF EXISTS "isMock";

ALTER TABLE "MaitrEngagementPoint"
  DROP COLUMN IF EXISTS "isMock";

ALTER TABLE "ChannelConnection"
  DROP COLUMN IF EXISTS "isVerified",
  DROP COLUMN IF EXISTS "verifiedAt",
  DROP COLUMN IF EXISTS "waPhoneNumberId",
  DROP COLUMN IF EXISTS "wabaId",
  DROP COLUMN IF EXISTS "waDisplayPhone",
  DROP COLUMN IF EXISTS "isMock";

-- 5. Neue Typen. Erst jetzt, weil die Spalten aus Schritt 4 sie halten.
DROP TYPE IF EXISTS "BenchmarkCohort";
DROP TYPE IF EXISTS "WhatsAppMediaState";
DROP TYPE IF EXISTS "WhatsAppTemplateStatus";
DROP TYPE IF EXISTS "WhatsAppMessageStatus";
DROP TYPE IF EXISTS "WhatsAppDirection";
DROP TYPE IF EXISTS "StampEventSource";
DROP TYPE IF EXISTS "StampEventKind";
DROP TYPE IF EXISTS "StampCardStatus";
DROP TYPE IF EXISTS "ReviewReplyStatus";
