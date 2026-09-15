/**
 * Wanduhr ↔ Zeitpunkt in der Zeitzone eines Betriebs.
 *
 * Die Rechnung liegt seit 15.09.2026 in `@maitr/core/zeitzone`, damit Server,
 * Web-Dashboard, Reservierungsformulare, Gast-Verwaltungsseite und App dieselbe
 * Semantik teilen (Anlass und Einzelheiten dort). Diese Datei bleibt als
 * Durchreiche, damit bestehende Server-Importe unverändert gelten.
 */
export * from "@maitr/core/zeitzone";
