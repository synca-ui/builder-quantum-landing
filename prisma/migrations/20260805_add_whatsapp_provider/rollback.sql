-- Rueckweg zur Migration 20260805_add_whatsapp_provider
-- Datum: 2026-08-05
--
-- ACHTUNG, das Wichtigste zuerst: Der Enum-Wert 'WHATSAPP' BLEIBT DAUERHAFT im Typ
-- "ChannelProvider". PostgreSQL kennt kein "ALTER TYPE ... DROP VALUE".
--
-- Die Vorlage der letzten Migration (20260803) endet mit
--   DROP TYPE IF EXISTS "ChannelProvider";
-- Das war dort richtig, weil 20260803 den Typ selbst ANGELEGT hat. Hier wird er nur
-- ERWEITERT. Wer die Vorlage kopiert, schreibt ein DROP TYPE, das an den
-- Abhaengigkeiten von ChannelConnection.provider scheitert - und wer die Zeile
-- weglaesst, hat einen Rueckweg, der stillschweigend unvollstaendig ist.
--
-- Ein toter Enum-Wert stoert nichts, solange keine Zeile ihn fuehrt. Genau das
-- stellt die folgende Anweisung sicher; ohne sie schluege jeder spaetere echte
-- Typumbau fehl.
--
-- ACHTUNG: Das DELETE entfernt die verschluesselten WhatsApp-Zugangsdaten
-- unwiderruflich. Betroffene Betriebe muessen neu verbinden. Die Gespraeche und
-- Nachrichten haengen NICHT an der Verbindung (WhatsAppConversation fuehrt bewusst
-- keine connectionId) und bleiben davon unberuehrt - sie verschwinden erst mit der
-- Schwester-Rollbackdatei.

SET lock_timeout = '3s';
SET statement_timeout = '60s';

DELETE FROM "ChannelConnection" WHERE "provider" = 'WHATSAPP';
