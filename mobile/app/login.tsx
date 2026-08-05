import { useEffect, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { GoogleMark } from "../src/components/icons";
import { Card } from "../src/components/ui/Card";
import { Eyebrow } from "../src/components/ui/Eyebrow";
import { PillButton } from "../src/components/ui/PillButton";
import { Screen } from "../src/components/ui/Screen";
import { Text } from "../src/components/ui/Text";
import { hasRealAuth, requireClerk } from "../src/lib/auth";
import { useStore } from "../src/lib/store";
import { useToast } from "../src/lib/toast";
import { useTheme } from "../src/theme";

/**
 * Screen 01 · Login.
 *
 * Zwei Wege, eine Oberfläche:
 * - Mit `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` läuft der echte Clerk-OAuth-Flow. Das
 *   Session-Token geht danach als Bearer an die API.
 * - Ohne Schlüssel bleibt die Demo-Anmeldung. Das ist der gewollte Rückfall: ohne
 *   Konfiguration muss die App trotzdem starten und bedienbar sein.
 *
 * Die Entscheidung fällt einmal und bleibt für die Prozesslaufzeit gleich (der
 * Schlüssel steht zur Bauzeit fest), deshalb ist die Verzweigung auf zwei Komponenten
 * hier hook-sicher.
 */
export default function LoginScreen() {
  const router = useRouter();
  const { signedIn } = useStore();

  // Wer hier steht und trotzdem angemeldet IST, muss weitergeschickt werden.
  //
  // Die Weiche in app/index.tsx ist ein <Redirect> und entscheidet deshalb nur
  // EINMAL, beim Mounten. Meldet sich Clerk später — die Sitzungslage kommt über
  // ein Abo, und der Store hat dafür eine Notbremse von vier Sekunden —, dann
  // steht signedIn auf true, aber niemand navigiert mehr: Der Nutzer bliebe mit
  // gültiger Sitzung auf dem Login und tippte „Weiter mit Google" gegen eine
  // bereits offene Sitzung. Genau die Sackgasse, die das Zusammenführen von
  // lokalem Zustand und Clerk-Sitzung beseitigen sollte.
  //
  // Deshalb hier reaktiv statt einmalig. Im Demobetrieb ist das folgenlos: Dort
  // setzt erst der Knopf signedIn, und der navigiert ohnehin selbst.
  useEffect(() => {
    if (signedIn) router.replace("/start");
  }, [signedIn, router]);

  return hasRealAuth() ? <ClerkLogin /> : <DemoLogin />;
}

/** Ohne Clerk-Schlüssel: jeder Weg meldet den Demobetrieb an, es fließt kein Token. */
function DemoLogin() {
  const router = useRouter();
  const { signIn } = useStore();

  const enter = () => {
    signIn();
    router.replace("/start");
  };

  return (
    <LoginForm
      onGoogle={enter}
      onApple={enter}
      onEmail={enter}
      footnote="Demomodus · Anmeldung noch nicht verbunden"
    />
  );
}

type SsoStrategy = "oauth_google" | "oauth_apple";

/** Mit Clerk-Schlüssel: echter OAuth-Flow im System-Browser. */
function ClerkLogin() {
  const router = useRouter();
  const toast = useToast();
  const { signIn } = useStore();
  // Das Modul liegt garantiert vor - `hasRealAuth()` hat es geladen, sonst stünden
  // wir in `DemoLogin`.
  const { startSSOFlow } = requireClerk().useSSO();
  const [busy, setBusy] = useState<SsoStrategy | null>(null);

  const start = async (strategy: SsoStrategy) => {
    if (busy) return;
    setBusy(strategy);
    try {
      // Ohne `redirectUrl` nimmt Clerk selbst `makeRedirectUri({ path: "sso-callback" })`
      // und trifft damit das App-Schema (`maitr://`) aus app.json.
      const { createdSessionId, setActive } = await startSSOFlow({ strategy });

      if (!createdSessionId) {
        // Kein Fehler, sondern der Normalfall bei Abbruch im Browser - oder Clerk
        // verlangt einen weiteren Schritt (MFA), den dieser Screen noch nicht führt.
        toast.show("Anmeldung abgebrochen.");
        return;
      }

      await setActive?.({ session: createdSessionId });
      // Der lokale Zustand steuert die Navigation der App; Clerk hält daneben die
      // Sitzung, aus der `mobileAuthAdapter.getToken()` das Bearer-Token zieht.
      signIn();
      router.replace("/start");
    } catch (error) {
      console.warn("[login] SSO fehlgeschlagen", error);
      toast.show("Anmeldung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <LoginForm
      onGoogle={() => void start("oauth_google")}
      onApple={() => void start("oauth_apple")}
      // Ein E-Mail-Weg ist noch nicht gebaut. Lieber ehrlich vertrösten, als
      // jemanden scheinbar anzumelden, dessen Aufrufe die API dann mit 401 abweist.
      onEmail={() => toast.show("E-Mail-Anmeldung folgt - bitte Google oder Apple nutzen.")}
      busy={busy !== null}
      footnote="Geschützt durch Clerk · OAuth & MFA"
    />
  );
}

interface LoginFormProps {
  onGoogle: () => void;
  onApple: () => void;
  onEmail: () => void;
  busy?: boolean;
  footnote: string;
}

/** Reine Darstellung - identisch in beiden Betriebsarten, damit das Layout nicht driftet. */
function LoginForm({ onGoogle, onApple, onEmail, busy = false, footnote }: LoginFormProps) {
  const theme = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState("");

  return (
    <Screen surface="deep" scroll={false} contentStyle={styles.container}>
      <View style={{ marginTop: 120 }}>
        <Text variant="heroTitle" accessibilityRole="header">
          Schön, dass du wieder da bist
          <Text variant="heroTitle" color={theme.colors.accent}>
            .
          </Text>
        </Text>
        <Text variant="body" tone="secondary" style={{ fontSize: 17, marginTop: 14 }}>
          Anmelden, deine Aufgaben warten schon.
        </Text>
      </View>

      <Card emphasis="strong" padding={0} style={styles.card}>
        <PillButton
          label={busy ? "Anmeldung läuft …" : "Weiter mit Google"}
          variant="outline"
          icon={<GoogleMark size={16} />}
          disabled={busy}
          onPress={onGoogle}
        />
        <PillButton
          label="Weiter mit Apple"
          variant="outline"
          disabled={busy}
          onPress={onApple}
        />

        <View style={styles.divider}>
          <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />
          <Eyebrow tone="faint" style={{ letterSpacing: 0.53 }}>
            oder
          </Eyebrow>
          <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />
        </View>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="sofia@cafe-goldstueck.de"
          placeholderTextColor={theme.colors.textFaint}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="E-Mail-Adresse"
          onSubmitEditing={onEmail}
          style={[
            theme.text.body,
            styles.field,
            { borderColor: theme.colors.border, color: theme.colors.textPrimary, fontSize: 15 },
          ]}
        />

        <PillButton label="Weiter" disabled={busy} onPress={onEmail} />

        <Text variant="bodySm" tone="secondary" style={styles.signupLine}>
          Neu hier?{" "}
          <Text
            variant="bodySm"
            tone="accent"
            style={{ textDecorationLine: "underline" }}
            onPress={() => router.push("/journey/willkommen")}
          >
            Konto erstellen
          </Text>
        </Text>
      </Card>

      <Eyebrow style={styles.footnote}>{footnote}</Eyebrow>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 26 },
  card: {
    marginTop: 34,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 22,
    gap: 14,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 2,
  },
  rule: { flex: 1, height: 1 },
  field: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 15,
    paddingHorizontal: 18,
    minHeight: 52,
  },
  signupLine: { textAlign: "center", fontSize: 14 },
  footnote: { marginTop: 22, textAlign: "center", letterSpacing: 0.53 },
});
