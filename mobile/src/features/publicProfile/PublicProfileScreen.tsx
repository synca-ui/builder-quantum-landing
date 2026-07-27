import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalendarIcon, PinIcon } from "../../components/icons";
import { StatusLabel } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { Tag } from "../../components/ui/Chip";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { PhotoTile } from "../../components/ui/Media";
import { PillButton } from "../../components/ui/PillButton";
import { Emphasis, Text } from "../../components/ui/Text";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

/**
 * Screen 17 · Öffentliches Profil (Gast-Seite).
 *
 * Spiegelt das im Betrieb gepflegte Profil (Store): Name, Beschreibung und Merkmale
 * kommen aus `venueProfile` - Änderungen in „Profil verwalten" erscheinen hier sofort.
 * Einziger Screen mit Titelbild; die Karte überlappt es um 30px.
 */
export function PublicProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { venueProfile } = useStore();

  const profile = {
    name: venueProfile.name,
    tagline: `${venueProfile.tagline} · ${venueProfile.city.replace(/^\d+\s/, "")}`,
    rating: "★ 4,8 · 128",
    tags: venueProfile.tags.slice(0, 3),
    openUntil: "bis 22:00",
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      {/* Kein `fill`: das Titelbild hat eine feste Höhe und spannt sich in der Breite -
          `fill` würde stattdessen flex:1 setzen und die ganze Spalte einnehmen. */}
      <PhotoTile
        tone="cool"
        size={246}
        radius={0}
        caption="Titelbild"
        style={{ width: "100%", height: 246, alignSelf: "stretch" }}
      />

      {/* Zurück schwebt über dem Titelbild, damit der Gast das Profil verlassen kann. */}
      {router.canGoBack() ? (
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Zurück"
          hitSlop={10}
          style={({ pressed }) => ({
            position: "absolute",
            top: insets.top + 10,
            left: 20,
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: "rgba(251,253,252,0.85)",
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
            zIndex: 2,
          })}
        >
          <Text variant="numeric" style={{ fontSize: 22, marginTop: -2 }}>
            ‹
          </Text>
        </Pressable>
      ) : null}

      <View style={{ position: "absolute", top: insets.top + 14, right: 24 }}>
        <View
          style={{
            backgroundColor: "rgba(251,253,252,0.85)",
            borderRadius: theme.radius.pill,
            paddingVertical: 8,
            paddingHorizontal: 14,
          }}
        >
          <Text variant="numeric" style={{ fontSize: 12 }}>
            {profile.rating}
          </Text>
        </View>
      </View>

      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 22,
          marginTop: -30,
          gap: theme.spacing.lg,
        }}
      >
        <Card emphasis="strong" padding={22} style={{ borderRadius: 22, gap: theme.spacing.sm }}>
          <Emphasis variant="screenTitle" style={{ fontSize: 28, lineHeight: 32 }}>
            {profile.name}
          </Emphasis>
          <Text variant="bodySm" tone="secondary" style={{ fontSize: 15 }}>
            {profile.tagline}
          </Text>

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            {profile.tags.map((tag) => (
              <Tag key={tag} label={tag} />
            ))}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
            <StatusLabel label="Jetzt geöffnet" color={theme.colors.success} />
            <Text variant="bodySm" tone="muted" style={{ fontSize: 14 }}>
              · {profile.openUntil}
            </Text>
          </View>
        </Card>

        <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
          <QuickAction
            label="Route"
            icon={<PinIcon size={22} color={theme.colors.primary} />}
            onPress={() => toast.show("Route in Karten öffnen")}
          />
          <QuickAction
            label="Speisekarte"
            icon={<CalendarIcon size={22} color={theme.colors.primary} />}
            onPress={() => router.push("/speisekarte")}
          />
        </View>
      </View>

      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: theme.spacing.lg,
          paddingBottom: Math.max(insets.bottom, 26),
          gap: theme.spacing.sm,
        }}
      >
        <PillButton
          label="Tisch reservieren"
          onPress={() => router.push("/gast/reservieren")}
        />
        <Eyebrow tone="faint" style={{ textAlign: "center" }}>
          Provisionsfrei über Maitr
        </Eyebrow>
      </View>
    </View>
  );
}

function QuickAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress?: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
    >
      <Card
        emphasis="subtle"
        padding={theme.spacing.lg}
        style={{ borderRadius: theme.radius.tile, alignItems: "center" }}
      >
        <View style={{ marginBottom: 4 }}>{icon}</View>
        <Text variant="numeric" style={{ fontSize: 14 }}>
          {label}
        </Text>
      </Card>
    </Pressable>
  );
}
