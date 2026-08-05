# Offene Entscheidungen

Punkte, die **niemand entschieden hat** und die deshalb im Produkt bewusst leer
stehen. Kein Backlog für Features — hier steht nur, wo eine Zahl, ein Text oder
eine Zusage fehlt, die sich nicht aus dem Code ableiten lässt.

Regel für diese Datei: Solange ein Punkt hier steht, darf die entsprechende
Stelle im Produkt **nichts behaupten**. Lieber eine Lücke als eine erfundene
Angabe — eine erfundene Zahl in einem Store-Screenshot ist eine Zusage.

---

## 1. Preise der Abo-Pläne · **offen**

**Stand:** Aus der App entfernt (05.08.2026). Vorher standen dort 29 € (Pro),
59 € (Autopilot) und 0 € (Start) sowie zwei erfundene Rechnungen über 29,00 €
für Juni und Juli 2026.

**Warum entfernt:** Die Zahlen stammten aus einem Entwurf, nicht aus einer
Entscheidung. Ein Screenshot mit Preis ist im App Store eine Preiszusage, die
App Review gegen die in App Store Connect hinterlegten In-App-Käufe prüft.
Weicht der Screenshot ab, ist das ein Ablehnungsgrund. Die Rechnungsliste war
zusätzlich eine Behauptung über Geldflüsse, die es nie gab.

**Was zu entscheiden ist:**
- Preis je Plan (Start / Pro / Autopilot), monatlich und ggf. jährlich
- Netto oder brutto, und für welche Länder
- Ob der kostenlose Plan „kostenlos" heißen darf oder ein Testzeitraum wird
- Ob die Abrechnung über Stripe direkt oder über Apples In-App-Kauf läuft
  — **wichtig:** Apple verlangt für digitale Inhalte, die in der App
  freigeschaltet werden, den eigenen Kaufweg (30 % bzw. 15 %). Reine
  B2B-SaaS-Abos können unter „Reader"/Business-Ausnahmen fallen; das ist vor
  der Einreichung zu klären, weil es die Architektur bestimmt, nicht nur den
  Preis.

**Wo es wieder eingetragen wird, wenn es feststeht:**
- `mobile/src/features/account/AbonnementScreen.tsx` → `PLANS[].price`
  (Feld ist optional, `PlanCard` zeigt es automatisch wieder an)
- `mobile/src/features/account/AccountScreen.tsx` → `PLAN_INFO[].price`
- Ebendort der Satz „Pro kostet X € — verdient ab dem ersten vollen Tisch."
  im ROI-Panel. Er war der stärkste Abschluss, den der Analytics-Kern liefert,
  und sollte zurück, sobald die Zahl echt ist.
- Echte Rechnungen ersetzen `invoices = []` in `AccountScreen.tsx`, sobald
  Stripe angebunden ist.

**Nicht angefasst:** Die Preise auf der **Web-Seite** (`client/`). Sie stehen
unter der ausdrücklichen Vorgabe, bestehende Builder-Inhalte und Preise nicht
zu ändern. Falls App und Web dieselben Preise zeigen sollen, ist das eine
eigene Entscheidung — und dann muss die Web-Seite mitgezogen werden.

---

## 2. Weitere offene Punkte

Hier eintragen, was beim Bauen auffällt und eine menschliche Entscheidung
braucht, statt es im Code zu erraten.
