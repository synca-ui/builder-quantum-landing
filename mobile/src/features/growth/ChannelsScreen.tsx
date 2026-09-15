import { useRouter } from "expo-router";
import { View } from "react-native";

import { Avatar, StatusLabel } from "../../components/ui/Avatar";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { ListCard, ListRow } from "../../components/ui/ListCard";
import { NavHeader } from "../../components/ui/NavHeader";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import { CHANNELS } from "./channels";
import { kanalStatus, kanalStatusText, kanalZaehlung, kanalZweck } from "./kanaele";

/**
 * Screen 11 · Deine Kanäle.
 *
 * Jede Zeile führt auf die Verbinden-/Verwalten-Seite des Kanals. Verbindungsstatus
 * liegt im Store und ist mit der Journey (Screen 23) geteilt.
 *
 * Für den echten Betrieb (Integrationsprüfung 15.09., Punkt 2) zählt „x von y“
 * nur Kanäle mit Connector (Google, Instagram/Facebook über Meta); Yelp und
 * TheFork stehen als „Nicht verfügbar“ da statt mit einem Verbinden, das nichts
 * verbinden kann. Demo und Showcase zeigen den Vorführzustand wie bisher.
 */
export function ChannelsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { channels, hasRealVenue, showcase } = useStore();

  const echterBetrieb = hasRealVenue && !showcase;
  const zaehlung = kanalZaehlung(channels, echterBetrieb);

  return (
    <Screen withTabBar contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader fallback="/konto" />

      <View>
        <Text variant="screenTitle" accessibilityRole="header" style={{ fontSize: 33, lineHeight: 36 }}>
          Deine Kanäle
        </Text>
        <Text variant="body" tone="secondary" style={{ marginTop: 6 }}>
          {echterBetrieb
            ? "Verbundene Kanäle liest Maitr mit. Veröffentlicht wird nichts."
            : "Ein Ort, Maitr hält alles andere synchron."}
        </Text>
      </View>

      <Eyebrow>
        {zaehlung.verbunden} von {zaehlung.gesamt} verbunden
      </Eyebrow>

      <ListCard>
        {CHANNELS.map((channel) => {
          const status = kanalStatus(channel.id, channels, echterBetrieb);
          return (
            <ListRow
              key={channel.id}
              title={channel.name}
              meta={kanalZweck(channel, echterBetrieb)}
              leading={<Avatar initials={channel.initials} color={channel.color} />}
              onPress={() => router.push({ pathname: "/kanal/[id]", params: { id: channel.id } })}
              trailing={
                status === "verbunden" ? (
                  <StatusLabel label={kanalStatusText(status)} color={theme.colors.success} />
                ) : (
                  <Text
                    variant="numeric"
                    tone={status === "verbinden" ? "accent" : "faint"}
                    style={{ fontSize: 14 }}
                  >
                    {kanalStatusText(status)}
                  </Text>
                )
              }
            />
          );
        })}
      </ListCard>

      {/* „Wunsch gesendet" hat keinen Versandweg - für den echten Betrieb wäre es eine
          Erfolgsmeldung ohne Mechanik. Im Demo bleibt es Teil der Vorführung. */}
      {!echterBetrieb ? (
        <Eyebrow tone="faint" style={{ textAlign: "center", marginTop: theme.spacing.sm }}>
          Plattform fehlt?{" "}
          <Eyebrow
            tone="accent"
            style={{ textDecorationLine: "underline" }}
            onPress={() => toast.show("Wunsch gesendet — danke!")}
          >
            Wunsch senden
          </Eyebrow>
        </Eyebrow>
      ) : null}
    </Screen>
  );
}
