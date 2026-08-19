import type { ReactNode } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { PillButton } from "../../components/ui/PillButton";
import { StepDots } from "../../components/ui/Progress";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useTheme } from "../../theme";

export interface AblaufRahmenProps {
  /** 1-basierter Schritt; `undefined` blendet die Fortschrittsleiste aus (Abschluss). */
  step?: number;
  /**
   * Gesamtzahl der Schritte für die Fortschrittsleiste.
   *
   * Pflicht, sobald `step` gesetzt ist - hier stand einmal ein Vorgabewert von 7
   * für eine Einrichtung, die es nicht mehr gibt. Ein Vorgabewert für eine
   * Schrittzahl ist ohnehin die falsche Bequemlichkeit: Er stimmt genau so lange,
   * wie niemand einen Schritt hinzufügt, und meldet danach still "5 / 4".
   */
  totalSteps?: number;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  primaryAction: { label: string; onPress: () => void; disabled?: boolean };
  /** Zweite Aktion als Textlink darunter. */
  secondaryAction?: { label: string; onPress: () => void };
  /** Kleingedrucktes statt Sekundäraktion, z. B. "Jederzeit widerrufbar". */
  footnote?: string;
  surface?: "canvas" | "deep";
}

/**
 * Gemeinsames Gerüst der vier Einrichtungsschritte und ihres Abschlusses.
 *
 * Alle Schritte teilen denselben Aufbau: Fortschritt oben, Titelblock, Inhalt,
 * Aktionen unten am Rand. Nur der Inhalt und die Schrittzahl wechseln - deshalb liegt
 * der Rest hier (Grundsatz "erweitern, nicht duplizieren" statt eines zweiten,
 * fast identischen Gerüsts für den neuen Ablauf).
 *
 * Anders als im Design-Dokument zeigt keiner der beiden Flows eine Tabbar: Während
 * der Einrichtung gibt es noch nichts zu wechseln, und eine nicht bedienbare Leiste
 * führt in die Irre.
 */
export function AblaufRahmen({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  primaryAction,
  secondaryAction,
  footnote,
  surface = "canvas",
}: AblaufRahmenProps) {
  const theme = useTheme();
  const router = useRouter();

  // Zurück gibt es ab Schritt 2 (und immer, wenn es einen Verlauf gibt). Der
  // Abschluss-Screen (kein `step`) bleibt ohne Rückweg - dort geht es nur nach vorn.
  const canGoBack = step !== undefined && router.canGoBack();

  return (
    <Screen surface={surface} contentStyle={{ gap: 18, minHeight: "100%" }}>
      {canGoBack ? <NavHeader /> : null}
      {step ? <StepDots current={step} total={totalSteps ?? 1} /> : null}

      {title ? (
        <View style={{ marginTop: theme.spacing.sm }}>
          <Text
            variant="screenTitle"
            accessibilityRole="header"
            style={{ fontSize: 32, lineHeight: 34 }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" tone="secondary" style={{ lineHeight: 22.4, marginTop: 10 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}

      {children}

      <View style={{ marginTop: "auto", paddingTop: theme.spacing.xl, gap: 10 }}>
        <PillButton
          label={primaryAction.label}
          onPress={primaryAction.onPress}
          disabled={primaryAction.disabled}
        />

        {secondaryAction ? (
          <Text
            variant="bodySm"
            style={{ fontSize: 15, textAlign: "center", textDecorationLine: "underline" }}
            onPress={secondaryAction.onPress}
            accessibilityRole="button"
          >
            {secondaryAction.label}
          </Text>
        ) : null}

        {footnote ? (
          // Auf `deep` steht die Zeile direkt auf dem animierten Verlauf statt auf
          // einer Karte. Der Vorgabeton `muted` ist für weisse Flaechen abgewogen
          // (siehe die Begruendung an `textMuted` in theme/colors.ts) und
          // verschwindet dort fast - im Simulator war die Zeile kaum zu lesen.
          <Eyebrow
            tone={surface === "deep" ? "secondary" : "muted"}
            style={{ textAlign: "center" }}
          >
            {footnote}
          </Eyebrow>
        ) : null}
      </View>
    </Screen>
  );
}
