# Maitr — Store-Metadaten (Entwurf)

Copy für App Store Connect & Google Play. Deutsch (Primärmarkt DE). In die jeweiligen
Felder einfügen; Zeichenlimits beachten.

## Namen & Kurztexte
- **App-Name (iOS, ≤30):** `Maitr — Gastro-Assistent`
- **Untertitel (iOS, ≤30):** `Dein Café im Griff`
- **Kurzbeschreibung (Play, ≤80):** `Gäste, Reservierungen, Bewertungen und Wachstum deines Cafés an einem Ort.`
- **Kategorie:** Primär **Wirtschaft** (Business), Sekundär **Essen & Trinken**.
- **Altersfreigabe:** iOS **4+**, Play **USK 0 / „Alle"**.
- **Preis:** kostenlos (Abo im Produkt: Start 0 € / Pro 29 € / Autopilot 59 €).

## Keywords (iOS, ≤100 Zeichen, kommagetrennt)
`café,restaurant,gastro,reservierung,tische,gäste,crm,bewertungen,google,instagram,speisekarte,wachstum`

## Beschreibung (lang)
> **Maitr nimmt Cafés und Bars den Online-Auftritt ab — und macht Präsenz zu Euro.**
>
> Jeden Morgen drei Entscheidungen, dann übernimmt Maitr: Bewertungen warm beantworten,
> Beiträge zur stärksten Stunde planen, Reservierungen und Tische im Blick behalten.
>
> **Deine Gäste gehören dir, nicht der Plattform.** Das Gäste-CRM erkennt Stammgäste,
> meldet, wer länger nicht da war, und holt sie mit einer freundlichen Nachricht zurück.
> No-Shows besetzt Maitr sofort aus deinem eigenen Gästekreis nach — kein leerer Tisch.
>
> **Provisionsfrei.** Reservierungen laufen über dich, nicht über teure Plattformen —
> und Maitr zeigt dir schwarz auf weiß, was du dadurch sparst.
>
> Ruhig, minimalistisch, ohne Werkzeug-Wildwuchs. Für den Betrieb um die Ecke.

## Screenshots (aus dem iOS-Simulator, 6,7″ iPhone Pflicht)
Empfohlenes Set (in dieser Reihenfolge):
1. Start — „Guten Morgen · drei Entscheidungen"
2. Gäste-CRM — Wert + No-Show-Risiko
3. Wachstum — ROI in € + Erkenntnisse
4. Autopilot — „Von Maitr erledigt"
5. Reservierung — No-Show → Tisch nachbesetzt

## App-Privacy (Nutrition Label / Data safety)
Auf den **tatsächlich ausgelieferten** Build abstimmen:
- Reiner Demo-Build (nur AsyncStorage, kein Netzverkehr): „Es werden keine Daten erfasst."
- Mit Live-Backend/Clerk: erhoben = **E-Mail, Name** (Zweck: App-Funktionalität/Account,
  nutzerverknüpft), **kein Tracking**, keine Werbe-IDs. Datenschutz-URL (Pflicht) →
  `docs/legal/PRIVACY.md` öffentlich hosten.
