-- Rueckweg zur Migration 20260915_add_presence_snapshot
-- Datum: 2026-09-15
--
-- Nur anwenden, wenn die oeffentliche Praesenzpruefung wieder entfernt werden
-- soll. Die Tabelle haelt ausschliesslich Rohdaten zweier Fremdabrufe, die sich
-- jederzeit neu holen lassen (POST /api/maitr/venues/:venueId/presence/refresh).
-- Ein Rueckbau kostet also keine Daten, die sich nicht rekonstruieren liessen.
--
-- WAS NACH DEM RUECKBAU PASSIERT:
-- - GET /presence antwortet mit status "ausstehend" bzw. "kein_schluessel" und
--   einem Bericht, der nur auf Maitr-Wissen beruht (ladeSnapshot faengt die
--   fehlende Tabelle ab).
-- - POST /presence/refresh holt Google und Website weiter ab und antwortet mit
--   dem frischen Stand - nur speichern kann er ihn nicht mehr (Warnung im Log).
-- - Das Tagesbriefing rechnet wie vor der Einfuehrung ohne Google-Daten.

DROP TABLE IF EXISTS "PresenceSnapshot";
