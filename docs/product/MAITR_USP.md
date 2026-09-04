# Maitr – USP-Entscheidung

Kurzfassung der Positionierung, damit Produkt- und Baurichtung konsistent bleiben.
Diese Datei ist die getroffene Entscheidung, nicht eine Optionsliste.

## These

> **Maitr gibt der Kleingastronomie die Gästebeziehung zurück und macht Online-Präsenz
> zu Euro – automatisch.**

Plattformen (Google, TheFork, Instagram) *vermieten* Nachfrage und besitzen die
Beziehung zum Gast. Sie bauen den Gäste-Graph durchaus — aber für sich. Was sie nicht
bauen können, ohne ihr Geschäftsmodell aufzugeben, ist **Besitz**: der Betrieb nimmt
seine Gästebeziehung mit, wenn er kündigt. Da liegt der Graben — in der Portabilität,
nicht in der Existenz der Daten.

## Die fünf USPs (nach Verteidigbarkeit)

### 1. Der eigene Gäste-Graph (der Moat)
Maitr baut aus jeder Reservierung eine **dem Betrieb gehörende, portable**
Gästebeziehung: Segmente (neu/Stammgast/VIP/gefährdet/verloren), Churn-Risiko,
No-Show-Risiko und **Lifetime Value in Euro**. Plattformen verschenken diesen Besitz
nicht – für sie ist der Gast das Produkt.
→ Algorithmen: `@maitr/core/analytics/guests.ts`. UI: Gäste-CRM.

> **Stand 09/2026:** OpenTable hat sein Guest Relationship Management am 26.08.2026 stark
> ausgebaut („zehnmal mehr Gästedetails", 10+ CRM-/Loyalty-Anbindungen). Die Aussage
> „Plattformen bauen das nicht" trägt nicht mehr. Die Aussage, die trägt: sie geben es
> nicht heraus. Siehe [../analyse/WETTBEWERB_2026.md](../analyse/WETTBEWERB_2026.md).

### 2. Provisionsfreie Reservierung mit Euro-ROI
Jede Buchung über Maitr statt über eine Plattform spart Provision. Maitr zeigt das
**in Euro** – pro Monat und aufs Jahr hochgerechnet. Das ist die direkte, harte Antwort
auf „Warum nicht TheFork?".
→ Algorithmus: `analytics/roi.ts`. UI: Wachstum („X € gespart diesen Monat").

### 3. Automatisierung, die *handelt* – kein Dashboard
Maitr zeigt nicht nur Zahlen, es erledigt: formuliert und sendet die Bewertungsantwort,
die Rückhol-Nachricht, den Beitrag zur stärksten Stunde. Das Ritual „drei
Entscheidungen am Morgen, dann übernimmt Maitr" ist das Produkt. Analytics-Tools
konkurrieren um Charts; Maitr konkurriert um erledigte Arbeit.
→ Orchestrierung: `analytics/insights.ts` (rangierte, handlungsleitende Erkenntnisse).

> **Stand 09/2026:** Dieser Punkt trennt uns nicht mehr allein. Choice (Prag, 7,1 Mio. $)
> und SOUS (Amsterdam, 4 Mio. €) automatisieren Kampagnen und Bewertungsantworten
> ebenfalls; Google testet KI-Antworten auf Bewertungen direkt im Unternehmensprofil.
> **Bewertungsantworten sind ein Zeitfenster, kein Graben.** Nach vorn gehört, was an den
> eigenen Gäste-Graph gebunden ist und deshalb niemand nachbauen kann, der ihn nicht hat:
> No-Show-Nachbesetzung, Rückhol-Nachricht, Lifetime Value in Euro.

### 4. Eine Präsenz-Oberfläche über Google + Meta
Bewertungen, Reichweite, Beiträge und Profilpflege aus allen Kanälen an *einer* Stelle,
verdichtet auf den **Präsenzscore** als Nordstern-Kennzahl. Der Kleinbetrieb hat keine
Zeit für drei Backends.
→ `analytics/presence.ts` + `integrations/` (Google/Meta-Connectors).

### 5. Lokaler Benchmark als Gewohnheits-Haken
„Besser als 58 % der Cafés in Köln." Peer-Vergleich erzeugt Wiederkehr (Habit) und ist
ein natürlicher Upsell-Hebel. Für Plattformen wäre das ein Interessenkonflikt.

## Neu 2026: KI-Auffindbarkeit

_Noch kein beschlossener sechster USP — eine Wertlinie, die 2026 entstanden ist und in
die bestehenden fünf einzahlt._

Gäste fragen zunehmend eine KI statt Google. 83 % der Restaurantstandorte tauchen in
KI-Antworten nie auf, obwohl 86 % ein gepflegtes Google-Profil haben; die gemessenen
Empfehlungsschwellen liegen bei ~3,9 Sternen (Gemini) bis ~4,3 (ChatGPT), und Gemini
bevorzugt die **eigene Website** des Betriebs. Beides spielt uns zu: der Konfigurator
baut diese Website ohnehin, und das Bewertungs-Feature wird damit ökonomisch — von 3,8
auf 4,0 ist der Unterschied zwischen „genannt" und „unsichtbar".
→ Zahlen und ihre Grenzen (US-Benchmark!): [../analyse/WETTBEWERB_2026.md](../analyse/WETTBEWERB_2026.md).

## Was das fürs Bauen heißt
- Der **Gäste-Graph** und die **handelnde Automatisierung** bekommen die meiste Tiefe –
  dort ist der Graben.
- Kennzahlen immer, wo möglich, **in Euro** übersetzen (ROI, LTV).
- Neue Features müssen die These stützen: *Besitz der Beziehung* oder *erledigte Arbeit*.
  Reine Anzeige-Features sind nachrangig.
- Alles, was eine Plattform selbst kostenlos anbieten könnte, ist kein Graben. Der Test
  vor jedem Feature: **Kann Google oder OpenTable das nächstes Jahr umsonst mitliefern?**
  Wenn ja, bauen wir es trotzdem — aber es trägt den Pitch nicht.
