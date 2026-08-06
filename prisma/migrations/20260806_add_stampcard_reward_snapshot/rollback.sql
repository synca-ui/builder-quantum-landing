-- Rueckweg zur Migration 20260806_add_stampcard_reward_snapshot
-- Datum: 2026-08-06
--
-- ACHTUNG - WAS DIESER RUECKWEG KOSTET:
-- Die Spalte traegt die Zusage, die dem Gast zum Zeitpunkt der Ausgabe gemacht
-- wurde. Wird sie entfernt, faellt das Lesen ueberall auf
-- `card.rewardText ?? program.rewardText` zurueck - und damit auf den AKTUELLEN
-- Programmtext. Jede Karte, deren Zusage inzwischen von einer Praemienaenderung
-- abweicht, zeigt danach die neue Praemie, auch die volle Karte des Gastes, der
-- morgen seinen Kaffee abholen wollte. Das ist genau der Zustand, den die Migration
-- beendet hat. Der Rueckweg ist deshalb nur vertretbar, solange keine
-- Praemienaenderung stattgefunden hat.
--
-- Der ALTE Code laeuft ohne die Spalte einwandfrei (er kennt sie nicht). Der NEUE
-- Code laeuft NICHT: er schreibt sie in POST /loyalty/cards und in PATCH
-- /loyalty/program. Reihenfolge deshalb: erst den Code zurueckrollen, DANN diese
-- Datei. Andersherum enden beide Pfade mit 42703 - was der Router als 503
-- "loyalty_nicht_eingerichtet" ausweist, also lesbar, aber funktionslos.
--
-- Kein Datenverlust ausserhalb dieser einen Spalte: Karten, Hauptbuch (StampEvent),
-- Zaehlerstand und Wallet-Kennungen bleiben unberuehrt.

SET lock_timeout = '3s';
SET statement_timeout = '60s';

ALTER TABLE "StampCard" DROP COLUMN IF EXISTS "rewardText";
