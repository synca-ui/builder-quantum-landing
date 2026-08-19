import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
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
  //
  // Ziel ist "/" und NICHT "/start": Dort steht die einzige Weiche der App, und
  // sie entscheidet, ob dieses Konto schon einen Betrieb hat. Wer direkt nach
  // "/start" springt, umgeht sie - und genau daran hing der Fehler, den das
  // Onboarding beheben sollte: Ein frisch angemeldeter Wirt landete trotz allem
  // in den Beispieldaten eines fremden Betriebs, weil die Anmeldung an der
  // Weiche vorbeiführte.
  useEffect(() => {
    if (signedIn) router.replace("/");
  }, [signedIn, router]);

  return hasRealAuth() ? <ClerkLogin /> : <DemoLogin />;
}

/** Ohne Clerk-Schlüssel: jeder Weg meldet den Demobetrieb an, es fließt kein Token. */
function DemoLogin() {
  const router = useRouter();
  const { signIn } = useStore();

  const enter = () => {
    signIn();
    // Über die Weiche, nicht daran vorbei - siehe die Begründung oben. Im
    // Demobetrieb gilt der Demo-Betrieb als vorhanden, sie schickt also direkt
    // nach "/start"; das Onboarding poppt hier bewusst nicht auf.
    router.replace("/");
  };

  return (
    <LoginForm
      onGoogle={enter}
      onApple={enter}
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
      // Und weiter über die Weiche: Ob dieses Konto schon einen Betrieb hat,
      // weiß hier niemand - `GET /venues` läuft erst danach an. Ein Sprung nach
      // "/start" nähme die Antwort vorweg, und für jeden neuen Wirt wäre sie
      // falsch.
      router.replace("/");
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
      busy={busy !== null}
      footnote="Geschützt durch Clerk · OAuth & MFA"
    />
  );
}

interface LoginFormProps {
  onGoogle: () => void;
  onApple: () => void;
  busy?: boolean;
  footnote: string;
}

/** Reine Darstellung - identisch in beiden Betriebsarten, damit das Layout nicht driftet. */
function LoginForm({ onGoogle, onApple, busy = false, footnote }: LoginFormProps) {
  const theme = useTheme();

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

        {/* KEIN E-Mail-Feld und kein „Weiter" mehr.
            Beides stand hier, obwohl der E-Mail-Weg nie gebaut wurde: Der Knopf
            zeigte nur einen kurzen Hinweis und meldete niemanden an. Im
            Simulator gemessen sah das aus wie eine kaputte App - man tippt eine
            Adresse ein, drückt einen farbigen Primärknopf, und nichts geschieht.
            Ein Feld mit einem Knopf darunter IST ein Versprechen; eines, das
            der Code nicht einlöst, gehört entfernt und nicht beschriftet.
            Bei Google und Apple ist die erste Anmeldung ohnehin zugleich die
            Registrierung, der Weg ist also vollständig - nur schmaler. */}

        {/* Kein eigener „Konto erstellen"-Weg mehr.
            Vorher führte er in eine siebenteilige Einrichtung, die nichts
            speicherte und am Ende `signIn()` OHNE Clerk-Sitzung rief: Der Nutzer
            war danach lokal „angemeldet", hatte kein Konto, keinen Betrieb, und
            jeder Aufruf endete 401 - eine Sackgasse, aus der nur das Löschen der
            App herausführte.
            Bei Google und Apple ist die erste Anmeldung ohnehin die Registrierung;
            ein zweiter Knopf daneben würde eine Unterscheidung behaupten, die es
            nicht gibt. Wer neu ist, meldet sich oben an und wird von der Weiche
            in `app/index.tsx` ins Onboarding geschickt. */}
        <Text variant="bodySm" tone="secondary" style={styles.signupLine}>
          Neu hier? Melde dich einfach oben an - dein Konto entsteht dabei.
        </Text>
      </Card>

      {/* `secondary` statt des Vorgabetons: Diese Zeile liegt auf dem
          animierten Verlauf, nicht auf der Karte darüber - dort war sie im
          Simulator kaum zu lesen. Siehe die Begründung an `textMuted`. */}
      <Eyebrow tone="secondary" style={styles.footnote}>{footnote}</Eyebrow>
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
  signupLine: { textAlign: "center", fontSize: 14 },
  footnote: { marginTop: 22, textAlign: "center", letterSpacing: 0.53 },
});
