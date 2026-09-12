/**
 * Die Schritte des Konfigurators - EINE Liste für alle, die sie brauchen.
 *
 * ANLASS: Die Liste stand als modul-lokale Konstante in
 * `client/pages/Configurator.tsx`. Das Nachbearbeitungs-Interface des
 * automatischen Modus springt gezielt in einzelne Schritte
 * (`setCurrentStep(<index>)`), und die Indizes dafür aus dem Kopf abzuschreiben
 * wäre eine zweite Wahrheit: Wer einen Schritt einfügt, verschiebt alle
 * folgenden - und ein Sprung auf "Farben" landete danach still auf "Seiten".
 * Deshalb liegt die Liste hier, und die Indizes werden aus ihr abgeleitet.
 *
 * Ein Import von `Configurator.tsx` käme nicht in Frage: die Seite zieht den
 * gesamten Konfigurator samt Vorschau nach, und der automatische Modus lädt sie
 * bewusst getrennt (`lazy` in client/App.tsx).
 */

export interface ConfiguratorStep {
  id: string;
  title: string;
  phase: number;
  phaseTitle: string;
  component: string;
}

export const CONFIGURATOR_STEPS_CONFIG: ConfiguratorStep[] = [
  {
    id: "template",
    title: "Choose your template",
    phase: 0,
    phaseTitle: "Template Selection",
    component: "template",
  },
  {
    id: "business-info",
    title: "Tell us about your business",
    phase: 1,
    phaseTitle: "Business Information",
    component: "business-info",
  },
  {
    id: "design-customization",
    title: "Design Customization",
    phase: 2,
    phaseTitle: "Design Customization",
    component: "design-customization",
  },
  {
    id: "page-structure",
    title: "Select your pages",
    phase: 3,
    phaseTitle: "Content Structure",
    component: "page-structure",
  },
  {
    id: "opening-hours",
    title: "Set your opening hours",
    phase: 4,
    phaseTitle: "Business Details",
    component: "opening-hours",
  },
  {
    id: "menu-products",
    title: "Add your menu or products",
    phase: 4,
    phaseTitle: "Business Details",
    component: "menu-products",
  },
  {
    id: "reservations",
    title: "Setup reservations",
    phase: 4,
    phaseTitle: "Business Details",
    component: "reservations",
  },
  {
    id: "contact-social",
    title: "Contact & social media",
    phase: 4,
    phaseTitle: "Business Details",
    component: "contact-social",
  },
  {
    id: "media-gallery",
    title: "Upload your photos",
    phase: 5,
    phaseTitle: "Media & Advanced",
    component: "media-gallery",
  },
  {
    id: "advanced-features",
    title: "Optional features",
    phase: 5,
    phaseTitle: "Media & Advanced",
    component: "advanced-features",
  },
  {
    id: "feature-config",
    title: "Configure feature",
    phase: 5,
    phaseTitle: "Media & Advanced",
    component: "feature-config",
  },
  {
    id: "domain-hosting",
    title: "Choose your domain",
    phase: 6,
    phaseTitle: "Publishing",
    component: "domain-hosting",
  },
  {
    id: "seo-optimization",
    title: "SEO Optimization",
    phase: 6,
    phaseTitle: "Publishing",
    component: "seo-optimization",
  },
  {
    id: "preview-adjustments",
    title: "Preview & final tweaks",
    phase: 6,
    phaseTitle: "Publishing",
    component: "preview-adjustments",
  },
  {
    id: "publish",
    title: "Publish your website",
    phase: 6,
    phaseTitle: "Publishing",
    component: "publish",
  },
];

/**
 * Index eines Schritts anhand seiner Kennung.
 *
 * Wirft bei unbekannter Kennung, statt -1 zurückzugeben: `setCurrentStep(-1)`
 * ist im Konfigurator die Willkommensseite. Ein Tippfehler in einer Kennung
 * landete damit lautlos auf einer ganz anderen Ansicht - genau der Fehler, den
 * diese Datei verhindern soll.
 */
export function schrittIndex(id: string): number {
  const index = CONFIGURATOR_STEPS_CONFIG.findIndex((s) => s.id === id);
  if (index < 0) {
    throw new Error(`Unbekannter Konfigurator-Schritt: "${id}"`);
  }
  return index;
}
