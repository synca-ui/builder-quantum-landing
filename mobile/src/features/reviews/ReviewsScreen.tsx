import { View } from "react-native";
import { useRouter } from "expo-router";

import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { DarkPanel, Stars, onDarkPanel } from "../../components/ui/DataDisplay";
import { CheckIcon } from "../../components/icons";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { LinkAction, PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { Text } from "../../components/ui/Text";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

import { BewertungenLaden, GoogleBewertungenAnsicht } from "./GoogleBewertungenAnsicht";

export interface Review {
  id: string;
  author: string;
  initials: string;
  rating: number;
  body: string;
  /** Zeitangabe für offene, Statuszeile für beantwortete Reviews. */
  meta: string;
  answeredMeta: string;
  /** Vorgeschlagene Antwort samt gewähltem Ton. */
  suggestion?: { tone: string; text: string };
}

export const reviews: Review[] = [
  {
    id: "rev_marion",
    author: "Marion K.",
    initials: "M",
    rating: 5,
    body:
      "„Bester Flat White in Ehrenfeld, und das Personal merkt sich sogar meinen Namen. Komme jede Woche.\"",
    meta: "Vor 2 Std",
    answeredMeta: "Beantwortet · gerade eben",
    suggestion: {
      tone: "Warmherzig",
      text:
        "„Liebe Marion, das lesen wir mit einem Lächeln, bis nächste Woche steht dein Flat White bereit!\"",
    },
  },
  {
    id: "rev_tobias",
    author: "Tobias R.",
    initials: "T",
    rating: 4,
    body: "„Sehr lecker, nur mittags etwas voll. Kommt aber wieder.\"",
    meta: "Vor 1 Tag",
    answeredMeta: "Beantwortet · Gestern",
  },
];

/**
 * Screen 13 · Bewertungen - seit dem Tabbar-Umbau ein Hauptbereich, nicht mehr ein
 * Unter-Screen von Start.
 *
 * Drei Fälle, entschieden allein über den Store:
 *  - Präsenz da (echter Betrieb, Abruf gelaufen): die öffentlichen Google-Bewertungen
 *    (`GoogleBewertungenAnsicht`). Ohne Google-Freigabe gibt es dort nichts zu
 *    beantworten - also auch kein „Freigeben".
 *  - Echter Betrieb, Präsenz noch nicht da: Laden bzw. „Erneut versuchen". Keine
 *    Demo-Bewertungen als Lückenfüller, die sähen aus wie die eigenen.
 *  - Demomodus und Showcase: die bisherige Vorführung, unverändert.
 *
 * Die Hooks der drei Ansichten stecken in je eigenen Komponenten. Wechselt der Fall
 * (die erste Antwort kommt an), tauscht React die Komponente aus, statt Hooks hinter
 * einer Bedingung ein- oder auszuschalten.
 *
 * Kein `NavHeader`: Als Tab-Wurzel gibt es nichts, wohin ein Zurück-Pfeil führen
 * könnte - Start, Beiträge, Wachstum und Konto tragen aus demselben Grund keinen.
 * Der Weg zurück ist die Tab-Leiste.
 */
export function ReviewsScreen() {
  const { praesenz, praesenzLaedt, aktualisierePraesenz, hasRealVenue, showcase, channels } =
    useStore();

  if (praesenz) {
    return (
      <GoogleBewertungenAnsicht
        praesenz={praesenz}
        laedt={praesenzLaedt}
        aktualisiere={aktualisierePraesenz}
        googleVerbunden={Boolean(channels.google)}
      />
    );
  }
  if (hasRealVenue && !showcase) {
    return <BewertungenLaden laedt={praesenzLaedt} aktualisiere={aktualisierePraesenz} />;
  }
  return <DemoBewertungen />;
}

/**
 * Die Vorführung (Café Goldstück): Antwortstatus liegt im Store, „Freigeben"
 * markiert die Bewertung als beantwortet, der Zähler oben zählt runter, und die
 * Karte verliert Rahmen und Aktionen.
 */
function DemoBewertungen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { reviewAnswered, answerReview } = useStore();

  const isAnswered = (r: Review) => Boolean(reviewAnswered[r.id]);
  const open = reviews.filter((r) => !isAnswered(r)).length;

  const release = (review: Review) => {
    answerReview(review.id, review.author);
    toast.show("Antwort veröffentlicht");
  };

  return (
    <Screen withTabBar contentStyle={{ gap: theme.spacing.lg }}>
      <ScreenHeader
        title="Bewertungen"
        trailing={
          <View style={{ alignItems: "flex-end" }}>
            {/* lineHeight muss mitwachsen, sonst wird die große Zahl oben abgeschnitten. */}
            <Text variant="numeric" style={{ fontSize: 26, lineHeight: 30 }}>
              4,8
            </Text>
            <Eyebrow style={{ fontSize: 10 }}>128 Google</Eyebrow>
          </View>
        }
      />

      <DarkPanel
        style={{
          borderRadius: 18,
          paddingVertical: theme.spacing.lg,
          paddingHorizontal: theme.spacing.xl,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flexShrink: 1 }}>
          {/* Singular/Plural und der Nullfall müssen stimmen - die Zeile steht ganz
              oben im Hauptbereich, „2 wartet auf Antwort" fällt jedem sofort auf. */}
          <Text variant="numeric" color={onDarkPanel.title} style={{ fontSize: 17 }}>
            {open === 0
              ? "Alles beantwortet"
              : open === 1
                ? "1 wartet auf Antwort"
                : `${open} warten auf Antwort`}
          </Text>
          <Eyebrow color={onDarkPanel.meta} style={{ marginTop: 2 }}>
            Ø Antwortzeit 3 Std · Top 10 % in Köln
          </Eyebrow>
        </View>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: onDarkPanel.accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Eine „0" im Akzentkreis liest sich wie ein Fehler; das Häkchen sagt
              dasselbe wie die Überschrift daneben. */}
          {open === 0 ? (
            <CheckIcon size={18} color={onDarkPanel.onAccent} />
          ) : (
            <Text variant="numeric" color={onDarkPanel.onAccent} style={{ fontSize: 16 }}>
              {open}
            </Text>
          )}
        </View>
      </DarkPanel>

      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          answered={isAnswered(review)}
          onRelease={() => release(review)}
          onEdit={() => router.push({ pathname: "/aufgabe/[id]", params: { id: review.id } })}
        />
      ))}
    </Screen>
  );
}

function ReviewCard({
  review,
  answered,
  onRelease,
  onEdit,
}: {
  review: Review;
  answered: boolean;
  onRelease: () => void;
  onEdit: () => void;
}) {
  const theme = useTheme();

  return (
    <Card
      emphasis={answered ? "subtle" : "default"}
      padding={18}
      style={{
        gap: answered ? theme.spacing.sm : 11,
        opacity: answered ? 0.94 : 1,
        // Die offene Bewertung trägt den Teal-Rahmen aus dem Design.
        ...(answered ? {} : { borderWidth: 2, borderColor: theme.colors.primary }),
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Avatar initials={review.initials} size={34} />
          <View>
            <Text variant="numeric" style={{ fontSize: 15 }}>
              {review.author}
            </Text>
            <Eyebrow
              color={answered ? theme.colors.success : theme.colors.textMuted}
              style={{ fontSize: 10 }}
            >
              {answered ? review.answeredMeta : review.meta}
            </Eyebrow>
          </View>
        </View>
        <Stars rating={review.rating} color={theme.colors.textSecondary} />
      </View>

      <Text
        variant="bodySm"
        tone={answered ? "secondary" : "primary"}
        style={{ fontSize: 15, lineHeight: 22.5 }}
      >
        {review.body}
      </Text>

      {review.suggestion && !answered ? (
        <View
          style={{
            backgroundColor: theme.colors.surfaceSunken,
            borderRadius: theme.radius.control,
            padding: 14,
            gap: theme.spacing.sm,
          }}
        >
          <Eyebrow tone="accent" style={{ fontSize: 10 }}>
            Maitr Vorschlag · {review.suggestion.tone}
          </Eyebrow>
          <Text variant="quote" tone="secondary" style={{ fontSize: 14 }}>
            {review.suggestion.text}
          </Text>
        </View>
      ) : null}

      {!answered ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <PillButton label="Freigeben" size="compact" style={{ flex: 1 }} onPress={onRelease} />
          <LinkAction label="Anpassen" onPress={onEdit} />
        </View>
      ) : null}
    </Card>
  );
}
