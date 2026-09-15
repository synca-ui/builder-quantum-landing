import { useMemo, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, Share, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import type { VenuePresence } from "@maitr/core";

import { RefreshIcon } from "../../components/icons";
import { Card } from "../../components/ui/Card";
import { Stars } from "../../components/ui/DataDisplay";
import { EmptyState } from "../../components/ui/EmptyState";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { LinkAction, PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import { reviews } from "./ReviewsScreen";

const MAX_CHARS = 350;

/** Antwortentwürfe je Tonfall - im Design die vier Chips über dem Editor. */
const TONES: Record<string, string> = {
  Warmherzig:
    "Liebe Marion, das lesen wir mit einem Lächeln, bis nächste Woche steht dein Flat White bereit!",
  Kurz: "Danke, Marion! Bis nächste Woche.",
  Formell:
    "Sehr geehrte Frau K., vielen Dank für Ihre Rückmeldung. Wir freuen uns auf Ihren nächsten Besuch.",
  Humorvoll:
    "Liebe Marion, dein Flat White übt schon mal fürs nächste Mal. Bis Donnerstag!",
};

/**
 * Screen 14 · Antwort bearbeiten.
 *
 * Zwei Fassungen, und die Weiche fällt vor jedem weiteren Hook:
 * - Echter Betrieb: die öffentliche Google-Bewertung aus dem Präsenzstand, ein
 *   Entwurf aus Vorlagen und ein ehrlicher Abschluss (kopieren, bei Google
 *   öffnen). Siehe `EchterAntwortEditor`.
 * - Demo und Showcase: unverändert der Vorführzustand mit Marion.
 */
export function ReplyEditorScreen({ reviewId }: { reviewId?: string }) {
  const { hasRealVenue, showcase } = useStore();
  if (hasRealVenue && !showcase) return <EchterAntwortEditor reviewId={reviewId} />;
  return <DemoAntwortEditor reviewId={reviewId} />;
}

/**
 * Vorführfassung.
 *
 * Der Ton-Wechsel ersetzt den Entwurf komplett - solange er nicht von Hand geändert
 * wurde. Danach bleibt die eigene Fassung stehen, sonst würde ein Fehlgriff auf einen
 * Chip die getippte Antwort verschlucken.
 */
function DemoAntwortEditor({ reviewId }: { reviewId?: string }) {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { answerReview } = useStore();

  const review = useMemo(
    () => reviews.find((r) => r.id === reviewId) ?? reviews[0],
    [reviewId],
  );

  const [tone, setTone] = useState("Warmherzig");
  const [draft, setDraft] = useState(TONES.Warmherzig);
  const [edited, setEdited] = useState(false);

  const applyTone = (next: string) => {
    setTone(next);
    if (!edited) setDraft(TONES[next]);
  };

  const publish = () => {
    answerReview(review.id);
    toast.show("Auf Google veröffentlicht");
    router.back();
  };

  const firstName = review.author.split(" ")[0];

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title={`Antwort an ${firstName}`} />

      <View
        style={{
          backgroundColor: theme.colors.surfaceSunken,
          borderRadius: theme.radius.tile,
          padding: theme.spacing.lg,
          gap: 6,
        }}
      >
        <Stars rating={review.rating} size={13} color={theme.colors.textSecondary} />
        <Text variant="quote" tone="secondary" style={{ fontSize: 14 }}>
          {review.body}
        </Text>
      </View>

      <Eyebrow>Ton wählen</Eyebrow>
      <View style={{ flexDirection: "row", gap: 9, flexWrap: "wrap" }}>
        {Object.keys(TONES).map((name) => (
          <Pressable
            key={name}
            onPress={() => applyTone(name)}
            accessibilityRole="button"
            accessibilityState={{ selected: tone === name }}
            accessibilityLabel={`Ton ${name}`}
            style={({ pressed }) => ({
              borderRadius: theme.radius.pill,
              paddingVertical: 10,
              paddingHorizontal: 18,
              minHeight: theme.hitSize.minTouch,
              justifyContent: "center",
              backgroundColor: tone === name ? theme.colors.primary : "transparent",
              borderWidth: tone === name ? 0 : 1,
              borderColor: theme.colors.border,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text
              variant="numeric"
              color={tone === name ? theme.colors.onPrimary : theme.colors.textPrimary}
              style={{ fontSize: 14 }}
            >
              {name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Card
        padding={18}
        style={{ borderWidth: 2, borderColor: theme.colors.primary, minHeight: 190 }}
      >
        <TextInput
          value={draft}
          onChangeText={(text) => {
            setDraft(text);
            setEdited(true);
          }}
          multiline
          maxLength={MAX_CHARS}
          accessibilityLabel="Antworttext"
          style={[
            theme.text.body,
            { color: theme.colors.textPrimary, lineHeight: 25.6, flex: 1, textAlignVertical: "top" },
          ]}
        />

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: theme.spacing.md,
          }}
        >
          <Eyebrow style={{ textTransform: "none" }}>
            {draft.length} / {MAX_CHARS} Zeichen
          </Eyebrow>
          <Pressable
            onPress={() => {
              setDraft(TONES[tone]);
              setEdited(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="Neuen Vorschlag erzeugen"
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <RefreshIcon size={15} color={theme.colors.primary} />
            <Eyebrow tone="accent">Neu vorschlagen</Eyebrow>
          </Pressable>
        </View>
      </Card>

      <View style={{ gap: theme.spacing.md }}>
        <PillButton label="Auf Google veröffentlichen" onPress={publish} />
        <Eyebrow tone="faint" style={{ textAlign: "center" }}>
          Wird öffentlich unter deinem Profil angezeigt
        </Eyebrow>
      </View>
    </Screen>
  );
}

/* ── Echter Betrieb ─────────────────────────────────────────────────────────── */

type GoogleEintrag = NonNullable<VenuePresence["google"]>;
type GoogleBewertung = GoogleEintrag["bewertungen"][number];

const GOOGLE_PROFIL_URL = "https://business.google.com/";

/**
 * Google begrenzt Inhaberantworten auf 4.096 Zeichen. 350 wie in der Demo wäre
 * für eine sorgfältige Antwort auf eine kritische Bewertung zu knapp.
 */
const MAX_ZEICHEN_ECHT = 1000;

type Ton = "Warmherzig" | "Kurz" | "Formell";
const TOENE: Ton[] = ["Warmherzig", "Kurz", "Formell"];

/**
 * Entwurf aus einer Vorlage - bewusst ohne Humor-Ton: Ob eine Bewertung Spaß
 * verträgt, kann eine Vorlage nicht wissen, und ein Witz unter einer 2★-Bewertung
 * ist öffentlich.
 *
 * Kein LLM-Vorschlag: Einen Endpunkt dafür gibt es noch nicht (Prüfbericht,
 * Punkt 30). Die Vorlage nennt deshalb nichts aus dem Bewertungstext - nur Name
 * und Grundton nach Sternen.
 */
function vorlage(ton: Ton, bewertung: GoogleBewertung): string {
  const name = (bewertung.autor ?? "").trim();
  const vorname = name.split(/\s+/)[0] ?? "";
  const hallo = vorname ? `Hallo ${vorname}` : "Hallo";
  const gutenTag = name ? `Guten Tag ${name}` : "Guten Tag";
  const kritisch = typeof bewertung.rating === "number" && bewertung.rating <= 3;

  if (kritisch) {
    if (ton === "Kurz") return `Danke für deine offene Rückmeldung${vorname ? `, ${vorname}` : ""}. Das nehmen wir uns zu Herzen.`;
    if (ton === "Formell") {
      return `${gutenTag}, vielen Dank für Ihre Rückmeldung. Es tut uns leid, dass Ihr Besuch nicht Ihren Erwartungen entsprochen hat. Wir nehmen Ihre Hinweise ernst.`;
    }
    return `${hallo}, danke, dass du dir die Zeit für deine ehrliche Rückmeldung genommen hast. Es tut uns leid, dass nicht alles gepasst hat. Magst du uns erzählen, was wir besser machen können?`;
  }
  if (ton === "Kurz") return `Danke${vorname ? `, ${vorname}` : ""}! Bis bald bei uns.`;
  if (ton === "Formell") {
    return `${gutenTag}, vielen Dank für Ihre freundliche Bewertung. Wir freuen uns auf Ihren nächsten Besuch.`;
  }
  return `${hallo}, vielen Dank für deine lieben Worte! Schön, dass es dir bei uns gefallen hat - wir freuen uns auf deinen nächsten Besuch.`;
}

/** Kennung aus der Route - Places-Kennungen enthalten „/", die kommen evtl. kodiert an. */
function findeBewertung(praesenz: VenuePresence, reviewId: string | undefined): GoogleBewertung | null {
  if (!reviewId) return null;
  const liste = praesenz.google?.bewertungen;
  if (!Array.isArray(liste)) return null;
  let dekodiert = reviewId;
  try {
    dekodiert = decodeURIComponent(reviewId);
  } catch {
    // Kaputte Kodierung: dann eben nur der Wortlaut.
  }
  return liste.find((b) => b && (b.id === reviewId || b.id === dekodiert)) ?? null;
}

/**
 * Antwort-Editor für einen echten Betrieb.
 *
 * ANLASS (Integrationsprüfung, Punkt 9): Für jeden Wirt stand hier Marions
 * 5★-Bewertung, und „Auf Google veröffentlichen" meldete Erfolg und schrieb einen
 * Chronik-Eintrag - ohne dass irgendetwas zu Google ging. Einen Antwortweg gibt es
 * ohne Freigabe nicht, und auch mit Freigabe liest der Connector nur.
 *
 * Deshalb:
 * - Die Bewertung kommt aus `praesenz.google.bewertungen` (Kennungsvergleich).
 *   Unbekannte Kennung → „nicht gefunden", kein Rückfall auf irgendeine andere.
 * - Abschluss ist, was wirklich geht: Text über das Teilen-Menü kopieren
 *   (expo-clipboard ist nicht installiert) und die Bewertung bei Google öffnen.
 *   Kein „veröffentlicht", kein `answerReview`.
 */
function EchterAntwortEditor({ reviewId }: { reviewId?: string }) {
  const theme = useTheme();
  const toast = useToast();
  const { praesenz, praesenzLaedt, aktualisierePraesenz } = useStore();

  const bewertung = praesenz ? findeBewertung(praesenz, reviewId) : null;

  if (bewertung && praesenz) {
    // `key`: Wechselt die Bewertung, beginnt der Entwurf neu statt die alte
    // Antwort unter einen anderen Namen zu schieben.
    return <AntwortEntwurf key={bewertung.id} bewertung={bewertung} mapsUrl={praesenz.google?.mapsUrl} />;
  }

  const erneut = async () => {
    const ok = await aktualisierePraesenz();
    if (!ok) toast.show("Hat wieder nicht geklappt. Prüfe die Verbindung.", "fehler");
  };

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title="Antwort schreiben" fallback="/bewertungen" />
      {praesenz === null && praesenzLaedt ? (
        <Card
          emphasis="subtle"
          padding={theme.spacing.xxl}
          style={{ alignItems: "center", gap: theme.spacing.md, borderRadius: 18 }}
        >
          <ActivityIndicator size="small" color={theme.colors.textMuted} />
          <Text variant="bodySm" tone="secondary" style={{ textAlign: "center", fontSize: 14 }}>
            Google-Bewertungen werden abgerufen …
          </Text>
        </Card>
      ) : praesenz === null ? (
        // Nicht abrufbar ist nicht „nicht gefunden" - die Bewertung kann es geben.
        <View style={{ gap: theme.spacing.md }}>
          <EmptyState
            title="Bewertung gerade nicht abrufbar"
            message="Die Google-Bewertungen deines Betriebs ließen sich nicht laden."
          />
          <PillButton label="Erneut versuchen" onPress={erneut} />
        </View>
      ) : (
        <EmptyState
          title="Bewertung nicht gefunden"
          message="Unter den Bewertungen, die Google öffentlich zeigt, ist diese nicht (mehr) dabei. Ohne Google-Freigabe gibt Google nur fünf Bewertungen heraus."
        />
      )}
    </Screen>
  );
}

function AntwortEntwurf({ bewertung, mapsUrl }: { bewertung: GoogleBewertung; mapsUrl?: string }) {
  const theme = useTheme();
  const toast = useToast();

  const [ton, setTon] = useState<Ton>("Warmherzig");
  const [entwurf, setEntwurf] = useState(() => vorlage("Warmherzig", bewertung));
  const [bearbeitet, setBearbeitet] = useState(false);

  const autor = (bewertung.autor ?? "").trim();
  const vorname = autor.split(/\s+/)[0];
  const text = (bewertung.text ?? "").trim();
  // Die Bewertung selbst, sonst wenigstens der Eintrag - dort führt „Bewertungen" hin.
  const ziel = bewertung.url ?? mapsUrl;
  // Unter Android löst `Share.share` sofort nach dem Start des Choosers auf, nicht
  // erst nach der Wahl. Ein automatisches Öffnen legte Google Maps über das
  // Teilen-Menü, bevor „Kopieren" gewählt ist. Dort sind es deshalb zwei Schritte.
  const zweiSchritte = Platform.OS === "android";
  const automatischOeffnen = Boolean(ziel) && !zweiSchritte;

  const waehleTon = (next: Ton) => {
    setTon(next);
    // Wie in der Demo: Eine von Hand geänderte Fassung verschluckt kein Chip-Tipp.
    if (!bearbeitet) setEntwurf(vorlage(next, bewertung));
  };

  const oeffne = (url: string) => {
    Linking.openURL(url).catch(() => toast.show("Link ließ sich nicht öffnen", "fehler"));
  };

  /**
   * Teilen-Menü statt Zwischenablage: expo-clipboard ist nicht installiert. Im Menü
   * steht „Kopieren". Nur wenn iOS meldet, dass wirklich kopiert wurde, sagt der
   * Toast „kopiert" - Android meldet das nie, dort bleibt es still. Abgebrochen →
   * Google wird nicht geöffnet, der Wirt wollte offensichtlich noch nicht.
   *
   * ANLASS (Prüfbefund): Unter Android kehrt `Share.share` zurück, sobald der
   * Chooser offen ist (RN-ShareModule meldet sofort `sharedAction`). Dort öffnet
   * dieser Knopf Google deshalb nicht selbst - „Bei Google öffnen" ist der zweite
   * Schritt darunter.
   */
  const kopierenUndOeffnen = async () => {
    const antwort = entwurf.trim();
    if (!antwort) {
      toast.show("Erst eine Antwort schreiben", "fehler");
      return;
    }
    try {
      const ergebnis = await Share.share({ message: antwort });
      if (ergebnis.action === Share.dismissedAction) return;
      if (ergebnis.activityType?.includes("CopyToPasteboard")) toast.show("Antwort kopiert");
      if (automatischOeffnen && ziel) oeffne(ziel);
    } catch {
      toast.show("Teilen-Menü ließ sich nicht öffnen", "fehler");
    }
  };

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title={vorname ? `Antwort an ${vorname}` : "Antwort schreiben"} fallback="/bewertungen" />

      <View
        style={{
          backgroundColor: theme.colors.surfaceSunken,
          borderRadius: theme.radius.tile,
          padding: theme.spacing.lg,
          gap: 6,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <Stars rating={bewertung.rating} size={13} color={theme.colors.textSecondary} />
          <Eyebrow tone="faint" style={{ fontSize: 10, flexShrink: 1 }} numberOfLines={1}>
            {[autor || "Ohne Namen", bewertung.relativ].filter(Boolean).join(" · ")}
          </Eyebrow>
        </View>
        {text ? (
          <Text variant="quote" tone="secondary" style={{ fontSize: 14 }}>
            {text}
          </Text>
        ) : (
          <Text variant="bodySm" tone="faint" style={{ fontSize: 14 }}>
            Nur Sterne, kein Kommentar
          </Text>
        )}
      </View>

      <Eyebrow>Ton wählen</Eyebrow>
      <View style={{ flexDirection: "row", gap: 9, flexWrap: "wrap" }}>
        {TOENE.map((name) => (
          <Pressable
            key={name}
            onPress={() => waehleTon(name)}
            accessibilityRole="button"
            accessibilityState={{ selected: ton === name }}
            accessibilityLabel={`Ton ${name}`}
            style={({ pressed }) => ({
              borderRadius: theme.radius.pill,
              paddingVertical: 10,
              paddingHorizontal: 18,
              minHeight: theme.hitSize.minTouch,
              justifyContent: "center",
              backgroundColor: ton === name ? theme.colors.primary : "transparent",
              borderWidth: ton === name ? 0 : 1,
              borderColor: theme.colors.border,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text
              variant="numeric"
              color={ton === name ? theme.colors.onPrimary : theme.colors.textPrimary}
              style={{ fontSize: 14 }}
            >
              {name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Card padding={18} style={{ borderWidth: 2, borderColor: theme.colors.primary, minHeight: 190 }}>
        <TextInput
          value={entwurf}
          onChangeText={(neu) => {
            setEntwurf(neu);
            setBearbeitet(true);
          }}
          multiline
          maxLength={MAX_ZEICHEN_ECHT}
          accessibilityLabel="Antworttext"
          style={[
            theme.text.body,
            { color: theme.colors.textPrimary, lineHeight: 25.6, flex: 1, textAlignVertical: "top" },
          ]}
        />

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: theme.spacing.md,
          }}
        >
          <Eyebrow style={{ textTransform: "none" }}>
            {entwurf.length} / {MAX_ZEICHEN_ECHT} Zeichen
          </Eyebrow>
          {/* „Vorlage", nicht „Neu vorschlagen": Es gibt keinen Generator, der
              etwas Neues vorschlüge - nur die Vorlage des gewählten Tons. */}
          <Pressable
            onPress={() => {
              setEntwurf(vorlage(ton, bewertung));
              setBearbeitet(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="Vorlage wiederherstellen"
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <RefreshIcon size={15} color={theme.colors.primary} />
            <Eyebrow tone="accent">Vorlage</Eyebrow>
          </Pressable>
        </View>
      </Card>

      <View style={{ gap: theme.spacing.md }}>
        <PillButton
          label={automatischOeffnen ? "Antwort kopieren & bei Google öffnen" : "Antwort kopieren"}
          onPress={kopierenUndOeffnen}
        />
        {ziel && zweiSchritte ? (
          <PillButton label="Bei Google öffnen" variant="outline" onPress={() => oeffne(ziel)} />
        ) : null}
        <Text variant="bodySm" tone="secondary" style={{ textAlign: "center", fontSize: 13, lineHeight: 18 }}>
          {!ziel
            ? "Google nennt für diese Bewertung keinen Link. Antworten schreibst du im Google-Unternehmensprofil."
            : zweiSchritte
              ? "Im Teilen-Menü „Kopieren“ wählen, dann „Bei Google öffnen“ tippen - als Inhaber angemeldet fügst du die Antwort dort ein."
              : "Im Teilen-Menü „Kopieren“ wählen. Danach öffnet sich die Bewertung bei Google - als Inhaber angemeldet fügst du die Antwort dort ein."}
        </Text>
        {/* Unter Android steht „Bei Google öffnen" schon als Knopf oben. */}
        {ziel && zweiSchritte ? null : (
          <View style={{ alignItems: "center" }}>
            {ziel ? (
              <LinkAction label="Nur bei Google öffnen" labelSize={14} onPress={() => oeffne(ziel)} />
            ) : (
              <LinkAction label="Unternehmensprofil öffnen" labelSize={14} onPress={() => oeffne(GOOGLE_PROFIL_URL)} />
            )}
          </View>
        )}
        <Eyebrow tone="faint" style={{ textAlign: "center" }}>
          Maitr veröffentlicht keine Antworten bei Google
        </Eyebrow>
      </View>
    </Screen>
  );
}
