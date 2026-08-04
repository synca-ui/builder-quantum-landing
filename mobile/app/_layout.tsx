import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { OpeningAnimation } from "../src/components/OpeningAnimation";
import { AppearanceProvider, useAppearance } from "../src/lib/appearance";
import { getClerkTokenCache, hasRealAuth, requireClerk } from "../src/lib/auth";
import { bootstrapCore } from "../src/lib/bootstrap";
import { env } from "../src/lib/env";
import { AppStateProvider, useStore } from "../src/lib/store";
import { ToastProvider } from "../src/lib/toast";
import { BRAND_FONT_ENABLED, ThemeProvider, fontAssets, useTheme } from "../src/theme";

// Der Splash bleibt stehen, bis die Schriften geladen sind - sonst blitzt ein
// Frame in der Systemschrift auf und das Layout springt.
SplashScreen.preventAutoHideAsync().catch(() => {});

// @maitr/core einmalig konfigurieren, bevor irgendein Screen eine API-Funktion ruft.
bootstrapCore();

export default function RootLayout() {
  // Bei ausgeschalteter Markenschrift laden wir PP Frama gar nicht erst - die App
  // nutzt dann die lizenzfreie System-Grotesk (siehe `BRAND_FONT_ENABLED`).
  const [fontsLoaded, fontError] = useFonts(BRAND_FONT_ENABLED ? fontAssets : {});
  const brandFontActive = fontsLoaded && BRAND_FONT_ENABLED;

  useEffect(() => {
    // Auch bei Font-Fehler weitermachen: die Typografie fällt dann auf System zurück,
    // aber die App startet.
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SafeAreaProvider>
          <AppStateProvider>
            <AppearanceProvider>
              <ThemedApp fontsLoaded={brandFontActive} />
            </AppearanceProvider>
          </AppStateProvider>
        </SafeAreaProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Hängt Clerk nur dann in den Baum, wenn ein Schlüssel konfiguriert ist.
 *
 * Ohne Schlüssel bleibt der Baum unverändert und die App läuft im Demomodus weiter -
 * der Umschalter ist ein Rückfall, kein Fehlerfall. Der Zugriff läuft bewusst über
 * `lib/auth.ts`: dort wird das Clerk-Paket erst beim ersten Bedarf geladen, damit
 * seine nativen Abhängigkeiten im Demobetrieb gar nicht erst angefasst werden.
 *
 * Kein Hook in dieser Komponente, deshalb ist der frühe Rücksprung unbedenklich -
 * und `hasRealAuth()` liefert ohnehin über die gesamte Laufzeit dieselbe Antwort.
 */
function AuthProvider({ children }: { children: ReactNode }) {
  if (!hasRealAuth()) return <>{children}</>;

  const { ClerkProvider } = requireClerk();
  return (
    // Der Tokenspeicher legt die Sitzung in expo-secure-store ab, sonst wäre man
    // nach jedem Neustart der App abgemeldet.
    <ClerkProvider publishableKey={env.clerkPublishableKey} tokenCache={getClerkTokenCache()}>
      {children}
    </ClerkProvider>
  );
}

/** Getrennt, damit `useAppearance()` innerhalb seines Providers liegt. */
function ThemedApp({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { forcedScheme, accessibleMode } = useAppearance();

  return (
    <ThemeProvider fontsLoaded={fontsLoaded} forceScheme={forcedScheme} accessible={accessibleMode}>
      {/* Toast liegt im Theme, damit die Blase die Palette kennt. */}
      <ToastProvider>
        <ThemedNavigator />
      </ToastProvider>
    </ThemeProvider>
  );
}

function ThemedNavigator() {
  const theme = useTheme();
  const { hydrated } = useStore();
  // Die Eröffnungsanimation liegt über allem und läuft einmal pro Kaltstart. In den
  // ~2 s, die sie sichtbar ist, wird die Hydration ohnehin fertig - blendet sie aus,
  // steht der eigentliche Screen bereits dahinter.
  const [introDone, setIntroDone] = useState(false);

  return (
    <>
      <StatusBar style={theme.scheme === "dark" ? "light" : "dark"} />
      {/* Bis der gespeicherte Zustand geladen ist, nichts routen - sonst blitzt der
          Login auf, bevor die persistierte Session greift. */}
      {hydrated ? (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.canvas },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
          <Stack.Screen name="login" options={{ animation: "fade" }} />
          <Stack.Screen name="aufgabe/[id]" options={{ presentation: "modal" }} />
          <Stack.Screen name="beitrag/[id]" options={{ presentation: "modal" }} />
          <Stack.Screen name="profil" options={{ presentation: "modal" }} />
          <Stack.Screen name="speisekarte" options={{ presentation: "modal" }} />
        </Stack>
      ) : (
        <View style={{ flex: 1, backgroundColor: theme.colors.canvas }} />
      )}

      {!introDone ? <OpeningAnimation onDone={() => setIntroDone(true)} /> : null}
    </>
  );
}

export const unstable_settings = {
  initialRouteName: "(tabs)",
};
