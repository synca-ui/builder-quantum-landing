import { ActivityIndicator, Pressable, View } from "react-native";
import { useRouter, type Href } from "expo-router";

import { AlertIcon, BellIcon, PostIcon, StarIcon, TableIcon, TargetIcon, type IconProps } from "../../components/icons";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { LinkAction, PillButton } from "../../components/ui/PillButton";
import { NavHeader } from "../../components/ui/NavHeader";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import type { InboxItem, InboxKind } from "../../lib/store";
import { useTheme } from "../../theme";
import { usePosteingang } from "./usePosteingang";

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
 *
 * Für einen echten Betrieb kommen die Einträge aus `usePosteingang` (offene
 * Anfragen, Präsenz-Warnungen, neue Google-Bewertungen). Leer heißt dort „nichts
 * Neues" nur, wenn beide Quellen geantwortet haben - Google zählt dabei nur mit
 * einem Eintrag (oder einem ausdrücklichen „nicht gefunden"), nicht schon mit
 * irgendeinem Präsenzstand. Sonst sagt der Screen, was sich nicht abrufen ließ.
 */
export function InboxScreen() {
  const theme = useTheme();
  const router = useRouter();
  const posteingang = usePosteingang();
  const { echterBetrieb, eintraege, gelesen, ungelesen, laedt, fehler, googleFehlt } = posteingang;

  const open = (item: InboxItem) => {
    posteingang.markiereGelesen(item.id);
    router.push(item.href as Href);
  };

  const teilweiseFehlend = echterBetrieb && (fehler || googleFehlt);

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader
        title="Posteingang"
        trailing={ungelesen > 0 ? <LinkAction label="Alle gelesen" onPress={posteingang.alleGelesen} /> : undefined}
      />

      {eintraege.length > 0 ? (
        <Eyebrow>{ungelesen > 0 ? `${ungelesen} ungelesen` : "Alles gelesen"}</Eyebrow>
      ) : null}

      {/* Einträge da, aber eine Quelle fehlt: sagen, was womöglich fehlt - sonst
          liest sich die Liste wie vollständig. */}
      {eintraege.length > 0 && teilweiseFehlend && !laedt ? (
        <HinweisKarte text={teilHinweis(fehler, googleFehlt)} onErneut={posteingang.erneutVersuchen} />
      ) : null}

      <View style={{ gap: theme.spacing.md }}>
        {eintraege.map((item) => {
          const read = gelesen[item.id];
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
                {item.body ? (
                  <Text variant="bodySm" tone="secondary" style={{ fontSize: 14 }} numberOfLines={2}>
                    {item.body}
                  </Text>
                ) : null}
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

      {echterBetrieb && eintraege.length === 0 ? (
        laedt ? (
          <Card
            emphasis="subtle"
            padding={theme.spacing.xxl}
            style={{ alignItems: "center", gap: theme.spacing.md, borderRadius: 18 }}
          >
            <ActivityIndicator size="small" color={theme.colors.textMuted} />
            <Text variant="bodySm" tone="secondary" style={{ textAlign: "center", fontSize: 14 }}>
              Posteingang wird geladen …
            </Text>
          </Card>
        ) : teilweiseFehlend ? (
          <View style={{ gap: theme.spacing.md }}>
            <EmptyState
              title={fehler ? "Posteingang gerade nicht abrufbar" : "Posteingang nur teilweise abrufbar"}
              message={leerHinweis(fehler, googleFehlt)}
            />
            <PillButton label="Erneut versuchen" onPress={posteingang.erneutVersuchen} />
          </View>
        ) : (
          // Erreicht nur, wenn Anfragen UND Google geantwortet haben - erst dann ist
          // „keine neuen Google-Bewertungen" eine Aussage und keine Vermutung.
          <EmptyState
            title="Nichts Neues"
            message="Keine offenen Reservierungsanfragen, keine neuen Google-Bewertungen, keine Warnungen aus dem Profil-Check."
          />
        )
      ) : null}

      <View style={{ alignItems: "center", marginTop: theme.spacing.sm }}>
        <BellIcon size={18} color={theme.colors.textFaint} />
        {echterBetrieb ? (
          // Nur nennen, was hier wirklich ankommt - und die Grenze der Quelle: Ohne
          // Google-Freigabe gibt Google fünf Bewertungen heraus, nicht jede neue.
          <Text
            variant="bodySm"
            tone="faint"
            style={{ marginTop: theme.spacing.xs, textAlign: "center", fontSize: 13, lineHeight: 18 }}
          >
            Hier landen offene Reservierungsanfragen, neue Google-Bewertungen der letzten 7 Tage und
            Warnungen aus dem Profil-Check. Ohne Google-Freigabe zeigt Google nur fünf Bewertungen -
            nicht jede neue erscheint hier.
          </Text>
        ) : (
          <Eyebrow tone="faint" style={{ marginTop: theme.spacing.xs, textAlign: "center" }}>
            Maitr sammelt hier, was dein Betrieb braucht
          </Eyebrow>
        )}
      </View>
    </Screen>
  );
}

/** Über einer gefüllten Liste: welche Quelle fehlt. */
function teilHinweis(fehler: boolean, googleFehlt: boolean): string {
  if (fehler && googleFehlt) {
    return "Reservierungsanfragen und Google-Stand ließen sich gerade nicht abrufen - hier fehlt womöglich etwas.";
  }
  if (fehler) return "Reservierungsanfragen ließen sich gerade nicht abrufen - neue fehlen hier womöglich.";
  return "Google-Stand gerade nicht abrufbar - neue Bewertungen und Profil-Warnungen fehlen hier womöglich.";
}

/** Leere Liste mit Fehler: sagen, was geklappt hat und was nicht. */
function leerHinweis(fehler: boolean, googleFehlt: boolean): string {
  if (fehler && googleFehlt) {
    return "Weder Reservierungsanfragen noch Google-Stand ließen sich abrufen. Prüfe die Verbindung.";
  }
  // Nur Anfragen fehlen: Google hat mit einem Eintrag geantwortet (`googleFehlt`
  // ist false), „keine" ist dort also belegt.
  if (fehler) {
    return "Die Reservierungsanfragen ließen sich nicht abrufen. Neue Google-Bewertungen und Profil-Warnungen gibt es keine.";
  }
  return "Keine offenen Reservierungsanfragen. Den Google-Stand (Bewertungen, Profil-Warnungen) konnte Maitr gerade nicht abrufen.";
}

function HinweisKarte({ text, onErneut }: { text: string; onErneut: () => void }) {
  const theme = useTheme();
  return (
    <Card
      emphasis="subtle"
      padding={theme.spacing.lg}
      style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm, borderRadius: 18 }}
    >
      {/* 2 pt nach unten: Icon (16) auf die erste Textzeile (lineHeight 20) mitteln. */}
      <View style={{ marginTop: 2 }}>
        <AlertIcon size={16} color={theme.colors.textMuted} />
      </View>
      <View style={{ flexShrink: 1, gap: 2 }}>
        <Text variant="bodySm" tone="secondary" style={{ fontSize: 14, lineHeight: 20 }}>
          {text}
        </Text>
        <View style={{ flexDirection: "row" }}>
          <LinkAction label="Erneut versuchen" labelSize={14} onPress={onErneut} />
        </View>
      </View>
    </Card>
  );
}
