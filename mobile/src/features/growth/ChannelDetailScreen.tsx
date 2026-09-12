import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { ApiError, api } from "@maitr/core";
import type { ProviderId } from "@maitr/core/integrations";

import { CheckIcon } from "../../components/icons";
import { Avatar, StatusLabel } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { ListCard, ListRow } from "../../components/ui/ListCard";
import { NavHeader } from "../../components/ui/NavHeader";
import { PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import { findChannel } from "./channels";

type Phase = "idle" | "connecting" | "disconnecting" | "done";

/**
 * Welche Server-Verbindung hinter einem Kanal der Oberfläche steht. Yelp & Co.
 * haben keine - dort bleibt Trennen ein reiner Store-Vorgang.
 */
function serverProvider(channelId: string): ProviderId | null {
  if (channelId === "google") return "google";
  if (channelId === "instagram") return "meta";
  return null;
}

/**
 * Verbinden- & Verwalten-Seite eines Kanals (aus Screen 11).
 *
 * Nicht verbunden: zeigt Konto und Berechtigungen, „Verbinden" simuliert den
 * OAuth-Fluss (Spinner → verbunden) und schreibt in den Store. Verbunden: zeigt Konto,
 * Sync-Status, Zugang zur Profilpflege (Google/Instagram) und Trennen.
 *
 * TRENNEN IST ECHT, sobald ein echter Betrieb dahintersteht: `DELETE
 * /integrations/:provider` widerruft die Freigabe bei Google/Meta und löscht die
 * Token serverseitig. Vorher löschte der Knopf nur den Zustand dieses Geräts, und
 * die Token blieben aktiv (AUFGABEN.md C6) - genau die Frage, die Google im
 * OAuth-Antrag stellt („Wie widerrufen Nutzer den Zugriff?"). Der Store wird in
 * jedem Fall bereinigt; der Server ist die Wahrheit, die Ansicht folgt ihr.
 */
export function ChannelDetailScreen({ channelId }: { channelId?: string }) {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { channels, channelMeta, connectChannelAs, disconnectChannel, venueId, hasRealVenue } =
    useStore();

  const channel = findChannel(channelId);
  const connected = Boolean(channels[channel.id]);
  const meta = channelMeta[channel.id];
  const [phase, setPhase] = useState<Phase>("idle");

  const disconnect = async () => {
    const provider = serverProvider(channel.id);
    if (hasRealVenue && provider) {
      setPhase("disconnecting");
      try {
        const ergebnis = await api.integrations.disconnect(venueId, provider);
        if (ergebnis.providerRevoked) {
          toast.show(`${channel.name} getrennt`);
        } else {
          // Bei uns ist die Verbindung weg; der Anbieter hat den Widerruf aber nicht
          // bestätigt (Token schon ungültig oder Anbieter nicht erreichbar).
          toast.show(
            `${channel.name} getrennt. Prüfe die Freigabe bitte auch in deinen ${channel.name}-Kontoeinstellungen.`,
            "info",
          );
        }
      } catch (err) {
        // 404 = serverseitig gab es nichts zu trennen; die Ansicht war voraus.
        // Alles andere ist ein echter Fehlschlag, und dann bleibt die Verbindung stehen -
        // sonst zeigte die App „getrennt", während die Token weiter aktiv sind.
        if (!(err instanceof ApiError && err.status === 404)) {
          setPhase("idle");
          toast.show("Trennen fehlgeschlagen. Bitte erneut versuchen.", "fehler");
          return;
        }
        toast.show(`${channel.name} getrennt`);
      }
    } else {
      toast.show(`${channel.name} getrennt`);
    }
    disconnectChannel(channel.id);
    setPhase("idle");
  };

  const connect = () => {
    setPhase("connecting");
    // OAuth-Simulation: kurzer Moment, dann verbunden.
    setTimeout(() => {
      connectChannelAs(channel.id, channel.suggestedAccount);
      setPhase("done");
      toast.show(`${channel.name} verbunden`);
    }, 1100);
  };

  return (
    <Screen animated="subtle" contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title={channel.name} fallback="/kanaele" />

      <Card emphasis="strong" padding={theme.spacing.xl} style={{ gap: 14, borderRadius: 22 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Avatar initials={channel.initials} size={48} color={channel.color} />
          <View style={{ flex: 1 }}>
            <Text variant="cardTitleSm" style={{ fontSize: 18 }}>
              {channel.name}
            </Text>
            {connected ? (
              <Eyebrow style={{ marginTop: 2 }}>{meta?.account ?? channel.suggestedAccount}</Eyebrow>
            ) : (
              <Eyebrow style={{ marginTop: 2 }}>{channel.purpose}</Eyebrow>
            )}
          </View>
          {connected ? <StatusLabel label="Verbunden" color={theme.colors.success} /> : null}
        </View>

        <View style={{ height: 1, backgroundColor: theme.colors.surfaceSunken }} />

        <Eyebrow>Maitr darf</Eyebrow>
        {channel.scopes.map((scope) => (
          <View key={scope} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <CheckIcon size={17} color={theme.colors.success} />
            <Text variant="bodySm" style={{ fontSize: 15, flex: 1 }}>
              {scope}
            </Text>
          </View>
        ))}
      </Card>

      {connected && meta ? (
        <ListCard>
          <ListRow title="Verbundenes Konto" meta={meta.account} value="" />
          <ListRow title="Synchronisation" meta={meta.since} value="" />
          {channel.managesProfile ? (
            <ListRow
              title={channel.managesProfile === "google" ? "Profil & Öffnungszeiten" : "Bio bearbeiten"}
              meta="Pflege Name, Bio, Zeiten"
              onPress={() =>
                router.push({ pathname: "/profil", params: { focus: channel.managesProfile! } })
              }
              trailing={
                <Text variant="numeric" tone="faint" style={{ fontSize: 22 }}>
                  ›
                </Text>
              }
            />
          ) : null}
        </ListCard>
      ) : null}

      <View style={{ marginTop: theme.spacing.sm, gap: theme.spacing.md }}>
        {connected ? (
          <PillButton
            label={phase === "disconnecting" ? "Wird getrennt …" : "Verbindung trennen"}
            variant="outline"
            disabled={phase === "disconnecting"}
            onPress={() => void disconnect()}
          />
        ) : phase === "connecting" ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              minHeight: theme.hitSize.control,
            }}
          >
            <ActivityIndicator color={theme.colors.primary} />
            <Text variant="action" tone="secondary">
              Verbinde mit {channel.name} …
            </Text>
          </View>
        ) : (
          <PillButton label={`Mit ${channel.name} verbinden`} onPress={connect} />
        )}

        {!connected ? (
          <Eyebrow tone="faint" style={{ textAlign: "center" }}>
            Jederzeit widerrufbar
          </Eyebrow>
        ) : null}
      </View>
    </Screen>
  );
}
