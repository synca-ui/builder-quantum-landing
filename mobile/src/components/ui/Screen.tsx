import { useEffect, useState, type ReactNode } from "react";
import { InteractionManager, ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../theme";
import { AnimatedBackground } from "./AnimatedBackground";

type Surface = "canvas" | "quiet" | "deep";

export interface ScreenProps {
  children: ReactNode;
  /** Welcher Hintergrundton - im Design je Screen unterschiedlich. */
  surface?: Surface;
  /** Screens mit Tabbar brauchen unten Luft, damit die Pille nichts verdeckt. */
  withTabBar?: boolean;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  /**
   * Animierter Wellen-Hintergrund. Standard: nur auf `deep` (Login, Journey, Onboarding),
   * wo das Design ohnehin Verlaufsstimmung hatte. `"subtle"` läuft „ganz leicht" für
   * ruhigere Screens (Verbinden, Profil, Kennzahlen). Dashboard-Kernscreens bleiben still.
   */
  animated?: boolean | "subtle";
}

/**
 * Gemeinsames Screen-Gerüst: Hintergrundton, Safe-Area und Screen-Innenrand.
 * Ersetzt den 390x844-Rahmen aus dem Design-Dokument.
 */
export function Screen({
  children,
  surface = "canvas",
  withTabBar = false,
  scroll = true,
  contentStyle,
  animated,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const background = {
    canvas: theme.colors.canvas,
    quiet: theme.colors.canvasQuiet,
    deep: theme.colors.canvasDeep,
  }[surface];

  const showWaves = animated === undefined ? surface === "deep" : animated !== false;
  const cloudOpacity = animated === "subtle" ? 0.5 : 1;
  // „subtle" läuft statisch (kein Animations-Loop): spart auf den vielen Unterseiten
  // die teure, dauerhafte animierte SVG-Neuzeichnung. Die immersiven Screens (deep:
  // Login/Journey/Onboarding) driften weiter.
  const staticWaves = animated === "subtle";

  // Den SVG-Hintergrund erst NACH der Navigations-Transition einhängen, sonst ruckelt
  // das Mounten mitten im Slide und die Unterseite „fühlt sich langsam an". Die
  // Grundfarbe liegt schon am Container, es blitzt also nichts.
  const [bgReady, setBgReady] = useState(false);
  useEffect(() => {
    if (!showWaves) return;
    const task = InteractionManager.runAfterInteractions(() => setBgReady(true));
    return () => task.cancel();
  }, [showWaves]);

  const padding: ViewStyle = {
    paddingHorizontal: theme.spacing.screen,
    paddingTop: insets.top + theme.spacing.sm,
    paddingBottom:
      insets.bottom + (withTabBar ? theme.spacing.tabBarClearance : theme.spacing.xl),
  };

  const body = scroll ? (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[padding, contentStyle]}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      // Ohne diese beiden ist jedes Formular halb unbedienbar, und zwar auf zwei
      // Arten zugleich: Die Tastatur schiebt sich über das Feld, in das gerade
      // getippt wird (am Login über das Passwortfeld), und ein Tipp auf den Knopf
      // darunter schließt nur die Tastatur, statt den Knopf auszulösen - der
      // erste Tipp geht immer verloren.
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, padding, contentStyle]}>{children}</View>
  );

  // Ohne Wellen: der Hintergrund ist einfach die Fläche. Mit Wellen liegt das SVG
  // darunter, der Inhalt transparent darüber.
  if (!showWaves) {
    return <View style={[styles.fill, { backgroundColor: background }]}>{body}</View>;
  }

  return (
    // Grundfarbe sofort am Container → kein Weißblitz, während der Hintergrund wartet.
    <View style={[styles.fill, { backgroundColor: background }]}>
      {/* Erst nach der Transition; „subtle" + Barrierefrei-Modus stellen die Bewegung still. */}
      {bgReady ? (
        <AnimatedBackground
          baseColor={background}
          reduceMotion={theme.accessible || staticWaves || undefined}
          cloudOpacity={cloudOpacity}
        />
      ) : null}
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
