# Das System hinter Maitr

Was Maitr ist, wie es arbeitet, worin die Innovation liegt und womit es gebaut
ist. Stand 6. August 2026.

Regel für dieses Dokument: **Nur was im Code steht.** Was geplant, aber nicht
gebaut ist, steht unter „Noch nicht gebaut" — nicht im Fließtext.

---

## 1. Was Maitr ist

Zwei Produkte auf einer Grundlage.

**Der Baukasten** (Web) erzeugt aus der bestehenden Online-Präsenz eines
Restaurants eine eigene Web-App: Speisekarte, Öffnungszeiten, Reservierung,
Bestellung. Der Wirt gibt eine Adresse ein, Maitr liest aus, was es findet, und
baut daraus einen Vorschlag.

**Der Präsenz-Assistent** (iOS-App) übernimmt danach die laufende Arbeit am
Google Business Profile und an Instagram: Bewertungen beantworten, Beiträge
planen, Öffnungszeiten pflegen, Gäste zurückholen.

**Der Leitsatz, an dem sich jede Funktion messen lassen muss:** Maitr nimmt dem
Wirt die Arbeit ab. Es macht keine zusätzliche. Eine Funktion, die dem
widerspricht, gehört gestrichen — auch wenn sie technisch beeindruckend ist.

---

## 2. Wie Maitr arbeitet

### 2.1 Vom Bestand zur Web-App

Ein Wirt hat fast immer schon etwas: eine alte Website, eine Facebook-Seite, ein
PDF der Speisekarte. Maitr liest das aus statt zu fragen. Der Weg:

```
Adresse eingeben
   └─ Auslesen der bestehenden Seite      (server/routes/scraper.ts, n8n)
        ├─ Name, Adresse, Kontakt
        ├─ Logo und Bilder                (→ Supabase Storage)
        ├─ Social-Media-Konten
        └─ Speisekarte (HTML, PDF, Bild)
   └─ Vorschlag erzeugen                  (client/pages/AutoConfigurator.tsx)
   └─ Anpassen in 15 Schritten            (client/pages/Configurator.tsx)
   └─ Veröffentlichen                     (Netlify Edge Function + Subdomain)
```

**Die Speisekartenerkennung ist der Kern des Ganzen.** Sie entscheidet, ob der
Vorschlag brauchbar ist oder Nacharbeit erzeugt — und damit, ob das Versprechen
„Maitr nimmt dir die Arbeit ab" hält. Sie ist derzeit die größte Baustelle
(siehe [AUFGABEN.md](AUFGABEN.md), Abschnitt A1).

### 2.2 Vom Kanal zum Tagesbriefing

Die App zeigt keine Rohdaten, sondern **Aufgaben**. Der Weg:

```
Kanal verbinden (OAuth)     server/maitr/routes.ts
   └─ Token verschlüsselt ablegen        AES-256-GCM, server/maitr/security.ts
   └─ Regelmäßig abrufen                 server/maitr/sync.ts
        ├─ Bewertungen  → MaitrReview
        └─ Reichweite   → MaitrEngagementPoint
   └─ Rechnen                            packages/core/src/analytics
   └─ Briefing zwischenspeichern         InsightsCache
   └─ App zeigt Aufgaben                 „3 Bewertungen warten auf Antwort"
   └─ Entscheidung des Wirts             TaskDecision (OPEN/APPROVED/DISMISSED)
```

Der entscheidende Unterschied zu einem Dashboard: Es gibt **eine Entscheidung
pro Aufgabe**, nicht zwölf Diagramme. `TaskDecision` hält fest, was der Wirt
entschieden hat — die Aufgabe selbst wird jedes Mal neu berechnet.

### 2.3 Vom Konto zum ersten Betrieb

Ein frisch angemeldeter Wirt hat noch nichts: `GET /venues` liefert eine leere
Liste, und jede betriebsgebundene Route antwortet ihm 403. Der Weg dorthin ist
deshalb die einzige Weiche der App (`mobile/app/index.tsx`):

```
Anmeldung (Clerk)
   └─ Betrieb bekannt?                  einstiegsWeiche(), features/onboarding/ablauf.ts
        ├─ noch keine Antwort   → warten (nicht raten)
        ├─ keiner               → Einrichtung
        └─ vorhanden            → Start
   └─ Einrichtung, vier Schritte        Betrieb · Google · Zeiten · Abschluss
        └─ Betrieb anlegen               POST /venues   (Pflicht)
        └─ Google verbinden              echte OAuth-URL, überspringbar
        └─ Öffnungszeiten                PATCH /venues/:venueId, überspringbar
        └─ Abschluss                     Häkchen NUR für serverseitig Belegtes
```

**Der Wartezustand ist keine Feinheit.** `GET /venues` läuft asynchron, ein
Redirect entscheidet nur beim Mounten. Wer in diesem Moment rät, schickt jeden
Wirt mit bestehendem Betrieb einmal falsch — ins Anlegen, wo ihn ein 409 erwartet.

**Zwei Ablagen für Öffnungszeiten, und sie werden nicht abgeglichen.**
`Business.openingHours` speist App und öffentliches Gastprofil.
`Configuration.content.openingHours` speist die veröffentlichte Web-App
(`server/routes/subdomains.ts`, `webapps.ts`). Wer in der App Zeiten ändert,
ändert die Website **nicht** — der Bildschirm sagt das auch so. Und an Google
gehen sie ebenfalls nicht; das schreibt kein Connector.

### 2.4 Die Stempelkarte

App-los für den Gast: Er scannt am Tisch einen QR-Code und legt die Karte in
Apple oder Google Wallet. Kein Konto, keine Installation.

```
Wirt legt Programm an        StampProgram (Prämie, Stempelzahl, Sperrfrist)
Gast bekommt Karte           StampCard + Scan-Token (gehasht)
Wirt scannt                  StampEvent  ← das Hauptbuch
   └─ currentStamps          nur Lese-Cache, wird abgeleitet
   └─ Pass aktualisieren     passUpdateSeq, WalletDeviceRegistration
```

**`StampEvent` ist das Hauptbuch, `currentStamps` nur ein Cache.** Das ist keine
Formalie: Nur so lässt sich „ich hatte neun!" im Nachhinein klären, und nur so
fällt ein Doppelscan auf.

---

## 3. Worin die Innovation liegt

Vier Dinge, die den Unterschied ausmachen — jedes davon ist im Code belegt.

### 3.1 Auslesen statt fragen
Übliche Baukästen fangen mit einem leeren Formular an. Maitr fängt mit dem an,
was schon da ist. Der Wirt korrigiert, statt zu tippen. Das verschiebt die
Hürde von „eine Stunde Arbeit" auf „fünf Minuten prüfen".

### 3.2 Entscheidungen statt Kennzahlen
Die App liefert Aufgaben mit einem fertigen Vorschlag, den man freigibt oder
verwirft. Ein Wirt hat um 15 Uhr keine Zeit für ein Diagramm.

### 3.3 Der Gast braucht nichts zu installieren
Stempelkarte in der Wallet, Reservierung im Browser, Speisekarte über QR. Jede
App-Installation, die man dem Gast abverlangt, verliert die Hälfte der Leute.

### 3.4 Ein Rechenkern für Web und App
`packages/core` enthält Analytik, Integrationen, API-Pfade und Typen. Web und
App rechnen dieselbe Zahl mit demselben Code — sie können nicht auseinanderlaufen.

**Ehrlich dazu:** Das Paket hat keine Workspaces und zeigt auf rohe
`.ts`-Dateien. Der Alias muss deshalb an **vier** Stellen stehen (`tsconfig.json`,
`vite.config.ts`, `vite.config.server.ts`, `vitest.config.ts`) plus einem
Resolver in `mobile/metro.config.js`. Das ist der Preis, und er ist bezahlt.

---

## 4. Technologien

| Bereich | Womit | Warum |
|---|---|---|
| Web | Vite 7, React 18, TanStack Query, Tailwind, Radix | schneller Bau, zugängliche Grundelemente |
| Server | Express 4, Node 22 | klein und durchschaubar; `asyncHandler` fängt abgelehnte Promises, die Express 4 sonst tödlich sind |
| Datenbank | Prisma + Neon Postgres | 64 Modelle/Enums, alles mandantengebunden über `businessId` |
| Anmeldung | Clerk (Web + App, **dieselbe** Instanz) | zwei Instanzen hätten unvereinbare Token-Signaturen |
| App | Expo SDK 57, React Native, expo-router | ein Bau für iOS und Android |
| Medien | Supabase Storage | |
| Automatisierung | n8n | Auslesen und Anreichern außerhalb des Anfragepfads |
| Betrieb | Netlify (Web) + Railway (API) | `main` deployt beide automatisch |

**Sicherheit, im Code belegt:** OAuth-Token nur AES-256-GCM-verschlüsselt.
`state` HMAC-signiert und an den auslösenden Nutzer gebunden. Zugriff über
`requireVenueAccess` — jede Abfrage über `businessId` eingegrenzt. Ändernde
Endpunkte zusätzlich hinter `ownerGuard`.

---

## 5. Grundsätze, die im Code sichtbar sind

Wer hier weiterbaut, sollte diese fünf kennen. Jeder stammt aus einem Fehler,
der einmal wehgetan hat.

1. **Kein Knopf, der nichts tut.** Ein Bildschirm meldete einmal „Belohnung
   gesendet", ohne dass je etwas rausging. Er wurde gelöscht, nicht repariert.
2. **Lieber eine Lücke als eine erfundene Angabe.** Preise sind aus der App
   entfernt, weil keine entschieden sind — ein Screenshot mit Preis ist im App
   Store eine Zusage.
3. **Jeder behauptete Fix braucht eine Gegenprobe.** Ein Test, der auch ohne den
   Fix grün bleibt, beweist nichts.
4. **Ein Fehler darf nie still sein.** Der Startwächter des Servers verglich
   einmal eine URL mit einem rohen Pfad — der Prozess lief durch, hörte auf
   keinem Port und endete mit Exit 0. Die Plattform meldete Erfolg.
5. **Erweitern, nicht duplizieren.** `Business` ist das Restaurant,
   `MaitrGuest` der Gast, `MaitrReview` die Bewertung. Ein zweites Modell
   danebenzustellen erzeugt zwei Wahrheiten.

---

## 6. Noch nicht gebaut

Damit dieses Dokument nicht mehr verspricht, als es hält:

- **Wallet-Passausgabe.** Datenmodell und Einstellungsbereich stehen, die
  Erzeugung von `.pkpass` und Google-Pass nicht (`PASSAUSGABE_GEBAUT = false`).
- **WhatsApp.** Datenmodell steht, Webhook und Versand nicht.
- **Google und Meta im Echtbetrieb.** Kein Freigabezugang; bis dahin läuft alles
  gegen Attrappen.
- **Rechtstexte.** Entwurf, nicht geprüft — blockiert den Google-Antrag.
