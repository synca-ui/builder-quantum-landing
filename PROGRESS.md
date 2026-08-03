# Fortschritt — Nachtlauf 03./04.08.2026

Branch: `chore/maitr-backend-und-sicherheitsfixes` (auf main aufgesetzt, nichts gepusht)

## Abweichung von der Vorgabe, vorab

Die angeforderten Agenten `worker-haiku`, `worker-sonnet`, `verifier` und
`verifier-strict` gibt es in dieser Umgebung nicht. Verfügbar sind
`general-purpose`, `Explore`, `Plan`, `claude`, `claude-code-guide`.
Umgesetzt wurde dieselbe Struktur mit anderen Mitteln: parallele
`general-purpose`-Agenten mit Modellwahl je nach Aufgabenart, danach je eine
getrennte Prüfrunde mit widerlegendem Auftrag — bei sicherheitsrelevanten
Änderungen mit verschärftem Prüfauftrag und höherem Denkaufwand.

`MAITR_API_BASE_URL` in Railway zu setzen ist mir nicht möglich (kein Zugriff).
Bleibt offen für dich.

## Stand der fünf Aufgaben

| # | Aufgabe | Status | Prüfurteil Runde 1 |
|---|---------|--------|------------|
| 1 | Entscheidungsvorlage Branch | Nachbesserung läuft | ❌ 8 statt 4 PP-Frama-Dateien übersehen |
| 2 | `/check-landing` bereinigen | ✅ + Nachbesserung | ✅ bestanden, ein Folgemangel |
| 3 | Backend verdrahten | **fertig** | siehe unten |
| 4 | Prerender-Build reparieren | ✅ **fertig** | ✅ bestanden |
| 5a | Schriften (EAS/Lizenz) | Nachbesserung läuft | ❌ Änderung war wirkungslos |
| 5b | Screenshots-Doku | Nachbesserung läuft | ❌ zwei Falschangaben |
| 5c | Kontolöschung | Nachbesserung läuft | ❌ Medien wurden nicht gelöscht |
| — | App: Tische → Bewertungen | läuft | — |

## Der schwerwiegendste Fund der Nacht

**Acht nicht weiterverteilbare Schriftdateien liegen committet in einem öffentlichen Repo.**

PP Frama ist „Free for Personal Use" (Pangram Pangram). Betroffen sind
`mobile/assets/fonts/PPFrama*.otf` (4) **und** dieselben vier noch einmal unter
`mobile/android/app/src/main/assets/fonts/`. Sie werden zusätzlich per `expo-font`
nativ in die App eingebettet. `docs/deployment/APP_STORE_SUBMISSION.md:42` nennt das
selbst einen rechtlichen Blocker.

Der erste Anlauf hat nur einen `.gitignore`-Kommentar umformuliert — wirkungslos, weil
`.gitignore` auf bereits getrackte Dateien nicht wirkt. Die Nachbesserung entfernt die
Dateien und fällt auf die Systemschrift zurück. Die **Entscheidung über die
Markenschrift** bleibt bei dir: Lizenz erwerben oder auf eine offene Schrift wechseln.
Auf `chore/track-mobile-app-and-security-fixes` läge mit Bricolage Grotesque und
Familjen Grotesk bereits eine SIL-OFL-Lösung — das ist Teil der Branch-Entscheidung.

## Zu den angeforderten Befehlen

`/security-review` ist verfügbar und läuft am Ende gegen den gesammelten Diff.
`/ultrareview` kann ich nicht selbst starten — das ist nutzergetriggert und
kostenpflichtig; du müsstest `/code-review ultra` selbst aufrufen. `/design` und
`/verify` gibt es in dieser Umgebung nicht; die Prüfung übernehmen die Gegenproben.

## Aufgabe 3 — Backend verdrahten (fertig)

Die vier Schritte aus deiner Vorgabe, in deiner Reihenfolge:

1. **`@maitr/core` auflösbar** — Alias in vier Konfigurationen, weil es keine
   Workspaces gibt und `packages/core` auf rohe `.ts`-Dateien zeigt: `tsconfig.json`,
   `vite.config.server.ts`, `vite.config.ts`, `vitest.config.ts`. Commit `94237a3`.
2. **`maitrRouter` + `registerMaitrWebhooks` gemountet** — Router unter `/api/maitr`,
   Webhooks oberhalb von `express.json()` wegen der HMAC über den Rohbody.
   Am laufenden Server belegt: `/api/maitr/venues` → `401 {"error":"Missing token"}`
   statt 404. Commit `94237a3`.
3. **Prisma-Migration eingespielt** — Commits `6a4dc10` (SQL) und `0344b2b` (Rückweg).
   Vorher: Unterschied Live-DB zu Schema zeichengleich mit der Datei, 119 Zeilen,
   keine `DROP`-Anweisung. Nachher: `migrate diff` meldet „This is an empty
   migration". Alle fünf Tabellen existieren, `Business` hatte 0 Zeilen — es waren
   also keine Bestandsdaten betroffen. `rollback.sql` liegt daneben.
4. **`MAITR_API_BASE_URL`** — **kann ich nicht**, kein Railway-Zugriff. Für dich.

Zusätzlich: `syncAll` hat jetzt einen Zeitgeber (`3bf689e`), standardmäßig **aus**,
schaltet sich erst mit `MAITR_SYNC_INTERVAL_MINUTES` ein.

## Offene Fragen an dich

1. **Railway-Variablen setzen** — ohne `MAITR_API_BASE_URL`, `MAITR_ENCRYPTION_KEY`,
   `MAITR_OAUTH_STATE_SECRET`, `MAITR_APP_DEEP_LINK`, `GOOGLE_CLIENT_ID/SECRET`,
   `META_APP_ID/SECRET`, `META_WEBHOOK_VERIFY_TOKEN` bleiben die OAuth-Routen tot.
   Erst danach existiert die Callback-URL, auf die Meta wartet.
2. **Soll der Sync laufen?** Wenn ja: `MAITR_SYNC_INTERVAL_MINUTES` setzen (ab 5).
