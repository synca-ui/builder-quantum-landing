# Fahrplan — Schritte 2 bis 5

Ausgangspunkt: [STAND.md](STAND.md). Schritt 1 (Datenmodell) ist fertig und
eingespielt.

Leitgedanke der Wartephase: **Alles, was ohne Google- und Meta-Freigabe gebaut
und geprüft werden kann, wird jetzt gebaut und geprüft.** Wo eine Freigabe
wirklich blockiert, steht das ausdrücklich dabei — und zwar getrennt danach, ob
sie den *Bau* blockiert oder nur den *Echtbetrieb*.

---

## Schritt 2 — Service-Layer mit Mock-Umschaltung

**Vollständig ohne Freigaben baubar und prüfbar.** Das ist der eigentliche
Hebel der Wartephase.

### Was entsteht

- `IGoogleBusinessService` und `IMetaService` als Schnittstellen.
- `MockGoogleBusinessService` / `MockMetaService` mit realistischen Daten:
  Bewertungen über den ganzen Sternebereich, mehrere Standorte, Antworten mit
  und ohne Text, Reichweitenverläufe mit Wochenrhythmus.
- `RealGoogleBusinessService` / `RealMetaService`, aktiv nur bei
  `ENABLE_PRODUCTION_APIS=true`.
- Fehlerbehandlung: **403** (Freigabe fehlt oder Quota null) muss eine
  verständliche Meldung erzeugen, nicht „unbekannter Fehler" — genau dieser Fall
  tritt während der Wartezeit dauernd ein. **401** löst den Token-Refresh aus;
  der Single-Flight-Lock dafür existiert bereits in `sync.ts`.

### Die Naht, die dabei mitgezogen wird

`packages/core/src/integrations/` ist über `FetchLike` sauber austauschbar.
`server/maitr/routes.ts` und `server/maitr/sync.ts` bauen sich dagegen je ein
**modul-privates `fetchLike`** um das globale `fetch`; `exchangeCode` und
`refreshGoogle` nehmen keinen Parameter dafür. Ein Doppelgänger geht dort nur
über `vi.stubGlobal("fetch")` — die grobe Kelle.

Wer den Mock-Schalter einbaut, ohne das zu vereinheitlichen, hat die Umschaltung
an zwei Stellen verschieden gelöst. Also mitziehen.

### Warum `isMock` im Schema steht

`ChannelConnection.isMock` und `MaitrEngagementPoint.isMock` existieren bereits.
Mock-Daten landen damit **in derselben Datenbank**, aber erkennbar. Zwei
Vorteile: Das Dashboard kann sie kennzeichnen statt echte Zahlen vorzutäuschen,
und beim Umschalten auf den Echtbetrieb sind sie gezielt löschbar, ohne echte
Daten mitzunehmen.

### Fertig, wenn

Der komplette Briefing-Weg läuft lokal mit Mock-Daten durch — von
`pullChannel` über `computeBriefing` bis zum Startbildschirm der App — und ein
Test belegt, dass `ENABLE_PRODUCTION_APIS=true` wirklich den echten Dienst
zieht und nicht still beim Mock bleibt.

---

## Schritt 3 — WhatsApp: Webhook und Medien

**Baubar und prüfbar ohne Freigabe.** Echter Versand und Empfang brauchen die
Meta-Freigabe; die Verarbeitung lässt sich mit nachgebildeten Meta-Nutzlasten
vollständig prüfen.

### Was entsteht

- `GET /api/webhooks/whatsapp` — Verifizierung: `hub.challenge` zurückgeben,
  wenn `hub.verify_token` zu `META_WEBHOOK_VERIFY_TOKEN` passt.
- `POST /api/webhooks/whatsapp` — Empfang von Nachrichten und Statusmeldungen.
- Medienweg: `media_id` → temporäre Download-Adresse anfordern → Datei sichern →
  als Gästefoto verknüpfen.
- `sendWhatsAppMessage(toPhone, text, imageUrl?)`.

### Drei Fallen, die hier scharf sind

1. **Signaturprüfung braucht den ROHEN Rumpf.** Meta signiert mit
   `X-Hub-Signature-256`. Wird der Rumpf vorher von `express.json()` geparst und
   neu serialisiert, stimmt die Signatur nicht mehr. Beim Clerk-Webhook im Repo
   ist genau diese Reihenfolge schon einmal zum Problem geworden — dort
   nachsehen, wie es gelöst wurde.
2. **Meta stellt Webhooks bei Fehlern erneut zu.** Ohne Idempotenzschlüssel
   entstehen Dubletten. Die Nachrichten-ID von Meta ist der Schlüssel; das
   Datenmodell trägt ihn bereits.
3. **Der Supabase-Bucket ist ÖFFENTLICH.** Jede Adresse darin funktioniert ohne
   Anmeldung. Gästefotos aus WhatsApp dort abzulegen hieße, private Bilder von
   Menschen öffentlich erreichbar zu machen. → **Entscheidung nötig**, bevor der
   Medienweg gebaut wird: eigener privater Bucket oder signierte Adressen.

### Das 24-Stunden-Fenster

Nach dem letzten Gast-Kontakt darf der Betrieb 24 Stunden frei antworten;
danach nur noch mit vorab genehmigter Vorlage. Wird das nicht beachtet, lehnt
Meta die Zustellung ab. `WhatsAppConversation` und `WhatsAppTemplate` tragen
das Modell dafür.

### Fertig, wenn

Ein Test spielt echte Meta-Nutzlasten ein (Text, Bild, Statusmeldung, doppelte
Zustellung) und belegt: richtig zugeordnet, nichts doppelt gespeichert,
gefälschte Signatur abgewiesen.

---

## Schritt 4 — Wallet-Stempelkarte

**Hier blockiert eine Freigabe wirklich — aber nur die Hälfte.**

| | Blockiert durch | |
|---|---|---|
| **Google Wallet** | nichts | Braucht nur einen Service-Account-Schlüssel aus der Google Cloud Console. **Unabhängig von der Business-Profile-Freigabe.** Vollständig baubar. |
| **Apple Wallet** | Apple Developer Program (99 $) | Ein signierter `.pkpass` braucht ein **Pass Type ID Zertifikat**, und das gibt es nur im bezahlten Programm. Struktur, Layout und der gesamte Web-Service sind ohne Zertifikat baubar und prüfbar — nur die Signatur nicht. |

### Vier Pakete fehlen noch

`passkit-generator`, `google-auth-library`, `jsonwebtoken`, `node-apn`.

### Was entsteht

- `/api/wallet/generate-pass?customerId=…` — Apple: `.pkpass` als `storeCard`
  mit QR und Stempelstand. Google: JWT-Save-Adresse.
- `/api/wallet/stamp` — Scan durch den Gastronomen: `StampEvent` schreiben,
  Zähler ableiten, dann APNs-Push (Apple) und `PATCH` (Google).
- Die vier PassKit-Web-Service-Endpunkte, die Apple verlangt: Gerät für einen
  Pass registrieren, geänderte Pässe abfragen, aktualisierten Pass ausliefern,
  Gerät abmelden.

### Was das Datenmodell hier schon vorgibt

- **`StampEvent` ist das Hauptbuch**, `currentStamps` nur Lese-Cache. Der
  Scan-Endpunkt schreibt ein Ereignis und leitet den Zähler ab — nicht
  umgekehrt. Sonst ist keine Reklamation mehr klärbar.
- **Doppelscan-Abwehr gehört in die Datenbank**, nicht in die Oberfläche.
- **Der Scan-Token liegt gehasht an der Karte** und ist nur je Betrieb
  eindeutig. Ein Scan darf nie die Karte eines fremden Betriebs treffen.

### Fertig, wenn

Google Wallet läuft echt durch (Pass anlegen, Stempel, Pass aktualisiert sich).
Apple läuft bis zur Signatur durch, mit einem Test, der belegt, dass der
`.pkpass` inhaltlich stimmt und nur das Zertifikat fehlt.

---

## Schritt 5 — Mock-Dashboard

**Ohne Freigaben baubar.**

- **Profil-Check-Score 0–100** aus Vollständigkeit: Öffnungszeiten, Fotos,
  Speisekarte, Beschreibung, Attribute, Antwortquote auf Bewertungen. Die
  Berechnung gehört in `@maitr/core`, damit App und Web dieselbe Zahl zeigen.
- **Autopilot-Simulation**: automatische Antwortvorschläge auf Bewertungen, die
  sichtbar als Vorschlag laufen und Freigabe brauchen. `TaskDecision` trägt den
  Zustand bereits.
- **Köln-Index / Nachbarschafts-Benchmark**: `BenchmarkSnapshot` steht im
  Schema. **Achtung Datenschutz**: Vergleichswerte müssen so aggregiert sein,
  dass sich daraus kein einzelner Betrieb ableiten lässt — die Differenz zweier
  Kohorten darf keine Einzelauskunft ergeben.

---

## Parallel, unabhängig von 2–5

| Aufgabe | Warum jetzt | Wer |
|---|---|---|
| **Datenschutz + Nutzungsbedingungen** | Voraussetzung für den Google-OAuth-Zustimmungsbildschirm — **blockiert den 60-Tage-Antrag**. Der Lauf ist am Sitzungslimit gescheitert und muss wiederholt werden. | ich |
| Store-Screenshots aus Release-Build | Der bisherige Satz zeigt das Expo-Zahnrad. Platte hat wieder Platz. | ich |
| Stripe anbinden | Hängt an der Preisentscheidung, siehe [OFFENE_ENTSCHEIDUNGEN.md](OFFENE_ENTSCHEIDUNGEN.md). | beide |

---

## Was nur du kannst — nach Dringlichkeit

1. **Clerk → Configure → Native applications einschalten.** Fünf Minuten.
   Blockiert **jede** Anmeldung. `Business` hat in Produktion 0 Zeilen — bis
   dahin entsteht kein einziger echter Betrieb.
2. **Google „Business Profile API access" beantragen.** ~60 Tage, ohne Freigabe
   Quota null. Kritischer Pfad — braucht aber vorher die Datenschutz-URL.
3. **Apple Developer Program (99 $).** Blockiert Store-Einreichung **und** die
   Apple-Hälfte von Schritt 4.
4. **`MAITR_*` in Railway setzen.** Datei liegt fertig (5 echte Werte,
   4 Platzhalter). Der Server startet damit nachweislich.
5. **Google Cloud Service-Account für Google Wallet.** Kostenlos, schnell, und
   entblockt die Hälfte von Schritt 4 sofort.
