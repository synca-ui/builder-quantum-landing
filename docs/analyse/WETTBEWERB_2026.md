# Wettbewerbsanalyse Kleingastronomie DACH

Geprüft am 2026-09-04, Branch `claude/competitor-landscape-audit-e42d3d`.

Gegenstand ist der Wettbewerb um das inhabergeführte Café — wer heute um dieselbe
Zielgruppe und dasselbe Versprechen konkurriert. Alle Angaben stammen aus Presseberichten
und Unternehmensangaben, **nicht** aus eigener Produktprüfung; ich hatte zu keinem der
genannten Produkte Zugang. Wo Quellen sich widersprechen, steht das im Text.

Anlass war ein Audit der Pitch-Folie „Competitive Landscape". Die Folie selbst und der
lange Audit liegen als Artefakte vor, dieses Dokument hält die Befunde fest, die die
Positionierung betreffen.

## Ergebnis auf einen Blick

| Anbieter | Kapital | Überschneidung | Warum |
|---|---|---|---|
| **SOUS** (Amsterdam) | 4 Mio. € Seed, 03/2026 | **hoch** | Gleiche Architektur: Sichtbarkeit + provisionsfrei + Gästebindung, ~100 €/Monat, unabhängige Restaurants. Expansion nennt Deutschland zuerst. |
| **Choice** (Prag) | 7,1 Mio. $ Series A, 03/2026 | **hoch** | KI ersetzt die Marketing-Abteilung: Kampagnen, Bewertungsantworten, Preise. Das ist USP 3. |
| **allO** (München) | 12 Mio. € Series A, 05/2026 | mittel | Betriebs-OS mit KI-Agenten. Schwerpunkt Kasse, nicht Präsenz — aber **1.000+ deutsche Standorte**. |
| **Malou** (Paris) | > 10 Mio. $ | mittel | Präsenz-Oberfläche über Google + Social, KI beantwortet Bewertungen. Zielgruppe ab 3 Standorten. |
| **OpenTable** | — | **hoch, neu** | Guest Relationship Management seit 08/2026 stark ausgebaut. Baut den Gästegraph — für sich. |
| **Bounti** (Berlin) | 4 Mio. € Seed, 03/2026 | **keine** | Mitarbeiterschulung für Ketten. Sieht aus wie ein Wettbewerber, ist keiner. |

**Kernbefund:** Kein Anbieter füllt alle fünf USPs — das Bündel ist echt. Aber vier von
fünf sind einzeln am Markt, und die drei am besten verteidigbaren füllt SOUS ebenfalls.
Die verbleibende Trennlinie ist nicht mehr das Bündel, sondern der **Zielkunde**.

---

## 1. Zwei Sätze in den Produktdokumenten sind nicht mehr haltbar

### „Plattformen bauen das nie"

`MAITR_USP.md` begründete den Moat damit, dass Plattformen den Gästegraph nicht bauen
können. Das ist seit dem 26.08.2026 widerlegt: OpenTable hat über zwanzig neue Funktionen
ausgerollt, darunter ein Guest Relationship Management mit nach eigener Angabe „zehnmal
mehr Gästedetails" als ein normales Gästebuch, über zehn Anbindungen an CRM-, PMS- und
Loyalty-Systeme, Voice-KI mit 20+ Partnern und drei Millionen darüber gesetzten Gästen
(+270 % gegenüber dem Vorjahreszeitraum). Dazu Launchpartner des OpenAI-Apps-SDK, native
Gemini-Anbindung seit Mitte 2026, Haken in Perplexity, Copilot und Alexa+.

**Was stattdessen trägt:** Plattformen bauen den Gästegraph — für sich. Was sie nicht
bauen können, ohne ihr Geschäftsmodell aufzugeben, ist **Besitz**: der Betrieb nimmt seine
Gästebeziehung mit, wenn er kündigt. Der Moat ist die Portabilität, nicht die Existenz
der Daten.

Umgesetzt in `MAITR_USP.md` und `PRODUCT_ONEPAGER.md`.

### Bewertungsantworten als Beleg für „Automatisierung, die handelt"

Google testet KI-generierte Antworten auf Bewertungen direkt im Unternehmensprofil —
bestätigt für USA, Brasilien und Indien, in Europa bislang weitgehend nicht aufgetaucht.
Die Berichte, ob veröffentlicht oder nur vorgeschlagen wird, widersprechen sich.

**Bewertung:** kein Graben, ein Zeitfenster. Das Feature bleibt im Produkt, darf im Pitch
aber nicht die Hauptlast tragen. Was Google *nicht* baut und auch nicht bauen wird:
No-Show-Nachbesetzung aus dem eigenen Gästekreis, Lifetime Value in Euro, die
Rückhol-Nachricht an den abdriftenden Stammgast. Das gehört nach vorn.

---

## 2. Eine dritte Wertlinie ist entstanden: KI-Auffindbarkeit

Gäste fragen zunehmend nicht mehr Google, sondern eine KI. Belege:

- 22 % der Konsumenten haben schon eine KI gefragt, wo sie essen sollen
  (DoorDash Restaurant Industry Trends 2026).
- 44 % der US-Amerikaner wollen KI 2026 stärker für Entdeckung und Reservierung nutzen
  (OpenTable Diner Trends 2026).
- 83 % der Restaurantstandorte tauchen in KI-Antworten **nie** auf, obwohl 86 % ein
  gepflegtes Google-Profil haben. Sichtbarkeit auf Google überträgt sich nicht.
- Gemessene Empfehlungsschwellen: ChatGPT ab ~4,3 Sternen, Perplexity ab ~4,1,
  Gemini ab ~3,9. Eine KI nennt typischerweise nur drei bis fünf Namen.
- Gemini bevorzugt die **eigene Website** des Restaurants; ChatGPT stützt sich stärker
  auf Verzeichnisse.

**Einschränkung:** Der Benchmark (Uberall, „Fast Food, Faster Discovery", 2026) misst
Multi-Location-Schnellrestaurants in den USA, nicht deutsche Cafés. Die Richtung ist
belastbar, die Prozentzahl für unseren Markt nicht. Nie ohne Herkunftsangabe zitieren.

**Was das für uns heißt — drei Dinge, für die nichts Neues gebaut werden muss:**

1. Der Konfigurator erzeugt bereits eine eigene Website mit strukturierten Daten. Das
   *ist* KI-Sichtbarkeits-Infrastruktur, wir nennen es nur nicht so.
2. Die Sterne-Schwelle macht das Bewertungs-Feature ökonomisch: von 3,8 auf 4,0 ist der
   Unterschied zwischen „von Gemini genannt" und „unsichtbar". Zweites Euro-Argument
   neben der gesparten Provision.
3. SOUS verkauft genau das bereits als eigenes Modul („Spotlight"). Wenn wir es nicht
   benennen, benennt es jemand anderes für uns.

---

## 3. Der Zielkunde muss enger geschnitten werden

Jeder der neuen Wettbewerber richtet sich an Betriebe mit Bestellgeschäft, Kassensystem
oder mehreren Standorten:

- **SOUS** — Mitte ist die Bestellung (Commerce-Modul).
- **Choice** — Betriebe mit Liefergeschäft, 1,5 Mio. Bestellungen/Monat.
- **allO** — Betriebe, die ein Kassensystem wechseln wollen.
- **Malou** — Gruppen ab drei Standorten.

**Die Lücke:** inhabergeführte Cafés und Bars **ohne Liefergeschäft und ohne
Kassenwechsel-Bereitschaft**, bei denen der Wert Zeit und Präsenz ist, nicht
Bestellvolumen. Das ist enger als „Kleingastronomie DACH" — und es ist die einzige Zeile,
in der heute niemand mit mehr Kapital steht.

**Offen, Gründerentscheidung:** ob die ICP-Definition im One-Pager entsprechend
verengt wird. Vorschlag liegt dort als Kommentar bei.

---

## 4. Offene Punkte

| Punkt | Warum offen |
|---|---|
| SOUS' Deutschlandstart | Expansion steht in der Meldung vom 03/2026; ob hier schon aktiv verkauft wird, nicht feststellbar |
| allOs Kundenprofil | „1.000+ aktive Standorte" ist Unternehmensangabe; ob Pizzerien mit Lieferung oder auch Cafés, geht aus den Quellen nicht hervor — entscheidend für die Nähe zu uns |
| Preise allO, Choice, Malou | nicht öffentlich |
| DISH-Paketpreis | nicht öffentlich, offen seit dem ersten Audit |
| Höhe der SOUS-Runde | 4 Mio. € gegen 3,1 Mio. $ je nach Quelle |
| Deutsche Zahlen zur KI-Auffindbarkeit | keine gefunden, alles Belastbare ist US-amerikanisch |
| Preisniveau Maitr | SOUS nimmt ~100 €/Monat von derselben Zielgruppe in Europa, Owner.com 499 $ in den USA. Maitr mit 29/59 € ist auffällig niedrig — Gründerentscheidung, hier nicht geändert |

## Quellen

Alle abgerufen am 04.09.2026.

- allO: [EU-Startups](https://www.eu-startups.com/2026/05/munichs-allo-raises-e12-million-series-a-to-expand-its-ai-operating-system-for-restaurants-across-europe/), [Hospitality Net](https://www.hospitalitynet.org/news/4132593/allo-raises-14m-series-a-led-by-zigg-capital-to-scale-the-first-ai-native-operating-system-for-restaurants)
- SOUS: [EU-Startups](https://www.eu-startups.com/2026/03/amsterdam-based-sous-raises-e4-million-to-become-the-ai-powered-sous-chef-for-restaurant-growth/), [The Next Web](https://thenextweb.com/news/sous-4m-seed-ai-restaurant-growth-platform), [Dealroom](https://app.dealroom.co/news/feed/amsterdam-s-sous-raises-3-1m-for-ai-agent-helping-independent-restaurants-compete-with-major-chains)
- Choice: [Tech.eu](https://tech.eu/2026/03/16/choice-secures-71m-series-a-to-expand-its-restaurant-operating-system-across-europe/), [The Recursive](https://www.therecursive.com/choice-raises-7-1m-ai-restaurant-tech-expansion-europe/)
- Malou: [Restaurant Technology News](https://restauranttechnologynews.com/2023/12/malou-raises-10-million-to-accelerate-growth-of-its-ai-powered-digital-marketing-solutions-for-restaurants/)
- Bounti: [Trending Topics](https://www.trendingtopics.eu/bounti-berliner-startup-holt-sich-4-mio-euro-fuer-ki-plattform-in-der-gastronomie/)
- OpenTable 08/2026: [Yahoo Finance](https://finance.yahoo.com/technology/articles/opentable-launches-largest-suite-updated-130000789.html), [StockTitan](https://www.stocktitan.net/news/BKNG/open-table-launches-its-largest-suite-of-new-and-updated-product-ls8wpprvts2d.html)
- Google KI-Bewertungsantworten: [Search Engine Land](https://searchengineland.com/google-business-profile-test-reply-to-reviews-with-ai-472167)
- Uberall-Benchmark: [Businesswire](https://www.businesswire.com/news/home/20260507962493/en/83-of-Restaurants-Are-Invisible-in-AI-Search-New-Uberall-Report-Reveals-the-Discovery-Gap-Reshaping-the-Quick-Service-Restaurant-Industry)
- Provisionen und DACH-Reservierungssysteme: [tischamigos.de](https://tischamigos.de/blog/kostenloses-reservierungssystem-restaurant), [OMR Reviews](https://omr.com/en/reviews/product/thefork/pricing)
- Quandoo stellt Ende 2026 ein: [gastrobird.io](https://gastrobird.io/quandoo-stellt-betrieb-ein-warum-gastrobird-die-beste-quandoo-alternative-fuer-ihr-restaurant-ist/)
