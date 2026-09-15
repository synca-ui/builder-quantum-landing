import { useMemo, useState } from "react";
import { TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { Card } from "../../components/ui/Card";
import { Chip } from "../../components/ui/Chip";
import { EmptyState } from "../../components/ui/EmptyState";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { PhotoTile } from "../../components/ui/Media";
import { LinkAction, PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { POST_SLOTS, useStore, type Post } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import { beitragsKanaele, kanaeleFuerBeitrag, sichtbareBeitraege } from "../growth/kanaele";
import { VorschauHinweis, useBeitragsZuordnung } from "./PostsScreen";

/**
 * Beitrag bearbeiten & verschieben (aus Screen 08).
 *
 * Titel, Kanäle und Zeit sind editierbar und landen im Store auf diesem Gerät - der
 * Beitrags-Screen zeigt danach die geänderten Werte. Im Demo setzt „Speichern &
 * einplanen“ den Beitrag auf eingeplant; ein Kanal erfährt davon nichts.
 *
 * Echter Betrieb (Integrationsprüfung 15.09., Punkt 6): Kanal-Chips nur für
 * verbundene Kanäle, gespeichert wird „als Entwurf“ - kein „eingeplant“, das beim
 * Kanal nie ankommt. Und kein stiller Rückfall auf `posts[0]`: Der wäre ein
 * Café-Goldstück-Beitrag, und bei leerer Liste stürzte der Editor ab.
 *
 * Ein Entwurf öffnet sich nur für den Betrieb, dem er zugeordnet ist (Prüfer-Befund
 * 15.09.) - sonst bearbeitete Konto B über einen gemerkten Link den Entwurf von A.
 */
export function PostEditorScreen({ postId }: { postId?: string }) {
  const theme = useTheme();
  const { posts, hasRealVenue, showcase, venueId } = useStore();
  const zuordnung = useBeitragsZuordnung();

  const echterBetrieb = hasRealVenue && !showcase;

  const post = useMemo(() => {
    const sichtbar = sichtbareBeitraege(posts, echterBetrieb, zuordnung.zuordnung, venueId);
    return echterBetrieb ? sichtbar.find((p) => p.id === postId) : (sichtbar.find((p) => p.id === postId) ?? sichtbar[0]);
  }, [posts, postId, echterBetrieb, zuordnung.zuordnung, venueId]);

  if (echterBetrieb && !zuordnung.geladen) {
    // Vor dem Lesen der Zuordnung wäre „nicht gefunden“ geraten.
    return (
      <Screen contentStyle={{ gap: theme.spacing.lg }}>
        <NavHeader title="Entwurf" fallback="/beitraege" />
        <Text variant="bodySm" tone="secondary" style={{ fontSize: 14 }}>
          Entwurf wird geladen …
        </Text>
      </Screen>
    );
  }

  if (!post) {
    return (
      <Screen contentStyle={{ gap: theme.spacing.lg }}>
        <NavHeader title="Beitrag" fallback="/beitraege" />
        <EmptyState title="Entwurf nicht gefunden" message="Auf diesem Gerät gibt es ihn nicht (mehr)." />
      </Screen>
    );
  }

  // Formular erst mit gefundenem Beitrag - und je Beitrag neu. Sein Anfangszustand
  // stammt aus dem Beitrag; wäre er schon vor dem Laden entstanden, stünden Text,
  // Kanäle und Zeitpunkt leer da und „Als Entwurf merken“ überschriebe sie.
  return <BeitragFormular key={post.id} post={post} echterBetrieb={echterBetrieb} />;
}

function BeitragFormular({ post, echterBetrieb }: { post: Post; echterBetrieb: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { updatePost, schedulePost, channels: kanalStatus } = useStore();

  const [title, setTitle] = useState(post.title);
  const [channels, setChannels] = useState<string[]>(post.channels);
  const [when, setWhen] = useState(post.when);

  // Echt nur verbundene Kanäle. Die Auswahl selbst bleibt ungefiltert im Zustand und
  // wird erst beim Speichern beschnitten - der Kanalstatus kommt asynchron vom
  // Server, und ein zu früh gefiltertes Anfangs-State verlöre die Auswahl für immer.
  const erlaubteKanaele = beitragsKanaele(kanalStatus, echterBetrieb);

  const toggleChannel = (c: string) =>
    setChannels((list) => (list.includes(c) ? list.filter((x) => x !== c) : [...list, c]));

  const save = () => {
    if (echterBetrieb) {
      updatePost(post.id, {
        title: title.trim() || post.title,
        channels: kanaeleFuerBeitrag(channels, erlaubteKanaele),
        when,
      });
      toast.show("Als Entwurf gemerkt");
      router.back();
      return;
    }
    updatePost(post.id, { title: title.trim() || post.title, channels, when });
    schedulePost(post.id);
    toast.show("Beitrag gespeichert & eingeplant");
    router.back();
  };

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title={echterBetrieb ? "Entwurf" : "Beitrag"} />

      {echterBetrieb ? <VorschauHinweis /> : null}

      <Card padding={theme.spacing.lg} style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
        <PhotoTile tone={post.tone} size={64} caption="foto" />
        <View style={{ flex: 1 }}>
          <Eyebrow>Vorschau</Eyebrow>
          <Text variant="cardTitleSm" numberOfLines={2} style={{ marginTop: 2 }}>
            {title || "Ohne Titel"}
          </Text>
        </View>
      </Card>

      <View style={{ gap: theme.spacing.sm }}>
        <Eyebrow>Text</Eyebrow>
        <Card padding={theme.spacing.lg}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            multiline
            placeholder="Worum geht es?"
            placeholderTextColor={theme.colors.textFaint}
            accessibilityLabel="Beitragstext"
            style={[
              theme.text.body,
              { color: theme.colors.textPrimary, minHeight: 88, textAlignVertical: "top" },
            ]}
          />
        </Card>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Eyebrow>Kanäle</Eyebrow>
        {erlaubteKanaele.length === 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md, flexWrap: "wrap" }}>
            <Text variant="bodySm" tone="secondary" style={{ fontSize: 14 }}>
              Kein Kanal verbunden.
            </Text>
            <LinkAction label="Kanäle öffnen" onPress={() => router.push("/kanaele")} />
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 9, flexWrap: "wrap" }}>
            {erlaubteKanaele.map((c) => (
              <Chip
                key={c}
                label={c}
                selected={channels.includes(c)}
                onPress={() => toggleChannel(c)}
              />
            ))}
          </View>
        )}
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Eyebrow>{echterBetrieb ? "Wunschzeitpunkt" : "Zeitpunkt"}</Eyebrow>
        <View style={{ flexDirection: "row", gap: 9, flexWrap: "wrap" }}>
          {POST_SLOTS.map((slot) => (
            <Chip key={slot} label={slot} selected={when === slot} onPress={() => setWhen(slot)} />
          ))}
        </View>
      </View>

      <View style={{ marginTop: theme.spacing.sm }}>
        <PillButton label={echterBetrieb ? "Als Entwurf merken" : "Speichern & einplanen"} onPress={save} />
      </View>
    </Screen>
  );
}
