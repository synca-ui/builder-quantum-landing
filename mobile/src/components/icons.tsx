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
export function GoogleMark({ size = 16 }: Pick<IconProps, "size">) {
  const tile = size / 2 - 1;
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Rect x="0" y="0" width={tile} height={tile} rx="1" fill="#EA4335" />
      <Rect x={tile + 2} y="0" width={tile} height={tile} rx="1" fill="#4285F4" />
      <Rect x="0" y={tile + 2} width={tile} height={tile} rx="1" fill="#FBBC05" />
      <Rect x={tile + 2} y={tile + 2} width={tile} height={tile} rx="1" fill="#34A853" />
    </Svg>
  );
}

/** Stern - Bewertungen und Journey-Liste. */
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
