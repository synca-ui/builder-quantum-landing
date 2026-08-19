import { View } from "react-native";
import { useRouter } from "expo-router";

import { DarkPanel, onDarkPanel } from "../../components/ui/DataDisplay";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useTheme } from "../../theme";

interface Msg {
  from: "guest" | "maitr" | "system";
  text: string;
  time?: string;
}

/** Der Verlauf, den Maitr ohne Zutun geführt hat - der digitale Gastgeber. */
const THREAD: Msg[] = [
  { from: "guest", text: "Hallo! Habt ihr Donnerstag um 19 Uhr einen Tisch für 2?", time: "18:32" },
  { from: "maitr", text: "Hallo 👋 Donnerstag 19:00 für 2 passt gut. Soll ich den Tisch für dich reservieren?", time: "18:32" },
  { from: "guest", text: "Ja, gerne 🙏 Habt ihr auch was Veganes?", time: "18:33" },
  { from: "maitr", text: "Klar — Zimtschnecken gibt's auch vegan, und der Hafer-Flat-White ist beliebt. Reserviert für Do 19:00. Bis dann im Café Goldstück!", time: "18:33" },
  { from: "system", text: "Reservierung angelegt · M. Weber im Gäste-CRM ergänzt." },
];

/**
 * WhatsApp-Concierge - ein 24/7-Gastgeber im Kanal, den Gäste ohnehin nutzen.
 * Beantwortet Öffnungszeiten/Allergene aus Speisekarte + Profil, bucht den Tisch,
 * legt den Gast im Graphen an. Tötet Telefon-Pingpong und Personalengpass an der Kasse.
 */
export function ConciergeScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Screen animated="subtle" contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title="WhatsApp-Concierge" fallback="/inbox" />

      <DarkPanel style={{ gap: 4 }}>
        <Eyebrow color={onDarkPanel.accent}>Automatisch erledigt · vor 20 Min</Eyebrow>
        <Text variant="bodySm" color={onDarkPanel.title} style={{ fontSize: 15 }}>
          Tisch für M. Weber gebucht
        </Text>
        <Text variant="bodySm" color={onDarkPanel.body} style={{ fontSize: 13 }}>
          Anfrage über WhatsApp — ohne dein Zutun beantwortet und reserviert.
        </Text>
      </DarkPanel>

      <View style={{ gap: 10 }}>
        {THREAD.map((m, i) => (
          <Bubble key={i} msg={m} />
        ))}
      </View>

      <Eyebrow tone="faint" style={{ textAlign: "center" }}>
        Maitr antwortet rund um die Uhr — aus Öffnungszeiten &amp; Speisekarte.
      </Eyebrow>
    </Screen>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const theme = useTheme();

  if (msg.from === "system") {
    return (
      <Eyebrow tone="faint" style={{ textAlign: "center", marginVertical: 2, fontSize: 10 }}>
        {msg.text}
      </Eyebrow>
    );
  }

  const mine = msg.from === "maitr";
  return (
    <View style={{ alignItems: mine ? "flex-end" : "flex-start" }}>
      <View
        style={{
          maxWidth: "82%",
          backgroundColor: mine ? theme.colors.primary : theme.colors.surface,
          borderRadius: 18,
          borderBottomRightRadius: mine ? 4 : 18,
          borderBottomLeftRadius: mine ? 18 : 4,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderWidth: mine ? 0 : 1,
          borderColor: theme.colors.border,
        }}
      >
        <Text
          variant="bodySm"
          color={mine ? theme.colors.onPrimary : theme.colors.textPrimary}
          style={{ fontSize: 14.5, lineHeight: 20 }}
        >
          {msg.text}
        </Text>
      </View>
      {msg.time ? (
        <Eyebrow tone="faint" style={{ fontSize: 9, marginTop: 3, marginHorizontal: 4 }}>
          {msg.time}
        </Eyebrow>
      ) : null}
    </View>
  );
}
