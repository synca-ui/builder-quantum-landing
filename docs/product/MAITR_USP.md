# Maitr – USP-Entscheidung

Kurzfassung der Positionierung, damit Produkt- und Baurichtung konsistent bleiben.
Diese Datei ist die getroffene Entscheidung, nicht eine Optionsliste.

## These

> **Maitr gibt der Kleingastronomie die Gästebeziehung zurück und macht Online-Präsenz
> zu Euro – automatisch.**

Plattformen (Google, TheFork, Instagram) *vermieten* Nachfrage und besitzen die
Beziehung zum Gast. Genau deshalb können und wollen sie das Folgende nicht bauen. Da
liegt der Graben.

## Die fünf USPs (nach Verteidigbarkeit)

### 1. Der eigene Gäste-Graph (der Moat)
Maitr baut aus jeder Reservierung eine **dem Betrieb gehörende, portable**
Gästebeziehung: Segmente (neu/Stammgast/VIP/gefährdet/verloren), Churn-Risiko,
No-Show-Risiko und **Lifetime Value in Euro**. Plattformen verschenken diesen Besitz
nicht – für sie ist der Gast das Produkt.
→ Algorithmen: `@maitr/core/analytics/guests.ts`. UI: Gäste-CRM.

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

### 4. Eine Präsenz-Oberfläche über Google + Meta
Bewertungen, Reichweite, Beiträge und Profilpflege aus allen Kanälen an *einer* Stelle,
verdichtet auf den **Präsenzscore** als Nordstern-Kennzahl. Der Kleinbetrieb hat keine
Zeit für drei Backends.
→ `analytics/presence.ts` + `integrations/` (Google/Meta-Connectors).

### 5. Lokaler Benchmark als Gewohnheits-Haken
„Besser als 58 % der Cafés in Köln." Peer-Vergleich erzeugt Wiederkehr (Habit) und ist
ein natürlicher Upsell-Hebel. Für Plattformen wäre das ein Interessenkonflikt.

## Was das fürs Bauen heißt
- Der **Gäste-Graph** und die **handelnde Automatisierung** bekommen die meiste Tiefe –
  dort ist der Graben.
- Kennzahlen immer, wo möglich, **in Euro** übersetzen (ROI, LTV).
- Neue Features müssen die These stützen: *Besitz der Beziehung* oder *erledigte Arbeit*.
  Reine Anzeige-Features sind nachrangig.
