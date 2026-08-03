import { Pressable, View } from "react-native";
import { useRouter, type Href } from "expo-router";

import { BellIcon, PostIcon, StarIcon, TableIcon, TargetIcon, type IconProps } from "../../components/icons";
import { Card } from "../../components/ui/Card";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { LinkAction } from "../../components/ui/PillButton";
import { NavHeader } from "../../components/ui/NavHeader";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useStore, type InboxItem, type InboxKind } from "../../lib/store";
import { useTheme } from "../../theme";

/** Icon je Ereignistyp - dieselbe Sprache wie die Tabbar. */
const KIND_ICON: Record<InboxKind, (p: IconProps) => JSX.Element> = {
  review: StarIcon,
  reservation: TableIcon,
  post: PostIcon,
  system: TargetIcon,
};

/**
 * Posteingang - ein Ort für alles, was Aufmerksamkeit braucht: neue Bewertungen,
 * Reservierungen, Beitragsvorschläge, Score-Hinweise. Jede Nachricht führt zum
 * passenden Screen und gilt danach als gelesen.
 *
 * Kein Screen aus dem Design-Dokument, aber die konsequente Sammelstelle für die
 * Ereignisse, die sonst über die App verstreut sind.
 */
export function InboxScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { inbox, inboxRead, unreadCount, markInboxRead, markAllInboxRead } = useStore();

  const open = (item: InboxItem) => {
    markInboxRead(item.id);
    router.push(item.href as Href);
  };

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader
        title="Posteingang"
        trailing={unreadCount > 0 ? <LinkAction label="Alle gelesen" onPress={markAllInboxRead} /> : undefined}
      />

      <Eyebrow>
        {unreadCount > 0 ? `${unreadCount} ungelesen` : "Alles gelesen"}
      </Eyebrow>

      <View style={{ gap: theme.spacing.md }}>
        {inbox.map((item) => {
          const read = inboxRead[item.id];
          const Icon = KIND_ICON[item.kind];
          return (
            <Pressable
              key={item.id}
              onPress={() => open(item)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
            <Card
              emphasis={read ? "subtle" : "default"}
              padding={theme.spacing.lg}
              style={{
                flexDirection: "row",
                gap: 14,
                opacity: read ? 0.7 : 1,
                ...(read ? {} : { borderWidth: 1, borderColor: theme.colors.border }),
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.surfaceSunken,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={20} color={theme.colors.primary} />
              </View>

              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {!read ? (
                    <View
                      style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.primary }}
                    />
                  ) : null}
                  <Text variant="cardTitleSm" style={{ fontSize: 16, flex: 1 }} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>
                <Text variant="bodySm" tone="secondary" style={{ fontSize: 14 }} numberOfLines={2}>
                  {item.body}
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                  <Eyebrow tone="faint" style={{ fontSize: 10 }}>
                    {item.time}
                  </Eyebrow>
                  <LinkAction label="Öffnen" labelSize={14} onPress={() => open(item)} />
                </View>
              </View>
            </Card>
            </Pressable>
          );
        })}
      </View>

      <View style={{ alignItems: "center", marginTop: theme.spacing.sm }}>
        <BellIcon size={18} color={theme.colors.textFaint} />
        <Eyebrow tone="faint" style={{ marginTop: theme.spacing.xs, textAlign: "center" }}>
          Maitr sammelt hier, was dein Betrieb braucht
        </Eyebrow>
      </View>
    </Screen>
  );
}
