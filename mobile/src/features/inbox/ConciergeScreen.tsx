import { View } from "react-native";
import { useRouter } from "expo-router";

import { DarkPanel, onDarkPanel } from "../../components/ui/DataDisplay";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useT, type Localized } from "../../lib/i18n";
import { useTheme } from "../../theme";

interface Msg {
  from: "guest" | "maitr" | "system";
  text: Localized;
  time?: string;
}

/** Der Verlauf, den Maitr ohne Zutun geführt hat - der digitale Gastgeber. */
const THREAD: Msg[] = [
  {
    from: "guest",
    text: {
      de: "Hallo! Habt ihr Donnerstag um 19 Uhr einen Tisch für 2?",
      en: "Hi! Do you have a table for 2 on Thursday at 7 PM?",
    },
    time: "18:32",
  },
  {
    from: "maitr",
    text: {
      de: "Hallo 👋 Donnerstag 19:00 für 2 passt gut. Soll ich den Tisch für dich reservieren?",
      en: "Hi 👋 Thursday 7:00 PM for 2 works well. Shall I reserve the table for you?",
    },
    time: "18:32",
  },
  {
    from: "guest",
    text: { de: "Ja, gerne 🙏 Habt ihr auch was Veganes?", en: "Yes, please 🙏 Do you have anything vegan?" },
    time: "18:33",
  },
  {
    from: "maitr",
    text: {
      de: "Klar — Zimtschnecken gibt's auch vegan, und der Hafer-Flat-White ist beliebt. Reserviert für Do 19:00. Bis dann im Café Goldstück!",
      en: "Sure — the cinnamon rolls are vegan too, and the oat flat white is popular. Booked for Thu 7:00 PM. See you at Café Goldstück!",
    },
    time: "18:33",
  },
  {
    from: "system",
    text: {
      de: "Reservierung angelegt · M. Weber im Gäste-CRM ergänzt.",
      en: "Reservation created · M. Weber added to the guest CRM.",
    },
  },
];

/**
 * WhatsApp-Concierge - ein 24/7-Gastgeber im Kanal, den Gäste ohnehin nutzen.
 * Beantwortet Öffnungszeiten/Allergene aus Speisekarte + Profil, bucht den Tisch,
 * legt den Gast im Graphen an. Tötet Telefon-Pingpong und Personalengpass an der Kasse.
 */
export function ConciergeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();

  return (
    <Screen animated="subtle" contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title="WhatsApp-Concierge" onBack={() => router.back()} />

      <DarkPanel style={{ gap: 4 }}>
        <Eyebrow color={onDarkPanel.accent}>
          {t({ de: "Automatisch erledigt · vor 20 Min", en: "Handled automatically · 20 min ago" })}
        </Eyebrow>
        <Text variant="bodySm" color={onDarkPanel.title} style={{ fontSize: 15 }}>
          {t({ de: "Tisch für M. Weber gebucht", en: "Table booked for M. Weber" })}
        </Text>
        <Text variant="bodySm" color={onDarkPanel.body} style={{ fontSize: 13 }}>
          {t({
            de: "Anfrage über WhatsApp — ohne dein Zutun beantwortet und reserviert.",
            en: "Request via WhatsApp — answered and reserved without your involvement.",
          })}
        </Text>
      </DarkPanel>

      <View style={{ gap: 10 }}>
        {THREAD.map((m, i) => (
          <Bubble key={i} msg={m} />
        ))}
      </View>

      <Eyebrow tone="faint" style={{ textAlign: "center" }}>
        {t({
          de: "Maitr antwortet rund um die Uhr — aus Öffnungszeiten & Speisekarte.",
          en: "Maitr replies around the clock — from opening hours & menu.",
        })}
      </Eyebrow>
    </Screen>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const theme = useTheme();
  const t = useT();

  if (msg.from === "system") {
    return (
      <Eyebrow tone="faint" style={{ textAlign: "center", marginVertical: 2, fontSize: 10 }}>
        {t(msg.text)}
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
          {t(msg.text)}
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
