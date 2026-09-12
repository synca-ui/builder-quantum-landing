# Stand — 5. August 2026

Der Punkt, von dem aus weitergearbeitet wird. Kein Verlaufsprotokoll: hier steht
nur, was **jetzt gilt** und was der nächste Schritt voraussetzt.

---

## Produktion

| | |
|---|---|
| `main` | `6d2d508` — gepusht, Netlify + Railway ziehen automatisch nach |
| API | `https://www.maitr.de/api` — `/api/ping` 200, `/api/maitr/venues` 401 |
| Datenbank | Neon, Schema **aktuell** (`prisma migrate status`: „up to date") |
| Tests | 553 grün, 36 Dateien |
| Typfehler | 108 — Altbestand, unverändert seit Beginn der Arbeit |

### Migrationshistorie ist jetzt intakt

Vorher gab es **keine** `_prisma_migrations`-Tabelle: die früheren Migrationen
waren von Hand eingespielt worden, ohne Eintrag. `prisma migrate deploy` hätte
versucht, alles erneut anzulegen, und wäre an „relation already exists"
gescheitert.

Alle fünf Migrationen sind jetzt als eingespielt vermerkt (`migrate resolve
--applied`). **Ab hier gilt der normale Weg**: neue Migration als Ordner unter
`prisma/migrations/`, dann `prisma migrate deploy`. Nicht mehr von Hand.

### Reihenfolge beim nächsten Mal

Migration **vor** dem Deploy einspielen, nicht danach. Prisma erzeugt nie
`SELECT *`, sondern listet jede Spalte einzeln auf — Code, der eine Spalte
erwartet, die es noch nicht gibt, bekommt einen Postgres-Fehler, keinen
`null`-Wert.

---

## Datenmodell (Schritt 1, fertig)

64 Modelle und Enums, davon 18 neu. **Aufgebaut auf dem Bestand**, nicht daneben:

| Wunsch aus der Aufgabenstellung | Heißt im Repo |
|---|---|
| `Restaurant` | `Business` |
| `ChannelAuth` | `ChannelConnection` |
| `Customer` | `MaitrGuest` |
| `Review` | `MaitrReview` |

Ein zweites Modell je Sache hätte zwei Wahrheiten ergeben — Reservierungen,
Speisekarte und die Tests hängen alle an den bestehenden Namen.

**Neu:** `StampProgram`, `StampCard`, `StampEvent`, `WalletDeviceRegistration`,
`WhatsAppConversation`, `WhatsAppMessage`, `WhatsAppMedia`, `WhatsAppTemplate`,
`BenchmarkSnapshot`.

### Drei Entwurfsentscheidungen, die Schritt 2–4 tragen

1. **`StampEvent` ist das Hauptbuch**, `StampCard.currentStamps` nur Lese-Cache.
   Wer den Scan-Endpunkt baut, schreibt ein Ereignis und leitet den Zähler ab —
   nicht umgekehrt. Sonst ist keine Reklamation mehr klärbar.
2. **Der Scan-Token liegt gehasht an der Karte**, nicht am Gast, und ist
   `@@unique([businessId, scanTokenHash])`. Global eindeutig hätte `findUnique`
   die Karte eines fremden Betriebs geliefert.
3. **Apple und Google sind nicht symmetrisch.** Apples Push-Token gehört zum
   **Gerät** (`WalletDeviceRegistration`), Google Wallet hat gar keinen
   Pass-Token — dort sind `googleObjectId` und `googleClassId` das Dauerhafte.

### `isMock` ist bereits im Schema

`ChannelConnection.isMock` und `MaitrEngagementPoint.isMock` existieren. Schritt 2
baut darauf auf: Mock-Daten sind in der Datenbank **erkennbar** und müssen nicht
über eine getrennte Ablage laufen.

---

## Was Schritt 2 voraussetzt

Service-Layer mit Mock-Umschaltung über `ENABLE_PRODUCTION_APIS`.

- `packages/core/src/integrations/` hat bereits `connectors.google` und
  `connectors.meta` hinter einem `FetchLike`-Interface — dort ist der Anbieter
  sauber austauschbar.
- **Aber:** `server/maitr/routes.ts` und `server/maitr/sync.ts` bauen sich je ein
  modul-privates `fetchLike` um das globale `fetch`. `exchangeCode` und
  `refreshGoogle` nehmen keinen Parameter dafür. Ein Doppelgänger geht dort nur
  über `vi.stubGlobal("fetch")`. Wer den Mock-Schalter baut, sollte diese Naht
  mitziehen — sonst ist die Umschaltung an zwei Stellen verschieden gelöst.
- `sync.ts` überspringt `WHATSAPP` bewusst (Nachrichten kommen über den Webhook).
  Abgesichert in `server/__tests__/maitrSyncWhatsApp.spec.ts`.

---

## Blockiert — und zwar nicht durch Code

| Was | Wer | Wirkung |
|---|---|---|
| **Clerk → Configure → Native applications einschalten** | du | Ohne das ist **keine Anmeldung** möglich. `Business` hat in Produktion 0 Zeilen — es existiert noch kein einziger echter Betrieb. |
| ~~`MAITR_*`-Variablen in Railway setzen~~ | **erledigt 11.9.** (per Railway-MCP) | Alle neun gesetzt: 5 echte Werte, `GOOGLE_*`/`META_APP_*` als `PLATZHALTER-bis-…-freigabe`. Deploy `098ce993` grün, Server startet, `/api/maitr/venues` → 401. `MAITR_ENCRYPTION_KEY` **nie rotieren**, im Dashboard auf „sealed" stellen. |
| `SUPABASE_SERVICE_ROLE_KEY` in Railway auf Projekt `qzsdrgvwoddqkvqxhxfi` umstellen | du | `SUPABASE_URL` zeigt seit 11.9. auf dieses Projekt; der Key ist sealed und stammt vermutlich vom gelöschten Vorgänger. Das Projekt pausiert auf dem Free-Tier nach Inaktivität (am 11.9. per MCP wieder hochgefahren). |
| Google „Business Profile API access" beantragen | du | ~60 Tage Vorlauf, ohne Freigabe ist die Quota **null**. Kritischer Pfad. Die Widerrufs-Frage im Antrag ist seit 11.9. beantwortbar (AUFGABEN.md C6). |
| Apple Developer Program (99 $) | du | Aktuelles Team ist ein kostenloses persönliches Team, damit ist keine Einreichung möglich. |
| Datenschutzerklärung + Nutzungsbedingungen | ich, offen | Voraussetzung für den Google-OAuth-Zustimmungsbildschirm **und** beide Stores. Der Lauf ist am Sitzungslimit gescheitert und muss wiederholt werden. |
| Store-Screenshots aus einem Release-Build | ich, offen | Der Release-Build scheiterte an voller Festplatte; Platz ist inzwischen da. |

`MAITR_API_BASE_URL` muss **`https://www.maitr.de/api`** sein — mit `/api` am
Ende und mit `www`. Beide Fallstricke würden erst **nach** der Google-Freigabe
auffallen.

---

## Offene Entscheidungen

Siehe [OFFENE_ENTSCHEIDUNGEN.md](OFFENE_ENTSCHEIDUNGEN.md). Aktuell: die
Abo-Preise. Sie sind aus der App entfernt, `price` ist optional geblieben —
Eintragen ist ein Einzeiler, kein Umbau.
