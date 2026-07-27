import type { ComponentType } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { PresenceStats } from "@maitr/core";

import { EyeIcon, ReviewIcon, TargetIcon } from "../../../components/icons";
import { Card } from "../../../components/ui/Card";
import { Text } from "../../../components/ui/Text";
import { useT } from "../../../lib/i18n";
import { useTheme } from "../../../theme";

export interface StatRowProps {
  stats: PresenceStats;
  /** Jede Kachel führt zu ihrem Detailbereich. */
  onRating?: () => void;
  onScore?: () => void;
  onImpressions?: () => void;
}

type IconComponent = ComponentType<{ size?: number; color?: string }>;

/**
 * Drei Kennzahl-Kacheln: Google-Bewertung, Präsenzscore, Profilaufrufe.
 * Jede zeigt Icon + Wert + klares Label und führt zu ihrem Bereich
 * (Bewertungen, Profil-Check, Wachstum). Das Label sorgt dafür, dass eindeutig
 * ist, wofür jede Zahl steht.
 */
export function StatRow({ stats, onRating, onScore, onImpressions }: StatRowProps) {
  const t = useT();

  return (
    <View style={styles.row}>
      <StatTile
        onPress={onRating}
        Icon={ReviewIcon}
        value={formatRating(stats.rating)}
        label={t({ de: "Bewertung", en: "Rating" })}
        accessibilityLabel={t({
          de: `Bewertung ${formatRating(stats.rating)}, öffnet Bewertungen`,
          en: `Rating ${formatRating(stats.rating)}, opens reviews`,
        })}
      />
      <StatTile
        onPress={onScore}
        Icon={TargetIcon}
        value={String(stats.score)}
        suffix="/ 100"
        label={t({ de: "Präsenz", en: "Presence" })}
        accessibilityLabel={t({
          de: `Präsenzscore ${stats.score} von 100, öffnet Profil-Check`,
          en: `Presence score ${stats.score} of 100, opens profile check`,
        })}
      />
      <StatTile
        onPress={onImpressions}
        Icon={EyeIcon}
        value={formatCount(stats.impressions)}
        label={t({ de: "Aufrufe", en: "Views" })}
        accessibilityLabel={t({
          de: `${stats.impressions} Profilaufrufe, öffnet Wachstum`,
          en: `${stats.impressions} profile views, opens growth`,
        })}
      />
    </View>
  );
}

function StatTile({
  onPress,
  Icon,
  value,
  suffix,
  label,
  accessibilityLabel,
}: {
  onPress?: () => void;
  Icon: IconComponent;
  value: string;
  /** Kleiner, gedämpfter Zusatz hinter dem Wert, z. B. „/ 100" für den Score. */
  suffix?: string;
  label: string;
  accessibilityLabel: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
    >
      <Card
        variant="raised"
        emphasis="subtle"
        padding={0}
        style={{
          borderRadius: theme.radius.control,
          paddingVertical: 9,
          paddingHorizontal: 8,
          minHeight: 58,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={styles.line}>
          <Icon size={16} color={theme.colors.textPrimary} />
          <Text variant="numeric">
            {value}
            {suffix ? (
              <Text variant="numeric" tone="muted" style={styles.suffix}>
                {` ${suffix}`}
              </Text>
            ) : null}
          </Text>
        </View>
        <Text variant="eyebrow" tone="muted" numberOfLines={1} style={styles.caption}>
          {label}
        </Text>
      </Card>
    </Pressable>
  );
}

/** Deutsche Schreibweise: Komma als Dezimaltrenner. */
function formatRating(value: number): string {
  return value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Punkt als Tausendertrennzeichen. */
function formatCount(value: number): string {
  return value.toLocaleString("de-DE");
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  line: { flexDirection: "row", alignItems: "center", gap: 7, justifyContent: "center" },
  suffix: { fontSize: 12 },
  caption: { marginTop: 4, textAlign: "center" },
});
