import { useRouter } from "expo-router";
import { View } from "react-native";

import { Avatar, StatusLabel } from "../../components/ui/Avatar";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { ListCard, ListRow } from "../../components/ui/ListCard";
import { NavHeader } from "../../components/ui/NavHeader";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useT } from "../../lib/i18n";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import { CHANNELS } from "./channels";

/**
 * Screen 11 · Deine Kanäle.
 *
 * Jede Zeile führt auf die Verbinden-/Verwalten-Seite des Kanals. Verbindungsstatus
 * liegt im Store und ist mit der Journey (Screen 23) geteilt.
 */
export function ChannelsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const { channels } = useStore();

  const connectedCount = CHANNELS.filter((c) => channels[c.id]).length;

  return (
    <Screen withTabBar contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader fallback="/konto" />

      <View>
        <Text variant="screenTitle" accessibilityRole="header" style={{ fontSize: 33, lineHeight: 36 }}>
          {t({ de: "Deine Kanäle", en: "Your channels" })}
        </Text>
        <Text variant="body" tone="secondary" style={{ marginTop: 6 }}>
          {t({ de: "Ein Ort, Maitr hält alles andere synchron.", en: "One place — Maitr keeps everything else in sync." })}
        </Text>
      </View>

      <Eyebrow>
        {t({
          de: `${connectedCount} von ${CHANNELS.length} verbunden`,
          en: `${connectedCount} of ${CHANNELS.length} connected`,
        })}
      </Eyebrow>

      <ListCard>
        {CHANNELS.map((channel) => {
          const connected = channels[channel.id];
          return (
            <ListRow
              key={channel.id}
              title={channel.name}
              meta={channel.purpose}
              leading={<Avatar initials={channel.initials} color={channel.color} />}
              onPress={() => router.push({ pathname: "/kanal/[id]", params: { id: channel.id } })}
              trailing={
                connected ? (
                  <StatusLabel label={t({ de: "Verbunden", en: "Connected" })} color={theme.colors.success} />
                ) : (
                  <Text variant="numeric" tone="accent" style={{ fontSize: 14 }}>
                    {t({ de: "Verbinden ›", en: "Connect ›" })}
                  </Text>
                )
              }
            />
          );
        })}
      </ListCard>

      <Eyebrow tone="faint" style={{ textAlign: "center", marginTop: theme.spacing.sm }}>
        {t({ de: "Plattform fehlt?", en: "Missing a platform?" })}{" "}
        <Eyebrow
          tone="accent"
          style={{ textDecorationLine: "underline" }}
          onPress={() => toast.show(t({ de: "Wunsch gesendet — danke!", en: "Request sent — thanks!" }))}
        >
          {t({ de: "Wunsch senden", en: "Send a request" })}
        </Eyebrow>
      </Eyebrow>
    </Screen>
  );
}
