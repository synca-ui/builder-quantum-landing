import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { analytics, api, isCoreConfigured, type VenuePresence } from "@maitr/core";

import { Card } from "../../components/ui/Card";
import { BarChart, DarkPanel, StatTile, onDarkPanel } from "../../components/ui/DataDisplay";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { ListCard, ListRow } from "../../components/ui/ListCard";
import { LinkAction, PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { Text } from "../../components/ui/Text";
import { useVenueDataset } from "../../lib/analytics";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import { computeOpenPoints, computeProfileScore } from "./profileScore";
import { InsightsSection } from "./InsightsSection";
import {
  bewertungKachel,
  kanalZaehlung,
  reservierungKachel,
  sichtbarkeitHinweis,
  zaehleKommendeReservierungen,
  type ReservierungsAbruf,
} from "./kanaele";

const MONTHS = ["F", "M", "A", "M", "J", "J"];

/** Zeitraum der Reservierungskachel - die Vorgabe von `reservations.upcoming`. */
const RESERVIERUNG_TAGE = 14;

/**
 * Screen 09 · Dein Juli.
 *
 * Der Monatsrückblick mit vier antippbaren Kennzahlen (Aufrufe, Bewertungen,
 * Reservierungen, Routen) - jede öffnet ihre Detail-Kurve. Zugleich Einstieg in
 * Profil-Check (10) und Kanäle (11).
 *
 * ECHTER BETRIEB (Integrationsprüfung 15.09., Punkte 2 und 23): Kacheln, Chart,
 * „Ø +15 %“, ROI-Panel und Empfehlungs-Panel hatten keine Quelle und zeigten
 * einem echten Wirt den Juli von Café Goldstück - ein Eyebrow „Beispielwerte“
 * darüber machte das nur halb ehrlich. Jetzt steht dort, was es gibt: Googles
 * Bewertungsschnitt aus der Präsenz (ohne Delta, es gibt keine Historie), die
 * kommenden Reservierungen vom Server und ein Hinweis, warum Aufrufe fehlen.
 * Demo und Showcase zeigen den Vorführzustand wie bisher.
 */
export function GrowthScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { profileDone, channels, growthMetrics, praesenz, praesenzLaedt, hasRealVenue, showcase, venueId } =
    useStore();
  const dataset = useVenueDataset();
  const [year, setYear] = useState(2026);
  const [reservierungen, setReservierungen] = useState<ReservierungsAbruf>({ art: "laedt" });

  // Demo und Showcase zeigen den Vorführzustand; nur ein echter Betrieb wird gemessen.
  const echterBetrieb = hasRealVenue && !showcase;

  // Kommende Reservierungen nur für den echten Betrieb. Ein Fehlschlag heißt
  // „nicht abrufbar“ - nie 0, das wäre eine Aussage über den Betrieb.
  useEffect(() => {
    if (!echterBetrieb) return;
    if (!isCoreConfigured()) {
      setReservierungen({ art: "fehler" });
      return;
    }
    const controller = new AbortController();
    setReservierungen({ art: "laedt" });
    api.reservations
      .upcoming(venueId, RESERVIERUNG_TAGE, controller.signal)
      .then((antwort) => {
        if (controller.signal.aborted) return;
        const anzahl = zaehleKommendeReservierungen(antwort);
        setReservierungen(anzahl === null ? { art: "fehler" } : { art: "da", anzahl });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setReservierungen({ art: "fehler" });
      });
    return () => controller.abort();
  }, [echterBetrieb, venueId]);

  // Score aus der geteilten Quelle (siehe profileScore) - identisch zu Start & Ring.
  // Liegt ein Präsenzbericht vor, gilt dessen Score: gemessen aus Google, Website
  // und Maitr statt aus vier lokal abgehakten Kästchen. Die offenen Punkte sind
  // dann die Summe dessen, was die Hebel des Berichts zusammen bringen würden.
  const score = praesenz ? praesenz.bericht.score : computeProfileScore(profileDone);
  const openPoints = praesenz
    ? Math.round(praesenz.bericht.hebel.reduce((summe, h) => summe + h.punkte, 0))
    : computeOpenPoints(profileDone);
  const profilCheckMeta = profilCheckZeile({
    praesenz,
    echterBetrieb,
    laedt: praesenzLaedt,
    score,
    openPoints,
  });
  // Echt zählen nur Kanäle mit Connector (Google, Instagram, Facebook) - siehe kanaele.ts.
  const kanaele = kanalZaehlung(channels, echterBetrieb);

  // ROI in Euro: provisionsfreie Reservierungen × Ø-Umsatz × gesparte Provision.
  const roi = analytics.reservationRoi(dataset.reservations, dataset.averageCheck);
  const euro = (v: number) => `${Math.round(v).toLocaleString("de-DE")} €`;

  const openMetric = (key: string) =>
    router.push({ pathname: "/kennzahl/[key]", params: { key } });

  const aufrufe = growthMetrics.find((m) => m.key === "aufrufe")!;

  if (echterBetrieb) {
    const bewertung = bewertungKachel(praesenz, praesenzLaedt);
    const reservierung = reservierungKachel(reservierungen, RESERVIERUNG_TAGE);
    const hinweis = sichtbarkeitHinweis(channels.google === true);

    return (
      <Screen withTabBar contentStyle={{ gap: 14 }}>
        {/* Kein „Dein Juli“ mit Jahresblätterer: Nichts hier ist ein Monatswert. */}
        <ScreenHeader title="Wachstum" />

        <Eyebrow>Aus Google Maps und deinen Reservierungen</Eyebrow>

        <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
          <Pressable
            onPress={() => router.push("/bewertungen")}
            accessibilityRole="button"
            accessibilityLabel={`Bewertungen ${bewertung.value}, ${bewertung.delta}, Bewertungen öffnen`}
            style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
          >
            <StatTile label="Bewertungen" value={bewertung.value} delta={bewertung.delta} trend="flat" />
          </Pressable>
          <View
            accessible
            accessibilityLabel={`Reservierungen ${reservierung.value}, ${reservierung.delta}`}
            style={{ flex: 1 }}
          >
            <StatTile label="Reservierungen" value={reservierung.value} delta={reservierung.delta} trend="flat" />
          </View>
        </View>

        <Card padding={theme.spacing.xl} style={{ borderRadius: 18, gap: 8 }}>
          <Text variant="numeric" style={{ fontSize: 17 }}>
            Aufrufe & Routen
          </Text>
          <Text variant="bodySm" tone="secondary" style={{ fontSize: 14, lineHeight: 20 }}>
            {hinweis.text}
          </Text>
          {hinweis.verbindenZeigen ? (
            <View style={{ flexDirection: "row" }}>
              <LinkAction label="Google verbinden" onPress={() => router.push("/kanal/google")} />
            </View>
          ) : null}
        </Card>

        <InsightsSection />

        <ListCard>
          <ListRow
            title="Profil Check"
            meta={profilCheckMeta}
            onPress={() => router.push("/profil-check")}
            trailing={<Chevron />}
          />
          <ListRow
            title="Deine Kanäle"
            meta={
              kanaele.offen > 0
                ? `${kanaele.verbunden} verbunden · ${kanaele.offen} offen`
                : `${kanaele.verbunden} verbunden`
            }
            onPress={() => router.push("/kanaele")}
            trailing={<Chevron />}
          />
          <ListRow
            title="Auslastung füllen"
            meta="Braucht Gästedaten, noch nicht verfügbar"
            onPress={() => router.push("/kampagne")}
            trailing={<Chevron />}
          />
          {/* Ohne Link: Der Benchmark rechnet heute auf Beispieldaten, und ein
              Stadt-Perzentil gibt es für echte Betriebe nicht (Prüfbericht Punkt 37). */}
          <ListRow title="Vergleich mit anderen Betrieben" meta="Noch keine Vergleichsdaten" />
        </ListCard>
      </Screen>
    );
  }

  return (
    <Screen withTabBar contentStyle={{ gap: 14 }}>
      <ScreenHeader
        title="Dein Juli"
        period={String(year)}
        onPrevious={() => setYear((y) => y - 1)}
        onNext={() => setYear((y) => y + 1)}
      />

      <View style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
          {growthMetrics.slice(0, 2).map((m) => (
            <Pressable
              key={m.key}
              onPress={() => openMetric(m.key)}
              accessibilityRole="button"
              accessibilityLabel={`${m.label} ${m.value}, Details`}
              style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
            >
              <StatTile label={m.label} value={m.value} delta={m.delta} trend={m.trend} />
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
          {growthMetrics.slice(2, 4).map((m) => (
            <Pressable
              key={m.key}
              onPress={() => openMetric(m.key)}
              accessibilityRole="button"
              accessibilityLabel={`${m.label} ${m.value}, Details`}
              style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
            >
              <StatTile label={m.label} value={m.value} delta={m.delta} trend={m.trend} />
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        onPress={() => openMetric("aufrufe")}
        accessibilityRole="button"
        accessibilityLabel="Aufrufe-Verlauf öffnen"
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <Card padding={theme.spacing.xl} style={{ borderRadius: 18, gap: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
            <Text variant="numeric" style={{ fontSize: 17 }}>
              Aufrufe · 6 Monate
            </Text>
            <Eyebrow>Ø +15 %/Monat</Eyebrow>
          </View>
          <BarChart
            data={aufrufe.series.map((value, i) => ({ label: MONTHS[i], value }))}
            highlightIndex={5}
          />
        </Card>
      </Pressable>

      <DarkPanel style={{ gap: 6 }}>
        <Eyebrow color={onDarkPanel.meta}>Provisionsfrei über Maitr</Eyebrow>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
          <Text variant="numeric" color={onDarkPanel.title} style={{ fontSize: 30, lineHeight: 34 }}>
            {euro(roi.savedCommission)}
          </Text>
          <Text variant="bodySm" color={onDarkPanel.body} style={{ fontSize: 13 }}>
            gespart diesen Monat
          </Text>
        </View>
        <Text variant="bodySm" color={onDarkPanel.body} style={{ fontSize: 13.5, lineHeight: 19 }}>
          {roi.reservations} Reservierungen · {roi.covers} Gäste · {euro(roi.revenue)} vermittelt.
          Hochgerechnet {euro(roi.savedCommissionAnnualized)} im Jahr, die nicht an Plattformen gehen.
        </Text>
      </DarkPanel>

      <InsightsSection />

      <ListCard>
        <ListRow
          title="Profil Check"
          meta={profilCheckMeta}
          onPress={() => router.push("/profil-check")}
          trailing={<Chevron />}
        />
        <ListRow
          title="Deine Kanäle"
          meta={
            kanaele.offen > 0
              ? `${kanaele.verbunden} verbunden · ${kanaele.offen} offen`
              : `${kanaele.verbunden} verbunden`
          }
          onPress={() => router.push("/kanaele")}
          trailing={<Chevron />}
        />
        <ListRow
          title="Auslastung füllen"
          meta="Ruhige Zeiten mit Stammgästen füllen"
          onPress={() => router.push("/kampagne")}
          trailing={<Chevron />}
        />
        <ListRow
          title="Köln-Index"
          meta="Besser als 58 % der Cafés in Köln"
          onPress={() => router.push("/benchmark")}
          trailing={<Chevron />}
        />
      </ListCard>

      <DarkPanel style={{ gap: theme.spacing.sm }}>
        <Text variant="sectionTitle" color={onDarkPanel.title} style={{ fontSize: 20 }}>
          Kolleg:innen empfehlen
          <Text variant="sectionTitle" color={onDarkPanel.accent} style={{ fontSize: 20 }}>
            .
          </Text>
        </Text>
        <Text variant="bodySm" color={onDarkPanel.body} style={{ fontSize: 14 }}>
          1 Monat geschenkt, für dich und den Betrieb, den du einlädst.
        </Text>
        <PillButton
          label="Einladung teilen"
          size="compact"
          labelColor={onDarkPanel.onAccent}
          onPress={() => toast.show("Einladungslink kopiert")}
          style={{ marginTop: theme.spacing.sm, backgroundColor: onDarkPanel.accent }}
        />
      </DarkPanel>
    </Screen>
  );
}

/**
 * Die Meta-Zeile unter "Profil Check" - sie darf nichts behaupten, was der
 * Profil-Check einen Tipp später widerlegt.
 *
 * - Echter Betrieb ohne Bericht (bis zur ersten Antwort, oder der Abruf scheiterte):
 *   KEIN Score. Die Demo-Rechnung wäre Basiswert 64 plus lokal abgehakte Kästchen,
 *   und der Profil-Check zeigt für genau diesen Fall bewusst keine Zahl.
 * - "komplett" nur, wenn der Bericht weder Hebel noch unbekannte Faktoren hat.
 *   Statushebel wie "Bei Google Maps nicht gefunden" bringen 0 Punkte, sind aber
 *   offen; und ein Score aus 1 von 5 Faktoren (kein Places-Schlüssel) ist 100,
 *   ohne dass die übrigen vier je gemessen wurden.
 */
function profilCheckZeile({
  praesenz,
  echterBetrieb,
  laedt,
  score,
  openPoints,
}: {
  praesenz: VenuePresence | null;
  echterBetrieb: boolean;
  laedt: boolean;
  score: number;
  openPoints: number;
}): string {
  if (!praesenz) {
    if (echterBetrieb) return laedt ? "Wird geprüft …" : "Präsenz noch nicht abgerufen";
    // Demo und Showcase: der Vorführzustand wie bisher.
    return openPoints > 0 ? `Score ${score} · +${openPoints} Punkte offen` : `Score ${score} · komplett`;
  }

  const { hebel, deckung, faktoren } = praesenz.bericht;
  if (openPoints > 0) return `Score ${score} · +${openPoints} Punkte offen`;
  if (hebel.length > 0) {
    return `Score ${score} · ${hebel.length} ${hebel.length === 1 ? "Hinweis" : "Hinweise"} offen`;
  }
  if (deckung.unbekannt.length > 0) {
    const bekannt = faktoren.length - deckung.unbekannt.length;
    return `Score ${score} · aus ${bekannt} von ${faktoren.length} Faktoren`;
  }
  return `Score ${score} · komplett`;
}

function Chevron() {
  return (
    <Text variant="numeric" tone="faint" style={{ fontSize: 22 }}>
      ›
    </Text>
  );
}
