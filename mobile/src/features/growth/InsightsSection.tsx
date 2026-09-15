import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { analytics, api, isCoreConfigured, type DailyTask } from "@maitr/core";
import type { Insight, InsightSeverity } from "@maitr/core/analytics";

import { Card } from "../../components/ui/Card";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { ListCard, ListRow } from "../../components/ui/ListCard";
import { LinkAction } from "../../components/ui/PillButton";
import { SwipeToDelete } from "../../components/ui/SwipeToDelete";
import { Text } from "../../components/ui/Text";
import { useVenueDataset } from "../../lib/analytics";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import { aufgabenAusBriefing, aufgabenRoute, aufgabenWirkung, sichtbareEintraege } from "./kanaele";

type AufgabenAbruf = { art: "laedt" } | { art: "fehler" } | { art: "da"; aufgaben: DailyTask[] };

/**
 * „Erkenntnisse" - die sichtbare Spitze des Analytics-Motors.
 *
 * Rendert die vom `buildInsights`-Rechner rangierte Liste: was ist gerade wichtig,
 * warum, und ein Sprung zur Handlung. Der Bereich lässt sich einklappen, einzelne
 * Erkenntnisse per Wisch nach rechts entfernen.
 *
 * ECHTER BETRIEB (Integrationsprüfung 15.09., Punkt 21): Der Demo-Zweig rechnet auf
 * `useVenueDataset` - Fixtures mit DEMO_NOW 2025 -, und genau das sah ein echter
 * Wirt als „Was deine Zahlen dir gerade raten“. Jetzt kommen seine offenen Aufgaben
 * aus `GET /briefing/today`, also aus seinen Serverdaten. Wegwischen verwirft die
 * Aufgabe dort (`dismissTask`, Wiedervorlage nach sieben Tagen), statt sie nur bis
 * zum nächsten Öffnen auszublenden.
 *
 * Titel und Wirkung des Servers gehen nicht ungeprüft durch (Prüfer-Befund 15.09.):
 * `roi_month` („X € Provision gespart“) fällt ganz weg, Wirkungszahlen bleiben nur,
 * wo sie gemessen sind (`aufgabenWirkung`), und eine Aufgabe, die auf diesen Screen
 * selbst zeigt, wird ohne Sprung dargestellt. `aktuelleRoute` ist die Route des
 * Screens, der den Bereich trägt - heute nur das Wachstum.
 */
export function InsightsSection({ limit = 4, aktuelleRoute = "/wachstum" }: { limit?: number; aktuelleRoute?: string }) {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const dataset = useVenueDataset();
  const { hasRealVenue, showcase, venueId } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [abruf, setAbruf] = useState<AufgabenAbruf>({ art: "laedt" });
  const [nonce, setNonce] = useState(0);

  const echterBetrieb = hasRealVenue && !showcase;

  useEffect(() => {
    if (!echterBetrieb) return;
    if (!isCoreConfigured()) {
      setAbruf({ art: "fehler" });
      return;
    }
    const controller = new AbortController();
    setAbruf({ art: "laedt" });
    api.briefing
      .today(venueId, controller.signal)
      .then((antwort) => {
        if (controller.signal.aborted) return;
        const aufgaben = aufgabenAusBriefing(antwort);
        // Falsche Antwortform ist „nicht abrufbar“, nie „keine Aufgaben“.
        setAbruf(aufgaben === null ? { art: "fehler" } : { art: "da", aufgaben });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setAbruf({ art: "fehler" });
      });
    return () => controller.abort();
  }, [echterBetrieb, venueId, nonce]);

  const verwerfen = useCallback(
    (task: DailyTask) => {
      // Sofort ausblenden, bei Fehlschlag zurückholen - sonst stünde „weg“ da,
      // während die Aufgabe beim nächsten Laden wieder auftaucht.
      setDismissed((d) => ({ ...d, [task.id]: true }));
      api.briefing.dismissTask(task.id, venueId).then(
        () => toast.show("Für 7 Tage ausgeblendet"),
        () => {
          setDismissed((d) => {
            const next = { ...d };
            delete next[task.id];
            return next;
          });
          toast.show("Ausblenden hat nicht geklappt. Bitte erneut versuchen.", "fehler");
        },
      );
    },
    [venueId, toast],
  );

  const toggle = (
    <Text
      variant="numeric"
      tone="faint"
      style={{ fontSize: 22, transform: [{ rotate: collapsed ? "0deg" : "90deg" }] }}
    >
      ›
    </Text>
  );

  if (echterBetrieb) {
    const aufgaben = abruf.art === "da" ? sichtbareEintraege(abruf.aufgaben, dismissed, limit) : [];

    return (
      <View style={{ gap: theme.spacing.md }}>
        <ListCard>
          <ListRow
            title="Aufgaben"
            meta="Offen aus deinem Tagesbriefing"
            onPress={() => setCollapsed((c) => !c)}
            trailing={toggle}
          />
        </ListCard>

        {!collapsed ? (
          abruf.art === "laedt" ? (
            <Text variant="bodySm" tone="secondary" style={{ fontSize: 14, paddingHorizontal: 4 }}>
              Aufgaben werden geladen …
            </Text>
          ) : abruf.art === "fehler" ? (
            <Card emphasis="subtle" padding={16} style={{ borderRadius: 18, gap: 4 }}>
              <Text variant="bodySm" tone="secondary" style={{ fontSize: 14, lineHeight: 20 }}>
                Aufgaben sind gerade nicht abrufbar.
              </Text>
              <View style={{ flexDirection: "row" }}>
                <LinkAction label="Erneut versuchen" onPress={() => setNonce((n) => n + 1)} />
              </View>
            </Card>
          ) : aufgaben.length === 0 ? (
            <Text variant="bodySm" tone="secondary" style={{ fontSize: 14, paddingHorizontal: 4 }}>
              Gerade keine offenen Aufgaben.
            </Text>
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              {aufgaben.map((task) => {
                const route = aufgabenRoute(task.primaryAction?.endpoint, aktuelleRoute);
                return (
                  <SwipeToDelete key={task.id} radius={18} label="Ausblenden" onDelete={() => verwerfen(task)}>
                    <AufgabeRow
                      task={task}
                      onPress={route ? () => router.push(route as Href) : undefined}
                    />
                  </SwipeToDelete>
                );
              })}
            </View>
          )
        ) : null}
      </View>
    );
  }

  // Erst weggewischte heraus, DANN kürzen - andersherum blieb nach jedem Wischen
  // ein Platz leer, obwohl weitere Erkenntnisse vorlagen (Prüfbericht Punkt 15).
  const insights = sichtbareEintraege(analytics.buildInsights(dataset), dismissed, limit);
  if (insights.length === 0) return null;

  return (
    <View style={{ gap: theme.spacing.md }}>
      {/* Kopf wie eine Profil-Check-Zeile: eigenständige Karte mit Titel, kurzer
          Beschreibung, was Erkenntnisse sind, und Chevron zum Ein-/Ausklappen. */}
      <ListCard>
        <ListRow
          title="Erkenntnisse"
          meta="Was deine Zahlen dir gerade raten"
          onPress={() => setCollapsed((c) => !c)}
          trailing={toggle}
        />
      </ListCard>

      {!collapsed ? (
        <View style={{ gap: theme.spacing.md }}>
          {insights.map((insight) => (
            <SwipeToDelete
              key={insight.id}
              radius={18}
              onDelete={() => setDismissed((d) => ({ ...d, [insight.id]: true }))}
            >
              <InsightRow
                insight={insight}
                onPress={
                  insight.action?.route ? () => router.push(insight.action!.route as Href) : undefined
                }
              />
            </SwipeToDelete>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const DOT: Record<InsightSeverity, (t: ReturnType<typeof useTheme>) => string> = {
  chance: (t) => t.colors.primary,
  hinweis: (t) => t.colors.textFaint,
  achtung: (t) => t.colors.destructive,
};

function InsightRow({ insight, onPress }: { insight: Insight; onPress?: () => void }) {
  const theme = useTheme();
  const dotColor = DOT[insight.severity](theme);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${insight.title}. ${insight.action?.label ?? ""}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Card emphasis="subtle" padding={16} style={{ borderRadius: 18, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} />
          <Text variant="cardTitleSm" style={{ flex: 1, fontSize: 15.5 }}>
            {insight.title}
          </Text>
          {insight.impact ? (
            <Eyebrow tone="accent" style={{ fontSize: 10 }}>
              {insight.impact}
            </Eyebrow>
          ) : null}
        </View>

        <Text variant="bodySm" tone="secondary" style={{ fontSize: 13.5, lineHeight: 19 }}>
          {insight.detail}
        </Text>

        {insight.action ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
            <Text variant="numeric" tone="accent" style={{ fontSize: 13 }}>
              {insight.action.label}
            </Text>
            <Text variant="numeric" tone="accent" style={{ fontSize: 15 }}>
              ›
            </Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

/**
 * Aufgabe aus dem Server-Briefing. `DailyTask` trägt kein `detail` und keine
 * Schwere (insightToTask in server/maitr/briefing.ts setzt sie nicht) - deshalb
 * nur Titel, Wirkung und Handlung, nichts dazuerfunden. Die Wirkung nur, wenn sie
 * eine Grundlage hat (`aufgabenWirkung`).
 */
function AufgabeRow({ task, onPress }: { task: DailyTask; onPress?: () => void }) {
  const theme = useTheme();
  const label = task.primaryAction?.label;
  const wirkung = aufgabenWirkung(task);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${task.title}${wirkung ? `, ${wirkung}` : ""}${onPress && label ? `. ${label}` : ""}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Card emphasis="subtle" padding={16} style={{ borderRadius: 18, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary }} />
          <Text variant="cardTitleSm" style={{ flex: 1, fontSize: 15.5 }}>
            {task.title}
          </Text>
          {wirkung ? (
            <Eyebrow tone="accent" style={{ fontSize: 10 }}>
              {wirkung}
            </Eyebrow>
          ) : null}
        </View>

        {onPress && label ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
            <Text variant="numeric" tone="accent" style={{ fontSize: 13 }}>
              {label}
            </Text>
            <Text variant="numeric" tone="accent" style={{ fontSize: 15 }}>
              ›
            </Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}
