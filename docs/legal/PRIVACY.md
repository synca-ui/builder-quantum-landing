# Datenschutzerklärung — Maitr

*Entwurf. Vor Veröffentlichung juristisch prüfen lassen und öffentlich unter einer
stabilen URL hosten (App Store & Play verlangen die URL). An den tatsächlich
ausgelieferten Build anpassen.*

Stand: v1.0.0 · Verantwortlich: [Betreiber / Anschrift / Kontakt-E-Mail einsetzen]

## Kurzfassung
Maitr ist ein Präsenz-Management-Werkzeug für die Gastronomie. Wir erheben so wenige
Daten wie möglich, verkaufen keine Daten und betreiben **kein** Tracking und **keine**
Werbe-IDs.

## Welche Daten verarbeitet werden

**Auf dem Gerät (lokal).** Der App-Zustand (Betriebsprofil, Gäste, Reservierungen,
Beiträge, Einstellungen) wird lokal auf dem Gerät gespeichert (AsyncStorage). Diese
Daten verlassen das Gerät im reinen Demo-Betrieb nicht.

**Konto (falls aktiviert).** Bei aktivierter Anmeldung verarbeiten wir Name und
E-Mail-Adresse zur Kontoverwaltung (Auth-Dienstleister: Clerk). Rechtsgrundlage:
Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).

**Gästedaten.** Legst du Gäste/Reservierungen an, verarbeiten wir die von dir
eingegebenen Angaben (Name, ggf. Telefonnummer) ausschließlich zur Erbringung der
Reservierungs- und CRM-Funktionen in deinem Auftrag. Für personenbezogene Gästedaten
bist du Verantwortlicher; wir handeln als Auftragsverarbeiter (AV-Vertrag erforderlich,
sobald ein Live-Backend im Einsatz ist).

**Verbundene Kanäle (falls verbunden).** Verbindest du Google Business bzw. Meta/
Instagram, verarbeiten wir Bewertungen und Reichweite-Kennzahlen dieser Konten in
deinem Auftrag. OAuth-Tokens werden serverseitig **verschlüsselt** gespeichert und nie
im Klartext protokolliert. Details: `docs/integrations/GOOGLE_META_API_ACCESS.md`.

## Was wir NICHT tun
Kein Verkauf/keine Weitergabe von Daten zu Werbezwecken, kein geräteübergreifendes
Tracking, keine Werbe-Identifier, keine Profilbildung zu Marketingzwecken Dritter.

## Speicherdauer & Löschung
Lokale Daten kannst du durch Deinstallation der App entfernen. Konto-/Serverdaten
werden auf Anfrage gelöscht; bei aktiver Kontofunktion bieten wir eine
In-App-Kontolöschung an (Apple-Vorgabe 5.1.1v).

## Deine Rechte (DSGVO)
Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch —
Kontakt: [E-Mail einsetzen]. Beschwerderecht bei einer Aufsichtsbehörde.

## Drittdienste (Stand v1.0.0)
- **Clerk** (Auth, optional) · **Google Business Profile API** / **Meta Graph API**
  (optional, nur bei Verbindung) · **Stripe** (Zahlungsabwicklung, sobald Abo live).
Jeder Dienst wird erst mit deiner Aktivierung/Verbindung wirksam.
