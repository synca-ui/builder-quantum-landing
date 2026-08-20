import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AlertIcon, CheckIcon } from "../components/icons";
import { Text } from "../components/ui/Text";
import { useTheme } from "../theme";

/**
 * Kurze Bestätigung nach einer Aktion („Freigegeben", „Reserviert").
 *
 * Das Design zeigt Feedback nicht explizit, aber ohne Rückmeldung wirkt jeder
 * Tap folgenlos. Ein dezenter, automatisch verschwindender Hinweis am unteren Rand
 * schließt die Lücke, ohne den ruhigen Look zu stören.
 *
 * Zwei Tonlagen, weil eine nicht reicht: Bis dahin bekam JEDE Meldung dieselbe
 * dunkle Blase mit einem Häkchen - auch „Anmeldung fehlgeschlagen". Am Gerät
 * gemessen las sich das wie eine Bestätigung, denn das Symbol nimmt man vor dem
 * Text wahr. Fehler tragen jetzt die `destructive`-Farbe, ein Warnzeichen und
 * stehen länger, weil man sie lesen muss statt nur zur Kenntnis zu nehmen.
 */
export type ToastTon = "info" | "fehler";

interface ToastValue {
  /** `tone` weglassen heißt „info" - alle bestehenden Aufrufe bleiben unverändert. */
  show: (message: string, tone?: ToastTon) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

/** Bestätigungen dürfen weghuschen; Fehlermeldungen muss man lesen können. */
const STANDZEIT: Record<ToastTon, number> = { info: 1900, fehler: 4200 };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [inhalt, setInhalt] = useState<{ message: string; ton: ToastTon } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (next: string, ton: ToastTon = "info") => {
      setInhalt({ message: next, ton });
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(
          ({ finished }) => finished && setInhalt(null),
        );
      }, STANDZEIT[ton]);
    },
    [opacity],
  );

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {inhalt ? (
        <ToastBubble message={inhalt.message} ton={inhalt.ton} opacity={opacity} />
      ) : null}
    </ToastContext.Provider>
  );
}

function ToastBubble({
  message,
  ton,
  opacity,
}: {
  message: string;
  ton: ToastTon;
  opacity: Animated.Value;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const fehler = ton === "fehler";
  const hintergrund = fehler ? theme.colors.destructive : theme.colors.inkAction;
  // Beide Flächen sind dunkel genug für Weiß; `onInkAction` ist im Dunkelmodus
  // aber schwarz, und auf Rot wäre das unlesbar.
  const schrift = fehler ? "#FFFFFF" : theme.colors.onInkAction;
  const Symbol = fehler ? AlertIcon : CheckIcon;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { bottom: insets.bottom + 92, opacity, transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
      ]}
    >
      <Animated.View
        style={[
          styles.bubble,
          // Runde Pille für kurze Bestätigungen, ruhigere Kante für längere
          // Fehlertexte - eine 999er-Rundung sieht bei zwei Zeilen falsch aus.
          fehler && styles.bubbleFehler,
          { backgroundColor: hintergrund },
          theme.elevation.floating,
        ]}
      >
        <Symbol size={16} color={schrift} strokeWidth={2.4} />
        <Text
          variant="action"
          color={schrift}
          // Fehler brauchen Platz: Sätze wie „Für diese Adresse gibt es bereits
          // ein Konto." wurden einzeilig mitten im Wort abgeschnitten.
          numberOfLines={fehler ? 3 : 1}
          style={[{ fontSize: 15 }, fehler && styles.textFehler]}
        >
          {message}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

export function useToast(): ToastValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast muss innerhalb von <ToastProvider> stehen.");
  return value;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    // Ohne Rand lief die Blase am Gerät bis an beide Bildschirmkanten - genau der
    // Eindruck von „viel zu groß", den lange Meldungen erzeugten.
    paddingHorizontal: 20,
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  bubbleFehler: {
    borderRadius: 18,
    alignItems: "flex-start",
    paddingVertical: 13,
  },
  textFehler: {
    flexShrink: 1,
    // Zeilenhöhe explizit: Bei mehrzeiligem Text klebten die Zeilen sonst
    // aneinander, weil `variant="action"` auf eine Zeile ausgelegt ist.
    lineHeight: 20,
  },
});
