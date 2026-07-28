/**
 * Macht aus einem gescrapten Entwurf etwas, das POST /api/webapps/apps/publish
 * annimmt – ohne dass jemand den manuellen Konfigurator durchläuft.
 *
 * Der Publish-Endpunkt lehnt eine Konfiguration ab, solange drei Felder fehlen
 * (validatePublishData in server/routes/webapps.ts):
 *
 *   business.name    – mindestens zwei Zeichen
 *   business.type    – irgendein nicht-leerer Wert
 *   design.template  – irgendein nicht-leerer Wert
 *
 * Der Scrape liefert die letzten beiden nicht zuverlässig: businessType nur,
 * wenn die Seite es hergibt, und template nur, wenn der Flow eine Vorlage
 * geraten hat. Ohne Ersatzwerte bräche der automatische Modus also am Ende
 * einer minutenlangen Analyse mit "Geschäftstyp ist erforderlich" ab – für
 * einen Modus, dessen ganzer Zweck es ist, keine Eingaben zu verlangen.
 *
 * Diese Funktion setzt deshalb Standardwerte, sagt aber ausdrücklich, welche.
 * Die Oberfläche zeigt das an: Geraten und geraten-und-verschwiegen sind zwei
 * verschiedene Dinge, und der Betreiber muss wissen, was er da veröffentlicht.
 *
 * Rein und ohne Seiteneffekte, damit es ohne Netz und ohne React prüfbar ist.
 */
import {
  FALLBACK_TEMPLATE,
  type ConfiguratorDraft,
  type ContactInfo,
  type ContentData,
  type DesignConfig,
  type BusinessInfo,
} from "./suggestedConfig";

/**
 * Derselbe Wert, auf den client/lib/normalizeConfig.ts fällt, wenn kein Typ
 * gesetzt ist. Bewusst gleichgezogen: Sonst veröffentlicht der automatische
 * Modus mit einem Typ, den der Renderer anschließend anders auslegt.
 */
export const FALLBACK_BUSINESS_TYPE = "restaurant";

/** Mindestlänge des Betriebsnamens, wie validatePublishData sie prüft. */
export const MIN_BUSINESS_NAME_LENGTH = 2;

/** Die verschachtelte Form, die der Publish-Endpunkt erwartet. */
export interface PublishConfig {
  business: Partial<BusinessInfo>;
  design: Partial<DesignConfig>;
  content: Partial<ContentData>;
  contact: Partial<ContactInfo>;
}

export interface BuildPublishConfigResult {
  /** null, wenn ein Pflichtfeld fehlt, das sich nicht ersetzen lässt. */
  config: PublishConfig | null;
  /**
   * Felder, die nicht aus dem Scrape stammen, sondern aus einem Standardwert.
   * Für die Anzeige – der Nutzer soll sehen, was geraten wurde.
   */
  defaulted: string[];
  /** Warum sich nichts bauen ließ. Leer, wenn config gesetzt ist. */
  blocking: string[];
}

/**
 * Seiten müssen hier NICHT gesetzt werden.
 *
 * AppRenderer (client/components/dynamic/AppRenderer.tsx, "AUTO-DISCOVERY")
 * blendet Speisekarte, Galerie und Kontakt von selbst ein, sobald die
 * entsprechenden Daten vorliegen. Eine selectedPages-Liste mitzuschicken würde
 * daran nichts verbessern und wäre eine zweite Wahrheit über dieselbe Frage.
 */
export function buildPublishConfig(
  draft: ConfiguratorDraft | null | undefined,
): BuildPublishConfigResult {
  if (!draft) {
    return { config: null, defaulted: [], blocking: ["Kein Analyseergebnis"] };
  }

  const blocking: string[] = [];
  const defaulted: string[] = [];

  const name = draft.business.name?.trim() ?? "";
  if (name.length < MIN_BUSINESS_NAME_LENGTH) {
    // Nicht ersetzbar: Ein erfundener Betriebsname stünde anschließend auf
    // einer öffentlich erreichbaren Seite.
    blocking.push(
      "Der Name des Betriebs wurde nicht gefunden – ohne ihn lässt sich nichts veröffentlichen.",
    );
  }

  let type = draft.business.type?.trim() ?? "";
  if (!type) {
    type = FALLBACK_BUSINESS_TYPE;
    defaulted.push(`Geschäftstyp: „${FALLBACK_BUSINESS_TYPE}“ angenommen`);
  }

  let template = draft.design.template?.trim() ?? "";
  if (!template) {
    template = FALLBACK_TEMPLATE;
    defaulted.push(`Vorlage: „${FALLBACK_TEMPLATE}“ angenommen`);
  }

  if (blocking.length) return { config: null, defaulted, blocking };

  return {
    config: {
      // Der Entwurf wird durchgereicht, die drei Pflichtfelder überschrieben.
      // Reihenfolge ist wichtig: erst der Scrape, dann die Ersatzwerte.
      business: { ...draft.business, name, type },
      design: { ...draft.design, template },
      content: { ...draft.content },
      contact: { ...draft.contact },
    },
    defaulted,
    blocking: [],
  };
}

/**
 * Zählt die Bilder im Entwurf, die noch auf fremdem Hosting liegen.
 *
 * Der Scrape sammelt Galeriebilder als URLs der analysierten Website ein und
 * reicht sie unverändert weiter (siehe die Warnung in mapGallery). Wird so
 * veröffentlicht, hängt die ausgelieferte Web-App an fremdem Hosting: Die
 * Bilder verschwinden, sobald die Quelle sie umbenennt, und jeder Aufruf
 * meldet dem fremden Server, wer die Seite besucht.
 *
 * Deshalb wird die Zahl in der Oberfläche genannt, statt sie zu verschweigen.
 */
export function countExternalImages(
  draft: ConfiguratorDraft | null | undefined,
  ownHostPatterns: string[] = ["supabase.co", "maitr.de"],
): number {
  const gallery = draft?.content?.gallery ?? [];
  return gallery.filter((image) => {
    const url = image?.url ?? "";
    if (!/^https?:\/\//i.test(url)) return false;
    return !ownHostPatterns.some((host) => url.includes(host));
  }).length;
}
