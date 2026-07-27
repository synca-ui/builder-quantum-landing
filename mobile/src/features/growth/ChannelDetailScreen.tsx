import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";

import { CheckIcon } from "../../components/icons";
import { Avatar, StatusLabel } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { ListCard, ListRow } from "../../components/ui/ListCard";
import { NavHeader } from "../../components/ui/NavHeader";
import { PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useT } from "../../lib/i18n";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import { findChannel } from "./channels";

type Phase = "idle" | "connecting" | "done";

/**
 * Verbinden- & Verwalten-Seite eines Kanals (aus Screen 11).
 *
 * Nicht verbunden: zeigt Konto und Berechtigungen, „Verbinden" simuliert den
 * OAuth-Fluss (Spinner → verbunden) und schreibt in den Store. Verbunden: zeigt Konto,
 * Sync-Status, Zugang zur Profilpflege (Google/Instagram) und Trennen.
 */
export function ChannelDetailScreen({ channelId }: { channelId?: string }) {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const { channels, channelMeta, connectChannelAs, disconnectChannel } = useStore();

  const channel = findChannel(channelId);
  const connected = Boolean(channels[channel.id]);
  const meta = channelMeta[channel.id];
  const [phase, setPhase] = useState<Phase>("idle");

  const connect = () => {
    setPhase("connecting");
    // OAuth-Simulation: kurzer Moment, dann verbunden.
    setTimeout(() => {
      connectChannelAs(channel.id, channel.suggestedAccount);
      setPhase("done");
      toast.show(t({ de: `${channel.name} verbunden`, en: `${channel.name} connected` }));
    }, 1100);
  };

  return (
    <Screen animated="subtle" contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title={channel.name} />

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
          {connected ? <StatusLabel label={t({ de: "Verbunden", en: "Connected" })} color={theme.colors.success} /> : null}
        </View>

        <View style={{ height: 1, backgroundColor: theme.colors.surfaceSunken }} />

        <Eyebrow>{t({ de: "Maitr darf", en: "Maitr can" })}</Eyebrow>
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
          <ListRow title={t({ de: "Verbundenes Konto", en: "Connected account" })} meta={meta.account} value="" />
          <ListRow title={t({ de: "Synchronisation", en: "Sync" })} meta={meta.since} value="" />
          {channel.managesProfile ? (
            <ListRow
              title={
                channel.managesProfile === "google"
                  ? t({ de: "Profil & Öffnungszeiten", en: "Profile & hours" })
                  : t({ de: "Bio bearbeiten", en: "Edit bio" })
              }
              meta={t({ de: "Pflege Name, Bio, Zeiten", en: "Edit name, bio, hours" })}
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
            label={t({ de: "Verbindung trennen", en: "Disconnect" })}
            variant="outline"
            onPress={() => {
              disconnectChannel(channel.id);
              setPhase("idle");
              toast.show(t({ de: `${channel.name} getrennt`, en: `${channel.name} disconnected` }));
            }}
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
              {t({ de: `Verbinde mit ${channel.name} …`, en: `Connecting to ${channel.name} …` })}
            </Text>
          </View>
        ) : (
          <PillButton
            label={t({ de: `Mit ${channel.name} verbinden`, en: `Connect ${channel.name}` })}
            onPress={connect}
          />
        )}

        {!connected ? (
          <Eyebrow tone="faint" style={{ textAlign: "center" }}>
            {t({ de: "Jederzeit widerrufbar", en: "Revoke anytime" })}
          </Eyebrow>
        ) : null}
      </View>
    </Screen>
  );
}
