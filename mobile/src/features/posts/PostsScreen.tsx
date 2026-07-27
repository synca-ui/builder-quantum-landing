import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { Card } from "../../components/ui/Card";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { PhotoTile } from "../../components/ui/Media";
import { LinkAction, PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { Text } from "../../components/ui/Text";
import { useT } from "../../lib/i18n";
import { useStore, type Post } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

/**
 * Screen 08 · Beiträge.
 *
 * Voller Lebenszyklus aus dem Store: Vorschlag → Einplanen → eingeplant → Jetzt
 * veröffentlichen → live. Bearbeiten und Verschieben öffnen den Editor (Screen
 * `beitrag/[id]`). Nichts ist mehr Attrappe.
 */
export function PostsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const { posts, schedulePost, publishPost } = useStore();
  const [week, setWeek] = useState(29);

  return (
    <Screen withTabBar contentStyle={{ gap: theme.spacing.lg }}>
      <ScreenHeader
        title={t({ de: "Beiträge", en: "Posts" })}
        period={t({ de: `KW ${week}`, en: `Week ${week}` })}
        onPrevious={() => setWeek((w) => w - 1)}
        onNext={() => setWeek((w) => w + 1)}
      />

      <PillButton
        label={t({ de: "Schnell posten", en: "Quick post" })}
        variant="outline"
        size="compact"
        onPress={() => router.push("/schnell-posten")}
      />

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onPlan={() => {
            schedulePost(post.id);
            toast.show(t({ de: "Beitrag eingeplant", en: "Post scheduled" }));
          }}
          onPublish={() => {
            publishPost(post.id);
            toast.show(t({ de: "Beitrag veröffentlicht", en: "Post published" }));
          }}
          onEdit={() => router.push({ pathname: "/beitrag/[id]", params: { id: post.id } })}
        />
      ))}

      <Eyebrow tone="faint" style={{ textAlign: "center", marginTop: theme.spacing.sm }}>
        {t({
          de: "Maitr schlägt jede Woche 3 Beiträge aus deinen Fotos vor",
          en: "Maitr suggests 3 posts from your photos every week",
        })}
      </Eyebrow>
    </Screen>
  );
}

function PostCard({
  post,
  onPlan,
  onPublish,
  onEdit,
}: {
  post: Post;
  onPlan: () => void;
  onPublish: () => void;
  onEdit: () => void;
}) {
  const theme = useTheme();
  const t = useT();

  const slotColor = post.state === "suggestion" ? theme.colors.primary : theme.colors.textMuted;
  const channels = post.channels.join(" + ");
  const slot =
    post.state === "suggestion"
      ? t({ de: `Vorschlag · ${post.when} · ${channels}`, en: `Suggestion · ${post.when} · ${channels}` })
      : post.state === "live"
        ? t({ de: `Live · ${post.when} · ${channels}`, en: `Live · ${post.when} · ${channels}` })
        : t({ de: `Eingeplant · ${post.when} · ${channels}`, en: `Scheduled · ${post.when} · ${channels}` });

  return (
    <Card
      emphasis={post.state === "suggestion" ? "default" : "subtle"}
      padding={theme.spacing.lg}
      style={{ gap: theme.spacing.md, opacity: post.state === "suggestion" ? 1 : 0.96 }}
    >
      <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
        <PhotoTile tone={post.tone} size={74} caption={t({ de: "foto", en: "photo" })} />

        <View style={{ flex: 1, gap: 5 }}>
          <Eyebrow color={slotColor}>{slot}</Eyebrow>
          <Text variant="cardTitleSm">{post.title}</Text>
          {post.state === "live" && post.note ? (
            <Eyebrow color={theme.colors.success}>{post.note}</Eyebrow>
          ) : null}
        </View>
      </View>

      {post.state === "suggestion" ? (
        <>
          {post.note ? <Eyebrow>{post.note}</Eyebrow> : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
            <PillButton
              label={t({ de: "Einplanen", en: "Schedule" })}
              size="compact"
              style={{ flex: 1 }}
              onPress={onPlan}
            />
            <LinkAction label={t({ de: "Bearbeiten", en: "Edit" })} onPress={onEdit} />
          </View>
        </>
      ) : post.state === "scheduled" ? (
        // Nach dem Einplanen: veröffentlichen oder verschieben (Editor).
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
          <PillButton
            label={t({ de: "Jetzt veröffentlichen", en: "Publish now" })}
            size="compact"
            variant="ink"
            style={{ flex: 1 }}
            onPress={onPublish}
          />
          <LinkAction label={t({ de: "Verschieben", en: "Reschedule" })} onPress={onEdit} />
        </View>
      ) : null}
    </Card>
  );
}
