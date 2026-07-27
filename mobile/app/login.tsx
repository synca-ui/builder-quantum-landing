import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { GoogleMark } from "../src/components/icons";
import { Card } from "../src/components/ui/Card";
import { Eyebrow } from "../src/components/ui/Eyebrow";
import { PillButton } from "../src/components/ui/PillButton";
import { Screen } from "../src/components/ui/Screen";
import { Text } from "../src/components/ui/Text";
import { useStore } from "../src/lib/store";
import { useTheme } from "../src/theme";

/**
 * Screen 01 · Login.
 *
 * Demo-Anmeldung: jeder Weg (Google, Apple, E-Mail) meldet denselben Betrieb an und
 * springt zum Start. Die echte Anbindung (Clerk Expo vs. Supabase Auth) ersetzt später
 * nur `signIn()` - Layout und Fluss bleiben.
 */
export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signIn } = useStore();
  const [email, setEmail] = useState("");

  const enter = () => {
    signIn();
    router.replace("/start");
  };

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
          label="Weiter mit Google"
          variant="outline"
          icon={<GoogleMark size={16} />}
          onPress={enter}
        />
        <PillButton label="Weiter mit Apple" variant="outline" onPress={enter} />

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
          onSubmitEditing={enter}
          style={[
            theme.text.body,
            styles.field,
            { borderColor: theme.colors.border, color: theme.colors.textPrimary, fontSize: 15 },
          ]}
        />

        <PillButton label="Weiter" onPress={enter} />

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

      <Eyebrow style={styles.footnote}>Geschützt durch Clerk · Magic Link & MFA</Eyebrow>
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
