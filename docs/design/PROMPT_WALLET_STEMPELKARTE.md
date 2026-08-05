# Prompt für Claude Design — Wallet-Stempelkarte

Alles zwischen den Linien in Claude einfügen. Der Prompt ist bewusst lang: Die
Formatzwänge von Apple Wallet sind hart, und ein Entwurf, der sie ignoriert,
lässt sich nicht bauen.

---

Du gestaltest eine **digitale Stempelkarte** für **Maitr**, ein Werkzeug für
Gastronomen. Die Karte liegt in Apple Wallet und Google Wallet auf dem Handy des
**Gastes** — nicht in einer App. Der Gast installiert nichts.

## Die Situation, für die du gestaltest

Jemand isst in einem kleinen Restaurant. Beim Zahlen hält er sein Handy hin, der
Wirt scannt einen QR-Code, ein Stempel kommt dazu. Vier Wochen später sieht der
Gast die Karte auf dem Sperrbildschirm und denkt: *ach ja, da war ich lange
nicht mehr.* **Genau dieser Moment ist die ganze Aufgabe.** Die Karte muss auf
einen Blick — im Vorbeischauen, halb verdeckt, bei schlechtem Licht — zwei Dinge
sagen: *wo* und *wie weit*.

Der Gast hat 30 andere Karten in der Wallet. Deine konkurriert mit Starbucks,
Payback und einem Kinoabo. Sie darf nicht aussehen wie eine Rabattkarte aus dem
Supermarkt.

## Marke Maitr

Ruhig, handwerklich, erwachsen. Kein Gamification-Lärm, keine Konfetti-Animation,
keine Sterne-Explosion. Ein Gastronom soll die Karte seinen Gästen zeigen können,
ohne sich zu schämen. Die Wärme kommt aus Typografie und Farbe, nicht aus Effekten.

**Farben** (aus dem Produkt, verbindlich):

| Rolle | Hex |
|---|---|
| Primär (Petrolgrün) | `#1F7A72` |
| Primär, dunkel | `#175E58` |
| Akzent (Mint) | `#6FBFAE` |
| Tiefes Petrol (nur Verläufe) | `#268494` |
| Tinte / Text | `#212B27` |
| Fläche hell | `#EAF1EE` |

**Schrift**: Bricolage Grotesque (aufrecht), Familjen Grotesk Italic (kursiv).
Beide SIL OFL. **Achtung:** Apple Wallet erlaubt **keine eigenen Schriften** —
das System setzt in San Francisco. Die Marke muss also über Farbe, Bildzuschnitt
und das Logo wirken, nicht über Schrift. Nutze die Marken-Schriften nur dort, wo
sie wirklich ankommen: im Logo-Bild, im Streifenbild und auf der Weboberfläche.

## Was du lieferst

### 1. Apple Wallet — `storeCard`

Das Format ist **fest vorgegeben**. Du gestaltest innerhalb dieser Schablone,
nicht darum herum. Verfügbare Felder:

- **Header-Felder** (bis 3) — oben rechts, immer sichtbar, auch wenn die Karte
  im Stapel liegt. **Das ist der wertvollste Platz der ganzen Karte.**
- **Primärfeld** (1) — groß, mittig, liegt auf dem Streifenbild.
- **Sekundärfelder** (bis 4) — Zeile darunter.
- **Zusatzfelder** (bis 4) — noch eine Zeile darunter.
- **Rückseite** (beliebig viele) — Text, erreichbar über „…".
- **Barcode** — QR, mit optionalem Text darunter.

Bilder: `logo` (oben links, neben dem Namen), `strip` (Vollbreite hinter dem
Primärfeld), `icon` (für Benachrichtigungen). *Die genauen Pixelmaße liefere ich
dir nach — sie hängen an der aktuellen PassKit-Fassung und werden gerade
verifiziert. Gestalte in den Proportionen, nicht in absoluten Pixeln, und liefere
Vektor oder ausreichend große Rasterbilder.*

Farben werden als drei Werte gesetzt: `backgroundColor`, `foregroundColor`,
`labelColor`. **Verläufe sind nicht möglich** — nur eine Vollfarbe plus dein
Streifenbild. Wenn du einen Verlauf willst, muss er ins Streifenbild.

**Deine eigentliche Gestaltungsaufgabe:** Wie stellst du **den Stempelstand**
dar? Naheliegend wäre „7/10" als Text. Das ist schwach — eine Zahl, die man lesen
muss. Besser wäre etwas, das man *sieht*. Aber: Die Felder nehmen nur Text auf,
also müsste eine grafische Darstellung ins **Streifenbild** — und das Streifenbild
wird bei jeder Änderung neu erzeugt und ausgeliefert. Entwirf beides:

- **(a)** eine typografische Lösung, die nur mit Text in Feldern auskommt
- **(b)** eine Lösung mit erzeugtem Streifenbild, in dem die Stempel sichtbar sind

Sag mir, welche du für stärker hältst und warum. Bei (b): Das Bild muss
**programmatisch erzeugbar** sein — beschreibe die Regel, nach der ein Bild für
`n` von `m` Stempeln entsteht, nicht nur ein Beispiel.

Beachte außerdem den Zustand, der leicht vergessen wird: **die volle Karte.**
Zehn von zehn — was passiert dann visuell? Und danach: eingelöst, Zähler zurück
auf null. Beide Zustände gehören in den Entwurf.

### 2. Google Wallet — Generic Pass

Anderes Format, gleiche Marke. Hier gibt es ein **Hero-Bild** (breit, oben) und
mehr Freiheit als bei Apple. Zeige, wie dieselbe Karte hier aussieht — nicht als
Kopie, sondern als saubere Übertragung.

### 3. Die Web-Seite „Karte hinzufügen"

Der Gast scannt am Tisch einen QR-Code und landet auf einer Seite mit **einem**
Zweck: Karte in die Wallet legen. Ein Bildschirm, mobil, ohne Anmeldung, ohne
Konto, ohne Cookie-Banner. Beide Wallet-Knöpfe (Apple und Google) müssen ihren
vorgeschriebenen Knopf-Stil verwenden — die erkennen Nutzer, und beide Anbieter
verlangen es.

Die Seite muss in **einem Satz** klarmachen, was passiert. Der Gast steht
womöglich noch am Tisch und will nicht lesen.

### 4. Der Scan-Bildschirm für den Gastronomen

In der Maitr-App. Der Wirt hat eine Hand frei, es ist laut, jemand wartet.
Kamera auf, Code drin, fertig. Zeige drei Zustände: bereit, erfolgreich,
Fehlerfall (z. B. „schon vor zwei Minuten gestempelt").

## Was ausdrücklich NICHT gefragt ist

- Keine Punkte-, Level- oder Ranglisten-Mechanik. Es ist eine Stempelkarte.
- Keine Werbeflächen, keine Fremdlogos.
- Keine erfundenen Preise oder Prämienwerte. Wenn du eine Prämie zeigst, nimm
  einen neutralen Platzhalter („Deine Prämie").
- Kein Personenfoto des Gastes auf der Karte.

## Format deiner Antwort

Für jeden der vier Punkte: **Bild plus Begründung.** Die Begründung ist der
wichtigere Teil — ich muss verstehen, warum eine Entscheidung so und nicht
anders fiel, weil ich sie später in Code umsetzen und dabei Kompromisse eingehen
muss. Wenn du an eine Formatgrenze stößt, sag es, statt sie zu ignorieren.

Zeige die Karte **im Kontext**: Sperrbildschirm, Wallet-Stapel zwischen anderen
Karten, und im Sonnenlicht (also mit reduziertem Kontrast). Eine Karte, die nur
auf weißem Hintergrund in Alleinstellung funktioniert, ist nicht fertig.

---

## Hinweise für mich (nicht Teil des Prompts)

- Die Pixelmaße für `logo`, `strip` und `icon` nachliefern, sobald der
  Technik-Kassensturz die aktuelle PassKit-Fassung bestätigt hat.
- Falls Variante (b) gewählt wird: Das Streifenbild muss serverseitig erzeugt
  werden. Zu klären ist, womit — und ob das auf Railway ohne native
  Bildbibliotheken läuft.
- Der QR-Inhalt ist **nicht** die `customerId`, sondern der Scan-Token aus
  `StampCard.scanTokenHash` (siehe Datenmodell). Dem Designer ist das egal, mir
  nicht.
