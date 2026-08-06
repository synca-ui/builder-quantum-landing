# Datenschutzerklärung

Stand: 07.08.2026

>>ENTSCHEIDUNG NOETIG (BLOCKER): Diese Fassung ERSETZT den Inhalt von `client/pages/Datenschutz.tsx`. Diese Seite ist derzeit unter maitr.de/datenschutz online und enthält mindestens drei Aussagen, die der ausgelieferte Build widerlegt: „Google Fonts werden lokal eingebunden" (`client/pages/Datenschutz.tsx:261-266`, tatsächlich unbedingter Fremdabruf, siehe Abschnitt 3.12), eine pauschale Zusage abgeschlossener Auftragsverarbeitungsverträge mit allen Anbietern sowie eine Angabe zu einer IP-Anonymisierung nach 7 Tagen, die im geprüften Code nicht nachvollziehbar ist. Die alte Seite darf nicht parallel zu dieser Fassung bestehen bleiben — unter anderem, weil der Google-OAuth-Zustimmungsbildschirm genau diese URL verlinkt (`client/pages/Index.tsx:952`).<<

## 1. Verantwortlicher

Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) für den Betrieb von maitr.de (Web-Baukasten und die dort veröffentlichten Restaurant-Websites, soweit maitr eigene Zwecke verfolgt) sowie für die iOS-App "Maitr" ist:

Julian Heinrich
Hansaring 37
48155 Münster
>>EINSETZEN: Kontakt-E-Mail für Datenschutzanfragen<<
>>EINSETZEN: Telefonnummer (optional)<<
>>EINSETZEN: Falls vorhanden – Name und Kontakt des Datenschutzbeauftragten; falls nicht vorhanden, entfällt dieser Absatz<<

Name und Anschrift sind bereits in der veröffentlichten AGB-Seite hinterlegt (`client/pages/AGB.tsx:114`).

>>ENTSCHEIDUNG NOETIG: Rechtsform und ggf. USt-IdNr. bestätigen — im geprüften Repository ist nur eine natürliche Person genannt (`client/pages/AGB.tsx:114`), keine Firmierung.<<

Für personenbezogene Daten von **Restaurantgästen**, die über eine von einem Gastronomen mit dem maitr-Baukasten erzeugte Website oder über die App eines Betriebs verarbeitet werden (z. B. Reservierungsdaten, Bestelldaten, Stempelkarten-Gastdaten), ist in aller Regel der **jeweilige Restaurantbetrieb** datenschutzrechtlich Verantwortlicher; maitr verarbeitet diese Daten als **Auftragsverarbeiter** nach Art. 28 DSGVO im Auftrag des Betriebs. Diese Rollenverteilung wird bei jeder betroffenen Verarbeitung unten ausdrücklich genannt.

>>ENTSCHEIDUNG NOETIG: Ob mit jedem Betrieb tatsächlich ein Auftragsverarbeitungsvertrag (AVV) nach Art. 28 DSGVO abgeschlossen ist, lässt sich aus dem Code nicht feststellen – kein AVV-Template im geprüften Repository gefunden. Vor Veröffentlichung klären und ggf. Prozess für Vertragsschluss bei Registrierung ergänzen.<<

## 2. Kurzfassung

Diese Erklärung richtet sich an zwei unterschiedliche Personengruppen:

- **Gastronomen** (Kunden von maitr), die sich mit E-Mail/Google/Apple über Clerk anmelden, den Web-Baukasten nutzen, eine eigene Website veröffentlichen und/oder die iOS-App "Maitr" nutzen, um Google-Business-Profil, Instagram, Bewertungen, Aufgaben, Personal, Gäste und die Stempelkarte ihres Betriebs zu verwalten.
- **Restaurantgäste**, deren Daten anfallen, wenn sie über die von einem Gastronomen veröffentlichte Website eine Reservierung oder Bestellung abgeben, am Tresen eine Stempelkarte erhalten, oder eine Bewertung auf Google/Instagram/Facebook hinterlassen, die der Betrieb über die App abruft und beantwortet.

Für Gastronomen ist maitr überwiegend selbst Verantwortlicher (Vertrag über die Nutzung der Plattform) — mit der Ausnahme der automatischen Übernahme bestehender Online-Präsenzen ohne Anmeldung (Abschnitt 3.3), die auch Dritte betreffen kann. Für Restaurantgäste ist überwiegend der jeweilige Betrieb Verantwortlicher, maitr agiert als technischer Dienstleister/Auftragsverarbeiter.

## 3. Welche Daten wir verarbeiten, wofür und auf welcher Rechtsgrundlage

### 3.1 Registrierung und Anmeldung (App und Web-Baukasten) — Gastronom

Bei der Anmeldung über den Authentifizierungsdienst **Clerk** (Instanz `clerk.maitr.de`) verarbeiten wir E-Mail-Adresse, Anzeigename, Profilbild-URL und eine Nutzer-ID aus dem Google-/Apple-OAuth-Vorgang bzw. bei Web-Login E-Mail, Name und ggf. Social-Login-Daten. Diese Felder werden zusätzlich in unserer eigenen Datenbank gespiegelt (`User.clerkId`, `email`, `fullName`, `role`) und bei Profiländerungen synchronisiert.

- Zweck: Authentifizierung, Sitzungsverwaltung, Rollenzuweisung je Betrieb (OWNER/ADMIN/STAFF).
- Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Erfüllung des Nutzungsvertrags über die maitr-Plattform).
- Belege: `mobile/src/lib/auth.ts:190-204`, `mobile/app/login.tsx:81,84-99`, `mobile/src/lib/env.ts:47-69`, `client/components/AppAreaShell.tsx:34-39`, `prisma/schema.prisma:11-36`, `server/routes/users.ts:87-235,237-283`.

Das Sitzungstoken wird von der Clerk-Bibliothek im verschlüsselten Systemspeicher des Geräts abgelegt (`expo-secure-store`) und bei jeder Anfrage an unsere eigene API als Autorisierungsnachweis mitgesendet; im Web hält Clerk die Sitzung über eigene Cookies. Läuft die App ohne konfigurierten Anmeldedienst (Demobetrieb), wird stattdessen ein lokaler Platzhalter unverschlüsselt im App-Speicher (AsyncStorage) abgelegt; in diesem Betrieb findet keine Übertragung an unseren Server statt.

- Zweck: Autorisierung jeder Anfrage, Schutz vor unbefugtem Zugriff.
- Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO sowie Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse: IT-Sicherheit, Missbrauchsschutz).
- Belege: `mobile/app/_layout.tsx:71-73` (SecureStore-Ablage durch Clerk), `mobile/package.json:29`, `mobile/src/lib/env.ts:44`, `packages/core/src/http.ts:70-82`, `mobile/app.json:61`; Rückfallpfad ohne Clerk (unverschlüsselt, kein Server-Kontakt): `mobile/src/lib/auth.ts:181,206-214,229-234` (`persistSession` → `AsyncStorage.multiSet`).

Ein E-Mail-Login-Weg ist im Code vorbereitet, aber nicht fertiggestellt; eingegebene Werte werden nirgends übertragen oder gespeichert, sondern beim Verlassen des Bildschirms verworfen.

- Beleg: `mobile/app/login.tsx:116-118,57-60`.

### 3.2 Nutzung des Web-Baukastens (Konfigurator) — Gastronom

Beim Einrichten der eigenen Restaurant-Website wird der gesamte Formularzustand (Betriebsname, Adresse, Telefon, Logo, Menü, Team, Design, Zahlungsoptionen, Loyalty-Konfiguration etc.) im Browser gespeichert, damit der Fortschritt einen Reload übersteht.

- Speicherort: `localStorage` (`configurator-store`, `configurator_persistence`), `sessionStorage` (`configurator_session`) – ausschließlich im Browser des Gastronomen, keine Übertragung an uns, solange nicht aktiv gespeichert/veröffentlicht wird.
- Zweck: technisch notwendige Funktionalität (Fortschritt erhalten), kein Tracking.
- Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer funktionierenden Anwendung); nach § 25 Abs. 2 Nr. 2 TTDSG ohne gesonderte Einwilligung zulässig, da technisch erforderlich.
- Belege: `client/store/configuratorStore.ts:1037,1050`, `client/lib/stepPersistence.ts:30-31,217-241`.

Im Quelltext sind zwei weitere Kennungen (`deviceId`, `sync_user_id`) vorbereitet; die zugehörigen Funktionen werden derzeit von keiner Stelle im Code aufgerufen, es wird also keine dieser Kennungen erzeugt oder gespeichert.

- Belege: `client/lib/utils.ts:4-11` (keine Aufrufer im gesamten `client/`), `client/lib/api.ts:58-66,330` (Export ohne Importeur), `client/store/configuratorStore.ts:1031` (`removeItem("sync_user_id")` — Aufräumcode für einen Schlüssel, den nichts anlegt).
- Wird eine der beiden Kennungen aktiviert, aktualisieren wir diese Erklärung vorab.

Die Entscheidung des Cookie-Banners (necessary/analytics/decided) wird lokal gespeichert.

- Speicherort: `localStorage("maitr_cookie_consent")`, ohne Ablaufzeitstempel.
- Beleg: `client/components/cookie-banner.tsx:10,18,61`.
- Hinweis: Der im Banner angebotene "Analytics"-Schalter ist aktuell folgenlos, da kein Tracking-Skript im Code hinterlegt ist (`// TODO: initPlausible()`). Sollte ein Analyse-Tool aktiviert werden, wird diese Erklärung vorab angepasst.

Ergebnisse des Restaurant-Website-Checks (n8n-Analyse: Ladezeit, Mobile-Score, Google-Bewertungen zu einer eingegebenen URL) werden zur Wiederverwendung lokal gespeichert.

- Speicherort: `localStorage("maitr_analysis_data")`.
- Beleg: `client/data/analysisStore.ts:10,16,36-46`.

### 3.3 Automatische Übernahme bestehender Online-Präsenzen (Auto-Konfigurator) — Gastronom bzw. Website-Besucher ohne Anmeldung

Auf maitr.de und check.maitr.de kann **ohne Anmeldung** eine Website-Adresse eingegeben werden. Diese Adresse wird über unseren Server an einen n8n-Workflow weitergegeben, der die angegebene Seite und die zugehörige Google-Maps-Präsenz ausliest. Dabei entstehen und werden gespeichert: Geschäftsname, E-Mail-Adresse, Telefonnummer, Instagram-Adresse, Speisekarten-Adresse, die extrahierten Rohdaten und ein daraus abgeleiteter Konfigurationsvorschlag.

- Zweck: automatisches Vorbefüllen des Konfigurators bzw. Erstellung eines Analyseberichts.
- Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahme), soweit die Anfrage vom Betriebsinhaber selbst kommt; im Übrigen — wenn eine fremde URL eingegeben wird — Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Vorbereitung eines Angebots). Betroffene können der Verarbeitung nach Art. 21 DSGVO widersprechen.
- Speicherort: Neon Postgres, Tabelle `ScraperJob`. Der n8n-Workflow schreibt zusätzlich direkt in diese Tabelle, außerhalb der Express-/Prisma-Anwendungsschicht; der vollständige Request wird außerdem an einen n8n-Webhook weitergeleitet.
- **Speicherdauer: Zeilen, die einem angemeldeten Konto zugeordnet sind (`ScraperJob.userId` gesetzt), werden bei Kontolöschung mitgelöscht (`server/routes/users.ts:184`). Zeilen, die aus einer Analyse ohne Anmeldung stammen — nach den Code-Kommentaren der Regelfall bei Aufruf über die Landingpage —, tragen keine `userId`, sind keinem Konto zugeordnet und werden derzeit nicht automatisch gelöscht.**
- Belege: `prisma/schema.prisma:603-637` (`userId String?`, `websiteUrl String @unique`); `server/routes/scraper.ts:355-362` (Kommentar zum herrenlosen Normalfall), `:383-391`; `client/pages/Index.tsx:435-441` und `client/pages/CheckLanding.tsx:909-915` (Aufruf ohne Anmeldung); `docs/n8n/Deep-Scrape-Flow.json:711,715`.

Zusätzlich existiert eine generische Weiterleitungsroute (`/api/forward-to-n8n`), die **ohne Anmeldung erreichbar ist** und den vom aufrufenden Client gesendeten Inhalt ungeprüft an n8n weiterreicht.

- Beleg: `server/index.ts:280` (`app.post("/api/forward-to-n8n", strictLimiter, handleForwardN8n)` — kein `requireAuth`), `server/routes/n8nProxy.ts:14-22`.
- >>ENTSCHEIDUNG NOETIG: Welche konkreten Datenarten über diese generische Route im Betrieb tatsächlich fließen, ist aus dem Code nicht abschließend nachvollziehbar (abhängig vom jeweiligen aufrufenden Client-Feature). Vor Veröffentlichung alle Aufrufer identifizieren und diese Erklärung entsprechend präzisieren. Zusätzlich fehlt eine Zugangsbeschränkung oder Allowlist der zulässigen Felder.<<
- >>ENTSCHEIDUNG NOETIG: Für ScraperJob-Zeilen ohne Konto existiert kein Löschpfad. Vor Veröffentlichung entweder eine Löschfrist implementieren (z. B. eine feste Frist nach Abschluss der Analyse) oder diese Verarbeitung ohne Anmeldung abschalten. Ohne eine der beiden Maßnahmen ist die Aussage zur Speicherdauer für diese Zeilen nicht haltbar.<<

### 3.4 Bilder für die veröffentlichte Website — Gastronom

Logo-, Speisekarten- und Galeriebilder werden hochgeladen und in einem **öffentlich lesbaren** Supabase-Storage-Bucket ("media") unter dem Pfad `<userId>/…` gespeichert.

- Zweck: Darstellung auf der veröffentlichten Restaurant-Website.
- Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
- Speicherdauer: dauerhaft öffentlich abrufbar bis zur expliziten Kontolöschung; bei Kontolöschung wird gezielt unter dem `userId`-Präfix gelöscht.
- Die Dateien werden mit einer langen Zwischenspeicherfrist ausgeliefert (`Cache-Control: public, max-age=31536000, immutable`). Nach einer Löschung können Auslieferungsnetze und Browser dieselbe Adresse deshalb noch eine Zeit lang beantworten, obwohl die Datei bei uns entfernt ist.
- Belege: `server/services/supabaseStorage.ts:14,34-46,56-89,92-104`, `server/services/imageIngest.ts:76`, `server/routes/media.ts:87`.

Enthält die hochgeladene Speisekarte Text, wird das Bild zur Texterkennung an die **Google Gemini API** übermittelt.

- Zweck: automatische Erfassung der Speisekarteninhalte (OCR).
- Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
- Beleg: `server/services/ocr/gemini.ts:19,225-227`.

### 3.5 Tischreservierung über die veröffentlichte Restaurant-Website — Restaurantgast

Gibt ein Restaurantgast über die von einem Gastronomen veröffentlichte Website eine Reservierung ab, verarbeiten wir Gastname, E-Mail, Telefonnummer, Personenzahl, Wunschtermin und Sonderwünsche.

- Zweck: Entgegennahme und Bestätigung der Tischreservierung beim jeweiligen Restaurant.
- Verantwortlicher: der jeweilige Restaurantbetrieb; maitr verarbeitet als Auftragsverarbeiter (Art. 28 DSGVO) im Auftrag des Betriebs.
- Rechtsgrundlage (des Betriebs gegenüber dem Gast): Art. 6 Abs. 1 lit. b DSGVO (Vertragsanbahnung/-erfüllung des Bewirtungsvertrags).
- Speicherort: Neon Postgres (Tabelle `Reservation`); zusätzlich werden Gastname, Gast-E-Mail, Gasttelefon und Sonderwünsche im Klartext im HTML-Body einer Bestätigungs- und einer Betreiber-Benachrichtigungsmail an den E-Mail-Dienst **Resend** übermittelt.
- Speicherdauer: an den Business-Datensatz gekoppelt (Löschung mit dem gesamten Betrieb); kein eigenständiger Löschjob für einzelne Reservierungen gefunden.
- Belege: `server/routes/publicReservations.ts:143-185`, `prisma/schema.prisma:164-184`, `server/routes/reservations.ts:10-18,96-107,150-159`, `server/utils/email.ts:1-3,22-56,34,101-143`.

**Verwaltungslink ohne Anmeldung**: Die Bestätigungsmail enthält einen Link (`${PUBLIC_URL}/r/${reservationId}`), über den die Reservierung ohne weitere Anmeldung eingesehen, geändert und storniert werden kann. `GET /api/public/reservations/:id` prüft keine Anmeldung und liefert den **vollständigen** Datensatz zurück (Gastname, Gast-E-Mail, Gasttelefon, Personenzahl, Sonderwünsche, Termin, Status); `PUT` auf denselben Pfad erlaubt das Ändern. Wer den Link besitzt — etwa aus einer weitergeleiteten Mail —, kann diese Daten einsehen bzw. ändern.

- Belege: `server/routes/publicReservations.ts:103-120` (GET ohne Auth, vollständige Rückgabe ohne `select`), `:198ff` (PUT); `server/utils/email.ts:34` (`manageUrl`).
- >>ENTSCHEIDUNG NOETIG: Der Endpunkt gibt derzeit den vollständigen Datensatz zurück. Vor Veröffentlichung mindestens auf eine Allowlist der wirklich benötigten Felder begrenzen und ein Ablaufdatum für den Link vorsehen.<<
- >>ENTSCHEIDUNG NOETIG: Speicherdauer einzelner Reservierungszeilen ist im Code nicht geregelt – Löschregel festlegen.<<
- >>ENTSCHEIDUNG NOETIG: Das Reservierungsformular selbst enthält derzeit keinen Hinweis und keinen Link auf eine Datenschutzerklärung vor dem Absenden. Vor Veröffentlichung ergänzen (Beleg für den Fehlbefund: vollständig durchsuchte Datei `client/components/dynamic/ReservationFormModern.tsx`, keine entsprechende Fundstelle).<<
- >>ENTSCHEIDUNG NOETIG: Veröffentlichte Restaurant-Websites verlinken aktuell keine eigene, gastgerichtete Datenschutzerklärung; der website-weite Cookie-Banner verweist stattdessen ausschließlich auf die betreiberbezogene Seite von maitr selbst. Für Restaurantgäste ist das nicht die zutreffende Erklärung. Vor Veröffentlichung klären, wie Gäste auf jeder Kunden-Website über die konkrete Verarbeitung durch den jeweiligen Betrieb informiert werden (Beleg: `client/components/dynamic/AppRenderer.tsx:816-819`, `client/App.tsx:256-258`).<<

### 3.5a Bestellung über die veröffentlichte Restaurant-Website — Restaurantgast

Ist die Bestellfunktion für einen Betrieb aktiviert, verarbeiten wir bei einer Bestellung Name, E-Mail-Adresse und Telefonnummer des Gastes, die bestellten Positionen, Beträge einschließlich Trinkgeld, Bestellart (vor Ort, Abholung, Lieferung), Tischzuordnung sowie Notizen und Sonderwünsche.

- Verantwortlicher: der jeweilige Betrieb; maitr als Auftragsverarbeiter.
- Rechtsgrundlage (des Betriebs): Art. 6 Abs. 1 lit. b DSGVO.
- Speicherort: Neon Postgres (`Order`, `OrderEvent`).
- Belege: `prisma/schema.prisma:238-266,552-566`; `server/routes/orders.ts:7-30`; Konfigurationsschalter `prisma/schema.prisma:466-468` (`onlineOrdering`, `onlineStore`); `client/components/dynamic/AppRenderer.tsx:813` (`onAddToCart`).
- >>ENTSCHEIDUNG NOETIG: Speicherdauer und Löschregel für Bestelldaten; im Code nicht geregelt.<<
- >>ENTSCHEIDUNG NOETIG: Ist die Bestellfunktion im ersten Rollout überhaupt freigeschaltet? Falls nein, gehört dieser Abschnitt nach 3.14 (vorbereitet, nicht aktiv) statt hierher. Die Mount-Stelle des Bestell-Routers im API-Router wurde nicht abschließend verifiziert.<<

### 3.6 Stempelkarte / Loyalty-Programm in der App — Restaurantgast

Gibt Personal eines Betriebs über die App eine Stempelkarte aus, werden Gastname und optionale Telefonnummer eingetippt und in der Datenbank angelegt (`MaitrGuest`). Zum Gast gespeichert werden darüber hinaus: optional eine E-Mail-Adresse, eine normalisierte Telefonnummer, Zeitpunkt des ersten und letzten Besuchs, ein Besuchszähler, ein Zähler nicht wahrgenommener Reservierungen sowie vom Betrieb vergebene Freitext-Merkmale ("Tags").

- Zweck: Zuordnung der Stempelkarte zum Gast, Führung des Treueprogramms.
- Verantwortlicher: der jeweilige Betrieb; maitr als Auftragsverarbeiter.
- Rechtsgrundlage (des Betriebs gegenüber dem Gast): Art. 6 Abs. 1 lit. b DSGVO (Teilnahme am Bonusprogramm auf Wunsch des Gastes) bzw. Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse des Betriebs an Kundenbindung).
- Speicherort: Neon Postgres (`MaitrGuest`); Identifikationsmerkmale der Karte selbst (`StampCard.scanTokenHash`, `encScanToken`, `serialNumber` u. a.) werden mit AES-256-GCM verschlüsselt bzw. als SHA-256-Hash gespeichert.
- Jede Stempelvergabe/-einlösung wird zusätzlich als Beleg dauerhaft protokolliert (`StampEvent`, inkl. Mitarbeiter-ID, Gerätebezeichnung, Notiz).
- Belege: `mobile/src/features/loyalty/StampProgramScreen.tsx:868-878`, `packages/core/src/api/index.ts:358,396`, `prisma/schema.prisma:798-874,816-845,1385-1558,1574-1605,1630-1656`, `server/maitr/stempelkarte.ts:1165-1256,1684-1739,1660-1662,1705-1709`, `server/maitr/security.ts:15-34`.

**Löschung**: Eine Löschanfrage wird als Anonymisierung umgesetzt: Name wird durch einen Platzhalter ersetzt, Telefonnummer und E-Mail werden entfernt, die Registrierung für digitale Karten (`WalletDeviceRegistration`) wird in derselben Transaktion gelöscht. **Nicht entfernt werden dabei die Besuchszähler und die vom Betrieb vergebenen Freitext-Merkmale ("tags").** Die Zeile selbst bleibt als Trägerin der Stempelkartenhistorie dauerhaft bestehen; ein echtes Löschen existiert nur über die Löschung des gesamten Betriebs. Die Funktion steht nur für Gäste mit ausgegebener Stempelkarte zur Verfügung — für einen Gast ohne Stempelkarte antwortet die Funktion bewusst wie bei einem nicht existierenden Gast und bietet keinen eigenen Weg zur Löschung oder Anonymisierung.

- Belege: `server/maitr/stempelkarte.ts:1701-1703` (Kartenfilter, Abbruch ohne Karte), `:1711-1723` (Update-Data ohne `tags`/`visits`/`noShows`); `prisma/schema.prisma:838` (`tags String[]`); `server/maitr/dataset.ts:80` und `server/maitr/briefing.ts:219` (tags werden weiter ausgewertet).
- Die App bietet dem Gastronomen eine Anonymisierungsfunktion für Gästedaten an; die eigentliche serverseitige Umsetzung liegt außerhalb des mobilen App-Codes.
- >>ENTSCHEIDUNG NOETIG: Freitext-Merkmale ("tags") werden bei der Anonymisierung nicht geleert, können aber personenbezogene und ggf. gesundheitsbezogene Angaben (z. B. Allergien) enthalten. Entweder in die Anonymisierung aufnehmen oder das Feld im Frontend entsprechend kennzeichnen/sperren.<<
- >>ENTSCHEIDUNG NOETIG: Für Gäste ohne Stempelkarte existiert kein Anonymisierungs- oder Löschweg. Vor Veröffentlichung ergänzen — sonst ist die Zusage in Abschnitt 7 (Löschung über den Betrieb) für diese Gruppe nicht einlösbar.<<
- >>ENTSCHEIDUNG NOETIG: Auf welcher dokumentierten Grundlage (mündliche Einwilligung am Tresen, Aushang, Teilnahmebedingungen) der Gast bei Kartenausgabe informiert wird, ist im Code nicht geregelt – organisatorisch beim Betrieb zu klären und ggf. hier zu ergänzen.<<

### 3.7 Bewertungen von Google und Instagram/Facebook — Restaurantgast

Die App zeigt Bewertungen im Tagesbriefing an und ermöglicht das Beantworten. Bewertungstext, Sternebewertung, Quelle, externe ID sowie unser Antworttext werden gespeichert (`MaitrReview`).

- **Herkunft der Daten**: Die Bewertung stammt von der bewertenden Person selbst und wird direkt bei Google (Business Profile API) bzw. Meta (Facebook Graph API) abgegeben. maitr ruft diese Daten im Auftrag des Betriebs über die jeweilige Schnittstelle ab.
- **Wer ist Verantwortlicher**: Für die ursprüngliche Erhebung der Bewertung ist die jeweilige Plattform (Google bzw. Meta) im Verhältnis zur bewertenden Person verantwortlich. Für die Anzeige und Beantwortung innerhalb der App ist der Betrieb Verantwortlicher, maitr Auftragsverarbeiter.
- **Zum Namen der bewertenden Person**: Das Datenbankschema sieht ausdrücklich ein Feld `MaitrReview.author` für den Namen der bewertenden Person vor. Nach dem geprüften Code wird dieses Feld jedoch **nicht befüllt**: Der Sync-Code liest bei Google kein Reviewer-Namensfeld aus, das interne Datenmodell (`ReviewRecord`) kennt gar kein Autorenfeld, und der Meta-Abruf fragt im `fields`-Parameter nur `created_time`, `recommendation_type`, `review_text` ab. Ein bei Google hinterlegter Name wird zwar in der HTTP-Antwort von Google an unseren Server übertragen, bei der Normalisierung aber verworfen und nicht gespeichert.
- Zweck: Reputationsmanagement, Kundenkommunikation im Namen des Betriebs.
- Rechtsgrundlage (des Betriebs): Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an Reputationsmanagement und Kundenkommunikation zu einer bereits öffentlich abgegebenen Bewertung).
- Speicherdauer: keine Löschroutine für einzelne Bewertungen gefunden; Zeilen bleiben bis zur Löschung des gesamten Betriebs bestehen.
- Belege: `prisma/schema.prisma:876-920,888-891`, `server/maitr/sync.ts:94-129,100-129`, `server/maitr/dataset.ts:41,52-59`, `packages/core/src/analytics/types.ts:22-31`, `packages/core/src/integrations/google.ts:35-41,122-131`, `packages/core/src/integrations/meta.ts:79-91,113-127`.
- >>ENTSCHEIDUNG NOETIG: Speicherdauer für Bewertungsdaten festlegen; aktuell technisch unbefristet.<<

### 3.8 Anbindung von Google Business Profile und Meta/Instagram (OAuth) — Gastronom

Um Bewertungen, Beiträge und Reichweitendaten abzurufen, verbindet der Betrieb sein Google-Business-Profil bzw. seine Instagram-/Facebook-Seite über OAuth. Zugriffs- und Refresh-Token, Konto-ID, Berechtigungsumfang (Scopes) und Ablaufzeit werden gespeichert (`ChannelConnection`).

- Zweck: Verwaltung von Bewertungen, Beiträgen und Kennzahlen im Namen des Betriebs.
- Verantwortlicher: der Betrieb (Inhaber der angebundenen Konten); maitr als technischer Dienstleister/Auftragsverarbeiter für die Token-Verwaltung.
- Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertrag mit dem Gastronomen über die Verwaltung seines Profils).
- Sicherheitsmaßnahme: Token werden vor dem Schreiben mit AES-256-GCM verschlüsselt (`MAITR_ENCRYPTION_KEY`).
- Speicherdauer: kein aktiver Löschpfad für die Verbindung selbst gefunden, nur ein Statuswechsel auf EXPIRED bei Token-Fehlern; die Zeile bleibt bis zur Löschung des gesamten Betriebs bestehen.
- Belege: `prisma/schema.prisma:939-1019`, `server/maitr/security.ts:15-34`, `server/maitr/sync.ts:45-68,173-178`, `server/maitr/routes.ts:1264-1266` (Redirect-URI), `:1321-1360` (Callback, Tokenablage).
- >>ENTSCHEIDUNG NOETIG: Löschregel für nicht mehr benötigte Verbindungen festlegen.<<

**Widerruf der Verbindung**: Die Schaltfläche „Verbindung trennen" in der App entfernt die Verbindung derzeit **nur aus der Ansicht des Geräts**. Die serverseitig gespeicherten, verschlüsselten Zugriffs- und Aktualisierungstoken werden dabei **nicht** gelöscht, die Verbindung bleibt mit Status `ACTIVE` bestehen, und der Datenabruf durch den Scheduler läuft weiter. Sie können Ihre Freigabe jederzeit unmittelbar bei Google (`myaccount.google.com/permissions`) bzw. Meta widerrufen; danach schlägt der Abruf fehl und die Verbindung wird auf „abgelaufen" (`EXPIRED`) gesetzt.

- Belege: `mobile/src/lib/store.tsx:814-821` (nur lokaler React-State, kein API-Aufruf), `mobile/src/features/growth/ChannelDetailScreen.tsx:106-109`; kein `channelConnection.delete` im gesamten `server/`-Verzeichnis (geprüft); Statuswechsel bei Fehlern: `server/maitr/sync.ts:69-72`.
- >>ENTSCHEIDUNG NOETIG: Vor dem Google-OAuth-Antrag ist ein echter Trennen-Endpunkt zu bauen (Token-Revocation bei Google/Meta und Löschen der ChannelConnection-Zeile) und die App daran zu hängen. Bis dahin ist der Knopf irreführend und sollte entfernt oder umbenannt werden.<<

Google liefert im Gegenzug Bewertungen (Sterne, Text, Antwortzeitpunkt) und Reichweite-Kennzahlen zurück; Meta liefert Seiten-Empfehlungen (Erstellungszeitpunkt, Empfehlungstyp, Bewertungstext) und Insights (Impressionen, Profilaufrufe).

- Belege: `packages/core/src/integrations/google.ts:18-30,59-88`, `packages/core/src/integrations/meta.ts:30-100`.

Für einen begrenzten Standortvergleich (Nachbarschafts-Benchmark) werden Postleitzahl/Koordinaten des Betriebs zu einer Kohorte anderer Betriebe (Mindestgröße n ≥ 5) verglichen; diese Felder werden über die öffentliche Venue-Auslieferung ausdrücklich **nicht** ausgegeben.

- Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an Marktvergleichsdaten für Betriebe).
- Hinweis zu Art. 22 DSGVO: Es handelt sich um eine aggregierte Kohortenauswertung auf Betriebsebene, keine automatisierte Entscheidung mit rechtlicher oder ähnlich erheblicher Wirkung gegenüber einer natürlichen Person.
- Belege: `prisma/schema.prisma:38-72,114-121`.
- >>ENTSCHEIDUNG NOETIG: Speicherdauer für Business-Geodaten ist im Code nicht geregelt.<<

### 3.8a Umgang mit Google-Nutzerdaten (Angaben für den Google-OAuth-Zustimmungsbildschirm)

**Welche Daten**: Nach Ihrer Freigabe rufen wir mit der Berechtigung `https://www.googleapis.com/auth/business.manage` ausschließlich ab: die Kennung Ihres Google-Unternehmensprofils, die zu diesem Profil abgegebenen Bewertungen (Sternewert, Text, Erstellungszeitpunkt, Zeitpunkt einer Antwort) und tägliche Aufrufkennzahlen des Profils. Weitere Google-Dienste werden nicht angesprochen.

**Wofür**: ausschließlich, um Ihnen diese Bewertungen und Kennzahlen in der App anzuzeigen und Ihnen das Beantworten von Bewertungen im Namen Ihres Betriebs zu ermöglichen.

**Wie gespeichert**: Zugriffs- und Aktualisierungstoken werden vor dem Schreiben mit AES-256-GCM verschlüsselt und niemals im Klartext protokolliert. Bewertungen und Kennzahlen liegen in unserer Datenbank bei Neon.

**Weitergabe**: Wir geben Google-Nutzerdaten an niemanden weiter außer an die zum Betrieb notwendigen Auftragsverarbeiter in Abschnitt 4. Wir verkaufen diese Daten nicht, verwenden sie nicht für Werbung, nicht für Profilbildung Dritter und nicht zum Training von Modellen künstlicher Intelligenz.

**Wie lange**: >>ENTSCHEIDUNG NOETIG: Aufbewahrungsfrist festlegen. Derzeit bleiben Bewertungen und Kennzahlen technisch unbefristet, bis der gesamte Betrieb gelöscht wird — diese Antwort genügt Google an dieser Stelle nicht.<<

**Widerruf und Löschung**: >>ENTSCHEIDUNG NOETIG: Erst nach Umsetzung eines echten Trennen-Endpunkts (siehe 3.8) hier belastbar zu beantworten.<<

- Belege: `packages/core/src/integrations/google.ts:18-20` (Scope `business.manage`), `:59-68` (Bewertungen), `:70-88` (Reichweite); `server/maitr/routes.ts:1264-1266` (Redirect-URI), `:1321-1360` (Callback, Tokenablage); `server/maitr/security.ts:15-34` (AES-256-GCM); `client/pages/Index.tsx:952` (Link zur Erklärung von der Startseite).

### 3.9 Personal-, Dienst- und Abwesenheitsplanung — Mitarbeitende des Betriebs

Für die Personalplanung verarbeitet der Betrieb über unsere Dienste:

- **Stammdaten**: Vorname, Nachname, E-Mail, Telefon, Position, Stundensatz, Eintritts- und Austrittsdatum, Berechtigungen (`prisma/schema.prisma:311-341`).
- **Dienstplan und Zeiterfassung**: geplante und tatsächliche Arbeits- und Pausenzeiten, Schichtart, Schichtstatus (einschließlich „nicht erschienen"), Freitextnotizen (`prisma/schema.prisma:343-380`).
- **Abwesenheiten**: Zeitraum, Abwesenheitsgrund einschließlich der Kategorie **Krankheit** (`SICK_LEAVE`), Freitextbegründung, Genehmigungsvermerk sowie hochgeladene Nachweise, ausdrücklich einschließlich **Arbeitsunfähigkeitsbescheinigungen** (`prisma/schema.prisma:383-414,431-439`).

Angaben zu Krankheit und ärztliche Nachweise sind **Gesundheitsdaten (besondere Kategorien personenbezogener Daten, Art. 9 DSGVO)**. Verantwortlicher ist der Betrieb als Arbeitgeber; maitr verarbeitet als Auftragsverarbeiter.

- Rechtsgrundlage des Betriebs: Art. 6 Abs. 1 lit. b DSGVO i. V. m. § 26 Abs. 1 BDSG; für die Gesundheitsdaten zusätzlich Art. 9 Abs. 2 lit. b DSGVO i. V. m. § 26 Abs. 3 BDSG (Erfüllung arbeitsrechtlicher Pflichten).
- Belege: `prisma/schema.prisma:311-341,343-380,383-414,431-439`; `server/routes/staff.ts:46-60` (Zod-Schema mit `"SICK_LEAVE"`), `:67,135,182,240,316` (`requireAuth`); `server/routes/index.ts:170` (`apiRouter.use("/dashboard/staff", staffRouter)`).
- >>ENTSCHEIDUNG NOETIG: Für Art. 9 verlangt § 22 Abs. 2 BDSG angemessene Schutzmaßnahmen. Für `Absence.attachments` existiert im Code keine erkennbare Zugriffsbeschränkung und keine Verschlüsselung. Vor Produktivbetrieb entweder absichern oder die Anhangsfunktion abschalten.<<
- >>ENTSCHEIDUNG NOETIG: Aufbewahrungsfrist für Dienstplan-, Zeit- und Abwesenheitsdaten festlegen (kaskadiert derzeit nur mit dem Betrieb).<<

### 3.10 Abonnement und Zahlungsabwicklung — Gastronom

Für das Abonnement werden Stripe-Kunden-/Abonummer und Abrechnungsmetadaten gespeichert; Name und Zahlungsmittel hält Stripe selbst.

- Zweck: Vertrags- und Zahlungsabwicklung.
- Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO; ggf. Art. 6 Abs. 1 lit. c DSGVO (handels-/steuerrechtliche Aufbewahrungspflichten).
- Speicherdauer: kaskadiert mit dem Nutzerkonto bei Kontolöschung.
- Belege: `prisma/schema.prisma:567-601`, `server/webhooks/stripe.ts:6-7,46-95`.
- >>ENTSCHEIDUNG NOETIG: Konkrete gesetzliche Aufbewahrungsfrist für Rechnungs-/Abrechnungsdaten benennen; im Code nicht hinterlegt.<<

### 3.11 Kontolöschung — Gastronom

In der App (Pflicht 5.1.1(v) für den App Store) und im Web kann das Konto gelöscht werden.

- Ablauf: `DELETE /users/me` löscht zuerst die im Bilderspeicher unter dem Präfix des Nutzers abgelegten Dateien, dann die Datenbankeinträge, zuletzt das Clerk-Konto.
- **Reichweite**: Gelöscht werden zusätzlich alle Betriebe, an denen nach dieser Löschung niemand mehr hängt — also weder ein weiteres Mitglied noch eine Konfiguration eines anderen Kontos. Mit einem solchen Betrieb werden **auch alle betriebsbezogenen Daten unwiderruflich gelöscht**: Gäste, Stempelkarten und deren Historie, Bewertungen, Reservierungen, Bestellungen, Personal-, Dienstplan- und Abwesenheitsdaten sowie die Verbindungen zu Google und Meta.
- Bleibt am Betrieb ein weiteres Mitglied oder eine fremde Konfiguration bestehen, bleiben sämtliche dieser betriebsseitigen Daten unverändert stehen; gelöscht wird dann nur das Konto selbst.
- Schlägt der abschließende Clerk-Löschschritt fehl, ist die Datenbanklöschung zu diesem Zeitpunkt bereits unwiderruflich vollzogen; die Clerk-Identität (E-Mail, Name) kann vorübergehend weiterbestehen. Es gibt keinen automatischen Wiederholungsversuch.
- Der `ScraperJob` des Nutzers wird explizit vor dem Konto gelöscht.
- Rechtsgrundlage: Art. 6 Abs. 1 lit. c DSGVO i. V. m. Art. 17 DSGVO (Wahrnehmung des Löschrechts).
- Belege: `mobile/src/features/account/DeleteAccountScreen.tsx:73-114`, `server/routes/users.ts:87-235,110-129,149,184-188`.
- >>ENTSCHEIDUNG NOETIG: In `DeleteAccountScreen.tsx:79-83` wird ohne vorhandenes Sitzungstoken keine Serveranfrage gestellt, dem Nutzer aber „Konto gelöscht" gemeldet — es wird nur der lokale Speicher geleert. Vor Veröffentlichung sollte dieser Zweig eine ehrliche Meldung zeigen, damit die Erklärung nicht mehr verspricht als der Bildschirm leistet. Dieser Fall ist unwahrscheinlich, da alle Bauprofile einen Clerk-Schlüssel setzen (`mobile/eas.json`), aber er ist die einzige Stelle, an der eine Löschung behauptet würde, die serverseitig nicht stattgefunden hat.<<

Jeder Löschversuch (erfolgreich oder fehlgeschlagen) wird protokolliert (Nutzer-ID, IP-Adresse, User-Agent, Änderungsdetails).

- Zweck: Nachweis- und Rechenschaftspflicht (Art. 5 Abs. 2 DSGVO), Missbrauchsprävention.
- Rechtsgrundlage: Art. 6 Abs. 1 lit. c DSGVO i. V. m. Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an IT-Sicherheit und Nachweisführung).
- Speicherdauer: an das Konto gebunden (Cascade); überlebt eine **erfolgreiche** Kontolöschung nicht. Zeilen zu fehlgeschlagenen Löschversuchen bleiben ohne festgelegte Frist stehen.
- Belege: `prisma/schema.prisma:674-691`, `server/utils/audit.ts:15-38`, `server/routes/users.ts:32-71,47-71`.
- >>ENTSCHEIDUNG NOETIG: Aufbewahrungsfrist für Protokolle fehlgeschlagener Löschversuche festlegen.<<

### 3.12 Aufruf unserer Websites: Schriftarten von Google

Beim Aufruf von maitr.de bzw. check.maitr.de werden die Schriftarten (Space Grotesk/Poppins bzw. Space Grotesk/Inter) direkt von den Google-Servern `fonts.googleapis.com`/`fonts.gstatic.com` nachgeladen. Dabei wird die IP-Adresse des Besuchers an Google übertragen. Dies geschieht bei jedem Seitenaufruf und unabhängig von der Cookie-Consent-Entscheidung.

- Zweck: Darstellung der Website mit den vorgesehenen Schriftarten.
- Belege: `index.html:60-75`, `check/index.html:57-62`, `netlify.toml:44` (Content-Security-Policy erlaubt `fonts.googleapis.com`/`fonts.gstatic.com`).
- >>ENTSCHEIDUNG NOETIG: Diese Übertragung erfolgt derzeit ohne vorherige Einwilligung. Eine belastbare Rechtsgrundlage (Art. 6 Abs. 1 lit. f DSGVO reicht hierfür nach verbreiteter Auffassung nicht ohne Weiteres, da Selbsthosting der Schriften technisch zumutbar wäre) ist vor Veröffentlichung mit rechtlicher Beratung zu klären. Alternativen: Schriftarten selbst hosten (dann entfällt die Drittübertragung) oder Laden hinter die Cookie-Einwilligung legen.<<

### 3.13 Gerätefunktionen, die die App nicht nutzt

Die App fragt **keine** Berechtigung für Kamera, Fotobibliothek, Standort oder Kontakte ab; die dafür nötigen Pakete sind nicht installiert (`mobile/package.json:15-45`) und die entsprechenden Einträge fehlen in `mobile/ios/Maitr/Info.plist` und `mobile/app.json:21`. Es werden keine Telemetrie-, Absturz-, Analyse- oder Werbedaten (IDFA) erhoben und kein Push-Token gesetzt — die entsprechenden SDKs (Sentry, Firebase, Amplitude, Mixpanel, Segment, PostHog, expo-notifications) sind nicht eingebunden.

Die App fragt beim ersten Start unter iOS die Berechtigung **„Geräte im lokalen Netzwerk finden"** ab. Sie stammt aus dem Entwicklungs-Client (`NSBonjourServices`, `NSLocalNetworkUsageDescription`) und wird von der App im Betrieb nicht benötigt.

- Belege: `mobile/ios/Maitr/Info.plist:1-85,56-61`; `mobile/app.json:21,35-62`; `mobile/package.json:15-45`; `mobile/src/features/loyalty/StampProgramScreen.tsx:844`.
- >>ENTSCHEIDUNG NOETIG: `NSBonjourServices` und `NSLocalNetworkUsageDescription` aus dem Produktionsbau entfernen (`Info.plist:56-61`). Der hinterlegte Begründungstext nennt ausdrücklich einen Entwicklungsserver und ist für einen Store-Bau nicht vertretbar.<<
- >>ENTSCHEIDUNG NOETIG (BLOCKER App Store): `mobile/ios/Maitr/PrivacyInfo.xcprivacy:43-44` deklariert `NSPrivacyCollectedDataTypes` derzeit als leeres Array, obwohl die App nach den Abschnitten 3.1 und 3.6 E-Mail, Name und Gästedaten überträgt. Das Manifest ist vor Einreichung um mindestens „Email Address", „Name" und „Other User Content" (jeweils linked, nicht für Tracking) zu ergänzen, sonst widerspricht der Build dieser Erklärung. Gegenbelege für die tatsächliche Datenübertragung: `mobile/src/lib/auth.ts:190-204`, `mobile/src/features/loyalty/StampProgramScreen.tsx:868-878`.<<
- >>ENTSCHEIDUNG NOETIG (Android): `mobile/app.json:21` setzt `"android.permissions": []`, das eingecheckte `mobile/android/app/src/main/AndroidManifest.xml:2-6` enthält dennoch READ_EXTERNAL_STORAGE/WRITE_EXTERNAL_STORAGE (maxSdkVersion 32), SYSTEM_ALERT_WINDOW und VIBRATE, ohne dass im App-Code eine Nutzung dieser Funktionen gefunden wurde. Ob dies bei einem sauberen Build verschwindet oder von einer Kernabhängigkeit vorgegeben wird, ist ungeklärt und vor Veröffentlichung zu prüfen.<<

### 3.14 Vorbereitete, aktuell nicht aktive Funktionen

Die folgenden Funktionen sind im Datenmodell bzw. Code angelegt, aber nach dem geprüften Stand **nicht produktiv im Einsatz**. Wir nennen sie hier aus Transparenzgründen; sobald eine davon aktiviert wird, aktualisieren wir diese Erklärung vorab entsprechend:

- **Foto-Uploads aus der iOS-App über Supabase**: Die Anbindung existiert im Code, wird aber an keiner Stelle aufgerufen; kein Zugangsdatensatz ist in einem Build-Profil gesetzt. Kein tatsächlicher Netzwerkverkehr vom Gerät zu Supabase feststellbar. Belege: `mobile/src/lib/supabase.ts:1-43`, `mobile/src/lib/bootstrap.ts:20-36,35`, `mobile/eas.json`, `mobile/.env.example:38-39`.
- **Apple-/Google-Wallet-Anbindung für die Stempelkarte**: Datenbankfelder sind vorbereitet (`StampCard.googleObjectId`, `passTypeIdentifier` u. a.), die tatsächliche Pass-Erzeugung ist laut Code-Kommentar nicht implementiert. Beleg: `server/maitr/stempelkarte.ts:396`.
- **WhatsApp-Gästekommunikation**: Im Datenbankschema vollständig modelliert (Konversationen, Nachrichten, Medien), im Server-Code aber nur mit einem frühen Rückzug ohne Sende-/Webhook-Logik vertreten. Beleg: `prisma/schema.prisma:1658-1938`, `server/maitr/sync.ts:74-82`.
- **Besuchs- und Umsatzstatistik der veröffentlichten Websites**: Das Datenmodell sieht eine tagesweise Auswertung mit Besucherzahl, QR-Code-Aufrufen, Herkunft der Zugriffe und Umsatzkennzahlen vor (`AnalyticsSnapshot`). Nach dem geprüften Stand gibt es dafür ausschließlich Lesezugriffe und keinen Schreibpfad; es werden derzeit keine solchen Daten erhoben. Wird die Erhebung aktiviert, binden wir sie an die Einwilligung im Cookie-Banner und aktualisieren diese Erklärung vorab. Belege: `prisma/schema.prisma:138-162`; Lesezugriffe `server/routes/insights.ts:66,69,191,273,364`, `server/routes/admin.ts:353,460`; kein `analyticsSnapshot.create`/`upsert` im gesamten `server/`-Verzeichnis (geprüft).
- **E-Mail-Login in der App**: siehe 3.1.

## 4. Empfänger und Auftragsverarbeiter

| Empfänger | Rolle | Was wird übermittelt | Beleg |
|---|---|---|---|
| Clerk, Inc. (Instanz `clerk.maitr.de`) | Auftragsverarbeiter (Authentifizierung) | E-Mail, Name/Vor-/Nachname, Profilbild-URL, OAuth-Identität, clerkId, Sitzungstoken | `mobile/app.json:61`, `mobile/app/_layout.tsx:66-76`, `mobile/src/lib/auth.ts:31-119`, `server/routes/users.ts:260-269`, `server/webhooks/clerk.ts:1-40`, `server/middleware/auth.ts:36-45` |
| Google / Apple (Login über den Systembrowser bzw. Clerk) | eigenständig Verantwortliche für den OAuth-Vorgang | Login-Versuch; Rückgabe der vom Nutzer freigegebenen Kontodaten (i. d. R. E-Mail, Name) an Clerk | `mobile/app/login.tsx:72,84-99` |
| Eigene API (Express/Railway, `www.maitr.de/api/maitr`) | Verantwortlicher (Gastronomendaten) bzw. Auftragsverarbeiter (Gästedaten) | Bearer-Token, Gastname/-telefon bei Stempelkarten, Venue-Name, Löschauftrag | `mobile/src/lib/env.ts:44`, `packages/core/src/http.ts:50-82`, `mobile/src/features/loyalty/StampProgramScreen.tsx:872-875`, `mobile/src/features/onboarding/OnboardingScreen.tsx:136-137`, `mobile/src/features/account/DeleteAccountScreen.tsx:92` |
| Google Business Profile API / Business Profile Performance API | Datenquelle Dritter / Auftragsverarbeiter je nach Betrachtung | Bearer-Zugriffstoken; Rücklieferung von Bewertungen und Reichweite-Kennzahlen | `packages/core/src/integrations/google.ts:18-30,59-88`, `server/maitr/routes.ts:1264-1266,1321-1360` |
| Meta/Facebook Graph API (Instagram + Facebook-Seite) | Datenquelle Dritter / Auftragsverarbeiter je nach Betrachtung | Bearer-Zugriffstoken; Rücklieferung von Empfehlungen und Insights | `packages/core/src/integrations/meta.ts:30-100` |
| Resend, Inc. | Auftragsverarbeiter (Transaktions-E-Mail) | Gastname, Gast-E-Mail, Gasttelefon, Sonderwünsche, Reservierungsdetails, Betreiber-E-Mail | `server/utils/email.ts:1,22-56,34,62-96,101-143` |
| Stripe | Auftragsverarbeiter/eigenständig Verantwortlicher (Zahlungsdaten) | Kundennummer/Abonummer, Abrechnungsmetadaten | `server/webhooks/stripe.ts:6-7,46-95`, `prisma/schema.prisma:567-601` |
| n8n (eigene Infrastruktur auf Railway) | Auftragsverarbeiter | (a) beliebiger, ungeprüft weitergereichter POST-Body über `/api/forward-to-n8n`, ohne Anmeldung erreichbar; (b) direkter Postgres-Schreibzugriff auf `ScraperJob`, auch für Zeilen ohne Konto | `server/routes/n8nProxy.ts:14-22`, `server/index.ts:280`, `docs/n8n/Deep-Scrape-Flow.json:711,715` |
| Supabase Storage | Auftragsverarbeiter | hochgeladene Bilder (Logo, Galerie, Speisekarten-Scans) in öffentlich lesbarem Bucket, Pfad `<userId>/…`, lange Cache-Frist | `server/services/supabaseStorage.ts:14,35-42,56-89` |
| Google Gemini API (`generativelanguage.googleapis.com`) | Auftragsverarbeiter | Bilddaten der hochgeladenen Speisekarte zur OCR-Erkennung | `server/services/ocr/gemini.ts:19,225-227` |
| Netlify | Auftragsverarbeiter (Hosting) | Site-/Domain-Konfiguration; Zugriffs-/Logdaten (IP) aller Aufrufe | `server/services/NetlifyPublishService.ts:67,86-117`, `netlify/edge-functions/inject-site-config.ts:38-131` |
| Railway | Auftragsverarbeiter (API-/Serverhosting) | sämtliche über die API verarbeiteten Daten | `netlify.toml:75`, `index.html:77,79` |
| Neon (Postgres) | Auftragsverarbeiter (Datenbank) | alle in Prisma-Modellen gespeicherten Daten | `prisma/schema.prisma` (durchgehend), `.env.example:22` |
| Google Fonts (`fonts.googleapis.com`/`fonts.gstatic.com`) | eigenständig Verantwortlicher für den Ladevorgang | IP-Adresse jedes Besuchers, ohne vorherige Einwilligung | `index.html:60-75`, `check/index.html:57-62`, `netlify.toml:44` |

>>ENTSCHEIDUNG NOETIG: Für alle vorgenannten Empfänger ist zu prüfen und hier zu ergänzen, ob und mit welchem konkreten Vertrag (AVV nach Art. 28 DSGVO) die Verarbeitung abgesichert ist. Im geprüften Code selbst findet sich kein AVV-Nachweis.<<

## 5. Übermittlung in Drittländer

Folgende Empfänger sind uns mit Sitz belegt außerhalb der EU/des EWR bekannt:

- **Clerk, Inc. (USA)** – Authentifizierungsdaten. Beleg: Empfängerangabe „Clerk, Inc. (USA)" in den geprüften Unterlagen.
- **Resend, Inc. (USA)** – Reservierungs-/Gastdaten für Transaktionsmails. Beleg: entsprechend.

>>EINSETZEN: Firmensitz/Land für Stripe, Google (Business Profile API, Gemini API, Fonts), Meta/Facebook, Netlify, Railway, Neon, Supabase, n8n-Hosting bestätigen und hier eintragen – aus dem geprüften Code nicht mit Datei:Zeile belegbar.<<
>>ENTSCHEIDUNG NOETIG: Für jeden Drittlandtransfer die konkrete Garantie benennen (Angemessenheitsbeschluss, EU-Standardvertragsklauseln, EU-U.S. Data Privacy Framework). Aus dem Code nicht ersichtlich; mit den jeweiligen Anbietern zu klären und hier einzutragen.<<

## 6. Speicherdauer

Wir speichern personenbezogene Daten nur so lange, wie es für den jeweiligen Zweck erforderlich ist oder eine gesetzliche Aufbewahrungspflicht besteht. Konkrete, aus dem Code belegte Fristen bzw. Kriterien:

| Datenkategorie | Speicherdauer/Kriterium | Beleg |
|---|---|---|
| Lokaler App-Zustand (Gästeliste, Reservierungen, Aktivitätsprotokoll) in AsyncStorage | bleibt bis zur expliziten Kontolöschung; wird beim normalen Abmelden **nicht** gelöscht | `mobile/src/lib/store.tsx:494,1109,1196-1213,664-671,1062-1088` |
| Sitzungstoken (App) | im Regelfall verschlüsselt in expo-secure-store (via Clerk) bis zur Abmeldung; im Rückfallbetrieb ohne Anmeldedienst unverschlüsselt in AsyncStorage, ohne Serverkontakt | `mobile/app/_layout.tsx:71-73`; Rückfallpfad `mobile/src/lib/auth.ts:181,206-214,229-234` |
| Kontodaten (User) | bis zur Kontolöschung (Cascade) | `server/routes/users.ts:87-235,237-283` |
| Stempelkarten-Gastdaten (MaitrGuest) | Anonymisierung statt Löschung (Name, Telefon, E-Mail); Besuchszähler und Freitext-Merkmale (tags) bleiben dabei unverändert; für Gäste ohne Stempelkarte existiert kein Anonymisierungsweg; echte Löschung nur mit dem gesamten Betrieb | `server/maitr/stempelkarte.ts:1684-1739,1701-1703,1711-1723` |
| WalletDeviceRegistration | wird bei Gast-Anonymisierung in derselben Transaktion gelöscht | `server/maitr/stempelkarte.ts:1660-1662,1705-1709` |
| StampEvent (Stempel-Hauptbuch) | bewusst dauerhafte Beweisfunktion; Mitarbeiterbezug wird bei dessen Kontolöschung auf NULL gesetzt, Zeile bleibt | `prisma/schema.prisma:1574-1605` |
| ScraperJob (Konto zugeordnet) | wird vor Kontolöschung explizit gelöscht | `server/routes/users.ts:184` |
| ScraperJob (ohne Konto, aus Analyse ohne Anmeldung) | >>ENTSCHEIDUNG NOETIG: kein Löschpfad im Code gefunden, technisch unbefristet<< | `prisma/schema.prisma:603-637`, `server/routes/scraper.ts:355-362` |
| AuditLog | an das Konto gebunden; überlebt erfolgreiche Kontolöschung nicht; fehlgeschlagene Löschversuche bleiben ohne Frist stehen | `server/routes/users.ts:32-71` |
| Bilder (Supabase, eigene Uploads) | öffentlich abrufbar bis zur Kontolöschung, dann gezielt gelöscht; kann durch lange Cache-Fristen noch danach ausgeliefert werden | `server/services/supabaseStorage.ts:14,34-46,68-70,89,92-104` |
| Bestelldaten (Order, OrderEvent) | >>ENTSCHEIDUNG NOETIG: keine Löschroutine/Frist im Code gefunden<< | `prisma/schema.prisma:238-266,552-566` |
| Personal-, Dienstplan- und Abwesenheitsdaten (Staff, Shift, Absence — einschließlich Gesundheitsdaten) | >>ENTSCHEIDUNG NOETIG: keine Aufbewahrungsfrist im Code geregelt, kaskadiert nur mit dem Betrieb<< | `prisma/schema.prisma:311-341,343-380,383-414` |
| Business-Geodaten, Reservation, MaitrReview, ChannelConnection, StampCard | >>ENTSCHEIDUNG NOETIG: keine Löschroutine/Frist im Code gefunden; bleiben technisch unbefristet bis zur Löschung des gesamten Betriebs<< | `prisma/schema.prisma:38-72,164-184,876-920,939-1019,1385-1558`, `server/maitr/scheduler.ts` (nur Sync-/Insight-Jobs, kein Purge-Job) |
| Configurator-/Cookie-Consent-/Analyse-Daten im Browser (localStorage/sessionStorage) | >>ENTSCHEIDUNG NOETIG: kein TTL im Code hinterlegt<< | `client/store/configuratorStore.ts:1037,1050`, `client/components/cookie-banner.tsx:10,18,61`, `client/data/analysisStore.ts:10,16,36-46` |
| Abo-/Zahlungsdaten (Subscription, BillingEvent) | kaskadiert mit Kontolöschung; >>ENTSCHEIDUNG NOETIG: gesetzliche Aufbewahrungsfrist für Rechnungsdaten nicht im Code hinterlegt<< | `prisma/schema.prisma:567-601` |

## 7. Ihre Rechte

Ihnen stehen nach der DSGVO folgende Rechte zu, soweit die jeweiligen gesetzlichen Voraussetzungen vorliegen:

- **Auskunft** (Art. 15 DSGVO) über die zu Ihnen gespeicherten Daten.
- **Berichtigung** (Art. 16 DSGVO) unrichtiger Daten.
- **Löschung** (Art. 17 DSGVO); bei Gastronomen über die Kontolöschungsfunktion in der App bzw. auf der Website, bei Restaurantgästen über den jeweiligen Betrieb. Beachten Sie Abschnitt 3.6: Bei Stempelkartendaten wird eine Löschanfrage als Anonymisierung umgesetzt und deckt derzeit weder Besuchszähler/Freitext-Merkmale noch Gäste ohne ausgegebene Stempelkarte ab.
- **Einschränkung der Verarbeitung** (Art. 18 DSGVO).
- **Datenübertragbarkeit** (Art. 20 DSGVO) für Daten, die auf Vertrag oder Einwilligung beruhen und automatisiert verarbeitet werden.
- **Widerspruch** (Art. 21 DSGVO) gegen auf Art. 6 Abs. 1 lit. f DSGVO gestützte Verarbeitungen.
- **Widerruf einer Einwilligung** (Art. 7 Abs. 3 DSGVO) mit Wirkung für die Zukunft, soweit eine Verarbeitung auf Einwilligung beruht (z. B. optionale Cookie-Kategorien).

Zur Ausübung dieser Rechte wenden Sie sich an: >>EINSETZEN: Kontakt-E-Mail des Verantwortlichen<<. Betrifft Ihre Anfrage Daten, die im Rahmen eines konkreten Restaurantbesuchs (Reservierung, Bestellung, Stempelkarte, Bewertungsantwort) verarbeitet wurden, wenden Sie sich zusätzlich oder vorrangig an den jeweiligen Betrieb als Verantwortlichen.

Die Bereitstellung von E-Mail-Adresse und Name bei der Registrierung ist erforderlich, um den Nutzungsvertrag zu schließen; ohne diese Angaben ist eine Nutzung von maitr nicht möglich. Die Bereitstellung von Name/Telefon bei Reservierung, Bestellung oder Stempelkarte ist erforderlich, um die jeweilige Leistung zu erhalten; ohne diese Angaben kann die Leistung nicht erbracht werden.

**Automatisierte Entscheidungsfindung/Profiling**: Eine automatisierte Entscheidung mit rechtlicher oder ähnlich erheblicher Wirkung im Sinne von Art. 22 DSGVO findet nicht statt. Der Nachbarschafts-Benchmark (Abschnitt 3.8) ist eine aggregierte Kohortenauswertung auf Betriebsebene, keine Einzelfallentscheidung über eine natürliche Person.

## 8. Beschwerderecht

Sie haben das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren, insbesondere in dem Mitgliedstaat Ihres Aufenthaltsorts, Ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes. Zuständig für den Verantwortlichen (Sitz Münster, Nordrhein-Westfalen) ist voraussichtlich:

Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen
Postfach 20 04 44
40102 Düsseldorf

>>ENTSCHEIDUNG NOETIG: Zuständigkeit bestätigen, insbesondere falls der maßgebliche Sitz von Münster abweicht oder eine andere Rechtsform mit anderem Sitz gewählt wird.<<

## 9. Änderungen dieser Erklärung

Wir passen diese Datenschutzerklärung an, wenn sich die beschriebenen Datenverarbeitungen ändern, insbesondere bei Aktivierung der in Abschnitt 3.14 genannten, derzeit inaktiven Funktionen (Foto-Uploads über Supabase in der App, Wallet-Anbindung, WhatsApp-Gästekommunikation, Besuchs-/Umsatzstatistik) oder bei Einführung eines weiteren Analyse-/Tracking-Tools. Ebenso passen wir Abschnitt 3.8/3.8a an, sobald ein echter Trennen-Endpunkt für verbundene Kanäle existiert. Es gilt jeweils die zum Zeitpunkt Ihres Besuchs auf maitr.de bzw. in der App abrufbare Fassung.

## Belegstellen

| Aussage | Datei:Zeile |
|---|---|
| Verantwortlicher (Name, Anschrift) | `client/pages/AGB.tsx:114` |
| Clerk-Kontodaten (E-Mail, Name, Profilbild, Nutzer-ID) | `mobile/src/lib/auth.ts:190-204`; `mobile/app/login.tsx:81,84-99`; `mobile/src/lib/env.ts:47-69` |
| Sitzungstoken in SecureStore (Clerk) | `mobile/app/_layout.tsx:71-73`; `mobile/package.json:29` |
| Sitzungstoken-Rückfallpfad ohne Clerk (unverschlüsselt, AsyncStorage) | `mobile/src/lib/auth.ts:181,206-214,229-234` |
| API-Autorisierung | `mobile/src/lib/env.ts:44`; `packages/core/src/http.ts:70-82` |
| E-Mail-Login unfertig, kein Datenfluss | `mobile/app/login.tsx:116-118,57-60` |
| deviceId/sync_user_id nicht aufgerufen | `client/lib/utils.ts:4-11`; `client/lib/api.ts:58-66,330`; `client/store/configuratorStore.ts:1031` |
| ScraperJob, Erhebung ohne Anmeldung, kein Löschpfad ohne Konto | `prisma/schema.prisma:603-637`; `server/routes/scraper.ts:355-362,383-391`; `client/pages/Index.tsx:435-441`; `client/pages/CheckLanding.tsx:909-915`; `server/routes/users.ts:184` |
| n8n-Proxy ungeprüft, ohne Anmeldung | `server/routes/n8nProxy.ts:14-22`; `server/index.ts:280`; `docs/n8n/Deep-Scrape-Flow.json:711,715` |
| Supabase Storage (Web) öffentlich, lange Cache-Frist | `server/services/supabaseStorage.ts:14,34-46,56-89,92-104` |
| Gemini OCR | `server/services/ocr/gemini.ts:19,225-227` |
| Reservation (DB + Resend), Verwaltungslink ohne Anmeldung | `prisma/schema.prisma:164-184`; `server/routes/reservations.ts:10-18,96-107,150-159`; `server/routes/publicReservations.ts:103-120,143-185,198ff`; `server/utils/email.ts:1-3,22-143,34` |
| Order (Bestellung) | `prisma/schema.prisma:238-266,466-468,552-566`; `server/routes/orders.ts:7-30`; `client/components/dynamic/AppRenderer.tsx:813` |
| MaitrGuest, Anonymisierung, tags/visits nicht erfasst, kein Weg ohne Karte | `prisma/schema.prisma:798-874,816-845,838`; `server/maitr/stempelkarte.ts:1165-1256,1684-1739,1701-1703,1711-1723`; `server/maitr/dataset.ts:80`; `server/maitr/briefing.ts:219` |
| MaitrReview, author nicht persistiert | `prisma/schema.prisma:876-920,888-891`; `server/maitr/sync.ts:94-129,100-129`; `packages/core/src/analytics/types.ts:22-31`; `packages/core/src/integrations/google.ts:35-41,122-131`; `packages/core/src/integrations/meta.ts:79-91,113-127` |
| ChannelConnection, Verschlüsselung, OAuth-Callback | `prisma/schema.prisma:939-1019`; `server/maitr/security.ts:15-34`; `server/maitr/sync.ts:45-68,173-178`; `server/maitr/routes.ts:1264-1266,1321-1360` |
| "Verbindung trennen" ohne Serverwirkung | `mobile/src/lib/store.tsx:814-821`; `mobile/src/features/growth/ChannelDetailScreen.tsx:106-109`; `server/maitr/sync.ts:69-72` |
| StampCard/StampEvent | `prisma/schema.prisma:1385-1558,1574-1605`; `server/maitr/stempelkarte.ts:396,1277-1291` |
| WalletDeviceRegistration | `prisma/schema.prisma:1630-1656`; `server/maitr/stempelkarte.ts:1660-1662,1705-1709` |
| WhatsApp nicht live | `prisma/schema.prisma:1658-1938`; `server/maitr/sync.ts:74-82` |
| Staff/Shift/Absence (Gesundheitsdaten) | `prisma/schema.prisma:311-341,343-380,383-414,431-439`; `server/routes/staff.ts:46-60,67,135,182,240,316`; `server/routes/index.ts:170` |
| Subscription/BillingEvent/Stripe | `prisma/schema.prisma:567-601`; `server/webhooks/stripe.ts:6-7,46-95` |
| AuditLog | `prisma/schema.prisma:674-691`; `server/utils/audit.ts:15-38`; `server/routes/users.ts:32-71` |
| Kontolöschung, Reichweite (verwaiste Betriebe) | `mobile/src/features/account/DeleteAccountScreen.tsx:73-114,79-83,92,100`; `server/routes/users.ts:87-235,110-129,149,184-188`; `mobile/eas.json` |
| Netlify Publish/Edge Function | `server/services/NetlifyPublishService.ts:67,86-117`; `netlify/edge-functions/inject-site-config.ts:38-131` |
| Konfigurator-Formular (localStorage) | `client/store/configuratorStore.ts:1037,1050`; `client/lib/stepPersistence.ts:30-31,217-241` |
| Cookie-Consent-Speicherung, Analytics-Schalter inaktiv | `client/components/cookie-banner.tsx:10,18,61,64` |
| Analyse-Tool-Ergebnis (localStorage) | `client/data/analysisStore.ts:10,16,36-46` |
| AnalyticsSnapshot nur Lesezugriffe, keine Erhebung | `prisma/schema.prisma:138-162`; `server/routes/insights.ts:66,69,191,273,364`; `server/routes/admin.ts:353,460` |
| Google Fonts extern, unbedingt, vor Consent | `index.html:60-75`; `check/index.html:57-62`; `netlify.toml:44`; Fehlerhafte Gegenbehauptung in bestehender Seite: `client/pages/Datenschutz.tsx:261-266`; Consent-Banner erscheint verzögert: `client/App.tsx:96-99` |
| Reservierungsformular ohne Datenschutzhinweis | vollständig durchsuchte Datei `client/components/dynamic/ReservationFormModern.tsx` (keine Fundstelle) |
| Veröffentlichte Websites ohne eigenes Impressum/Datenschutz | `client/components/dynamic/AppRenderer.tsx:816-819`; `client/App.tsx:256-258` |
| Google-OAuth-Scope und -Nutzung | `packages/core/src/integrations/google.ts:18-20,59-68,70-88`; `client/pages/Index.tsx:952` |
| Kamera/Standort/Kontakte nicht abgefragt; lokales Netzwerk (Dev-Client) | `mobile/ios/Maitr/Info.plist:1-85,56-61`; `mobile/app.json:21,35-62`; `mobile/package.json:15-45` |
| PrivacyInfo.xcprivacy widerspricht tatsächlicher Datenübertragung | `mobile/ios/Maitr/PrivacyInfo.xcprivacy:43-46` |
| Kein Tracking/Analytics/IDFA | `mobile/package.json:15-45`; `mobile/app.json:35-62`; `mobile/ios/Maitr/PrivacyInfo.xcprivacy:45-46` |
| Supabase in App inaktiv | `mobile/src/lib/supabase.ts:1-43`; `mobile/src/lib/bootstrap.ts:20-36,35`; `mobile/eas.json`; `mobile/.env.example:38-39` |
| User/Business (DB) | `prisma/schema.prisma:11-36,38-72,114-121`; `server/routes/users.ts:87-235,237-283` |

## Ungeklärt (nicht in den Erklärungstext übernommen)

- Serverseitige Aufbewahrungsfristen für Gäste-/Stempelkartendaten, Fotos und Business-Daten wurden nur so weit geprüft, wie sie in `server/` und `prisma/schema.prisma` sichtbar sind; darüber hinausgehende Löschjobs außerhalb des geprüften Codes wurden nicht ausgeschlossen.
- Aufbewahrungspraxis von Clerk als Auftragsverarbeiter (eigene Fristen, ggf. zusätzliche SDK-interne Diagnosedaten) ist eine Eigenschaft des Drittdienstes und im Repo nicht dokumentiert.
- Android-Berechtigungen im AndroidManifest.xml (READ/WRITE_EXTERNAL_STORAGE, SYSTEM_ALERT_WINDOW, VIBRATE) trotz `"permissions": []` in `app.json` – Ursache ungeklärt, kein Build ausgeführt.
- Ob im Repo liegende Umgebungsvariablen (`mobile/.env`, `mobile/eas.json`) bereits rotiert wurden, wurde in dieser Prüfung nicht erneut verifiziert.
- Ob der OAuth-Callback (`server/maitr/routes.ts:1321-1360`, code/state als Query-Parameter) in Plattform-Zugriffslogs außerhalb des Repos protokolliert wird, ist unbekannt.
- Ob es einen WhatsApp-Handler außerhalb des durchsuchten `server/`-Verzeichnisses gibt (z. B. `netlify/edge-functions/`), wurde nicht gezielt geprüft.
- Aktueller Implementierungsstand der Wallet-Anbindung sollte unmittelbar vor Veröffentlichung erneut geprüft werden, da sich der Code laut Commit-Historie schnell weiterentwickelt.
- `RestaurantSchemaConfig.reviews` (rating, author, text, date) ist im Typ vorgesehen; kein befüllender Aufrufer gefunden, ein solcher kann aber existieren.
- Ob die von PRIVACY.md/Datenschutz.tsx behaupteten AVV-Verträge mit Netlify, Railway, Clerk, Resend tatsächlich unterschrieben sind, die behauptete IP-Anonymisierung „nach 7 Tagen" konfiguriert ist, und ob bei Clerk „Mit Google anmelden" aktiviert ist, ließ sich aus dem Code nicht belegen.
- Der tatsächliche Instagram-HTML-Scrape-Mechanismus, den die bestehende Seite `Datenschutz.tsx:332-339` behauptet, wurde im geprüften Code (`server/`, `client/`) nicht gefunden (vermutlich außerhalb des Repos in n8n).
- Welche der beiden möglichen Quellen (`check/`-Build oder prerenderte Hauptclient-Routen) tatsächlich unter `check.maitr.de` liegt, ist aus dem Repo nicht zu belegen (DNS/Netlify-Konfiguration außerhalb des Codes).
- Ob `Absence.attachments` in der laufenden Instanz je befüllt wurde — im geprüften `server/routes/staff.ts` wurde das Feld im Zod-Schema nicht gefunden, im Prisma-Modell schon (`prisma/schema.prisma:398`). Ob ein anderer Pfad schreibt, ist offen.
- Ob die Bestellfunktion (`Order`) im ersten Rollout tatsächlich freigeschaltet ist; die Mount-Stelle des Bestell-Routers im API-Router (`server/routes/index.ts`) wurde nicht abschließend verifiziert.
- Ob der n8n-Flow außer `ScraperJob` weitere Tabellen direkt beschreibt — geprüft wurde nur `docs/n8n/Deep-Scrape-Flow.json` per Grep auf `userId`, nicht der vollständige Flow.
- Sitzländer und Vertragsgrundlagen der Empfänger (Stripe, Google, Meta, Netlify, Railway, Neon, Supabase) — aus dem Code nicht belegbar; die `>>EINSETZEN<<`-Marke in Abschnitt 5 ist zu Recht offen.
