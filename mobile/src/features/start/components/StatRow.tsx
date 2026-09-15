import type { ComponentType } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { PresenceStats } from "@maitr/core";

import { EyeIcon, ReviewIcon, TargetIcon } from "../../../components/icons";
import { Card } from "../../../components/ui/Card";
import { Text } from "../../../components/ui/Text";
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
 *
 * Was nicht gemessen ist, steht als Strich da, nicht als Null: „0,0" läse sich wie
 * eine vernichtende Bewertung, „0 Aufrufe" wie ein unsichtbares Profil - beides
 * wäre eine Behauptung, die niemand erhoben hat. Die Fixture (4,8 / 64 / 4.812)
 * trägt weder `reviewCount` noch `impressionsKnown` und erscheint unverändert.
 */
export function StatRow({ stats, onRating, onScore, onImpressions }: StatRowProps) {
  return (
    <View style={styles.row}>
      <StatTile
        onPress={onRating}
        Icon={ReviewIcon}
        value={hatBewertung(stats.rating) ? formatRating(stats.rating) : STRICH}
        label="Bewertung"
        accessibilityLabel={bewertungLabel(stats)}
      />
      <StatTile
        onPress={onScore}
        Icon={TargetIcon}
        // Kein Score für einen echten Betrieb, solange weder Briefing noch
        // Präsenzbericht geantwortet haben (StartScreen `kennzahlen`): Strich statt
        // des Demo-Werts 64.
        value={Number.isFinite(stats.score) ? String(stats.score) : STRICH}
        suffix={Number.isFinite(stats.score) ? "/ 100" : undefined}
        label="Präsenz"
        accessibilityLabel={scoreLabel(stats)}
      />
      <StatTile
        onPress={onImpressions}
        Icon={EyeIcon}
        // Fehlt das Feld (älterer Server, Fixture), gilt der Wert als gemessen -
        // deshalb der Vergleich auf `false`, nicht auf „falsy".
        value={stats.impressionsKnown === false ? STRICH : formatCount(stats.impressions)}
        label="Aufrufe"
        accessibilityLabel={
          stats.impressionsKnown === false
            ? "Profilaufrufe noch nicht gemessen, öffnet Wachstum"
            : `${stats.impressions} Profilaufrufe, öffnet Wachstum`
        }
      />
    </View>
  );
}

/** Gedankenstrich als Platzhalter für „nicht gemessen" - nie eine Beispielzahl. */
const STRICH = "–";

/**
 * 0 bedeutet laut `PresenceStats` „noch keine Bewertung bekannt". Positiv geprüft
 * (`> 0`) statt `<= 0` ausgeschlossen, damit auch ein `null` oder `NaN` aus einer
 * unvollständigen Antwort als fehlend gilt, statt als „NaN" in der Kachel zu landen.
 */
function hatBewertung(rating: number): boolean {
  return rating > 0;
}

/**
 * Die Anzahl gehört in die Ansage, nicht in die Kachel: Drei Kacheln nebeneinander
 * haben keinen Platz für „(312)", aber wer vorlesen lässt, soll hören, wie viel
 * hinter dem Schnitt steckt - 4,9 aus 3 Bewertungen ist etwas anderes als aus 300.
 */
function bewertungLabel(stats: PresenceStats): string {
  if (!hatBewertung(stats.rating)) return "Noch keine Bewertung, öffnet Bewertungen";
  const anzahl = stats.reviewCount;
  const aus =
    typeof anzahl === "number" && anzahl > 0
      ? ` aus ${formatCount(anzahl)} ${anzahl === 1 ? "Bewertung" : "Bewertungen"}`
      : "";
  return `Bewertung ${formatRating(stats.rating)}${aus}, öffnet Bewertungen`;
}

/**
 * Beruht der Score nur auf einem Teil der Faktoren, sagt der Server das in
 * `scoreHint`. Sichtbar ist dafür kein Platz; vorgelesen wird es mit, damit die
 * Zahl nicht vollständiger klingt, als sie ist.
 */
function scoreLabel(stats: PresenceStats): string {
  if (!Number.isFinite(stats.score)) return "Präsenzscore noch nicht berechnet, öffnet Profil-Check";
  const hinweis = stats.scoreHint?.trim();
  // Ohne Hinweis exakt die bisherige Ansage - die Fixture trägt keinen.
  if (!hinweis) return `Präsenzscore ${stats.score} von 100, öffnet Profil-Check`;
  return `Präsenzscore ${stats.score} von 100. ${hinweis} Öffnet Profil-Check`;
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
