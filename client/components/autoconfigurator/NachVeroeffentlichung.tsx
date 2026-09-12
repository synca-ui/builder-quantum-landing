/**
 * Was nach dem automatischen Veröffentlichen zu tun bleibt: alles anpassen.
 *
 * ANLASS: Der automatische Modus endete mit "Herzlichen Glückwunsch" und einem
 * QR-Code. Wer danach die Vorlage wechseln, ein Gericht ändern oder ein Foto
 * tauschen wollte, fand dafür genau einen unauffälligen Textlink ("Inhalte noch
 * anpassen"), der im ersten Schritt des Konfigurators landete - von dort aus
 * musste man sich durch alle Schritte klicken, um zur Vorlage zu kommen, die
 * ganz vorn liegt.
 *
 * Diese Ansicht führt stattdessen direkt in den jeweiligen Schritt. Sie baut
 * die Schritte NICHT nach: Jede Kachel springt in die vorhandene Oberfläche des
 * manuellen Konfigurators, mit dem Zustand, der gerade online ist
 * (`applyPublishedConfig`). Ein Nachbau wäre eine zweite Wahrheit über
 * dieselben Felder.
 */
import { memo } from "react";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  LayoutTemplate,
  Palette,
  Phone,
  Search,
  Sparkles,
  Store,
  Tags,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import { schrittIndex } from "@/lib/configuratorSteps";

interface Bereich {
  /** Kennung des Schritts in client/lib/configuratorSteps.ts. */
  schritt: string;
  titel: string;
  beschreibung: string;
  icon: LucideIcon;
}

/**
 * Die Reihenfolge ist nicht die des Konfigurators, sondern die der Nachfragen:
 * Zuerst kommt, was am Aussehen der fertigen Seite am meisten ändert. Die
 * Vorlage steht ausdrücklich vorn - sie ist der Wunsch, mit dem die meisten
 * zurückkommen.
 */
const BEREICHE: Bereich[] = [
  {
    schritt: "template",
    titel: "Vorlage",
    beschreibung: "Anderes Grundlayout wählen — Minimalistisch, Modern, Riviera oder Verde.",
    icon: LayoutTemplate,
  },
  {
    schritt: "design-customization",
    titel: "Farben & Schrift",
    beschreibung: "Markenfarben, Schriftart und Kopfzeile feinjustieren.",
    icon: Palette,
  },
  {
    schritt: "menu-products",
    titel: "Speisekarte",
    beschreibung: "Gerichte, Preise, Kategorien und Aushängeschilder bearbeiten.",
    icon: Utensils,
  },
  {
    schritt: "media-gallery",
    titel: "Bilder & Logo",
    beschreibung: "Fotos austauschen, eigene hochladen, Logo ersetzen.",
    icon: ImageIcon,
  },
  {
    schritt: "opening-hours",
    titel: "Öffnungszeiten",
    beschreibung: "Zeiten je Wochentag ändern, Ruhetage festlegen.",
    icon: CalendarDays,
  },
  {
    schritt: "business-info",
    titel: "Betrieb & Texte",
    beschreibung: "Name, Slogan, Beschreibung und Standort.",
    icon: Store,
  },
  {
    schritt: "contact-social",
    titel: "Kontakt & soziale Netze",
    beschreibung: "Telefon, E-Mail, Instagram und Facebook.",
    icon: Phone,
  },
  {
    schritt: "reservations",
    titel: "Reservierung",
    beschreibung: "Tischbuchung ein- oder ausschalten, Zeitfenster festlegen.",
    icon: CalendarClock,
  },
  {
    schritt: "page-structure",
    titel: "Seiten",
    beschreibung: "Welche Unterseiten die Web-App zeigt.",
    icon: Tags,
  },
  {
    schritt: "advanced-features",
    titel: "Angebote & Funktionen",
    beschreibung: "Angebotsbanner, Team-Bereich und weitere Bausteine.",
    icon: Sparkles,
  },
  {
    schritt: "domain-hosting",
    titel: "Adresse",
    beschreibung: "Unter welcher Adresse die Web-App erreichbar ist.",
    icon: Globe,
  },
  {
    schritt: "seo-optimization",
    titel: "Suchmaschinen",
    beschreibung: "Titel und Beschreibung für Google und geteilte Links.",
    icon: Search,
  },
];

export interface NachVeroeffentlichungProps {
  /** Die Adresse, unter der die Web-App erreichbar ist. */
  publishedUrl: string;
  /**
   * Wird mit dem Schritt-INDEX aufgerufen (nicht der Kennung): Der Aufrufer
   * setzt damit `setCurrentStep` und wechselt in den Konfigurator.
   */
  onBereichOeffnen: (schrittIndex: number) => void;
  /** Überschrift; im Erfolgsfall anders als beim späteren Wiederkommen. */
  titel?: string;
  einleitung?: string;
}

function NachVeroeffentlichungInner({
  publishedUrl,
  onBereichOeffnen,
  titel = "Alles anpassen",
  einleitung = "Deine Web-App ist online. Such dir aus, was du ändern möchtest — du landest direkt an der richtigen Stelle.",
}: NachVeroeffentlichungProps) {
  return (
    <section
      aria-labelledby="nach-veroeffentlichung-titel"
      className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h2
          id="nach-veroeffentlichung-titel"
          className="text-lg font-bold text-gray-900"
        >
          {titel}
        </h2>
        <a
          href={publishedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-700 hover:text-purple-900 underline underline-offset-2"
        >
          Zur Web-App
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
      <p className="text-sm text-gray-500 mb-5">{einleitung}</p>

      {/* auto-fit statt fester Spaltenzahl: Die Ansicht steht auch in der
          schmalen Erfolgsspalte und im Telefonrahmen der Vorschau, wo die
          md:-Haltepunkte nicht greifen. */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
      >
        {BEREICHE.map((bereich) => {
          const Icon = bereich.icon;
          return (
            <button
              key={bereich.schritt}
              type="button"
              onClick={() => onBereichOeffnen(schrittIndex(bereich.schritt))}
              className="group text-left flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 transition-colors"
            >
              <span className="shrink-0 p-2 rounded-lg bg-gray-50 group-hover:bg-white transition-colors">
                <Icon className="w-4 h-4 text-purple-600" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 font-semibold text-sm text-gray-900">
                  {bereich.titel}
                  <ArrowRight
                    className="w-3.5 h-3.5 text-gray-300 group-hover:text-purple-500 transition-colors"
                    aria-hidden="true"
                  />
                </span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  {bereich.beschreibung}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/*
        Der wichtigste Satz der ganzen Ansicht: Der Konfigurator speichert
        Änderungen sofort im Entwurf, die ausgelieferte Seite ändert sich davon
        aber NICHT. Ohne diesen Hinweis ändert jemand die Vorlage, schaut auf
        seiner Adresse nach und sieht die alte Seite.
      */}
      <p className="mt-5 text-xs text-gray-500 leading-relaxed">
        Änderungen werden erst live, wenn du im Konfigurator oben rechts erneut
        auf <span className="font-medium text-gray-700">Veröffentlichen</span>{" "}
        tippst. Deine Adresse bleibt dabei dieselbe.
      </p>
    </section>
  );
}

export const NachVeroeffentlichung = memo(NachVeroeffentlichungInner);
export { BEREICHE as NACHBEARBEITUNG_BEREICHE };
