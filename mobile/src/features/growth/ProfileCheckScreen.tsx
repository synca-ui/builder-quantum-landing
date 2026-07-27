import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";

import { CheckIcon } from "../../components/icons";
import { Card } from "../../components/ui/Card";
import { ScoreRing } from "../../components/ui/DataDisplay";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useT } from "../../lib/i18n";
import { useStore } from "../../lib/store";
import { useTheme } from "../../theme";
import {
  PROFILE_ITEMS,
  computeOpenPoints,
  computeProfileScore,
  type ProfileCheckItem,
} from "./profileScore";

type CheckItem = ProfileCheckItem;

/**
 * Screen 10 · Profil Check.
 *
 * Abhaken zählt live hoch und liegt im Store, überlebt also das Verlassen des Screens.
 * Der Ring zeigt den Basiswert plus die Punkte der frisch erledigten Aufgaben - dieselbe
 * Rechnung wie die „Score"-Kachel auf dem Start-Screen (siehe `profileScore`).
 */
export function ProfileCheckScreen() {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();
  const { profileDone, toggleProfileItem } = useStore();

  const isDone = (id: string) => Boolean(profileDone[id]);
  const openPoints = computeOpenPoints(profileDone);
  const score = computeProfileScore(profileDone);

  return (
    <Screen withTabBar contentStyle={{ gap: 18 }}>
      <NavHeader fallback="/wachstum" />

      <Text variant="screenTitle" accessibilityRole="header" style={{ fontSize: 33, lineHeight: 36 }}>
        {t({ de: "Profil Check", en: "Profile check" })}
      </Text>

      <View style={{ alignItems: "center", gap: 10 }}>
        <ScoreRing score={score} />
        <Eyebrow variant="eyebrowLg">
          {t({ de: "Besser als 58 % der Cafés in Köln", en: "Better than 58% of cafés in Cologne" })}
        </Eyebrow>
      </View>

      <Text variant="body" tone="secondary">
        {t({ de: "Offen · bringt dir", en: "Open · earns you" })}{" "}
        <Text variant="body" tone="accent">
          {t({ de: `+${openPoints} Punkte`, en: `+${openPoints} points` })}
        </Text>
      </Text>

      <View style={{ gap: theme.spacing.md }}>
        {PROFILE_ITEMS.map((item) => (
          <CheckRow
            key={item.id}
            item={item}
            done={isDone(item.id)}
            // Speisekarte führt in den echten Editor (schließt sich dort ab), Rest togglet.
            onToggle={() =>
              item.id === "menu" ? router.push("/speisekarte") : toggleProfileItem(item.id)
            }
          />
        ))}
      </View>
    </Screen>
  );
}

function CheckRow({
  item,
  done,
  onToggle,
}: {
  item: CheckItem;
  done: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const t = useT();

  const row = (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={t({ de: `${item.title}, ${item.points} Punkte`, en: `${item.title}, ${item.points} points` })}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        minHeight: theme.hitSize.minTouch,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          // Theme-Tokens statt Hardcodes: reagiert auf Nachtbar- & Barrierefrei-Modus.
          backgroundColor: done ? theme.colors.success : "transparent",
          borderWidth: done ? 0 : 1.5,
          borderColor: theme.colors.borderStrong,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {done ? <CheckIcon size={16} color="#FFFFFF" strokeWidth={2.6} /> : null}
      </View>

      <View style={{ flex: 1 }}>
        <Text
          variant="cardTitleSm"
          tone={done ? "faint" : "primary"}
          style={{ fontSize: 17, textDecorationLine: done ? "line-through" : "none" }}
        >
          {item.title}
        </Text>
        {item.reason && !done ? (
          <Eyebrow style={{ marginTop: 2 }}>{item.reason}</Eyebrow>
        ) : null}
      </View>

      <Text
        variant="numeric"
        color={done ? theme.colors.textFaint : theme.colors.primary}
        style={{ fontSize: 16 }}
      >
        +{item.points}
      </Text>
    </Pressable>
  );

  // Erledigtes verliert die Karte: im Design steht es ohne Fläche in der Liste.
  if (done) {
    return <View style={{ paddingHorizontal: 18 }}>{row}</View>;
  }

  return (
    <Card
      emphasis="subtle"
      padding={0}
      style={{ borderRadius: 18, paddingVertical: theme.spacing.lg, paddingHorizontal: 18 }}
    >
      {row}
    </Card>
  );
}
