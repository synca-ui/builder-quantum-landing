import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

/**
 * Icon-Set aus dem Design-Dokument, 1:1 als SVG-Pfade übernommen.
 * Alle Icons sind 24x24-Outline mit `strokeWidth` 1.4-1.5 und erben ihre Farbe.
 */
export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const defaults = { size: 22, strokeWidth: 1.5 };

/** Start / Präsenz - konzentrische Kreise. */
export function TargetIcon({ size = defaults.size, color = "currentColor", strokeWidth = 1.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/** Tische - Tisch von oben. */
export function TableIcon({ size = defaults.size, color = "currentColor", strokeWidth = 1.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="5" width="16" height="14" rx="3" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="4" y1="11" x2="20" y2="11" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="12" y1="5" x2="12" y2="11" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/** Beitraege - Karte mit Textzeilen. */
export function PostIcon({ size = defaults.size, color = "currentColor", strokeWidth = 1.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="4" width="16" height="16" rx="4" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="8" y1="9.5" x2="16" y2="9.5" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="8" y1="14.5" x2="13" y2="14.5" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/** Wachstum - Raute in Raute. */
export function GrowthIcon({ size = defaults.size, color = "currentColor", strokeWidth = 1.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l9 9-9 9-9-9z" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M12 8.5l3.5 3.5-3.5 3.5-3.5-3.5z" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/** Konto - Person. */
export function AccountIcon({ size = defaults.size, color = "currentColor", strokeWidth = 1.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="9" r="3.6" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M5.5 20c0-3.6 3-5.6 6.5-5.6s6.5 2 6.5 5.6" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/** Mond - schaltet den Nachtbar-Modus. */
export function MoonIcon({ size = 18, color = "currentColor", strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 14.5A8 8 0 019.5 4 7 7 0 1020 14.5z" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/** Google-Bewertungen - drei überlappende Kreise. */
export function ReviewIcon({ size = 17, color = "currentColor", strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="8" cy="9" r="4.4" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="16" cy="9" r="4.4" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="12" cy="15.5" r="4.4" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/**
 * Google-Marke: vier Quadrate im 2x2-Raster, wie im Login-Screen.
 * Feste Markenfarben - die dürfen sich nicht mit dem Theme ändern.
 */
/**
 * Googles Bildmarke - das vierfarbige „G".
 *
 * ANLASS: Hier standen vier Quadrate in einem 2x2-Raster, eingefärbt mit
 * Googles Farben. Das ist die Form der Bildmarke von MICROSOFT, nicht von
 * Google. Sie saß am Knopf „Weiter mit Google" und an zwei Stellen des
 * Onboardings - im Simulator fiel es sofort auf.
 *
 * Warum das mehr ist als ein Schönheitsfehler: Google gibt die Gestaltung
 * dieses Knopfes verbindlich vor, und die Einhaltung wird bei der
 * OAuth-Verifizierung geprüft - also bei genau dem Antrag, der für die
 * Business-Profile-Freigabe ohnehin auf dem kritischen Pfad liegt. Zwei fremde
 * Bildmarken zu vermischen wäre auch für sich genommen nichts, was man
 * einreicht.
 *
 * Die vier Pfade sind die offizielle Marke in ihrem 48er-Raster; sie darf für
 * genau diesen Zweck verwendet werden. NICHT umfärben, nicht verzerren, nicht
 * in eine eigene Form setzen - dieselben Richtlinien verbieten das.
 */
export function GoogleMark({ size = 16 }: Pick<IconProps, "size">) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <Path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <Path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <Path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </Svg>
  );
}

/** Stern - Bewertungen und Journey-Liste. */
/**
 * Apple-Wortzeichen für den Anmeldeknopf.
 *
 * Anders als die übrigen Icons eine gefüllte Fläche statt einer Outline - so gibt
 * Apple die Marke vor, und ein nachgezeichneter Umriss wäre eine Abwandlung, die
 * die Richtlinien für „Sign in with Apple" nicht zulassen. Die Farbe erbt es
 * trotzdem, damit der Knopf in beiden Themes stimmt.
 */
export function AppleMark({ size = 16, color = "currentColor" }: Pick<IconProps, "size" | "color">) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      />
    </Svg>
  );
}

export function StarIcon({ size = 14, color = "currentColor", strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Häkchen - Erledigt-Zustände, Bestätigungen, Journey-Listen. */
export function CheckIcon({ size = 18, color = "currentColor", strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.5l4 4L19 6.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Uhr - leerer Tag, Servicezeiten. */
export function ClockIcon({ size = 30, color = "currentColor", strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M12 7.5V12l3 2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Plus - Foto hinzufügen, Tischzahl erhöhen. */
export function PlusIcon({ size = 22, color = "currentColor", strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="6" x2="12" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="6" y1="12" x2="18" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Kreispfeile - "neu vorschlagen". */
export function RefreshIcon({ size = 15, color = "currentColor", strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4v6h6M20 20v-6h-6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M20 10a8 8 0 00-14-4M4 14a8 8 0 0014 4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Kartennadel - Route zum Betrieb. */
export function PinIcon({ size = 22, color = "currentColor", strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21s-7-5.2-7-11a7 7 0 0114 0c0 5.8-7 11-7 11z" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="12" cy="10" r="2.5" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/** Kalender - Speisekarte, Termin, Öffnungszeiten. */
export function CalendarIcon({ size = 22, color = "currentColor", strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 3v3M18 3v3M4 8h16M5 6h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
}

/** Auge - Profilaufrufe / Reichweite (Start-Kennzahl). */
export function EyeIcon({ size = 18, color = "currentColor", strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/** Glocke - Posteingang. */
export function BellIcon({ size = 18, color = "currentColor", strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10 20a2 2 0 004 0"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
