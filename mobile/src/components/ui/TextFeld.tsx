import { TextInput, View } from "react-native";
import type { KeyboardTypeOptions, TextInputProps } from "react-native";

import { Eyebrow } from "./Eyebrow";
import { Text } from "./Text";
import { useTheme } from "../../theme";

/**
 * Beschriftetes Textfeld.
 *
 * Stand vorher in `features/loyalty/Formularteile.tsx` mit dem Vermerk, es werde
 * erst dann ein Grundelement, wenn ein zweiter Bereich es benutzt. Genau das ist
 * mit dem Login eingetreten - dort brauchen E-Mail-Adresse und Einmalcode
 * dasselbe Feld. `Formularteile` re-exportiert von hier weiter, damit die
 * Stempelkarten-Screens unverändert bleiben.
 *
 * Die Tastatur-Eigenschaften sind neu und alle optional: Ohne sie verhält sich
 * das Feld exakt wie zuvor.
 */
export function TextFeld({
  label,
  wert,
  onChange,
  maxLength,
  hinweis,
  placeholder,
  editable = true,
  mehrzeilig = false,
  keyboardType,
  autoCapitalize,
  autoComplete,
  textContentType,
  autoFocus,
  onSubmit,
}: {
  label: string;
  wert: string;
  onChange: (wert: string) => void;
  maxLength?: number;
  hinweis?: string;
  placeholder?: string;
  editable?: boolean;
  mehrzeilig?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  /** `email` bzw. `one-time-code` - erst damit bietet iOS die Vorschläge an. */
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  autoFocus?: boolean;
  onSubmit?: () => void;
}) {
  const theme = useTheme();
  const rest = maxLength ? maxLength - wert.length : null;

  return (
    <View style={{ gap: 6 }}>
      <Eyebrow>{label}</Eyebrow>
      <TextInput
        value={wert}
        onChangeText={onChange}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textFaint}
        maxLength={maxLength}
        multiline={mehrzeilig}
        accessibilityLabel={label}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        textContentType={textContentType}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmit}
        returnKeyType={onSubmit ? "go" : undefined}
        style={[
          theme.text.body,
          {
            color: theme.colors.textPrimary,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.tile,
            paddingHorizontal: 14,
            paddingVertical: 12,
            minHeight: mehrzeilig ? 76 : theme.hitSize.minTouch,
            opacity: editable ? 1 : 0.5,
            textAlignVertical: mehrzeilig ? "top" : "center",
          },
        ]}
      />
      {rest !== null || hinweis ? (
        <Text variant="bodySm" tone="muted" style={{ fontSize: 12.5 }}>
          {hinweis ? `${hinweis}${rest !== null ? " · " : ""}` : ""}
          {rest !== null ? `noch ${rest} Zeichen` : ""}
        </Text>
      ) : null}
    </View>
  );
}
