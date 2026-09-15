import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useRouter } from "expo-router";

import { CheckIcon } from "../../components/icons";
import { Card } from "../../components/ui/Card";
import { ScoreRing } from "../../components/ui/DataDisplay";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useStore } from "../../lib/store";
import { useTheme } from "../../theme";
import {
  PROFILE_ITEMS,
  computeOpenPoints,
  computeProfileScore,
  type ProfileCheckItem,
} from "./profileScore";
import { PraesenzBerichtAnsicht } from "./PraesenzBerichtAnsicht";

type CheckItem = ProfileCheckItem;

/**
 * Screen 10 · Profil Check.
 *
 * Drei Zustände, entschieden allein über die Darstellung (die Hooks laufen immer
 * gleich, egal welcher greift):
 *  - Präsenzbericht liegt vor → `PraesenzBerichtAnsicht`: Score, Hebel und Befunde
 *    aus Google, Website und Maitr, wie der Server sie gerechnet hat.
 *  - Echter Betrieb, aber (noch) kein Bericht → ehrlicher Lade- bzw. Leerzustand.
 *    Früher sah der Wirt hier die Demo-Liste mit „Besser als 58 %" - Zahlen, die
 *    nie jemand für seinen Betrieb gemessen hat. Welcher Text dort steht, hängt an
 *    `venueKnown`, nicht allein an `praesenzLaedt`: siehe `leerZustand`.
 *  - Demomodus und Showcase → die Vorführansicht, unverändert: Abhaken zählt live
 *    hoch und liegt im Store; der Ring zeigt den Basiswert plus die Punkte der
 *    frisch erledigten Aufgaben - dieselbe Rechnung wie die „Score"-Kachel auf dem
 *    Start-Screen (siehe `profileScore`).
 */
export function ProfileCheckScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
    profileDone,
    toggleProfileItem,
    praesenz,
    praesenzLaedt,
    aktualisierePraesenz,
    hasRealVenue,
    showcase,
    venueKnown,
  } = useStore();

  /* Hat dieser Screen `venueKnown === "bekannt"` schon einen Render lang gesehen?
     Der Store stößt den Präsenzabruf in einem Effekt an, also erst NACH dem Render,
     in dem der Betrieb bekannt wurde. In genau diesem einen Render gilt „bekannt",
     aber noch nicht `praesenzLaedt` - ohne diese Verzögerung blitzte dort kurz
     „nicht abrufbar" auf, obwohl der Abruf gerade erst losgeht. Der Effekt hier und
     der des Stores laufen im selben Durchgang, ihre Updates landen gemeinsam im
     nächsten Render. Wer den Screen erst öffnet, wenn der Betrieb längst bekannt
     ist, startet direkt mit `true` - dort lief der Abruf schon. */
  const [bekanntGesehen, setBekanntGesehen] = useState(venueKnown === "bekannt");
  useEffect(() => {
    setBekanntGesehen(venueKnown === "bekannt");
  }, [venueKnown]);

  const isDone = (id: string) => Boolean(profileDone[id]);
  const openPoints = computeOpenPoints(profileDone);
  const score = computeProfileScore(profileDone);

  const kopf = (
    <>
      <NavHeader fallback="/wachstum" />

      <Text variant="screenTitle" accessibilityRole="header" style={{ fontSize: 33, lineHeight: 36 }}>
        Profil Check
      </Text>
    </>
  );

  if (praesenz) {
    return (
      <Screen withTabBar contentStyle={{ gap: 18 }}>
        {kopf}
        <PraesenzBerichtAnsicht
          praesenz={praesenz}
          laedt={praesenzLaedt}
          onAktualisieren={aktualisierePraesenz}
        />
      </Screen>
    );
  }

  // Echter Betrieb ohne Bericht: KEINE Demo-Werte als Lückenfüller. Der Store holt
  // den Bericht selbst, sobald der Betrieb bekannt ist; hier steht nur, dass er
  // kommt - oder dass er gerade nicht kam und wie man es noch einmal versucht.
  //
  // `hasRealVenue` allein reicht für diese Aussage nicht: Es prüft nur, ob eine
  // echte Kennung im Store steht - und die stellt der Gerätespeicher beim Kaltstart
  // wieder her, bevor `GET /venues` geantwortet hat. Der Store fragt die Präsenz
  // aber erst bei `venueKnown === "bekannt"` ab. Bis dahin lief also KEINE Prüfung,
  // und „hat nicht geklappt" wäre eine Behauptung über einen Abruf, den es nie gab.
  if (hasRealVenue && !showcase) {
    const leerZustand: "verbinden" | "keinBetrieb" | "pruefen" | "fehlgeschlagen" =
      venueKnown === "unbekannt"
        ? "verbinden"
        : venueKnown === "keiner"
          ? "keinBetrieb"
          : praesenzLaedt || !bekanntGesehen
            ? "pruefen"
            : "fehlgeschlagen";

    return (
      <Screen withTabBar contentStyle={{ gap: 18 }}>
        {kopf}
        <Card
          emphasis="subtle"
          padding={theme.spacing.xxl}
          style={{ alignItems: "center", gap: theme.spacing.md, borderRadius: 18 }}
        >
          {leerZustand === "verbinden" ? (
            // Wartet auf `GET /venues`. Ohne Netz bleibt es womöglich dabei - deshalb
            // kein Text, der eine laufende Google- oder Website-Prüfung behauptet.
            <>
              <ActivityIndicator color={theme.colors.primary} />
              <Text variant="bodySm" tone="secondary" style={{ textAlign: "center", fontSize: 14.5, lineHeight: 21 }}>
                Wir verbinden mit deinem Betrieb …
              </Text>
              <Text variant="bodySm" tone="faint" style={{ textAlign: "center", fontSize: 13, lineHeight: 19 }}>
                Dein Präsenzbericht folgt, sobald der Server deinen Betrieb bestätigt hat.
              </Text>
            </>
          ) : leerZustand === "keinBetrieb" ? (
            // `GET /venues` war leer, die gespeicherte Kennung ist also nicht (mehr)
            // die dieser Anmeldung. „Erneut versuchen" fragte dann die Präsenz eines
            // fremden Betriebs ab, bekäme 403 und landete wieder hier - daher ohne Knopf.
            <>
              <Text variant="cardTitleSm" style={{ textAlign: "center", fontSize: 17 }}>
                Noch kein Betrieb hinterlegt
              </Text>
              <Text variant="bodySm" tone="secondary" style={{ textAlign: "center", fontSize: 14, lineHeight: 20 }}>
                Zu dieser Anmeldung gehört noch kein Betrieb. Sobald er eingerichtet ist, erscheint hier sein Präsenzbericht.
              </Text>
            </>
          ) : leerZustand === "pruefen" ? (
            <>
              <ActivityIndicator color={theme.colors.primary} />
              <Text variant="bodySm" tone="secondary" style={{ textAlign: "center", fontSize: 14.5, lineHeight: 21 }}>
                Wir prüfen gerade, wie Gäste dich bei Google und auf deiner Website finden.
              </Text>
            </>
          ) : (
            // Nur hier ist tatsächlich ein Abruf gelaufen und ohne Bericht zurückgekommen
            // (kein Netz, Serverfehler, unerwartete Antwort) - erst jetzt ist
            // „nicht abrufbar" wahr und ein neuer Versuch sinnvoll.
            <>
              <Text variant="cardTitleSm" style={{ textAlign: "center", fontSize: 17 }}>
                Präsenz gerade nicht abrufbar
              </Text>
              <Text variant="bodySm" tone="secondary" style={{ textAlign: "center", fontSize: 14, lineHeight: 20 }}>
                Wir konnten deinen Präsenzbericht gerade nicht laden.
              </Text>
              <PillButton
                label="Erneut versuchen"
                size="compact"
                onPress={() => void aktualisierePraesenz()}
                style={{ marginTop: theme.spacing.xs }}
              />
            </>
          )}
        </Card>
      </Screen>
    );
  }

  return (
    <Screen withTabBar contentStyle={{ gap: 18 }}>
      {kopf}

      <View style={{ alignItems: "center", gap: 10 }}>
        <ScoreRing score={score} />
        <Eyebrow variant="eyebrowLg">Besser als 58 % der Cafés in Köln</Eyebrow>
      </View>

      <Text variant="body" tone="secondary">
        Offen · bringt dir{" "}
        <Text variant="body" tone="accent">
          +{openPoints} Punkte
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

  const row = (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`${item.title}, ${item.points} Punkte`}
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
