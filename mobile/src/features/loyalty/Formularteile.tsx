import { View } from "react-native";

import { Chip } from "../../components/ui/Chip";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { Text } from "../../components/ui/Text";
import { useTheme } from "../../theme";

/**
 * Formularteile für die Stempelkarte.
 *
 * Bewusst HIER und nicht in `components/ui/`: es gibt im Repo keinen
 * Formular-Baustein - `DeleteAccountScreen` legt die Theme-Stile von Hand über ein
 * nacktes `TextInput`. Diese Datei tut dasselbe, nur an einer Stelle statt an sechs,
 * und komponiert im Übrigen nur vorhandene Bausteine (`Chip`, `Text`, `Eyebrow`).
 * Ein neues Grundelement wäre das erst, wenn es ein zweiter Bereich benutzte.
 */

/**
 * `TextFeld` wohnt seit dem Login in `components/ui/` - siehe den Vermerk oben:
 * ein zweiter Bereich benutzt es jetzt. Hier nur noch weitergereicht, damit die
 * Stempelkarten-Screens ihren Import behalten.
 */
export { TextFeld } from "../../components/ui/TextFeld";

/**
 * Auswahl aus wenigen festen Werten statt eines freien Zahlenfeldes.
 *
 * Der Grund steht an `SPERRFRIST_OPTIONEN`: 36000 statt 3600 getippt sperrt zehn
 * Stunden, und niemand sieht es dem Feld an. Dasselbe gilt für die Stempelzahl -
 * eine Karte mit 37 Feldern hat noch niemand gedruckt.
 */
export function AuswahlZeile<T>({
  label,
  optionen,
  wert,
  onChange,
  editable = true,
  hinweis,
}: {
  label: string;
  optionen: { wert: T; label: string }[];
  wert: T;
  onChange: (wert: T) => void;
  editable?: boolean;
  hinweis?: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: 8 }}>
      <Eyebrow>{label}</Eyebrow>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {optionen.map((option) => (
          <Chip
            key={String(option.wert)}
            label={option.label}
            selected={option.wert === wert}
            onPress={editable ? () => onChange(option.wert) : undefined}
            style={{ opacity: editable ? 1 : 0.5, paddingHorizontal: 16, paddingVertical: 10 }}
          />
        ))}
      </View>
      {hinweis ? (
        <Text variant="bodySm" tone="muted" style={{ fontSize: 12.5 }}>
          {hinweis}
        </Text>
      ) : null}
    </View>
  );
}

/** Platzhalterblock während des ersten Ladens - kein Spinner über dem ganzen Screen. */
export function Skelett({ hoehe = 84 }: { hoehe?: number }) {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        height: hoehe,
        borderRadius: theme.radius.card,
        backgroundColor: theme.colors.surfaceSunken,
      }}
    />
  );
}
