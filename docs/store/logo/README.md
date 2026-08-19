# Maitr-Logo — Quelldateien

Hier liegen die **Quellen**, nicht die ausgelieferten Dateien. Wer die Icons neu
rechnen muss, tut es aus diesen und überschreibt damit die Zielorte unten.

| Datei | was |
|---|---|
| `maitr-icon-nacht.svg` / `-1024/-512/-180.png` | Fläche `#121820`, Welle `#F4F7F4`, Punkt `#6FBFAE` |
| `maitr-icon-petrol.svg` / `-1024/-512/-180.png` | Fläche `#1F7A72`, Welle weiß, Punkt `#6FBFAE` |
| `maitr-icon-transparent.svg` / `-1024.png` | nur Welle (`#1F7A72`) und Punkt, ohne Fläche |

**Gewählt ist Nacht** (14.08.2026): Es hebt sich auf hellen wie dunklen
Homescreens ab, und Teal bleibt dadurch in der App die Akzentfarbe statt zur
Grundfläche zu werden.

## Wohin die Dateien gehören — und die Falle dabei

`mobile/ios/` und `mobile/android/` liegen als native Ordner im Repo. Deshalb
**synchronisiert EAS Build `icon` aus `app.json` NICHT** (`expo-doctor` sagt das
ausdrücklich: „When the android/ios folders are present, EAS Build will not sync
the following properties: … icon …"). Der native Ort gewinnt.

Genau das hat hier lange verdeckt, was los war: Das iOS-Icon
(`ios/Maitr/Images.xcassets/AppIcon.appiconset/`) trug seit dem 28.07. das
richtige Nacht-Logo — Android und `mobile/assets/` dagegen den blauen Winkel der
**Expo-Vorlage**, mitsamt sichtbarer Konstruktionshilfslinien. `expo-doctor`
meldete trotzdem grün, weil es nur Maße und Alphakanal prüft, nie den Inhalt.

Die eigentliche Gefahr lag in der Zukunft: Ein `expo prebuild` hätte das gute
iOS-Icon aus `mobile/assets/icon.png` **überschrieben** und durch den
Expo-Winkel ersetzt. Seit alle drei Orte dasselbe Bild tragen, ist das entschärft.

Ziele:
- `mobile/assets/*` — Quelle für `prebuild`, muss stimmen, auch wenn sie nicht gebaut wird
- `mobile/ios/Maitr/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png`
- `mobile/android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/` — fünf Dichten, je fünf Dateien
- `mobile/android/app/src/main/res/values/colors.xml` → `iconBackground`

## Regeln, die beim Rechnen gelten

- **iOS-Symbol: kein Alphakanal**, und randlos. Die Quelle hat runde Ecken mit
  transparentem Außenbereich — auf dieselbe Flächenfarbe gelegt entsteht das
  randlose Quadrat, das iOS erwartet. Apple legt seine Maske selbst darüber; eine
  andere Unterlegfarbe ergäbe helle Zipfel innerhalb der Maske.
- **Android adaptiv:** Vordergrund nur in der sicheren Zone (mittlerer Kreis,
  ~62 % Kantenlänge). Das System beschneidet mit wechselnden Formen und
  verschiebt beim Parallax.
- **Themed Icon (Android 13+):** reine Silhouette. Das System färbt sie selbst
  und wertet **nur den Alphakanal** aus — eigene Farben sind wirkungslos.
