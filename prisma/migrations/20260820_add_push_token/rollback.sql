-- Rollback zu 20260820_add_push_token: entfernt die Push-Token-Tabelle wieder.
-- Verlustbehaftet nur fuer die Tokens selbst - die registriert jede App beim
-- naechsten Start neu.
DROP TABLE IF EXISTS "PushToken";
