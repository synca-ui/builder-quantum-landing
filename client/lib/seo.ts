/**
 * Zentrale Quelle für Seiten-Metadaten (title, description, canonical).
 *
 * Vorher trug jede Seite ihre Strings selbst und KEINE übergab canonicalPath.
 * PageSEO setzt den Standard auf "", wodurch jede Unterseite auf
 * https://www.maitr.de/ kanonisiert hat – also sich selbst gegenüber Google als
 * Dublette der Startseite auswies. Der Pfad gehört deshalb hier fest zur Seite.
 *
 * Titel folgen dem Muster "<Seite> – Maitr", damit in der Suchergebnisliste das
 * Unterscheidungsmerkmal vorn steht; die Startseite trägt den vollen Markentitel.
 */
export interface PageMeta {
  title: string;
  description: string;
  canonicalPath: string;
  noindex?: boolean;
}

export const SEO = {
  home: {
    title: "Maitr – Restaurant-Web-App in 30 Sekunden & Google-Profil-Pflege",
    description:
      "Maitr ist der digitale Gastgeber für Gastronomie: Web-App-Builder für Restaurants in 30 Sekunden – und eine App, die mit ausdrücklicher Zustimmung des Inhabers das Google Unternehmensprofil pflegt, Bewertungen beantwortet und Beiträge veröffentlicht.",
    canonicalPath: "/",
  },

  checkLanding: {
    title: "Online-Präsenz prüfen – Maitr Check",
    description:
      "Kostenloser Check für Cafés und Restaurants: Wie sichtbar ist dein Betrieb bei Google, wie vollständig ist dein Unternehmensprofil und wo verlierst du Gäste?",
    canonicalPath: "/check-landing",
  },

  demoDashboard: {
    title: "Demo-Dashboard ausprobieren – Maitr",
    description:
      "Sieh dir das Maitr-Dashboard ohne Anmeldung an: Reservierungen, Tischplan, Kennzahlen und Creative Studio an echten Beispieldaten.",
    canonicalPath: "/demo-dashboard",
  },

  impressum: {
    title: "Impressum – Maitr",
    description:
      "Anbieterkennzeichnung nach § 5 TMG für Maitr: Betreiber, Anschrift und Kontaktmöglichkeiten.",
    canonicalPath: "/impressum",
  },

  datenschutz: {
    title: "Datenschutzerklärung – Maitr",
    description:
      "Wie Maitr personenbezogene Daten verarbeitet: Rechtsgrundlagen, eingesetzte Dienste, Speicherdauer und deine Rechte nach DSGVO.",
    canonicalPath: "/datenschutz",
  },

  agb: {
    title: "Allgemeine Geschäftsbedingungen – Maitr",
    description:
      "Die Vertragsbedingungen für die Nutzung von Maitr: Leistungsumfang, Laufzeiten, Preise und Kündigung.",
    canonicalPath: "/agb",
  },

  checkImpressum: {
    title: "Impressum – Maitr Check",
    description:
      "Anbieterkennzeichnung nach § 5 TMG für den Maitr-Check unter check.maitr.de.",
    canonicalPath: "/impressum-check",
  },

  checkDatenschutz: {
    title: "Datenschutzerklärung – Maitr Check",
    description:
      "Wie der Maitr-Check unter check.maitr.de personenbezogene Daten verarbeitet: Rechtsgrundlagen, Speicherdauer und deine Rechte nach DSGVO.",
    canonicalPath: "/datenschutz-check",
  },

  // Seiten hinter bzw. vor der Anmeldung: kein Suchmaschinen-Index. Sie stehen
  // bewusst NICHT in der sitemap.xml.
  login: {
    title: "Anmelden – Maitr",
    description: "Melde dich bei deinem Maitr-Konto an.",
    canonicalPath: "/login",
    noindex: true,
  },

  signup: {
    title: "Konto erstellen – Maitr",
    description: "Erstelle dein kostenloses Maitr-Konto.",
    canonicalPath: "/signup",
    noindex: true,
  },

  modeSelection: {
    title: "Modus auswählen – Maitr",
    description: "Wähle, wie du deine Web-App mit Maitr erstellen möchtest.",
    canonicalPath: "/mode-selection",
    noindex: true,
  },
} satisfies Record<string, PageMeta>;
