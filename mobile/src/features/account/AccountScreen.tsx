import { View } from "react-native";
import { useRouter } from "expo-router";

import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { DarkPanel, onDarkPanel } from "../../components/ui/DataDisplay";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { ListCard, ListRow } from "../../components/ui/ListCard";
import { LinkAction, PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { Toggle } from "../../components/ui/Toggle";
import { useAppearance } from "../../lib/appearance";
import { useStore, type PlanId } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import { useState } from "react";

/**
 * Rechnungen - vorerst keine.
 *
 * Hier standen zwei erfundene Rechnungen über 29,00 € für Juli und Juni 2026.
 * Es hat nie jemand bezahlt und es gibt keinen Preis; das war eine Behauptung
 * über Geldflüsse, die es nicht gab. Die Liste bleibt als Struktur stehen und
 * füllt sich, sobald Stripe angebunden ist (Schritt 5) - dann aus echten
 * Belegen, nicht aus dieser Datei.
 */
const invoices: { period: string; amount: string }[] = [];

/**
 * Muss zu den Plänen in AbonnementScreen passen - hier nur die Konto-Kurzfassung.
 * `price` ist optional, solange keine Preise entschieden sind (siehe dort).
 */
const PLAN_INFO: Record<PlanId, { name: string; price?: string; blurb: string }> = {
  start: { name: "Maitr Start", blurb: "Präsenzscore, Erkenntnisse, 1 Kanal." },
  pro: { name: "Maitr Pro", blurb: "Alle Kanäle, KI-Antworten, Gäste-CRM, provisionsfrei." },
  autopilot: { name: "Maitr Autopilot", blurb: "Maitr übernimmt: Antworten, Beiträge, Auslastung." },
};

/**
 * Screen 12 · Konto & Abo.
 *
 * Der Schalter „Nachtbar" ist hier keine Attrappe: er schaltet die App wirklich in die
 * dunkle Palette und damit den Start-Screen auf die Abend-Fassung (Screen 16).
 */
export function AccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { nightMode, toggleNightMode, accessibleMode, toggleAccessibleMode } = useAppearance();
  const { user, signOut, currentPlan } = useStore();
  const plan = PLAN_INFO[currentPlan];

  const [dailyPush, setDailyPush] = useState(true);
  const [abmeldung, setAbmeldung] = useState(false);

  /**
   * Abmelden.
   *
   * Erst warten, dann navigieren - nicht umgekehrt. `signOut()` beendet im echten
   * Anmeldebetrieb auch die Clerk-Sitzung im SecureStore (Store → `lib/auth.ts`).
   * Wer sofort auf den Login springt, kann dort erneut eine Anmeldung starten,
   * während die alte Sitzung noch steht - Apple-Dialog wie Passworteingabe liefen
   * dann gegen eine bereits aktive Sitzung.
   *
   * Der Sperrschalter verhindert zusätzlich den doppelten Tipp; der Nutzer sieht
   * ihn im Label.
   */
  const logout = async () => {
    if (abmeldung) return;
    setAbmeldung(true);
    try {
      await signOut();
    } catch (err) {
      // Fangen, nicht durchreichen. Der Aufruf ist ein `void logout()` am Knopf —
      // eine abgelehnte Zusage hätte niemanden, der sie behandelt, und erschiene im
      // Entwicklungsbau als rote Meldung über dem gerade erreichten Login. Die
      // Clerk-Abmeldung ist in auth.ts bereits abgesichert; hier bleibt vor allem
      // das Leeren des lokalen Speichers, das etwa bei vollem Gerät scheitern kann.
      console.warn("[konto] Abmelden unvollständig:", (err as Error)?.message ?? err);
    } finally {
      // Auch nach einem Fehler weiterreichen: Der lokale Zustand ist in jedem Fall
      // abgemeldet, auf diesem Screen wäre der Nutzer sonst gefangen.
      setAbmeldung(false);
      router.replace("/login");
    }
  };

  return (
    <Screen withTabBar contentStyle={{ gap: 9 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Avatar initials={user?.initials ?? "SB"} size={54} variant="ink" />
        <View style={{ flex: 1 }}>
          <Text variant="sectionTitle" style={{ fontSize: 22 }}>
            {user?.name ?? "Sofia Brandt"}
          </Text>
          <Eyebrow style={{ marginTop: 1 }}>
            {user?.venueName ?? "Café Goldstück"} · {user?.district ?? "Ehrenfeld"}
          </Eyebrow>
        </View>
      </View>

      <DarkPanel style={{ paddingVertical: theme.spacing.lg, paddingHorizontal: 18, gap: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Eyebrow color={onDarkPanel.accent}>{plan.name}</Eyebrow>
          <Eyebrow color={onDarkPanel.accent}>Aktiv</Eyebrow>
        </View>

        {/* Ohne Preis trägt der Planname die große Zeile - sonst klaffte hier eine
            Lücke, wo vorher „29 € / Monat" stand. */}
        {plan.price ? (
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Text variant="numeric" color={onDarkPanel.title} style={{ fontSize: 38, lineHeight: 42 }}>
              {plan.price}
            </Text>
            <Text variant="body" color={onDarkPanel.body}>
              / Monat
            </Text>
          </View>
        ) : (
          <Text variant="numeric" color={onDarkPanel.title} style={{ fontSize: 30, lineHeight: 36 }}>
            {plan.name}
          </Text>
        )}

        <Text variant="quote" color={onDarkPanel.bodyStrong} style={{ fontSize: 15 }}>
          {plan.blurb}
        </Text>
        {/* Kein „Nächste Abrechnung: 1. August" mehr - es gibt keine Abrechnung.
            Der Satz erweckte den Eindruck eines laufenden Vertrags. */}
        <Eyebrow color={onDarkPanel.meta} style={{ marginTop: 4 }}>
          Preise stehen noch nicht fest · Zugang derzeit ohne Abrechnung
        </Eyebrow>

        <View
          style={{ flexDirection: "row", alignItems: "center", gap: 18, marginTop: theme.spacing.sm }}
        >
          <PillButton
            label="Abo verwalten"
            size="compact"
            labelColor={onDarkPanel.onAccent}
            onPress={() => router.push("/abo")}
            style={{ flex: 1, backgroundColor: onDarkPanel.title }}
          />
          <Text
            variant="action"
            color={onDarkPanel.title}
            style={{ fontSize: 15, textDecorationLine: "underline" }}
            onPress={() => router.push("/abo")}
            accessibilityRole="button"
          >
            Pläne
          </Text>
        </View>
      </DarkPanel>

      <Card
        emphasis="default"
        padding={0}
        style={{
          borderRadius: theme.radius.tile,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: 18,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.inkAction,
            borderRadius: 7,
            paddingVertical: 6,
            paddingHorizontal: 10,
          }}
        >
          <Eyebrow color={theme.colors.onInkAction} style={{ fontSize: 12 }}>
            Visa
          </Eyebrow>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="numeric" style={{ fontSize: 17, letterSpacing: 0.7 }}>
            •••• 4242
          </Text>
          <Eyebrow style={{ fontSize: 10, marginTop: 1 }}>Läuft ab 08/28</Eyebrow>
        </View>
        <LinkAction label="Ändern" onPress={() => router.push("/abo")} />
      </Card>

      <Card
        emphasis="default"
        padding={0}
        style={{ borderRadius: theme.radius.tile, paddingHorizontal: 18, paddingTop: theme.spacing.md }}
      >
        <Eyebrow style={{ marginBottom: 4 }}>Rechnungen</Eyebrow>
        {invoices.length === 0 ? (
          <Text variant="bodySm" tone="muted" style={{ paddingVertical: 9, fontSize: 14 }}>
            Noch keine Rechnungen.
          </Text>
        ) : null}
        {invoices.map((invoice, index) => (
          <View
            key={invoice.period}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 9,
              borderBottomWidth: index < invoices.length - 1 ? 1 : 0,
              borderBottomColor: theme.colors.surfaceSunken,
            }}
          >
            <Text variant="numeric" style={{ fontSize: 16 }}>
              {invoice.period}
            </Text>
            <Text variant="numeric" tone="muted" style={{ fontSize: 13 }}>
              {invoice.amount} ·{" "}
              <Text
                variant="numeric"
                tone="accent"
                style={{ fontSize: 13, textDecorationLine: "underline" }}
                onPress={() => toast.show(`Rechnung ${invoice.period} als PDF`)}
                accessibilityRole="button"
              >
                PDF
              </Text>
            </Text>
          </View>
        ))}
      </Card>

      <ListCard style={{ borderRadius: 18 }}>
        <ListRow
          title="Dark Modus „Nachtbar“"
          trailing={
            <Toggle
              value={nightMode}
              onValueChange={toggleNightMode}
              accessibilityLabel="Nachtbar Modus"
            />
          }
        />
        <ListRow
          title="Barrierefrei Modus"
          meta="Mehr Kontrast, keine Bewegung"
          trailing={
            <Toggle
              value={accessibleMode}
              onValueChange={toggleAccessibleMode}
              accessibilityLabel="Barrierefrei Modus"
            />
          }
        />
        <ListRow
          title="Push täglich 7:00"
          trailing={
            <Toggle
              value={dailyPush}
              onValueChange={setDailyPush}
              accessibilityLabel="Tägliche Push-Benachrichtigung um 7 Uhr"
            />
          }
        />
      </ListCard>

      <ListCard style={{ borderRadius: 18 }}>
        <ListRow
          title="Autopilot"
          meta="Was Maitr automatisch erledigt"
          onPress={() => router.push("/autopilot")}
          trailing={
            <Text variant="numeric" tone="faint" style={{ fontSize: 22 }}>
              ›
            </Text>
          }
        />
        <ListRow
          title="Profil verwalten"
          meta="Name, Beschreibung, Öffnungszeiten, Bio"
          onPress={() => router.push("/profil")}
          trailing={
            <Text variant="numeric" tone="faint" style={{ fontSize: 22 }}>
              ›
            </Text>
          }
        />
        <ListRow
          title="Deine Kanäle"
          meta="Google, Instagram, Yelp, TheFork, Facebook"
          onPress={() => router.push("/kanaele")}
          trailing={
            <Text variant="numeric" tone="faint" style={{ fontSize: 22 }}>
              ›
            </Text>
          }
        />
        {/* Gehört in diese Karte und nicht in die Löschen-Karte darunter: die
            Stempelkarte ist eine Einstellung des Betriebs, wie Autopilot und Profil. */}
        <ListRow
          title="Stempelkarte"
          meta="Prämie, Stempel, wer sammelt"
          onPress={() => router.push("/stempelkarte")}
          trailing={
            <Text variant="numeric" tone="faint" style={{ fontSize: 22 }}>
              ›
            </Text>
          }
        />
      </ListCard>

      {/* Kontolöschung gehört sichtbar in den Kontobereich - Apple verlangt sie
          in der App (5.1.1(v)), nicht in einer Mail an den Support. Eigene Karte
          statt Zeile in der Liste darüber: Löschen ist keine Einstellung. */}
      <ListCard style={{ borderRadius: 18 }}>
        <ListRow
          title="Konto löschen"
          meta="Endgültig, mit allen Daten des Betriebs"
          onPress={() => router.push("/konto-loeschen")}
          trailing={
            <Text variant="numeric" color={theme.colors.destructive} style={{ fontSize: 22 }}>
              ›
            </Text>
          }
        />
      </ListCard>

      <Eyebrow tone="faint" style={{ textAlign: "center", marginTop: theme.spacing.md }}>
        Via Clerk ·{" "}
        <Eyebrow
          tone="accent"
          style={{ textDecorationLine: "underline" }}
          onPress={() => void logout()}
        >
          {abmeldung ? "Wird abgemeldet …" : "Abmelden"}
        </Eyebrow>
      </Eyebrow>

      {/* Kein Produktinhalt: Einstieg ins Screen-Verzeichnis für Vorführungen.
          Als Button statt Textlink, damit die Tap-Fläche 44pt erreicht. */}
      <PillButton
        label="Alle Screens · Demo"
        variant="outline"
        size="compact"
        onPress={() => router.push("/demo")}
        style={{ alignSelf: "center", marginTop: theme.spacing.xs }}
      />
    </Screen>
  );
}
