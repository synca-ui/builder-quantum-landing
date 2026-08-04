# Begutachtung der liegengebliebenen Fremdarbeit

Stand: 04.08.2026, Branch `chore/maitr-backend-und-sicherheitsfixes`, HEAD `42a234e`.
Geprüft wurde ausschließlich der uncommittete Arbeitsbaum. Es wurde nichts
geändert, nichts committet, nichts eingespielt.

Umfang laut `git status --short`:

```
 M mobile/.expo/devices.json
 M server/index.ts
 M server/routes/configurations.ts
 M server/routes/instagram.ts
 M server/routes/n8nProxy.ts
 M server/routes/orders.ts
 M server/routes/publicReservations.ts
 M server/webhooks/stripe.ts
```

`git diff --stat`: 8 Dateien, 91 Einfügungen, 35 Löschungen.

---

## Vorbemerkung: Auftrag (b) ist nicht in diesem Arbeitsbaum – und auch sonst nicht erledigt

Der Auftrag lautete unter anderem „Serverstart-Blocker ERR_ERL_KEY_GEN_IPV6".
Im gesamten Diff kommt kein Rate-Limiter vor. Der einzige Versuch dazu ist
bereits committet (`git blame server/index.ts`, Zeilen 35–39, Commit `c91c2616`
vom 28.07.2026, Betreff „chore: sync and update mobile project dependencies and
configuration files"):

```ts
// Normalize IPv6 addresses (strip brackets) to avoid ERR_ERL_KEY_GEN_IPV6
keyGenerator: (req) => {
  const ip = (req.ip ?? "").replace(/^\[|\]$/g, "");
  return `${ip}-${req.params.subdomain ?? ""}`;
},
```

**Das wirkt nicht.** `express-rate-limit@8.2.1` prüft nicht das Ergebnis,
sondern den Quelltext der Funktion
(`node_modules/express-rate-limit/dist/index.mjs`, Zeile 602 ff.):

```js
keyGeneratorIpFallback(keyGenerator) {
  const src = keyGenerator.toString();
  if ((src.includes("req.ip") || src.includes("request.ip")) && !src.includes("ipKeyGenerator")) {
    throw new ValidationError("ERR_ERL_KEY_GEN_IPV6", ...);
  }
}
```

Beleg aus dem laufenden Test der echten App
(`npx vitest run server/__tests__/routeAuth.spec.ts`, der `createServer()`
aufruft):

```
stderr | server/__tests__/routeAuth.spec.ts
ValidationError: Custom keyGenerator appears to use request IP without calling the ipKeyGenerator helper ...
    at parseOptions (.../express-rate-limit/dist/index.mjs:721:16)
    at /Users/.../server/index.ts:32:25
  code: 'ERR_ERL_KEY_GEN_IPV6',
```

Zwei Dinge folgen daraus:

1. Die Warnung erscheint bei **jedem** Serverstart, unverändert. Sie wird in
   8.2.1 nur per `console.error` ausgegeben statt geworfen (`wrappedValidations`,
   Zeile 649–658) – der Start bricht also nicht ab, aber „behoben" ist nichts.
2. Der sachliche Kern ist ebenfalls offen. `ipKeyGenerator` fasst IPv6 zu einem
   Präfix zusammen, das Klammern-Entfernen nicht:

   ```
   ipKeyGenerator('2001:db8::1') = 2001:db8::/56
   bracket-strip ergibt          = 2001:db8::1
   ```

   Ein IPv6-Anschluss hat üblicherweise ein /56 oder /64 zur freien Verfügung.
   Mit der aktuellen Fassung zählt jede Adresse daraus als eigener Client – die
   Drosselung gegen das Durchprobieren von Kundensubdomains ist für IPv6
   praktisch aus.

Der Auftrag (b) ist damit **nicht erledigt**, unabhängig davon, wie man über die
hier vorliegenden Änderungen entscheidet.

---

## Datei für Datei

### 1. `server/index.ts` — **NACHBESSERN**

**Was geändert wurde.** Drei Dinge in einem: der Stripe-Webhook wird neu
registriert (Import + `app.post("/api/webhooks/stripe", express.raw(...), ...)`),
`/api/schema/generate|validate` bekommen `strictLimiter`, und
`/api/orders/create` bekommt zusätzlich `requireAuth`.

**Fertig?** Ja, syntaktisch abgeschlossen, keine TODO-Marken, kein toter Code.

**Korrekt?**

* Reihenfolge stimmt. Der Stripe-Handler steht in Zeile 98, `express.json()`
  erst in Zeile 106. `stripe.webhooks.constructEvent` bekommt damit tatsächlich
  den Rohpuffer. Die Begründung im Kommentar ist richtig und passt zum bereits
  bestehenden Muster von Clerk und Meta.
* Doppelregistrierung gibt es nicht: `grep -rn "webhooks/stripe" server/` findet
  nur diese eine Stelle, im `apiRouter` kommt „stripe" nicht vor.
* **Aber:** Diese Zeile schaltet einen Handler scharf, der gegen das installierte
  Stripe-SDK nicht typprüft. `npx tsc --noEmit` meldet 14 Fehler in
  `server/webhooks/stripe.ts`, darunter fünfmal:

  ```
  server/webhooks/stripe.ts(75,51): error TS2339: Property 'current_period_start' does not exist on type 'Subscription'.
  server/webhooks/stripe.ts(76,49): error TS2339: Property 'current_period_end' does not exist on type 'Subscription'.
  ```

  Das ist kein Typ-Pedanterie-Problem, sondern eine Laufzeitfolge. Installiert
  ist `stripe@20.3.1`; dort gibt es das Feld auf der Subscription nicht mehr,
  sondern nur noch auf den Positionen:

  ```
  grep current_period_end node_modules/stripe/types/Subscriptions.d.ts     → (keine Treffer)
  grep current_period_end node_modules/stripe/types/SubscriptionItems.d.ts → 53:  current_period_end: number;
  ```

  Der Handler rechnet aber `new Date(subscription.current_period_start * 1000)`:

  ```
  node -e "console.log(new Date(undefined*1000).toString())"  → Invalid Date
  ```

  `Subscription.currentPeriodStart` ist im Prisma-Schema (Zeile 536) ein
  `DateTime?`; Prisma weist ein ungültiges Date zurück. Ergebnis: jedes
  `customer.subscription.created` und `.updated` läuft in den `catch` und
  antwortet 500 „Webhook processing failed". Stripe wiederholt solche Events
  drei Tage lang. Wir hätten also einen Endpunkt, der Signaturen korrekt prüft
  und danach zuverlässig scheitert – schlechter als kein Endpunkt, weil es nach
  „angebunden" aussieht.
* `requireAuth` auf `/api/orders/create` widerspricht dem, was dieselbe Arbeit in
  `server/routes/orders.ts` erlaubt: dort ist `orderSource` auf
  `["stripe","pos_api","manual"]` festgelegt. Weder ein Stripe-Webhook noch ein
  Kassensystem kann ein Clerk-Browsertoken mitschicken (`server/middleware/auth.ts`
  verlangt `Authorization: Bearer <Clerk-JWT>`). Entweder ist der Endpunkt für
  Maschinen gedacht – dann braucht er einen API-Schlüssel statt `requireAuth` –
  oder er ist es nicht, dann gehören zwei Werte aus dem Enum gestrichen. So wie
  es jetzt dasteht, ist die Absicht nicht entscheidbar.

**Bricht es etwas?** Kein Aufrufer geht verloren: `grep -rn "api/orders" client/ mobile/`
findet nur `menu-stats` (`client/hooks/useRecentOrders.ts:81`). `/api/orders/create`
hat heute überhaupt keinen Aufrufer im Repo. Der Typcheck bringt keine neuen
Fehler in `server/index.ts`.

**Tests.** `server/__tests__/routeAuth.spec.ts` führt die Liste geschützter
Routen und geht über die echte App. `/api/orders/create` fehlt darin – genau die
Stelle, an der diese Änderung abgesichert gehörte, zwei Zeilen Aufwand. Für die
Reihenfolge Stripe/`express.json()` gibt es ebenfalls keinen Test, obwohl sie
genau die Art Fehler ist, die man nur einmal macht und dann still wieder einbaut.

---

### 2. `server/routes/instagram.ts` — **NACHBESSERN**

**Was geändert wurde.** `normalizeProfileUrl` prüft jetzt bei vollständigen URLs
den Hostnamen gegen `instagram.com`/`www.instagram.com`, erzwingt `https:` und
lässt bei blanken Benutzernamen nur noch `[a-zA-Z0-9._]` durch.

**Fertig?** Die Funktion selbst ja.

**Korrekt? Teilweise – die klassischen Umgehungen sind zu.** Nachgestellt mit der
exakten Fassung aus dem Arbeitsbaum:

```
"https://instagram.com@169.254.169.254/latest/meta-data/" => null
"http://169.254.169.254/latest/meta-data/"                => null
"https://www.instagram.com.evil.tld/x"                    => null
"https://[::ffff:127.0.0.1]/"                             => null
"https://WWW.INSTAGRAM.COM/x/"                            => "https://www.instagram.com/x/"
"http://www.instagram.com/x/"                             => "https://www.instagram.com/x/"
"file:///etc/passwd"                                      => null
```

Die `userinfo`-Falle (`https://instagram.com@ziel/`) greift nicht, weil
`new URL()` den Host korrekt hinter dem `@` liest. IP-Literale und IPv6 fallen
über die Hostnamensprüfung. Groß-/Kleinschreibung normalisiert `URL` selbst.
DNS-Rebinding ist hier kein realistischer Weg, weil der Host fest verdrahtet ist
und nicht vom Angreifer benannt wird.

**Was trotzdem fehlt:**

* **Weiterleitungen werden nicht geprüft.** `fetch()` folgt automatisch. Lokal
  nachgestellt (zwei Server auf 127.0.0.1, der erste antwortet 302 auf den
  zweiten):

  ```
  Start-URL : http://127.0.0.1:62460/start
  End-URL   : http://127.0.0.1:62459/interne-daten
  Body      : <meta property="og:image" content="GEHEIM">
  ```

  Genau dieser Body wird in Zeile 111–115 nach `og:image` durchsucht und der
  Fund an den Aufrufer zurückgegeben. Ein offener Redirect auf instagram.com
  genügt also, um die Hostprüfung wirkungslos zu machen.
* **`server/services/safeFetch.ts` wird nicht benutzt** – obwohl es im Projekt
  für exakt diesen Zweck existiert, vier Aufrufer hat (`site.ts`, `menu.ts`,
  `imageIngest.ts`, `menuExtraction.ts`) und einen eigenen Test
  (`server/__tests__/safeFetch.spec.ts`). Es verfolgt Weiterleitungen bewusst
  mit `redirect: "manual"` und prüft **jeden** Sprung, dazu Zeitlimit,
  Größenlimit und Sperrnetze. Hier wurde stattdessen eine zweite, schwächere
  Prüfung danebengebaut. Der nackte `fetch` in Zeile 54 hat weder Timeout noch
  Größenbegrenzung.
* **Regression bei den gängigen Eingabeformaten:**

  ```
  "instagram.com/kiepenkerl"     => null
  "www.instagram.com/kiepenkerl" => null
  "kiepenkerl/"                  => null
  ```

  Vorher kam dabei zwar auch nichts Brauchbares heraus, aber eine 200-Antwort
  mit leerer Liste; jetzt ist es ein 400. Wer im Konfigurator „instagram.com/x"
  einträgt, bekommt einen Fehler statt einer leeren Galerie.

**Der ehrlichere Weg.** `apiRouter.get("/instagram", fetchInstagramPhotos)`
(`server/routes/index.ts:220`) ist unauthentifiziert, und
`grep -rn "api/instagram" client/ server/ shared/` findet **keinen einzigen
Aufrufer**. Ein öffentlicher, ungenutzter Endpunkt, der fremde Adressen abruft,
ist Angriffsfläche ohne Gegenwert. Löschen schließt die Lücke vollständig und
dauerhaft; die halbe Härtung hält sie offen und suggeriert Sicherheit.

**Tests.** Keine. `normalizeProfileUrl` ist nicht exportiert, also auch nicht
prüfbar, ohne das zu ändern. Für eine Sicherheitskorrektur ohne Testfall gibt es
keine Rechtfertigung – die Tabelle oben ist in zehn Minuten ein Spec.

---

### 3. `server/routes/publicReservations.ts` — **VERWERFEN (in dieser Form)**

**Was geändert wurde.** `PUT /api/public/reservations/:id` verlangt jetzt im Body
ein `guestEmail`, vergleicht es kleingeschrieben mit dem gespeicherten Wert und
antwortet sonst 400 bzw. 403.

**Fertig? Nein.** Die Serverseite wurde verschärft, die Gegenstelle nicht
angefasst. `client/pages/ManageReservation.tsx` schickt in **beiden** Aufrufen
kein `guestEmail`:

```
Zeile 53  handleUpdate: body = { ...editForm, guestCount, reservationTime }
Zeile 81  handleCancel: body = { status: "CANCELLED" }
```

`editForm` besteht aus `guestName`, `guestCount`, `reservationTime`,
`specialRequests` (Zeilen 17–22). Damit ist `proofEmail` undefiniert und der
Server antwortet 400 „guestEmail ist erforderlich". **Ändern und Stornieren
durch den Gast sind ab dem Commit beide tot** – der Link aus der
Bestätigungsmail führt auf eine Seite, deren beide Knöpfe nur noch eine
Fehlermeldung erzeugen.

**Korrekt? Nein, der Nachweis schützt nichts.** Direkt darüber, in Zeile 194,
liegt unverändert:

```ts
router.get("/:id", async (req, res) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: id as string },
    include: { business: { select: { name: true, logoUrl: true } } },
  });
  res.json({ success: true, data: reservation });
});
```

Kein `select`, also alle Skalarfelder – laut `prisma/schema.prisma` Zeile 121 ff.
inklusive `guestEmail` und `guestPhone`. Ohne jede Anmeldung. Wer die ID kennt,
holt sich mit einem GET auf dieselbe ID den „Nachweis" ab und schickt ihn im PUT
mit. Aus einer IDOR mit einem Request wird eine IDOR mit zwei. Nebenbei gibt
derselbe GET E-Mail und Telefonnummer jedes Gastes preis – das ist die
gewichtigere Lücke und wurde nicht angefasst.

**Weiterer Bruch:** `createSchema` (Zeile 24) lässt `guestEmail` optional und
sogar leer zu. Reservierungen ohne E-Mail – etwa telefonisch aufgenommene –
können vom Gast nie mehr storniert werden: `!existing.guestEmail` führt
zwangsläufig zu 403.

**Tests.** Keine. Es gibt `server/__tests__/maitrReservations.spec.ts` und
`shared/reservation.spec.ts`, aber nichts, das den öffentlichen PUT abdeckt.

**Was es bräuchte.** Ein signiertes Verwaltungs-Token in der Bestätigungsmail
(`/reservierung/<id>?token=...`), serverseitig geprüft; der GET gibt ohne Token
nur Restaurantname, Zeit und Status heraus. Das ist die Lösung, für die diese
Änderung ein Platzhalter ist – als Zwischenstand ist sie schädlich, weil sie
Funktion kostet, ohne Schutz zu liefern.

---

### 4. `server/routes/orders.ts` — **UEBERNEHMEN (mit einer offenen Entscheidung)**

**Was geändert wurde.** Handvalidierung ersetzt durch ein `zod`-Schema
(`webAppId` als UUID, `orderSource` als Enum, Längengrenzen), vier
Fehlerantworten geben nicht mehr `error.message` heraus, und `handleGetMenuStats`
begrenzt die Abfrage auf 24 Stunden.

**Fertig?** Ja. Keine Reste, `zod` ist bereits Abhängigkeit (3.25.76, dort ist
`ZodError.errors` noch gültig), `error` wird in allen `catch`-Blöcken weiter
geloggt.

**Korrekt?** Ja. `webAppId` ist im Schema `@default(uuid())` (Zeile 494), die
UUID-Prüfung passt. Der 24-Stunden-Filter ist sinnvoll: die Funktion rechnet
ohnehin nur `recentCount` (1 h) und `dailyCount` (24 h). Eine kleine
Bedeutungsänderung bleibt: `lastOrderedAt` ist jetzt auf 24 h gedeckelt, ein seit
drei Tagen nicht bestelltes Gericht verschwindet aus der Statistik, statt „vor
4320 Minuten" zu melden. Für Social Proof ist das eher richtig als falsch, sollte
aber bewusst sein.

**Bricht es etwas?** Nein. Kein Aufrufer im Repo, keine neuen Typfehler (die drei
`tsc`-Meldungen zu `orders.ts` betreffen `req.params`-Typisierung und stehen
wortgleich schon in der HEAD-Fassung).

**Offen bleibt** die oben beschriebene Unstimmigkeit: Enum erlaubt `stripe` und
`pos_api`, `server/index.ts` verlangt ein Clerk-Browsertoken. Das muss vor dem
Commit entschieden werden, sonst ist der Endpunkt für seinen dokumentierten
Zweck unbenutzbar.

**Tests.** Fehlen. Das Zod-Schema ist ohne DB testbar (400 bei falscher UUID,
400 bei unbekanntem `orderSource`).

---

### 5. `server/webhooks/stripe.ts` — **UEBERNEHMEN, aber ohne Wirkung ohne Punkt 1**

**Was geändert wurde.** Der Rohbody wird jetzt als Buffer genommen
(`Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body))`)
statt über ein nie gesetztes `(req as any).rawBody`, und zwei Fehlerantworten
geben die interne Meldung nicht mehr heraus.

**Fertig und korrekt?** Ja. `grep -rn "rawBody" server/` zeigt: außerhalb von
`server/maitr/security.ts` (eigener Parameter) setzt niemand `req.rawBody` – die
alte Zeile wäre also immer in den `JSON.stringify`-Zweig gelaufen und die
Signaturprüfung hätte grundsätzlich fehlgeschlagen. Der Fallback ist jetzt
toter, aber harmloser Verteidigungscode.

**Der Haken liegt nicht im Diff, sondern in der Datei.** Siehe Punkt 1: 14
Typfehler, davon fünf an `current_period_start/end`, die zur Laufzeit `Invalid
Date` erzeugen. Diese Änderung allein ist folgenlos, solange die Route nicht
registriert ist. Zusammen mit `server/index.ts` schaltet sie eine Verarbeitung
scharf, die bei Abo-Ereignissen sicher scheitert.

**Tests.** Keine für Stripe. Mindestens einer wäre billig: Handler mit einem
Buffer und falscher Signatur aufrufen, 400 erwarten – das beweist, dass der
Rohbody ankommt.

---

### 6. `server/routes/configurations.ts` — **UEBERNEHMEN**

Eine Zeile: `message: error.message` fliegt aus der 500-Antwort von
`saveConfiguration`. `error` wird zwei Zeilen darüber weiter geloggt und an
`audit(...)` übergeben, es bleibt also nichts verwaist. Richtig und vollständig.
(Die 18 `tsc`-Fehler dieser Datei betreffen `req.params`-Typisierung und sind
älter als diese Änderung.)

---

### 7. `server/routes/n8nProxy.ts` — **UEBERNEHMEN, halbherzig**

Eine Zeile: `details: String(error)` fliegt aus der 500-Antwort. Kein Aufrufer
liest `details` (`grep -rn "\.details" client/` findet nichts). Richtig.

Nur bleibt zwölf Zeilen darüber der größere Durchstich stehen:

```ts
if (!resp.ok) {
  return res.status(resp.status).send(text);
}
```

Die Antwort von n8n wird unverändert durchgereicht – inklusive dessen
Fehlermeldungen und interner Pfade. Wer Ausgabefehler schließt, sollte diesen
mitnehmen; sonst ist der Aufwand kosmetisch.

---

### 8. `mobile/.expo/devices.json` — **VERWERFEN**

Der Diff besteht aus einem Zeitstempel (`lastUsed`), den der Simulator schreibt.
`mobile/.gitignore` Zeile 7 enthält `.expo/`; die Datei ist nur deshalb noch
versioniert, weil sie vor der Regel eingecheckt wurde. Sie gehört nicht in einen
Sicherheitscommit. `git checkout -- mobile/.expo/devices.json`, und bei
Gelegenheit `git rm --cached`.

---

## Empfehlung

**Der Satz ist als Ganzes nicht committierbar.** Zwei der acht Dateien sind nicht
nur unfertig, sondern verschlechtern den Zustand: `publicReservations.ts` legt
die Gast-Selbstverwaltung lahm, ohne die Lücke zu schließen, für die sie gedacht
war; `index.ts` schaltet einen Stripe-Endpunkt scharf, dessen Verarbeitung gegen
das installierte SDK nicht funktioniert.

Reihenfolge, wenn es schnell gehen soll:

1. **Sofort zurücknehmen:** `mobile/.expo/devices.json`.
2. **Sofort committierbar** (ein Commit „Fehlermeldungen geben keine Interna mehr
   heraus"): `configurations.ts`, `n8nProxy.ts`, `orders.ts` – letzteres nur,
   wenn vorher entschieden ist, ob `/api/orders/create` Menschen oder Maschinen
   bedient. `stripe.ts` kann mit in diesen Commit, **ohne** die
   Routenregistrierung.
3. **Vor dem Commit nachbessern:**
   * `index.ts`: Stripe-Registrierung erst, wenn `current_period_start/end` auf
     `subscription.items.data[0]` umgestellt ist. `requireAuth` auf
     `/api/orders/create` erst, wenn die Enum-Frage geklärt ist – und dann mit
     Eintrag in `routeAuth.spec.ts`.
   * `instagram.ts`: entweder auf `safeFetch` umstellen (mit Hostschranke, dann
     ist auch die Weiterleitung geprüft) oder – ehrlicher – den ungenutzten
     Endpunkt entfernen. In beiden Fällen mit Test.
4. **Nicht committieren, neu machen:** `publicReservations.ts`. Der Weg ist ein
   signiertes Token in der Bestätigungsmail plus ein GET, der ohne Token keine
   Gastdaten mehr herausgibt.
5. **Weiterhin offen, unabhängig davon:** ERR_ERL_KEY_GEN_IPV6. Die Lösung ist
   `import { ipKeyGenerator } from "express-rate-limit"` und
   `` `${ipKeyGenerator(req.ip ?? "")}-${req.params.subdomain ?? ""}` ``, dazu ein
   Test, der `createServer()` aufruft und auf eine leere `console.error`-Ausgabe
   besteht.

Was in Summe fehlt, ist nicht Sorgfalt im Detail, sondern der jeweils letzte
Schritt: die Gegenstelle anpassen, den vorhandenen Baustein benutzen, den Test
danebenlegen. Drei der fünf inhaltlichen Änderungen sind an genau dieser Stelle
stehengeblieben.

---

## Verwendete Kommandos

```
git status --short; git diff --stat
git diff <jede der acht Dateien>
git blame -L 30,45 server/index.ts
npx vitest run server/__tests__/routeAuth.spec.ts     # 15 Tests grün, ERR_ERL_KEY_GEN_IPV6 im stderr
npx tsc --noEmit                                       # 163 Zeilen, davon 14 in webhooks/stripe.ts
grep -rn "api/orders|api/instagram|public/reservations" client/ server/ shared/ mobile/
grep -rn "current_period_end" node_modules/stripe/types/
node <Nachbau von normalizeProfileUrl gegen 14 Eingaben>
node <lokaler 302-Server, um das Weiterleitungsverhalten von fetch zu zeigen>
```

Keine Installation, kein Build, kein vollständiger Testlauf, keine Migration.
