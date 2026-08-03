import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheckIcon } from "../components/icons";
import { Text } from "../components/ui/Text";
import { useTheme } from "../theme";

/**
 * Kurze Bestätigung nach einer Aktion („Freigegeben", „Reserviert").
 *
 * Das Design zeigt Feedback nicht explizit, aber ohne Rückmeldung wirkt jeder
 * Tap folgenlos. Ein dezenter, automatisch verschwindender Hinweis am unteren Rand
 * schließt die Lücke, ohne den ruhigen Look zu stören.
 */
interface ToastValue {
  show: (message: string) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (next: string) => {
      setMessage(next);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(
          ({ finished }) => finished && setMessage(null),
        );
      }, 1900);
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
      {message ? <ToastBubble message={message} opacity={opacity} /> : null}
    </ToastContext.Provider>
  );
}

function ToastBubble({ message, opacity }: { message: string; opacity: Animated.Value }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

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
          { backgroundColor: theme.colors.inkAction },
          theme.elevation.floating,
        ]}
      >
        <CheckIcon size={16} color={theme.colors.onInkAction} strokeWidth={2.4} />
        <Text variant="action" color={theme.colors.onInkAction} numberOfLines={1} style={{ fontSize: 15 }}>
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
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
});
