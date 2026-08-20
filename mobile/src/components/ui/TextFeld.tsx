import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import type { KeyboardTypeOptions, TextInputProps } from "react-native";

import { EyeIcon, EyeOffIcon } from "../icons";
import { Eyebrow } from "./Eyebrow";
import { Text } from "./Text";
import { useTheme } from "../../theme";

/**
 * Beschriftetes Textfeld.
 *
 * Stand vorher in `features/loyalty/Formularteile.tsx` mit dem Vermerk, es werde
 * erst dann ein Grundelement, wenn ein zweiter Bereich es benutzt. Genau das ist
 * mit dem Login eingetreten - dort brauchen E-Mail-Adresse und Passwort dasselbe
 * Feld. `Formularteile` re-exportiert von hier weiter, damit die
 * Stempelkarten-Screens unverändert bleiben.
 *
 * Die Tastatur-Eigenschaften und `geheim` sind neu und alle optional: Ohne sie
 * verhält sich das Feld exakt wie zuvor.
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
  geheim = false,
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
  /** Passwortfeld: Zeichen verdeckt, mit Schalter zum kurzen Aufdecken. */
  geheim?: boolean;
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

  // Verdeckt starten. Wer sein Passwort im Café eintippt, will es nicht
  // standardmäßig offen auf dem Bildschirm haben - aufdecken ist eine bewusste
  // Entscheidung, verbergen darf keine sein.
  const [sichtbar, setSichtbar] = useState(false);
  const verdeckt = geheim && !sichtbar;
  const Augensymbol = sichtbar ? EyeOffIcon : EyeIcon;

  return (
    <View style={{ gap: 6 }}>
      <Eyebrow>{label}</Eyebrow>
      <View style={{ justifyContent: "center" }}>
        <TextInput
          value={wert}
          onChangeText={onChange}
          editable={editable}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textFaint}
          maxLength={maxLength}
          multiline={mehrzeilig}
          accessibilityLabel={label}
          secureTextEntry={verdeckt}
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
              // Platz für den Augenschalter, sonst läuft der Text darunter durch.
              paddingRight: geheim ? 48 : 14,
              paddingVertical: 12,
              minHeight: mehrzeilig ? 76 : theme.hitSize.minTouch,
              opacity: editable ? 1 : 0.5,
              textAlignVertical: mehrzeilig ? "top" : "center",
            },
          ]}
        />
        {geheim ? (
          <Pressable
            onPress={() => setSichtbar((v) => !v)}
            disabled={!editable}
            accessibilityRole="button"
            accessibilityLabel={sichtbar ? "Passwort verbergen" : "Passwort anzeigen"}
            // Die Fläche ist absichtlich größer als das Symbol: 18px trifft
            // niemand zuverlässig mit dem Daumen.
            hitSlop={10}
            style={{
              position: "absolute",
              right: 4,
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: editable ? 1 : 0.5,
            }}
          >
            <Augensymbol size={19} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {rest !== null || hinweis ? (
        <Text variant="bodySm" tone="muted" style={{ fontSize: 12.5 }}>
          {hinweis ? `${hinweis}${rest !== null ? " · " : ""}` : ""}
          {rest !== null ? `noch ${rest} Zeichen` : ""}
        </Text>
      ) : null}
    </View>
  );
}
