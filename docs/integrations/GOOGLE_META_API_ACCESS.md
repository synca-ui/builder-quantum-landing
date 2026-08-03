# Google & Meta API-Zugriff beantragen

Damit Nutzer ihre Kanäle bei Maitr verbinden und wir Bewertungen, Reichweite und
Profildaten abrufen können, brauchst du bei **Google** und **Meta** freigegebenen
API-Zugriff. Beide Anbieter gatekeepen genau die Daten, die wir wollen (fremde
Bewertungen, Insights) hinter einem Antrags- und Prüfprozess. Ohne Freigabe liefern
die Endpunkte `PERMISSION_DENIED` bzw. leere Antworten.

Dieser Leitfaden ist die Schritt-für-Schritt-Checkliste. Der Code dazu liegt in
`packages/core/src/integrations/` (`google.ts`, `meta.ts`) – Scopes, Endpunkte und
Normalisierung sind dort exakt so hinterlegt, wie unten beschrieben.

> **Grundregel Sicherheit:** Client-Secrets und Refresh-Tokens gehören **nur auf den
> Server**, nie in die Mobile-App. Die App startet nur den OAuth-Flow (öffentliche
> Client-ID + Redirect); den Code-gegen-Token-Tausch und alle Datenabrufe macht der
> Server. Tokens verschlüsselt speichern.

---

## 1. Google Business Profile

Datenquellen, die wir nutzen:
- **Bewertungen** – `mybusiness.googleapis.com/v4/accounts/*/locations/*/reviews`
- **Reichweite/Aufrufe** – Business Profile Performance API
  (`businessprofileperformance.googleapis.com/v1/…:fetchMultiDailyMetricsTimeSeries`)

### Schritte

1. **Google-Cloud-Projekt anlegen** in der [Google Cloud Console](https://console.cloud.google.com).
2. **APIs aktivieren** (APIs & Dienste → Bibliothek):
   - *Google My Business API* (Bewertungen, v4)
   - *Business Profile Performance API* (Aufrufe/Reichweite)
   - *My Business Account Management API* und *My Business Business Information API*
     (Konten & Standorte auflisten)
3. **Zugriff gesondert beantragen** – das ist das eigentliche Tor. Die Business-
   Profile-APIs sind nicht frei nutzbar: Fülle das **„Business Profile API access"**-
   Antragsformular aus (verlinkt in der Google-Doku „Request access / Prerequisites").
   Google schaltet dein Projekt danach frei und vergibt Quota. **Ohne diese Freigabe
   ist die Quota 0.** Bearbeitungszeit: Tage bis wenige Wochen.
4. **OAuth-Zustimmungsbildschirm** konfigurieren (Nutzertyp *Extern*):
   - Scope hinzufügen: `https://www.googleapis.com/auth/business.manage`
   - App-Infos, Datenschutzerklärung-URL, Domain-Verifizierung
   - Testnutzer eintragen (funktioniert vor der Verifizierung nur für diese)
5. **OAuth-Verifizierung** einreichen. `business.manage` gilt als *sensibler* Scope →
   Google verlangt App-Verifizierung (Datenschutz, Domain, Demo-Video). Erst danach
   dürfen beliebige Nutzer verbinden.
6. **OAuth-Client-ID erstellen** (Anmeldedaten → OAuth-Client-ID, Typ *Webanwendung*),
   Redirect-URIs eintragen.
7. **Flow implementieren**: Autorisierung → Code → Access-/Refresh-Token (mit
   `access_type=offline`) → Endpunkte aufrufen. Der Nutzer muss Inhaber/Manager des
   jeweiligen Standorts sein.

### Voraussetzungen beim Nutzer
Verifiziertes Google-Business-Profil, der verbindende Account ist Inhaber oder Manager
des Standorts.

---

## 2. Meta (Instagram + Facebook)

Instagram-Profidaten hängen immer an einer Facebook-Seite. Über den Graph-Zugang der
Seite lesen wir beides.

Datenquellen:
- **Reichweite** – `/{ig-user-id}/insights?metric=impressions,reach,profile_views`
- **Empfehlungen** (als „Bewertungen") – `/{page-id}/ratings`
  (Instagram selbst hat keine Sternebewertungen; wir mappen Facebook-Empfehlungen)

### Schritte

1. **Meta-App anlegen** unter [developers.facebook.com](https://developers.facebook.com)
   (App-Typ *Business*).
2. **Produkte hinzufügen**: *Facebook Login* und *Instagram Graph API*
   („Instagram API mit Facebook Login").
3. **Berechtigungen (Permissions)**, die wir anfragen:
   - `instagram_basic`
   - `instagram_manage_insights`
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_read_user_content`
   - `business_management`
4. **App Review**: Für all diese Permissions brauchst du *Advanced Access*. Dafür jede
   Permission mit Screencast begründen (wie und wo Maitr sie nutzt), plus App-Icon,
   Datenschutzerklärung-URL und Nutzungsbedingungen.
5. **Business-Verifizierung** deines Unternehmens im *Meta Business Manager* – Pflicht
   für Advanced Access. (Handelsregister/Impressum, Domain.)
6. **Vor dem Review testen**: Mit *Standard Access* kannst du die App mit Personen
   testen, die eine Rolle in der App haben (Admin/Tester/Entwickler).
7. **Long-Lived Tokens**: Kurzlebiges Token gegen ein langlebiges Page-Access-Token
   tauschen (~60 Tage), rechtzeitig erneuern.

### Voraussetzungen beim Nutzer
Instagram-**Professional**-Konto (Business/Creator), verbunden mit einer Facebook-
Seite, auf der der Nutzer eine Rolle hat.

---

## 3. Der Verbinden-Flow (beide Anbieter, gleich)

1. Nutzer tippt in Maitr „Google verbinden" bzw. „Instagram verbinden".
2. App öffnet die Autorisierungs-URL des Anbieters (siehe
   `connector.buildAuthorizationUrl` in `packages/core/src/integrations/`).
3. Nutzer stimmt im Consent-Screen zu → Redirect zurück mit `code` + `state`.
4. **Server** tauscht `code` gegen Access-/Refresh-Token, speichert sie verschlüsselt.
5. Server ruft periodisch (und per Webhook, wo verfügbar) Bewertungen + Insights ab,
   normalisiert sie auf `ReviewRecord` / `EngagementPoint` und speist damit
   `@maitr/core/analytics`.

## 4. Reihenfolge / Zeitplan

| Aufgabe | Google | Meta |
|---|---|---|
| Projekt/App anlegen | sofort | sofort |
| Daten-Zugriff beantragen | **GBP-Access-Formular** | **App Review** |
| Firmen-/Domain-Nachweis | Domain-Verifizierung | **Business-Verifizierung** |
| Vor Freigabe testbar mit | Testnutzern | App-Rollen (Standard Access) |
| Typische Dauer | Tage–Wochen | Tage–Wochen |

Beide Prüfungen laufen parallel – am besten früh starten, denn ohne Freigabe bleibt der
Verbinden-Button eine Demo.
