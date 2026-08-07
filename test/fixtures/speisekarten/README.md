# Messkorpus Speisekartenerkennung

Zwei Sätze echter deutscher Speisekarten, an denen sich messen lässt, ob die
Erkennung taugt. Aufgebaut am 7. August 2026.

## Warum zwei Sätze

`korpus.json` (12 Karten) ist der **Trainingssatz** — gegen ihn wurden die
Regeln in `shared/menuParser.ts` abgestimmt.

`pruef.json` (14 Karten) ist die **Prüfmenge**. Gegen sie wurde bewusst *nicht*
optimiert. Sie ist der einzige ehrliche Test: Ob die Regeln allgemein taugen
oder nur zwölf Karten auswendig können.

Der Unterschied war erheblich und ist der Grund, warum es die Prüfmenge gibt.
Stand 7.8.2026 nach den Korrekturen:

| | Training | Prüfmenge |
|---|---|---|
| Gerichte gefunden | 77 % | 54 % |
| Ausgaben, die kein Gericht sind | 17 % | 39 % |
| Kennzeichnungen erkannt | 76 % | 9 % |

**Wer die Erkennung anfasst, misst beide Sätze.** Eine Verbesserung, die nur
den Trainingssatz hebt, ist keine.

## Was hier liegt

| Datei | Inhalt |
|---|---|
| `korpus.json` | Quell-URLs des Trainingssatzes |
| `pruef.json` | Quell-URLs der Prüfmenge |
| `sollwerte.json` | Was auf jeder Karte steht: Gerichte, Preise, Kategorien, Varianten, Allergene |

Die Karten selbst liegen **nicht** im Repo — es sind fremde PDFs und Websites,
teils mehrere Megabyte. Sie lassen sich aus den URLs neu laden. Dass eine
Website sich ändert oder verschwindet, gehört dazu: `sollwerte.json` hält den
Stand fest, gegen den gemessen wurde.

## Die Sollwerte

Erhoben von Sprachmodell-Agenten aus dem ausgelesenen Kartentext, stichprobenweise
gegengeprüft. Sie sind **nicht** fehlerfrei — bei zwei Karten zählen sie
Varianten und Gerichte anders, als ein Mensch es täte. Für einen Vergleich
*vorher/nachher* reicht das; für eine absolute Aussage ("die Erkennung ist zu
83 % korrekt") nicht.

Ein bekannter Messfehler: Die Kategorien werden auf Zeichengleichheit mit der
gedruckten Rubrik verglichen. „SCHNITZEL VOM SCHWEIN" → `Schnitzel` ist eine
sinnvolle Zuordnung, zählt aber als Fehler. Die echte Quote liegt über der
gemessenen.

## Was die Karten schwierig macht

Gesammelt aus den Fehlern, die sie tatsächlich ausgelöst haben:

- Der Name steht über **vier bis fünf Zeilen**, der Preis ganz am Ende
- Der Preis steht **allein** in seiner Zeile (zweispaltiger Satz nach OCR)
- Die Beilagenzeile („dazu Kartoffelsalat") wiederholt sich zehnmal
- Der Betriebsname steht als Kopfzeile **zwischen** Gericht und Preis
- Ein Gerichtname enthält ein Rubrik-Stichwort: „Zwiebelsuppe", „Rumpsteak"
- Allergen-Kürzel in vier Schreibweisen: `(a1, f)`, `a, g` am Zeilenende,
  `Allergene: C, D, G`, und mitten in der Zeile `2,4,11,i,g`
- Die Kürzel-Legende liegt mal oben, mal unten, und in drei Formaten
- **Die Kürzel bedeuten je Karte etwas anderes** — beim einen Wirt ist `f` die
  Milch, beim anderen `g`
- Preise mit einer Nachkommastelle, Datumsangaben, Kürzellisten und
  Füllmengen, die alle wie Preise aussehen
- Mittagstisch nach Wochentagen, ganz ohne Einzelpreise
