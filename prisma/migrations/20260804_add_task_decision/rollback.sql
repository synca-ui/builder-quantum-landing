-- Rueckweg zur Migration 20260804_add_task_decision
-- Datum: 2026-08-04
--
-- Nur anwenden, wenn die Aufgaben-Entscheidungen wieder entfernt werden sollen.
-- Reihenfolge umgekehrt zur Migration: erst die Tabelle (sie haelt den Enum), dann
-- der Typ. Die Fremdschluessel verschwinden mit der Tabelle, brauchen also keine
-- eigene Anweisung.
--
-- ACHTUNG: DROP TABLE loescht die Freigaben unwiderruflich. Zum Zeitpunkt des
-- Einspielens ist die Tabelle leer, ein sofortiger Rueckweg kostet also nichts.
-- Sobald Betriebe Aufgaben freigegeben haben, ist das anders: Die Entscheidungen
-- lassen sich NICHT rekonstruieren - sie sind das einzige, was am Tagesbriefing
-- nicht ausgerechnet werden kann. Nach dem Rueckbau erscheint jede bereits
-- freigegebene Aufgabe wieder als offen, solange ihre Grundlage besteht.
--
-- WAS NACH DEM RUECKBAU PASSIERT, genau:
--
-- - GET /briefing/today laeuft WEITER. loadDecisions in server/maitr/briefing.ts
--   faengt die fehlende Tabelle ab und liefert eine leere Karte; jede Aufgabe gilt
--   dann als offen - der Zustand vor der Einfuehrung. Der Startbildschirm der App
--   bleibt also bedienbar. Dieselbe Vorkehrung deckt den umgekehrten Fall ab:
--   Der Code landet ueber main automatisch auf Railway, die Migration spielt ein
--   Mensch von Hand ein. In dem Fenster dazwischen fehlt die Tabelle ebenfalls.
--
-- - POST /briefing/tasks/:id/approve und PATCH /briefing/tasks/:id antworten mit
--   500. Das ist beabsichtigt und nicht zu heilen: Ohne Tabelle gibt es nichts,
--   worauf eine Freigabe geschrieben werden koennte. Ein stiller Erfolg waere
--   schlimmer - der Betrieb haelte die Aufgabe fuer erledigt.
--
-- Wer den Rueckbau dauerhaft will, baut deshalb nur diese beiden Routen zurueck.
-- server/maitr/briefing.ts kann bleiben, wie es ist.

DROP TABLE IF EXISTS "TaskDecision";

DROP TYPE IF EXISTS "TaskDecisionState";
