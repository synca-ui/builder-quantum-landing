import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { Card } from "../../components/ui/Card";
import { Chip } from "../../components/ui/Chip";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { PhotoTile } from "../../components/ui/Media";
import { PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { POST_SLOTS, useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

const ALL_CHANNELS = ["Instagram", "Google", "Facebook"];

/**
 * Beitrag bearbeiten & verschieben (aus Screen 08).
 *
 * Titel, Kanäle und Zeit sind echt editierbar und landen im Store - der Beitrags-Screen
 * zeigt danach die geänderten Werte. „Speichern & einplanen" setzt den Beitrag auf
 * eingeplant.
 */
export function PostEditorScreen({ postId }: { postId?: string }) {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { posts, updatePost, schedulePost } = useStore();

  const post = useMemo(() => posts.find((p) => p.id === postId) ?? posts[0], [posts, postId]);

  const [title, setTitle] = useState(post.title);
  const [channels, setChannels] = useState<string[]>(post.channels);
  const [when, setWhen] = useState(post.when);

  const toggleChannel = (c: string) =>
    setChannels((list) => (list.includes(c) ? list.filter((x) => x !== c) : [...list, c]));

  const save = () => {
    updatePost(post.id, { title: title.trim() || post.title, channels, when });
    schedulePost(post.id);
    toast.show("Beitrag gespeichert & eingeplant");
    router.back();
  };

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title="Beitrag" />

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
        <View style={{ flexDirection: "row", gap: 9, flexWrap: "wrap" }}>
          {ALL_CHANNELS.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={channels.includes(c)}
              onPress={() => toggleChannel(c)}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Eyebrow>Zeitpunkt</Eyebrow>
        <View style={{ flexDirection: "row", gap: 9, flexWrap: "wrap" }}>
          {POST_SLOTS.map((slot) => (
            <Chip key={slot} label={slot} selected={when === slot} onPress={() => setWhen(slot)} />
          ))}
        </View>
      </View>

      <View style={{ marginTop: theme.spacing.sm }}>
        <PillButton label="Speichern & einplanen" onPress={save} />
      </View>
    </Screen>
  );
}
