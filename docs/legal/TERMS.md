# Nutzungsbedingungen

> **ENTWURF – NICHT RECHTSVERBINDLICH.** Dieser Text ist ein Arbeitsentwurf zur anwaltlichen Prüfung und noch nicht zur Veröffentlichung freigegeben. Alle mit `>>ENTSCHEIDUNG NOETIG<<` markierten Stellen enthalten offene unternehmerische oder rechtliche Entscheidungen, alle mit `>>EINSETZEN: ...<<` markierten Stellen fehlende Pflichtangaben. Vor Veröffentlichung sind beide Kategorien vollständig zu schließen und der Text ist von einer Rechtsanwältin/einem Rechtsanwalt freizugeben. An Stellen, an denen Verbraucherrecht in ein grundsätzlich auf Unternehmer (B2B) zugeschnittenes Regelwerk hereinragen könnte, ist das im Text mit ⚠ **Verbraucherschutz-Prüfhinweis** gekennzeichnet.
>
> Diese Fassung wurde gegenüber dem vorherigen Entwurf um die Ergebnisse eines Prüfberichts ergänzt, der den Text und die veröffentlichte Datenschutzerklärung gegen den Code abgeglichen hat. Jede Ergänzung, die eine Aussage über Daten oder Funktionen trifft, trägt einen Datei:Zeile-Beleg. Nicht belegbare Punkte stehen unter "Ungeklärt" in der Anlage, nicht im Vertragstext.

Anbieter (nachfolgend "**maitr**" oder "**wir**"):

Julian Heinrich, Hansaring 37, 48155 Münster (Beleg: identische Angabe in der bereits veröffentlichten AGB-Fassung, "client/pages/AGB.tsx":114).

>>EINSETZEN: Rechtsform (im Repository ist an der genannten Stelle nur eine natürliche Person ohne Zusatz wie „e.K." genannt — vor Veröffentlichung zu bestätigen, ob ein Einzelunternehmen, ein Kaufmann i. S. d. HGB oder eine andere Rechtsform vorliegt), Handelsregister/USt-IdNr. sofern vorhanden, Kontakt-E-Mail für rechtsgeschäftliche Erklärungen und Datenschutzanfragen, ggf. Telefon<<

## § 1 Geltungsbereich und Vertragsgegenstand

(1) Diese Nutzungsbedingungen gelten für die Nutzung der unter maitr.de angebotenen Software durch Gastronomiebetriebe (nachfolgend "**Kunde**"). Das Angebot besteht aus zwei technisch und funktional getrennten Teilen, die gemeinsam oder einzeln genutzt werden können:

- **(a) Web-Baukasten**: Ein Konfigurator, mit dem der Kunde eine eigene Web-App für seinen Betrieb erzeugt (Betriebsdaten, Speisekarte, Design, Reservierungsfunktion, ggf. automatisierte Übernahme von Inhalten aus einer bestehenden Web-Präsenz des Kunden, ggf. Online-Bestellfunktion über QR-Code). Die erzeugte Web-App wird auf von maitr betriebener Infrastruktur veröffentlicht. Funktionsbeleg Bestellfunktion: "prisma/schema.prisma":238-266,466-468 (Modell `Order`, Schalter `onlineOrdering`); "server/routes/orders.ts":7,30; "client/components/dynamic/AppRenderer.tsx":813 (`onAddToCart`). >>ENTSCHEIDUNG NOETIG<<: Ob die Bestellfunktion im ersten Rollout tatsächlich freigeschaltet ist, war im Rahmen dieser Prüfung nicht abschließend feststellbar (die Mount-Stelle der Route im `apiRouter` wurde nicht verifiziert); bis zur Klärung ist sie als vorhandene, ggf. inaktive Funktion zu behandeln und in § 11 entsprechend offenzulegen.
- **(b) iOS-App "Maitr"**: Eine mobile Anwendung, mit der der Kunde sein Google Business Profile und seinen Instagram-Auftritt verwaltet (Bewertungen, Beiträge), sowie interne Funktionen für Aufgaben, Gästeverwaltung, Personal-, Dienst- und Abwesenheitsplanung sowie ein Stempelkarten-/Treueprogramm nutzt. Funktionsbelege: Bewertungen – "prisma/schema.prisma":876-920, "server/maitr/sync.ts":94-129; Google-/Instagram-Anbindung – "prisma/schema.prisma":939-1019, "packages/core/src/integrations/google.ts":18-30,59-88, "packages/core/src/integrations/meta.ts":30-100; Gästeverwaltung – "prisma/schema.prisma":798-874; Personal-, Dienst- und Abwesenheitsplanung – "prisma/schema.prisma":311-341,343-380,383-414,431-439, "server/routes/staff.ts":46-60,67,135,182,240,316; Stempelkarte – "prisma/schema.prisma":1385-1558,1574-1605.

(2) Kunde im Sinne dieser Bedingungen ist ausschließlich ein Unternehmer im Sinne von § 14 BGB, der die Leistungen zum Betrieb seiner Gastronomie nutzt. >>ENTSCHEIDUNG NOETIG<<: Soll die Zielgruppe explizit auf Unternehmer beschränkt und die Registrierung entsprechend geprüft werden (z. B. Abfrage Gewerbeanmeldung/USt-IdNr.)? ⚠ **Verbraucherschutz-Prüfhinweis**: Die aktuell veröffentlichte AGB-Fassung enthält einen Abschnitt "§ 8 Widerruf" (client/pages/AGB.tsx), der auf ein Verbraucher-Widerrufsrecht nach § 312g BGB hindeutet. Das ist mit einer reinen B2B-Ausrichtung nicht vereinbar und im Rahmen dieser Prüfung zu klären: entweder wird die Zielgruppe tatsächlich auch Kleinstunternehmer ohne Gewerbeanmeldung umfassen (dann bleibt ein Widerrufsrecht ggf. bestehen), oder der Abschnitt ist bei konsequenter B2B-Ausrichtung zu streichen.

(3) Individuelle Vereinbarungen mit einzelnen Kunden gehen diesen Nutzungsbedingungen vor.

## § 2 Vertragsschluss

(1) Die Darstellung der Leistungen auf maitr.de stellt kein bindendes Angebot dar, sondern eine Aufforderung zur Registrierung.

(2) Der Vertrag kommt zustande, indem der Kunde ein Konto anlegt (Authentifizierung über den Dienst Clerk, siehe § 11) und die Registrierung abschließt. maitr kann die Registrierung ohne Angabe von Gründen ablehnen.

(3) >>ENTSCHEIDUNG NOETIG<<: Erfolgt eine gesonderte Bestätigung des Vertragsschlusses per E-Mail (Textform)? Wird bei der Registrierung eine Bestätigung der Unternehmereigenschaft eingeholt (siehe § 1 Abs. 2)?

## § 3 Testphase und Abonnement

(1) >>ENTSCHEIDUNG NOETIG<<: Dauer einer etwaigen kostenlosen Testphase, automatischer Übergang in ein kostenpflichtiges Abonnement oder gesonderte Bestätigung erforderlich, Kündbarkeit während der Testphase.

(2) >>ENTSCHEIDUNG NOETIG<<: Abrechnungsmodell (monatlich/jährlich), ob Web-Baukasten und App separat oder nur gebündelt abonniert werden können.

(3) Die Zahlungsabwicklung erfolgt über den Zahlungsdienstleister Stripe; maitr speichert Kundennummer, Abonnementnummer und Abrechnungsmetadaten, nicht jedoch Zahlungsmitteldaten selbst ("prisma/schema.prisma":567-601; "server/webhooks/stripe.ts":6-7,46-95).

## § 4 Pflichten des Kunden

(1) Der Kunde ist verantwortlich für die Richtigkeit der von ihm eingegebenen Betriebs-, Speisekarten- und Kontaktdaten sowie für die Pflege dieser Daten.

(2) Der Kunde ist verantwortlich für die Zugangsdaten zu seinem Konto und zu den von ihm verbundenen Google-/Instagram-Konten und hat diese vor Zugriff Dritter zu schützen.

(3) Wo der Kunde eigenes Personal Zugriff auf die iOS-App gewährt (z. B. zur Ausgabe von Stempelkarten am Tresen), ist der Kunde dafür verantwortlich, dass dieses Personal berechtigt ist, im Namen seines Betriebs Gästedaten (Name, Telefonnummer) zu erfassen ("mobile/src/features/loyalty/StampProgramScreen.tsx":868-878; "server/maitr/stempelkarte.ts":1165-1256).

(4) Der Kunde darf die Dienste nicht für rechtswidrige Zwecke nutzen und keine Inhalte einstellen, die Rechte Dritter verletzen (siehe § 5).

(5) Soweit der Kunde über die iOS-App Personal-, Dienst- und Abwesenheitsdaten seiner Mitarbeitenden verarbeitet, ist er hierfür als Arbeitgeber datenschutzrechtlich Verantwortlicher; maitr verarbeitet insoweit als Auftragsverarbeiter (siehe § 11 Abs. 1). Der Kunde ist verantwortlich für die Rechtsgrundlage dieser Verarbeitung gegenüber seinen Mitarbeitenden, insbesondere soweit besondere Kategorien personenbezogener Daten betroffen sind — namentlich der Abwesenheitsgrund „Krankheit" und hochgeladene Nachweise/Atteste, die als Gesundheitsdaten unter Art. 9 DSGVO fallen. Beleg: "prisma/schema.prisma":383-414 (Feld `attachments`, Kommentar „URLs to medical certificates"), :431-439 (`AbsenceType.SICK_LEAVE`).

## § 5 Inhalte des Kunden und Rechte daran

(1) Der Kunde stellt im Rahmen des Web-Baukastens eigene Inhalte bereit (Texte, Logo, Speisekartenfotos, Galeriebilder, Kontaktdaten). Der Kunde sichert zu, dass er zur Nutzung, Vervielfältigung und öffentlichen Zugänglichmachung dieser Inhalte im Rahmen der von maitr bereitgestellten Web-App berechtigt ist und keine Rechte Dritter (Urheber-, Marken-, Persönlichkeitsrechte) verletzt werden. Der Kunde stellt maitr von Ansprüchen Dritter frei, die auf einer Verletzung dieser Zusicherung beruhen.

(2) **Auto-Konfigurator:** Ein Teil des Web-Baukastens übernimmt automatisiert Material von einer vom Kunden angegebenen, bereits bestehenden Web-Präsenz des Kunden (Website, Google Maps) und befüllt daraus den Konfigurator (Geschäftsname, Kontaktdaten, Menü-URL, Bilder). Beleg: "prisma/schema.prisma":603-637 (Tabelle ScraperJob mit Feldern businessName, email, phone, extractedData, suggestedConfig); "server/routes/n8nProxy.ts":5,14-22; "docs/n8n/Deep-Scrape-Flow.json":711,715 (Verarbeitung außerhalb der Express-/Prisma-Schicht durch einen n8n-Workflow mit eigenem Datenbankzugriff). Übernommene Bilder werden im Bilderdienst des Kunden abgelegt ("server/services/imageIngest.ts":76; "server/services/supabaseStorage.ts":14,34-46,89).

Nutzt der Kunde die automatisierte Übernahme von Inhalten aus einer bestehenden Web-Präsenz, sichert er zu, dass er zur Nutzung der von der angegebenen Quelle übernommenen Inhalte für seinen Betrieb berechtigt ist, und beauftragt maitr mit der Übernahme. Der Kunde stellt maitr von Ansprüchen Dritter frei, die auf einer Verletzung dieser Zusicherung beruhen. maitr prüft die Rechteinhaberschaft an der angegebenen Quelle nicht.

>>ENTSCHEIDUNG NOETIG<<: Soll vor der automatisierten Übernahme eine explizite Bestätigungsseite ("Diese Inhalte gehören mir / ich bin berechtigt, sie zu verwenden") zwischengeschaltet werden? Aktuell ist im Konfigurator-Flow kein gesondertes Zustimmungs- oder Bestätigungs-UI für die Rechteübernahme belegt.

**Hinweis zum Anwendungsbereich dieser Klausel:** Die hier geregelte Zusicherung bindet den Kunden im Rahmen seines Vertrags mit maitr. Die technische Erfassung durch den Auto-Konfigurator setzt jedoch keine Registrierung voraus: Auf maitr.de und check.maitr.de kann eine Website-Adresse **ohne Anmeldung, von jedem Besucher der Seite**, eingegeben werden, wodurch dieselbe ScraperJob-Verarbeitung ausgelöst wird — Beleg: "client/pages/Index.tsx":435-441; "client/pages/CheckLanding.tsx":909-915; "server/index.ts":280 (Route `/api/forward-to-n8n` ohne `requireAuth`). Diese vorvertragliche bzw. außervertragliche Erfassung durch nicht registrierte Besucher fällt nicht unter diese Nutzungsbedingungen und ist ausschließlich in der Datenschutzerklärung zu regeln.

>>ENTSCHEIDUNG NOETIG<<: Für ScraperJob-Zeilen ohne zugeordnetes Konto (`userId` = NULL — nach Angabe der Codekommentare der Regelfall bei Erfassung ohne vorherige Anmeldung, "server/routes/scraper.ts":355-362) existiert im Code kein Löschpfad, auch nicht über die Kontolöschung nach § 9: Die dortige Löschung trifft ausschließlich Zeilen mit gesetzter `userId` ("server/routes/users.ts":184). Vor Veröffentlichung ist entweder eine Löschfrist zu implementieren oder der ungeschützte Endpunkt einzuschränken.

(3) Hochgeladene Speisekartenfotos können zur Texterkennung an die Google-Gemini-API übermittelt werden ("server/services/ocr/gemini.ts":19,225-227). Der Kunde ist damit einverstanden, dass zu diesem Zweck Bilddaten an diesen Drittanbieter übertragen werden.

(4) Bilder aus dem Web-Baukasten werden in einem öffentlich lesbaren Speicher-Bucket abgelegt und sind damit ohne Zugriffsbeschränkung über das Internet abrufbar ("server/services/supabaseStorage.ts":14,34-46,89,92-104; "server/routes/media.ts":87). Die Dateien werden zudem mit einer langen Zwischenspeicherfrist ausgeliefert (`Cache-Control: public, max-age=31536000, immutable`, "server/services/supabaseStorage.ts":68-70); nach Löschung eines Bildes können Auslieferungsnetze und Browser dieselbe Adresse deshalb noch eine Zeit lang beantworten, obwohl die Datei bei maitr entfernt ist (Kommentar im Code hierzu: "server/services/supabaseStorage.ts":92-104). Der Kunde ist hierüber zu informieren, insbesondere wenn er Bilder mit Personenabbildungen hochlädt.

(5) maitr räumt dem Kunden ein einfaches, nicht übertragbares Nutzungsrecht an der über den Baukasten erzeugten Web-App für die Dauer des Vertrags ein. >>ENTSCHEIDUNG NOETIG<<: Was geschieht mit der veröffentlichten Web-App und den darauf enthaltenen Inhalten nach Vertragsende (Deaktivierung, Frist zur Datenmitnahme, Löschung)?

## § 6 Verbindung zu Google und Meta

(1) Die Funktionen der iOS-App zur Verwaltung von Google Business Profile und Instagram setzen voraus, dass der Kunde maitr über eine OAuth-Autorisierung Zugriff auf die entsprechenden Konten gewährt. Die Zugriffstoken werden verschlüsselt gespeichert ("prisma/schema.prisma":939-1019; "server/maitr/security.ts":15-34).

(2) **Diese Verbindungen hängen von Freigaben Dritter ab, auf die maitr keinen Einfluss hat:**

- Der Zugriff auf die Google Business Profile API setzt voraus, dass Google die maitr-Anwendung für den angeforderten Berechtigungsumfang (u. a. `business.manage`) im Rahmen des OAuth-Verifizierungsverfahrens freigibt. Dieses Verfahren liegt vollständig bei Google, kann mehrere Wochen dauern und kann von Google abgelehnt, verzögert oder nachträglich widerrufen werden.
- Entsprechendes gilt für den Zugriff auf die Meta-/Instagram-Anbindung über die Meta Graph API.
- Fällt eine dieser Freigaben weg oder wird sie von Google/Meta eingeschränkt (z. B. Scope-Änderung, App-Sperre, Ablehnung im Review), sind die davon abhängigen Funktionen der iOS-App (Bewertungsübersicht, Beitragsverwaltung, Reichweitenkennzahlen) nicht nutzbar. maitr sichert die Verfügbarkeit dieser Funktionen nicht zu und haftet nicht für Ausfälle, die auf Entscheidungen von Google oder Meta beruhen.
- Der Kunde ist zudem verantwortlich dafür, dass er selbst zur Erteilung dieser Berechtigungen für sein Google Business Profile und seinen Instagram-/Facebook-Account berechtigt ist (z. B. als Inhaber/Administrator des jeweiligen Kontos).

(3) maitr ist berechtigt, den Funktionsumfang der Google-/Meta-Anbindung anzupassen, wenn dies durch Änderungen der jeweiligen Schnittstellen oder Richtlinien der Drittanbieter erforderlich wird.

(4) Die iOS-App bietet dem Kunden eine Schaltfläche „Verbindung trennen" für einzelne Google-/Instagram-Verbindungen an. **Diese Funktion entfernt die Verbindung nach aktuellem Stand ausschließlich aus der Ansicht auf dem Gerät des Kunden. Die serverseitig gespeicherten, verschlüsselten Zugriffs- und Aktualisierungstoken werden dabei nicht gelöscht, und der automatisierte Datenabruf läuft unverändert weiter**, bis der Kunde die Freigabe unmittelbar bei Google bzw. Meta widerruft. Beleg: "mobile/src/lib/store.tsx":814-821 (Handler ändert nur lokalen State), "mobile/src/features/growth/ChannelDetailScreen.tsx":106-109; kein `channelConnection.delete`-Aufruf im gesamten `server/` (geprüft), Statuswechsel bei Fehlern nur auf `EXPIRED` ("server/maitr/sync.ts":69-72).

>>ENTSCHEIDUNG NOETIG<<: Vor Einreichung des Google-OAuth-Verifizierungsantrags ist ein Endpunkt zu bauen, der die Verbindung serverseitig tatsächlich beendet (Token-Widerruf bei Google/Meta und Löschung der Verbindungszeile), und die Schaltfläche daran anzuschließen. Bis dahin ist entweder die Beschriftung der Schaltfläche richtigzustellen oder sie zu entfernen, da der Kunde andernfalls von einem Widerruf ausgeht, der technisch nicht stattfindet.

## § 7 Verfügbarkeit

(1) Der Web-Baukasten wird über die Infrastrukturanbieter Netlify (Frontend/Hosting) und Railway (Backend) betrieben, die Datenhaltung erfolgt bei Neon (Postgres); Beleg: "netlify.toml"; "prisma/schema.prisma" (durchgehend); "netlify/edge-functions/inject-site-config.ts":38-131.

(2) maitr bemüht sich um eine hohe Verfügbarkeit der Dienste, sichert jedoch keine bestimmte Verfügbarkeit in Prozent zu, soweit nicht gesondert vereinbart. >>ENTSCHEIDUNG NOETIG<<: Soll eine SLA-Kennzahl zugesagt werden? Wartungsfenster werden mit angemessenem Vorlauf angekündigt, soweit technisch möglich.

(3) Ausfälle, die auf Störungen bei den in § 6 und § 11 genannten Drittanbietern (Google, Meta, Clerk, Stripe, Resend, Netlify, Railway, Neon, Supabase, n8n) beruhen, liegen außerhalb des Einflussbereichs von maitr.

## § 8 Vergütung

(1) >>ENTSCHEIDUNG NOETIG<<: Preise sind zum Zeitpunkt dieses Entwurfs nicht festgelegt. Dieser Abschnitt ist erst nach Preisentscheidung final zu formulieren (Preismodell, Fälligkeit, Zahlungsweg über Stripe, Folgen von Zahlungsverzug, Preisanpassungsvorbehalt).

(2) ⚠ **Verbraucherschutz-Prüfhinweis**: Sollte entgegen § 1 Abs. 2 doch mit Einzelunternehmern ohne klare Unternehmereigenschaft kontrahiert werden, sind bei Preisangaben und Zahlungsbedingungen die Informationspflichten aus Art. 246a/246c EGBGB zu prüfen.

## § 9 Laufzeit und Kündigung

(1) >>ENTSCHEIDUNG NOETIG<<: Mindestlaufzeit, Verlängerungsautomatik, ordentliche Kündigungsfrist.

(2) Beide Vertragspartner können den Vertrag aus wichtigem Grund fristlos kündigen.

(3) Kündigt der Kunde oder löscht er sein Konto, gilt hinsichtlich der Datenlöschung Folgendes:

- **Ablauf**: Die Kontolöschung entfernt zuerst die im Bilderspeicher unter dem Präfix des Nutzers abgelegten Dateien, dann die Datenbankeinträge des Kontos, zuletzt die Identität bei Clerk. Beleg: "server/routes/users.ts":87-129,149,237-283.
- **Reichweite Betriebsdaten**: Ist an dem Betrieb des kündigenden Kontos nach dieser Löschung noch mindestens ein weiteres Mitgliedskonto vorhanden **oder** zeigt eine Konfiguration eines anderen Kontos weiterhin auf diesen Betrieb, bleiben sämtliche betriebsbezogenen Daten (Gästedaten, Bewertungen, Stempelkarten, Reservierungen, Bestellungen, Personal-, Dienst- und Abwesenheitsdaten, Kanalverbindungen) unverändert bestehen. Beleg: "server/routes/users.ts":110-129.
- **Wird der Betrieb durch die Löschung verwaist** (kein weiteres Mitglied, keine fremde Konfiguration mehr am Betrieb), **löscht maitr den gesamten Betrieb einschließlich aller vorgenannten betriebsbezogenen Daten unwiderruflich mit**. Beleg: "server/routes/users.ts":184-188 (`business.deleteMany` für `orphanBusinessIds`).

Eine vollständige Löschung sämtlicher Betriebsdaten setzt somit voraus, dass der Betrieb durch die Kontolöschung verwaist. Ist der Kunde nicht das einzige Konto seines Betriebs oder ist eine fremde Konfiguration mit dem Betrieb verknüpft, betrifft die Löschung ausschließlich das eigene Konto. Diese Differenzierung ist dem Kunden bei Vertragsende offenzulegen; der Formulierung "das Konto wird gelöscht" darf im veröffentlichten Text nicht der Eindruck einer unvollständigen oder einer vollständigen Datenlöschung entnommen werden können, ohne dass klar wird, welcher der beiden Fälle vorliegt.

(4) Diese Nutzungsbedingungen ersetzen die zuvor unter maitr.de/agb veröffentlichte Fassung vollständig. >>ENTSCHEIDUNG NOETIG<<: Die bisherige Fassung sagt zu, alle Nutzerdaten würden 30 Tage nach Kündigung unwiderruflich gelöscht ("client/pages/AGB.tsx":236). Ein solcher automatisierter Löschlauf existiert im Code nicht ("server/maitr/scheduler.ts":60-86 enthält ausschließlich Sync- und Insight-Aufgaben, keinen Purge-Job; kein zeitbezogenes `deleteMany` im gesamten `server/`, geprüft). Vor Veröffentlichung dieser Fassung ist diese Zusage entweder technisch umzusetzen oder ausdrücklich aufzuheben — ein stillschweigendes Ersetzen genügt gegenüber Kunden mit laufenden Altverträgen nicht.

## § 10 Haftung

(1) maitr haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie nach den Vorschriften des Produkthaftungsgesetzes.

(2) Bei einfacher Fahrlässigkeit haftet maitr nur bei Verletzung einer wesentlichen Vertragspflicht (Kardinalpflicht), deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung der Kunde regelmäßig vertrauen darf; in diesem Fall ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt. Im Übrigen ist die Haftung für einfache Fahrlässigkeit ausgeschlossen.

(3) Die Haftungsbeschränkungen gelten nicht für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit.

(4) Für Ausfälle oder Fehlfunktionen, die auf den in § 6 und § 11 genannten Drittdiensten beruhen (insbesondere Entscheidungen von Google oder Meta über API-Zugriffsfreigaben), haftet maitr nicht, soweit maitr diese nicht zu vertreten hat.

(5) >>ENTSCHEIDUNG NOETIG<<: Soll eine betragsmäßige Haftungshöchstgrenze (z. B. gekoppelt an die Jahresvergütung) aufgenommen werden?

## § 11 Auftragsverarbeitung / Datenschutz

(1) Der Kunde erfasst über die Dienste personenbezogene Daten seiner eigenen Gäste und Mitarbeitenden, u. a.:

- **Reservierungsdaten** (Name, E-Mail, Telefonnummer, Personenzahl, Sonderwünsche) über die vom Kunden erzeugte Web-App, gespeichert in Neon Postgres und im Klartext per E-Mail über den Versanddienst Resend an Kunde und Gast versendet ("prisma/schema.prisma":164-184; "server/routes/publicReservations.ts":143-185; "server/utils/email.ts":1-3,21-56,62-96,101-143). Die Bestätigungsmail an den Gast enthält einen Link, über den die Reservierung **ohne weitere Anmeldung** eingesehen und geändert werden kann ("server/utils/email.ts":34, `manageUrl`; "server/routes/publicReservations.ts":103-120, GET ohne Authentifizierung mit vollständiger Rückgabe des Datensatzes; :198ff, PUT). Der Kunde ist verpflichtet, seine Gäste darauf hinzuweisen, diesen Link nicht weiterzugeben. >>ENTSCHEIDUNG NOETIG<<: Der Endpunkt gibt derzeit den vollständigen Reservierungsdatensatz ohne Feld-Einschränkung zurück und kennt kein Ablaufdatum für den Link; vor Veröffentlichung ist mindestens eine Allowlist der benötigten Felder und ein Ablaufdatum vorzusehen.
- **Gästedaten für das Stempelkarten-/Treueprogramm**: Name, Telefonnummer (roh und normalisiert), optional E-Mail-Adresse, Zeitpunkt des ersten und letzten Besuchs, Besuchszähler, Zähler nicht wahrgenommener Reservierungen sowie vom Betrieb vergebene Freitext-Merkmale, erfasst vom Personal des Kunden über die iOS-App ("prisma/schema.prisma":798-874, Feld `tags String[]` in :838; "server/maitr/stempelkarte.ts":1165-1256). Eine Löschanfrage eines Gasts wird als Anonymisierung umgesetzt (Name → Platzhalter, Telefon/E-Mail → NULL); Besuchszähler und Freitext-Merkmale werden dabei **nicht** entfernt, und für Gäste ohne ausgegebene Stempelkarte existiert derzeit **kein** Anonymisierungs- oder Löschweg ("server/maitr/stempelkarte.ts":1701-1703,1711-1723). >>ENTSCHEIDUNG NOETIG<<: Freitext-Merkmale können personenbezogene und ggf. gesundheitsbezogene Angaben (z. B. Allergien) enthalten und sind entweder in die Anonymisierung aufzunehmen oder im Frontend zu sperren; für Gäste ohne Stempelkarte ist ein Löschweg zu ergänzen.
- **Bestelldaten**, sofern die Online-Bestellfunktion für den Betrieb aktiviert ist: Name, E-Mail-Adresse und Telefonnummer des Gastes, bestellte Positionen, Beträge einschließlich Trinkgeld, Bestellart, Tischzuordnung, Notizen und Sonderwünsche ("prisma/schema.prisma":238-266,552-566; "server/routes/orders.ts":7-30). >>ENTSCHEIDUNG NOETIG<<: Speicherdauer und Löschregel für Bestelldaten sind im Code nicht geregelt; siehe auch § 1 Abs. 1 lit. a zum Rollout-Status.
- **Personal-, Dienst- und Abwesenheitsdaten** der Mitarbeitenden des Kunden: Stammdaten (Vorname, Nachname, E-Mail, Telefon, Position, Stundensatz, Ein-/Austrittsdatum, Berechtigungen), geplante und tatsächliche Arbeits- und Pausenzeiten, Schichtstatus einschließlich „nicht erschienen", Freitextnotizen, sowie Abwesenheitszeitraum, Abwesenheitsgrund einschließlich der Kategorie **Krankheit**, Freitextbegründung und hochgeladene Nachweise einschließlich Arbeitsunfähigkeitsbescheinigungen ("prisma/schema.prisma":311-341,343-380,383-414,431-439; "server/routes/staff.ts":46-60,67,135,182,240,316). Angaben zu Krankheit und ärztliche Nachweise sind Gesundheitsdaten im Sinne von Art. 9 DSGVO; siehe § 4 Abs. 5. >>ENTSCHEIDUNG NOETIG<<: Für hochgeladene Nachweise ist im Code keine gesonderte Zugriffsbeschränkung oder Verschlüsselung ersichtlich; vor Produktivbetrieb mit echten Attesten ist dies abzusichern oder die Anhangsfunktion abzuschalten. Eine Aufbewahrungsfrist ist zusätzlich festzulegen.

(2) Soweit maitr dabei personenbezogene Daten der Gäste oder Mitarbeitenden des Kunden im Auftrag des Kunden verarbeitet, dürfte dies eine Auftragsverarbeitung im Sinne von Art. 28 DSGVO darstellen. **Ein Muster für eine Auftragsverarbeitungsvereinbarung (AVV) wurde im geprüften Repository nicht gefunden** (kein Treffer in "docs/legal/", "prisma/", "server/" für ein entsprechendes Vertragsdokument). >>ENTSCHEIDUNG NOETIG<<: Ein AVV-Text ist vor Produktivbetrieb mit echten Gäste- oder Personaldaten zu erstellen und den Kunden entweder automatisiert bei Registrierung oder gesondert zur Unterzeichnung anzubieten; ein Verweis "Auftragsverarbeitung gemäß separatem AVV" allein genügt ohne tatsächlich existierenden, abschließbaren AVV nicht. Für die in Abs. 1 genannten Gesundheitsdaten sind zudem angemessene Schutzmaßnahmen nach § 22 Abs. 2 BDSG im AVV zu benennen.

(3) maitr setzt zur Erbringung der Dienste folgende Subunternehmer/Auftragsverarbeiter ein, deren Auswahl der Kunde mit Vertragsschluss genehmigt (Unterauftragsverarbeiter-Genehmigung nach Art. 28 Abs. 2 DSGVO): Clerk, Inc. (Authentifizierung – "server/routes/users.ts":260-269; "server/webhooks/clerk.ts":1-40), Neon (Datenbank – durchgehend in "prisma/schema.prisma"), Netlify (Hosting/Edge-Funktionen – "netlify.toml"; "netlify/edge-functions/inject-site-config.ts":38-131), Railway (Server-Hosting), Supabase (Bilder-/Dateispeicher – "server/services/supabaseStorage.ts":14,35-42,56-89), Resend, Inc. (Transaktions-E-Mail – "server/utils/email.ts"), n8n-Instanz (Auto-Konfigurator-Workflow, mit direktem Datenbankzugriff auf die Tabelle ScraperJob außerhalb der Anwendungsschicht – "docs/n8n/Deep-Scrape-Flow.json":711,715), Stripe (Zahlungsabwicklung – "server/webhooks/stripe.ts":6-7,46-95), Google LLC (Gemini API zur Speisekarten-OCR – "server/services/ocr/gemini.ts":19,225-227). >>ENTSCHEIDUNG NOETIG<<: Vollständigkeitsprüfung dieser Liste und Ergänzung um Drittlandtransfer-Hinweise (mehrere der genannten Anbieter sind US-Unternehmen).

(4) maitr verarbeitet zudem personenbezogene Daten des Kunden selbst (Kontoinhaber) zur Vertragsdurchführung; hierzu wird auf die gesonderte Datenschutzerklärung verwiesen. **Prüfhinweis (kein Bestandteil dieser Klausel, sondern Hinweis für die Prüfung), BLOCKER:** Die aktuell unter maitr.de/datenschutz veröffentlichte Seite ("client/pages/Datenschutz.tsx") enthält mindestens drei Aussagen, die der Code widerlegt: Google Fonts würden „lokal eingebunden" und es finde „keine Verbindung zu Google-Servern beim Seitenaufruf" statt (Zeile 261-266; tatsächlich lädt der Build unbedingt und vor jeder Einwilligung von fonts.googleapis.com/fonts.gstatic.com — Beleg "index.html":60-61,65-74, "netlify.toml":44); mit allen Anbietern seien bereits AVV abgeschlossen (Zeile 168; im Repository ist kein AVV-Dokument auffindbar, siehe Abs. 2); IP-Adressen würden „anonymisiert nach 7 Tagen" (Zeile 219; kein entsprechender Job im Code gefunden). Diese veröffentlichte Fassung darf nicht neben dem im Rahmen dieser Prüfung erstellten Datenschutz-Entwurf bestehen bleiben, sondern muss ihn vor Freigabe dieser Nutzungsbedingungen ersetzen — insbesondere, weil der Google-OAuth-Zustimmungsbildschirm exakt diese URL verlinkt ("client/pages/Index.tsx":952). Der im Repository liegende Entwurf "docs/legal/PRIVACY.md" ist zusätzlich gegen den final veröffentlichten Text zu konsolidieren.

## § 12 Änderungen dieser Nutzungsbedingungen

(1) maitr kann diese Nutzungsbedingungen mit Wirkung für die Zukunft ändern, soweit dies zur Anpassung an geänderte rechtliche Rahmenbedingungen, technische Weiterentwicklung der Dienste oder geänderte Vorgaben von Google/Meta/Apple erforderlich ist.

(2) >>ENTSCHEIDUNG NOETIG<<: Ankündigungsfrist vor Inkrafttreten von Änderungen (in der Praxis üblich: mind. 4–6 Wochen), Form der Mitteilung (E-Mail/In-App), Zustimmungsfiktion bei Widerspruchslösung mit Hinweis auf Widerspruchsrecht und Rechtsfolgen bei Nichtwiderspruch.

## § 13 Recht und Gerichtsstand

(1) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.

(2) Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag ist, soweit der Kunde Kaufmann im Sinne des HGB, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist, **Münster** (Sitz von maitr; deckungsgleich mit der bereits veröffentlichten AGB-Fassung, Beleg: "client/pages/AGB.tsx":300). ⚠ **Verbraucherschutz-Prüfhinweis**: Diese Gerichtsstandsklausel ist gegenüber einem Kunden ohne Kaufmannseigenschaft (z. B. nicht eingetragener Kleingewerbetreibender) unwirksam; siehe Prüfhinweis zu § 1 Abs. 2.

## § 14 Schlussbestimmungen

(1) Änderungen und Ergänzungen dieses Vertrags bedürfen der Textform, soweit nicht ausdrücklich etwas anderes vereinbart ist. Dies gilt auch für die Änderung dieser Schriftformklausel selbst.

(2) Der Kunde kann Rechte und Pflichten aus diesem Vertrag nur mit vorheriger schriftlicher Zustimmung von maitr auf Dritte übertragen.

(3) Sollte eine Bestimmung dieser Nutzungsbedingungen unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.

---

## Anlage: Offene Punkte für die anwaltliche Prüfung (Zusammenfassung)

Diese Anlage fasst die im Text verteilten Marker zusammen und dient nur der Übersicht; sie ist kein Vertragsbestandteil.

**>>ENTSCHEIDUNG NOETIG<<**
- Beschränkung der Zielgruppe auf Unternehmer und Prüfung bei Registrierung (§ 1 Abs. 2)
- Widerruf-Abschnitt im bestehenden AGB-Entwurf ("client/pages/AGB.tsx", § 8) auf B2B-Konsistenz prüfen (§ 1 Abs. 2)
- Rollout-Status der Online-Bestellfunktion klären (§ 1 Abs. 1 lit. a, § 11 Abs. 1)
- Vertragsschluss: Bestätigungsmechanismus (§ 2)
- Testphase/Abo-Ausgestaltung (§ 3)
- Vollständiges Preismodell (§ 8) – **keine Preise in diesem Entwurf enthalten**
- Laufzeit/Kündigungsfristen (§ 9 Abs. 1)
- 30-Tage-Löschversprechen aus der bisherigen AGB-Fassung technisch umsetzen oder ausdrücklich aufheben (§ 9 Abs. 4)
- Haftungshöchstgrenze (§ 10)
- AVV-Text erstellen und Prozess zum Abschluss festlegen, inkl. Schutzmaßnahmen für Gesundheitsdaten nach § 22 Abs. 2 BDSG (§ 11 Abs. 2) – im Repository nicht vorhanden
- Vollständigkeit/Drittlandtransfer-Hinweise der Subunternehmerliste (§ 11 Abs. 3)
- Datenschutzerklärung unter maitr.de/datenschutz vor Veröffentlichung dieser Fassung ersetzen (Google-Fonts-, AVV- und IP-Anonymisierungs-Aussagen widerlegt) und gegen "docs/legal/PRIVACY.md" konsolidieren (§ 11 Abs. 4) – BLOCKER
- Ankündigungsfrist und Widerspruchsmechanismus bei AGB-Änderungen (§ 12)
- Bestätigungs-UI vor automatisierter Inhaltsübernahme durch den Auto-Konfigurator (§ 5 Abs. 2) – aktuell nicht belegt vorhanden
- Löschfrist für ScraperJob-Zeilen ohne Konto implementieren oder Erfassung ohne Anmeldung einschränken (§ 5 Abs. 2)
- Echten Trennen-Endpunkt für Google-/Meta-Verbindungen bauen, bevor der Google-OAuth-Antrag gestellt wird; bis dahin Schaltflächentext richtigstellen (§ 6 Abs. 4)
- Reservierungslink absichern: Feld-Allowlist und Ablaufdatum für die Verwaltungsseite (§ 11 Abs. 1)
- Stempelkarten-Anonymisierung: Freitext-Merkmale einbeziehen, Löschweg für Gäste ohne Karte ergänzen (§ 11 Abs. 1)
- Zugriffsschutz/Verschlüsselung für hochgeladene Krankheitsnachweise, Aufbewahrungsfrist für Personal-/Dienstplandaten festlegen (§ 4 Abs. 5, § 11 Abs. 1)
- Datenschutz-/Impressumslink im Footer der vom Web-Baukasten erzeugten Kunden-Websites ergänzen — aktuell nicht vorhanden (Beleg: "client/components/dynamic/AppRenderer.tsx":816-819 enthält nur Copyright-Zeile und Herstellernennung; "client/components/dynamic/ReservationFormModern.tsx", 312 Zeilen vollständig durchsucht, kein Treffer auf „Datenschutz", „Einwilligung" oder „Zustimmung")

**>>EINSETZEN<<**
- Rechtsform, Handelsregister/USt-IdNr., Kontakt-E-Mail, ggf. Telefon (Anbieterangaben; Name und Anschrift bereits vorbelegt aus "client/pages/AGB.tsx":114)

**Bewusst nicht geändert (Beanstandungen, die die Datenschutzerklärung betreffen, nicht die Nutzungsbedingungen):**

Die folgenden Punkte aus dem Prüfbericht sind zutreffend, gehören inhaltlich aber in die Datenschutzerklärung ("docs/legal/PRIVACY.md" / "client/pages/Datenschutz.tsx") und wurden deshalb nicht in diesen Vertragstext übernommen. Sie sind bei der Überarbeitung der Datenschutzerklärung zu berücksichtigen:
- Punkt 6 (Apple-Privacy-Manifest widerspricht der App-Beschreibung; NSBonjourServices/NSLocalNetworkUsageDescription im Produktionsbau)
- Punkt 7 (SecureStore-Beleg deckt nicht die zitierte Aussage; AsyncStorage-Rückfallpfad ohne Clerk-Schlüssel)
- Punkt 11 (deviceId/sync_user_id werden im Code nirgends aufgerufen)
- Punkt 12 (dedizierter Abschnitt zu Google-Nutzerdaten für den OAuth-Zustimmungsbildschirm — Format und Reihenfolge sind eine Vorgabe des Google-Verifizierungsformulars, nicht des Kundenvertrags)
- Punkt 14 (AnalyticsSnapshot-Tabelle ohne aktiven Schreibpfad)
- Punkt 16 (DeleteAccountScreen meldet ohne Sitzungstoken fälschlich Erfolg — App-UI-Frage, keine Vertragsklausel)
- Punkt 17 (vier fehlerhafte Belegzeilen im DSE-Entwurf — betrifft nur den DSE-Text, in den Nutzungsbedingungen kommen die betroffenen Zeilen nicht vor)

**Ungeklärt (nicht in den Text übernommen, da nicht abschließend belegbar):**
- Ob `Absence.attachments` in der laufenden Instanz je tatsächlich befüllt wurde — im geprüften "server/routes/staff.ts" wurde das Feld im Zod-Schema nicht gefunden, im Prisma-Modell schon ("prisma/schema.prisma":398). Ob ein anderer Pfad schreibt, ist offen.
- Ob `Order` im ersten Rollout freigeschaltet ist; die Mount-Stelle im `apiRouter` wurde nicht abschließend verifiziert (siehe § 1 Abs. 1 lit. a).
- Ob der n8n-Flow außer `ScraperJob` weitere Tabellen direkt beschreibt — geprüft wurde nur "docs/n8n/Deep-Scrape-Flow.json" per Grep auf `userId`, nicht der vollständige Flow.
- Ob die im Repository liegenden Clerk-/API-Werte ("mobile/eas.json", "mobile/src/lib/env.ts":69) und in der Git-Historie zuvor exponierte Zugangsdaten rotiert wurden — nicht Gegenstand dieser Prüfung.
- Sitzländer und konkrete Vertragsgrundlagen der Empfänger (Stripe, Google, Meta, Netlify, Railway, Neon, Supabase) für die Drittlandtransfer-Angabe — aus dem Code nicht belegbar.
- Serverseitige Aufbewahrungsfristen für Gäste-, Bestell-, Personal- und Stempelkartendaten.
- Welcher Build tatsächlich unter check.maitr.de liegt (DNS/Netlify-Konfiguration außerhalb des Repository-Inhalts).
