import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ApiError, api } from "@maitr/core";

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
import { fehlerText } from "../onboarding/ablauf";
import { findChannel } from "./channels";
import {
  kanalBerechtigungen,
  kanalVerfuegbar,
  kanalZweck,
  serverProvider,
  verbindenAusgang,
} from "./kanaele";

/**
 * `pruefen`: der OAuth-Browser ist zu und der Kanalstatus neu geholt - der Effekt
 * unten entscheidet mit dem FRISCHEN `channels`, ob die Verbindung steht.
 */
type Phase = "idle" | "connecting" | "pruefen" | "disconnecting" | "done";

/**
 * Verbinden- & Verwalten-Seite eines Kanals (aus Screen 11).
 *
 * Nicht verbunden: zeigt Nutzen und Berechtigungen. Verbunden: zeigt Konto,
 * Sync-Status, Zugang zur Profilpflege (Demo) und Trennen.
 *
 * VERBINDEN IST ECHT für einen echten Betrieb (Integrationsprüfung 15.09., Punkt 2):
 * `connectUrl` → OAuth im System-Browser → Rücksprung über `maitr://` → Kanalstatus
 * neu vom Server. Erfolg meldet die Seite erst, wenn `channels[id]` danach true ist -
 * wie AblaufGoogle im Onboarding. Vorher simulierte ein setTimeout das Verbinden
 * auch für echte Wirte und schrieb „verbunden“ in den Store, ohne dass je ein Token
 * existierte. Im Demo und Showcase bleibt genau diese Simulation (Vorführung).
 * Yelp und TheFork haben keinen Connector und zeigen das.
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
  const {
    channels,
    channelMeta,
    connectChannelAs,
    disconnectChannel,
    aktualisiereKanaele,
    venueId,
    hasRealVenue,
    showcase,
  } = useStore();

  const channel = findChannel(channelId);
  const echterBetrieb = hasRealVenue && !showcase;
  const provider = serverProvider(channel.id);
  const verfuegbar = kanalVerfuegbar(channel.id, echterBetrieb);
  const connected = Boolean(channels[channel.id]);
  const meta = channelMeta[channel.id];
  const berechtigungen = kanalBerechtigungen(channel, echterBetrieb);
  const [phase, setPhase] = useState<Phase>("idle");
  const [fehler, setFehler] = useState<string | null>(null);

  // Nach dem Browser kann der Screen schon verlassen sein - dann keine Toasts und
  // kein setState mehr.
  const aktiv = useRef(true);
  useEffect(() => {
    aktiv.current = true;
    return () => {
      aktiv.current = false;
    };
  }, []);

  // Was der Browser zurückgab, bis der Effekt unten mit dem frischen Status entscheidet.
  const browserAusgang = useRef<{ typ: string; url?: string } | null>(null);

  // Entscheidung NACH dem Neuladen: `aktualisiereKanaele` setzt den Status per
  // setState, und erst das nächste Rendern trägt ihn. Ein Blick auf `channels`
  // direkt nach dem await läse noch den alten Wert (Closure) - und meldete eine
  // frisch hergestellte Verbindung als gescheitert.
  useEffect(() => {
    if (phase !== "pruefen") return;
    const zurueck = browserAusgang.current;
    browserAusgang.current = null;
    const ausgang = verbindenAusgang({
      browserTyp: zurueck?.typ ?? "dismiss",
      rueckUrl: zurueck?.url,
      verbunden: connected,
      kanalName: channel.name,
    });
    if (ausgang.erfolg) {
      setFehler(null);
      setPhase("done");
      toast.show(ausgang.meldung);
    } else {
      setFehler(ausgang.meldung);
      setPhase("idle");
    }
  }, [phase, connected, channel.name, toast]);

  const disconnect = async () => {
    setFehler(null);
    // `echterBetrieb`, nicht `hasRealVenue`: Im Showcase kann eine echte Kennung aus
    // dem Gerätespeicher stehen. Getrennt wird dort, wie verbunden wurde - nur im
    // Store, ohne DELETE ohne Token (401 und "Trennen fehlgeschlagen").
    if (echterBetrieb && provider) {
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
      disconnectChannel(channel.id);
      // Instagram und Facebook hängen an EINER Meta-Verbindung: Wer eine trennt,
      // trennt beide. Der Serverstatus zieht den Nachbarkanal mit nach.
      if (echterBetrieb) void aktualisiereKanaele();
    } else {
      toast.show(`${channel.name} getrennt`);
      disconnectChannel(channel.id);
    }
    if (aktiv.current) setPhase("idle");
  };

  const connectDemo = () => {
    setPhase("connecting");
    // OAuth-Simulation: kurzer Moment, dann verbunden. Nur Demo und Showcase.
    setTimeout(() => {
      connectChannelAs(channel.id, channel.suggestedAccount);
      setPhase("done");
      toast.show(`${channel.name} verbunden`);
    }, 1100);
  };

  const connectEcht = async () => {
    if (!provider) return;
    setFehler(null);
    setPhase("connecting");
    try {
      const { url } = await api.integrations.connectUrl(venueId, provider);
      if (typeof url !== "string" || url.length === 0) {
        throw new Error("Antwort enthält keine Anmeldeadresse");
      }
      const ergebnis = await WebBrowser.openAuthSessionAsync(url, "maitr://");
      if (!aktiv.current) return;
      browserAusgang.current = {
        typ: ergebnis.type,
        url: ergebnis.type === "success" ? ergebnis.url : undefined,
      };
      // Auch nach Abbruch neu laden: Der Callback kann gespeichert haben, bevor der
      // Browser zuging. `aktualisiereKanaele` wirft nie.
      await aktualisiereKanaele();
      if (!aktiv.current) return;
      setPhase("pruefen");
    } catch (err) {
      if (!aktiv.current) return;
      setPhase("idle");
      setFehler(fehlerText(err));
    }
  };

  const connect = () => {
    if (echterBetrieb) void connectEcht();
    else connectDemo();
  };

  // Konto-Zeile unter dem Namen: im Demo das vorgeschlagene Beispielkonto, echt nur,
  // was der Server über die Verbindung sagt - nie „Sofia Brandt · Inhaberin“.
  const kontoZeile = connected
    ? (meta?.account ?? (echterBetrieb ? kanalZweck(channel, true) : channel.suggestedAccount))
    : kanalZweck(channel, echterBetrieb);

  const busy = phase === "connecting" || phase === "pruefen";

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
            <Eyebrow style={{ marginTop: 2 }}>{kontoZeile}</Eyebrow>
          </View>
          {connected && verfuegbar ? (
            <StatusLabel label="Verbunden" color={theme.colors.success} />
          ) : null}
        </View>

        <View style={{ height: 1, backgroundColor: theme.colors.surfaceSunken }} />

        {verfuegbar ? (
          <>
            <Eyebrow>Maitr darf</Eyebrow>
            {berechtigungen.map((scope) => (
              <View key={scope} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <CheckIcon size={17} color={theme.colors.success} />
                <Text variant="bodySm" style={{ fontSize: 15, flex: 1 }}>
                  {scope}
                </Text>
              </View>
            ))}
            {echterBetrieb ? (
              <Text variant="bodySm" tone="secondary" style={{ fontSize: 13.5, lineHeight: 19 }}>
                {provider === "meta"
                  ? "Nur lesend. Instagram und Facebook laufen über dieselbe Meta-Freigabe."
                  : "Nur lesend. Maitr veröffentlicht nichts in deinem Namen."}
              </Text>
            ) : null}
          </>
        ) : (
          <Text variant="bodySm" tone="secondary" style={{ fontSize: 14, lineHeight: 20 }}>
            Für {channel.name} gibt es in Maitr noch keine Anbindung. Verbinden ist deshalb nicht
            möglich.
          </Text>
        )}
      </Card>

      {connected && verfuegbar && echterBetrieb ? (
        <ListCard>
          <ListRow
            title="Verbindung"
            meta={meta?.account ? `Aktiv · ${meta.account}` : "Aktiv"}
            value=""
          />
        </ListCard>
      ) : connected && meta ? (
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

      {fehler ? (
        <Text
          variant="bodySm"
          color={theme.colors.destructive}
          accessibilityLiveRegion="polite"
          style={{ fontSize: 14, lineHeight: 20, textAlign: "center" }}
        >
          {fehler}
        </Text>
      ) : null}

      {verfuegbar ? (
        <View style={{ marginTop: theme.spacing.sm, gap: theme.spacing.md }}>
          {connected ? (
            <PillButton
              label={phase === "disconnecting" ? "Wird getrennt …" : "Verbindung trennen"}
              variant="outline"
              disabled={phase === "disconnecting"}
              onPress={() => void disconnect()}
            />
          ) : busy ? (
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
      ) : null}
    </Screen>
  );
}
