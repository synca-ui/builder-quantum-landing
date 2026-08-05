import { Platform, type TextStyle } from "react-native";

/**
 * Typografie aus dem Design-System.
 *
 * Markenschrift (Hybrid): Bricolage Grotesque (SIL OFL) mit echten optischen Größen für
 * alle AUFRECHTEN Rollen - Überschriften „Display" (opsz 36), Fließtext „Text" (opsz 14).
 * Bricolage hat keine eigene Kursive, daher nutzen die KURSIVEN Rollen Familjen Grotesk
 * Italic (echte Kursive), damit die Signatur-Schrägstellung („Café Goldstück", Zitate)
 * erhalten bleibt. Fehlen die Dateien oder ist die Markenschrift abgeschaltet, fällt alles
 * auf die Systemschrift zurück - Größen, Zeilenhöhen und Laufweiten unten gelten unverändert
 * weiter. (Komplett zurück zu Familjen: alle vier Namen unten auf
 * `FamiljenGrotesk-Regular`/`-Italic` setzen und den Schnitt in `fonts.ts` registrieren.)
 */

/**
 * Namen der Markenschnitte, wie sie in `fonts.ts` unter `fontAssets` registriert sind.
 * Die Zeichenketten müssen dort zeichengleich als Schlüssel auftauchen - sonst zeigt
 * `fontFamily` auf eine Schrift, die nie geladen wurde, und React Native ignoriert das
 * still. `resolveFont` fängt den Fall zusätzlich ab.
 */
export const fontFamily = {
  display: "BricolageGrotesque-Display",
  displayItalic: "FamiljenGrotesk-Italic",
  text: "BricolageGrotesque-Text",
  textItalic: "FamiljenGrotesk-Italic",
} as const;

const systemFallback = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: "System",
})!;

/**
 * Löst einen Font-Namen auf. Ohne geladene Dateien liefert sie die Systemschrift,
 * damit `fontFamily` nie auf eine fehlende Ressource zeigt.
 *
 * Der leere Name wird bewusst mit abgefangen, nicht nur `loaded`: ein leerer
 * `fontFamily`-Wert ist für React Native kein gültiger Schriftname. Aktuell sind alle vier
 * Namen gesetzt, aber der Zweig bleibt als Sicherheitsgurt stehen - müsste eine Schrift
 * kurzfristig wieder entfernt werden (wie zuletzt bei PP Frama aus Lizenzgründen), genügt
 * es, den Namen zu leeren; die App rendert dann in der Systemschrift weiter statt auf eine
 * nicht vorhandene Schrift zu zeigen.
 */
export function resolveFont(name: string, loaded: boolean): string {
  return loaded && name ? name : systemFallback;
}

/**
 * Text-Rollen. `letterSpacing` ist in RN absolut (pt), nicht relativ (em) -
 * die em-Werte aus dem Design sind hier bereits umgerechnet.
 */
export function createTextStyles(loaded: boolean) {
  const display = resolveFont(fontFamily.display, loaded);
  const displayItalic = resolveFont(fontFamily.displayItalic, loaded);
  const text = resolveFont(fontFamily.text, loaded);
  const textItalic = resolveFont(fontFamily.textItalic, loaded);

  return {
    /** Login/Journey-Übertitel: 40-42px, -.03em. */
    heroTitle: {
      fontFamily: display,
      fontSize: 40,
      lineHeight: 42,
      letterSpacing: -1.2,
    } satisfies TextStyle,

    /** "Guten Morgen, Café Goldstück" - 29px, -.03em. */
    screenTitle: {
      fontFamily: display,
      fontSize: 29,
      lineHeight: 30,
      letterSpacing: -0.9,
    } satisfies TextStyle,

    /** Sektionsüberschrift, 21px. */
    sectionTitle: {
      fontFamily: display,
      fontSize: 21,
      lineHeight: 25,
      letterSpacing: -0.2,
    } satisfies TextStyle,

    /** Kartentitel, 19px. */
    cardTitle: {
      fontFamily: display,
      fontSize: 19,
      lineHeight: 23,
      letterSpacing: -0.2,
    } satisfies TextStyle,

    /** Kompakter Kartentitel, 18px. */
    cardTitleSm: {
      fontFamily: display,
      fontSize: 18,
      lineHeight: 22,
      letterSpacing: -0.2,
    } satisfies TextStyle,

    /** Großbuchstaben-Zeile über Karten: 10.5px, .06em, uppercase. */
    eyebrow: {
      fontFamily: display,
      fontSize: 10.5,
      lineHeight: 14,
      letterSpacing: 0.63,
      textTransform: "uppercase",
    } satisfies TextStyle,

    /** Etwas größere Variante für Datumszeilen: 11px, .07em. */
    eyebrowLg: {
      fontFamily: display,
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 0.77,
      textTransform: "uppercase",
    } satisfies TextStyle,

    /** Fließtext, 15.5-16px. */
    body: {
      fontFamily: text,
      fontSize: 16,
      lineHeight: 22,
    } satisfies TextStyle,

    bodySm: {
      fontFamily: text,
      fontSize: 14.5,
      lineHeight: 21,
    } satisfies TextStyle,

    /** Zitierte KI-Entwürfe stehen kursiv. */
    quote: {
      fontFamily: textItalic,
      fontStyle: "italic",
      fontSize: 14.5,
      lineHeight: 21,
    } satisfies TextStyle,

    /** Betriebsnamen im Fließtext stehen kursiv (ss01/salt im Original). */
    emphasis: {
      fontFamily: displayItalic,
      fontStyle: "italic",
    } satisfies TextStyle,

    /** Beschriftung auf Buttons und Pills. */
    action: {
      fontFamily: text,
      fontSize: 16,
      lineHeight: 20,
    } satisfies TextStyle,

    /** Zahlenwerte in Statistik-Kacheln. */
    numeric: {
      fontFamily: display,
      fontSize: 16,
      lineHeight: 20,
    } satisfies TextStyle,
  };
}

export type TextStyles = ReturnType<typeof createTextStyles>;
