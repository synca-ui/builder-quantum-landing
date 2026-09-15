import { useEffect, useState, useSyncExternalStore } from "react";
import { Share, View } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { PhotoTile } from "../../components/ui/Media";
import { LinkAction, PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { Text } from "../../components/ui/Text";
import { useStore, type Post } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import {
  entwurfZeile,
  sichtbareBeitraege,
  zuordnungAusSpeicher,
  zuordnungMit,
  type BeitragsZuordnung,
} from "../growth/kanaele";

/**
 * Screen 08 · Beiträge.
 *
 * Demo: Lebenszyklus aus dem Store - Vorschlag → Einplanen → eingeplant → Jetzt
 * veröffentlichen → live. Bearbeiten und Verschieben öffnen den Editor (Screen
 * `beitrag/[id]`). Das alles passiert NUR auf dem Gerät: Es gibt kein Beitragsmodell
 * auf dem Server und keinen Veröffentlichungsweg (die Connectoren lesen nur).
 *
 * Echter Betrieb (Integrationsprüfung 15.09., Punkt 6 und Querschnitt 5): Hier stand
 * „Nichts ist mehr Attrappe“ über einem Seed von Café Goldstück mit „1.284 erreicht“
 * und einem „Jetzt veröffentlichen“, das nur einen Zustand im Speicher umschrieb.
 * Jetzt: sichtbarer Vorschau-Hinweis, nur selbst angelegte Entwürfe, keine
 * Veröffentlichen-Knöpfe. „Text teilen“ reicht den Text an den System-Teilen-Dialog -
 * der einzige Weg, der wirklich etwas nach draußen bringt.
 *
 * Welche Entwürfe „deine“ sind, entscheidet die Beitrags-Zuordnung (unten), nicht
 * das id-Präfix: Sonst sah ein Wirt Demo-Schnellbeiträge und die Entwürfe eines
 * vorher angemeldeten Kontos (Prüfer-Befund 15.09.).
 */
export function PostsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { posts, schedulePost, publishPost, hasRealVenue, showcase, venueId } = useStore();
  const [week, setWeek] = useState(29);
  const zuordnung = useBeitragsZuordnung();

  const echterBetrieb = hasRealVenue && !showcase;
  const sichtbar = sichtbareBeitraege(posts, echterBetrieb, zuordnung.zuordnung, venueId);

  if (echterBetrieb) {
    const entwuerfe = sichtbar;

    const teilen = async (post: Post) => {
      try {
        await Share.share({ message: post.title });
      } catch {
        toast.show("Teilen ließ sich nicht öffnen", "fehler");
      }
    };

    return (
      <Screen withTabBar contentStyle={{ gap: theme.spacing.lg }}>
        {/* Keine KW mit Blätterer: Entwürfe hängen an keiner Woche. */}
        <ScreenHeader title="Beiträge" />

        <VorschauHinweis />

        <PillButton
          label="Neuer Entwurf"
          variant="outline"
          size="compact"
          onPress={() => router.push("/schnell-posten")}
        />

        {!zuordnung.geladen ? (
          // Solange die Zuordnung liest, wäre „Noch keine Entwürfe“ geraten.
          <Text variant="bodySm" tone="secondary" style={{ fontSize: 14, paddingHorizontal: 4 }}>
            Entwürfe werden geladen …
          </Text>
        ) : entwuerfe.length === 0 ? (
          <EmptyState
            title="Noch keine Entwürfe"
            message="Schreib einen Entwurf und teile den Text von hier aus selbst in Instagram oder Google."
          />
        ) : (
          entwuerfe.map((post) => (
            <Card key={post.id} emphasis="default" padding={theme.spacing.lg} style={{ gap: theme.spacing.md }}>
              <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
                <PhotoTile tone={post.tone} size={74} caption="foto" />
                <View style={{ flex: 1, gap: 5 }}>
                  <Eyebrow>{entwurfZeile(post)}</Eyebrow>
                  <Text variant="cardTitleSm">{post.title}</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
                <PillButton
                  label="Text teilen"
                  size="compact"
                  variant="ink"
                  style={{ flex: 1 }}
                  onPress={() => void teilen(post)}
                />
                <LinkAction
                  label="Bearbeiten"
                  onPress={() => router.push({ pathname: "/beitrag/[id]", params: { id: post.id } })}
                />
              </View>
            </Card>
          ))
        )}
      </Screen>
    );
  }

  return (
    <Screen withTabBar contentStyle={{ gap: theme.spacing.lg }}>
      <ScreenHeader
        title="Beiträge"
        period={`KW ${week}`}
        onPrevious={() => setWeek((w) => w - 1)}
        onNext={() => setWeek((w) => w + 1)}
      />

      <PillButton
        label="Schnell posten"
        variant="outline"
        size="compact"
        onPress={() => router.push("/schnell-posten")}
      />

      {sichtbar.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onPlan={() => {
            schedulePost(post.id);
            toast.show("Beitrag eingeplant");
          }}
          onPublish={() => {
            publishPost(post.id);
            toast.show("Beitrag veröffentlicht");
          }}
          onEdit={() => router.push({ pathname: "/beitrag/[id]", params: { id: post.id } })}
        />
      ))}

      <Eyebrow tone="faint" style={{ textAlign: "center", marginTop: theme.spacing.sm }}>
        Maitr schlägt jede Woche 3 Beiträge aus deinen Fotos vor
      </Eyebrow>
    </Screen>
  );
}

/* ── Beitrags-Zuordnung ──────────────────────────────────────────────────────
 *
 * Entwurf → Betrieb, auf dem Gerät gespeichert. Gehört eigentlich an den Beitrag im
 * Store (venueId am Post, und `signOut` räumt die Entwürfe) - der Store liegt aber
 * außerhalb dieser Screens. Bis dahin hält dieser kleine gemeinsame Stand die
 * Zuordnung: Beitragsliste, Editor und Schnell-Posten lesen denselben Wert, auch
 * wenn zwei davon gleichzeitig im Stapel liegen (Schnell-Posten über der Liste).
 * Persistiert, weil die Beiträge selbst persistiert sind - ein nach dem Neustart
 * verschwundener Entwurf widerspräche „als Entwurf gemerkt“.
 */

const ZUORDNUNG_SCHLUESSEL = "maitr.beitraege.betrieb.v1";

type ZuordnungStand = { geladen: boolean; zuordnung: BeitragsZuordnung };

let zuordnungStand: ZuordnungStand = { geladen: false, zuordnung: {} };
const zuordnungHoerer = new Set<() => void>();
let zuordnungLaden: Promise<void> | null = null;

function setzeZuordnung(naechster: ZuordnungStand) {
  zuordnungStand = naechster;
  zuordnungHoerer.forEach((hoerer) => hoerer());
}

/**
 * Einmal lesen. Scheitert das Lesen, gilt der Stand trotzdem als geladen (leer ist
 * hier die sichere Seite: kein Entwurf wird einem Betrieb zugeschlagen), und der
 * nächste Aufruf versucht es erneut.
 */
function ladeZuordnung(): Promise<void> {
  if (!zuordnungLaden) {
    zuordnungLaden = AsyncStorage.getItem(ZUORDNUNG_SCHLUESSEL).then(
      (roh) => {
        // Was in dieser Sitzung schon gemerkt wurde, gewinnt gegen den Speicherstand.
        setzeZuordnung({
          geladen: true,
          zuordnung: { ...zuordnungAusSpeicher(roh), ...zuordnungStand.zuordnung },
        });
      },
      (fehler: unknown) => {
        zuordnungLaden = null;
        setzeZuordnung({ geladen: true, zuordnung: zuordnungStand.zuordnung });
        throw fehler;
      },
    );
  }
  return zuordnungLaden;
}

function abonniereZuordnung(hoerer: () => void) {
  zuordnungHoerer.add(hoerer);
  return () => {
    zuordnungHoerer.delete(hoerer);
  };
}

function leseZuordnung() {
  return zuordnungStand;
}

export function useBeitragsZuordnung(): ZuordnungStand {
  const stand = useSyncExternalStore(abonniereZuordnung, leseZuordnung);
  useEffect(() => {
    ladeZuordnung().catch(() => {
      // Lesefehler: Stand ist leer-geladen, siehe ladeZuordnung.
    });
  }, []);
  return stand;
}

/**
 * Einen gerade angelegten Entwurf dem Betrieb zuordnen. Sofort im Speicher (die
 * Liste zeigt ihn gleich), dann auf dem Gerät. Wirft, wenn das Speichern scheitert -
 * dann gilt der Entwurf nur bis zum nächsten App-Start, und das muss der Wirt wissen.
 */
export async function merkeEigenenEntwurf(
  postId: string,
  venueId: string,
  vorhandeneIds: readonly string[],
): Promise<void> {
  let gelesen = true;
  try {
    await ladeZuordnung();
  } catch {
    gelesen = false;
  }
  const zuordnung = zuordnungMit(zuordnungStand.zuordnung, postId, venueId, vorhandeneIds);
  setzeZuordnung({ geladen: true, zuordnung });
  // Ohne gelesenen Speicherstand würde Schreiben ältere Zuordnungen überschreiben
  // und damit fremde wie eigene Entwürfe unsichtbar machen.
  if (!gelesen) throw new Error("Beitrags-Zuordnung nicht lesbar");
  await AsyncStorage.setItem(ZUORDNUNG_SCHLUESSEL, JSON.stringify(zuordnung));
}

/**
 * Der Hinweis, den Beitragsliste, Editor und Schnell-Posten im echten Betrieb
 * tragen. Ein Baustein statt dreier Texte, damit sie nicht auseinanderlaufen.
 */
export function VorschauHinweis() {
  const theme = useTheme();
  return (
    <Card variant="sunken" padding={theme.spacing.lg} style={{ gap: 4, borderRadius: 16 }}>
      <Eyebrow tone="secondary">Vorschau · Beiträge werden noch nicht veröffentlicht</Eyebrow>
      <Text variant="bodySm" tone="secondary" style={{ fontSize: 13.5, lineHeight: 19 }}>
        Maitr merkt sich deine Entwürfe auf diesem Gerät. Posten musst du sie selbst.
      </Text>
    </Card>
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

  const slotColor = post.state === "suggestion" ? theme.colors.primary : theme.colors.textMuted;
  const channels = post.channels.join(" + ");
  const slot =
    post.state === "suggestion"
      ? `Vorschlag · ${post.when} · ${channels}`
      : post.state === "live"
        ? `Live · ${post.when} · ${channels}`
        : `Eingeplant · ${post.when} · ${channels}`;

  return (
    <Card
      emphasis={post.state === "suggestion" ? "default" : "subtle"}
      padding={theme.spacing.lg}
      style={{ gap: theme.spacing.md, opacity: post.state === "suggestion" ? 1 : 0.96 }}
    >
      <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
        <PhotoTile tone={post.tone} size={74} caption="foto" />

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
            <PillButton label="Einplanen" size="compact" style={{ flex: 1 }} onPress={onPlan} />
            <LinkAction label="Bearbeiten" onPress={onEdit} />
          </View>
        </>
      ) : post.state === "scheduled" ? (
        // Nach dem Einplanen: veröffentlichen oder verschieben (Editor).
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
          <PillButton
            label="Jetzt veröffentlichen"
            size="compact"
            variant="ink"
            style={{ flex: 1 }}
            onPress={onPublish}
          />
          <LinkAction label="Verschieben" onPress={onEdit} />
        </View>
      ) : null}
    </Card>
  );
}
