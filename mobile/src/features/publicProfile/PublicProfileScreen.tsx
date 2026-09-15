import { useState } from "react";
import { Image, Linking, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalendarIcon, PinIcon } from "../../components/icons";
import { StatusLabel } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { Tag } from "../../components/ui/Chip";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { PhotoTile } from "../../components/ui/Media";
import { PillButton } from "../../components/ui/PillButton";
import { Emphasis, Text } from "../../components/ui/Text";
import { useDailyBriefing } from "../start/useDailyBriefing";
import { oeffnungsstatus, type Oeffnungsstatus } from "../../lib/oeffnungsstatus";
import { anzahlText, sterneText } from "../../lib/praesenz";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

/**
 * Screen 17 · Öffentliches Profil (Gast-Seite).
 *
 * Spiegelt das im Betrieb gepflegte Profil (Store): Name, Beschreibung und Merkmale
 * kommen aus `venueProfile` - Änderungen in „Profil verwalten" erscheinen hier sofort.
 * Einziger Screen mit Titelbild; die Karte überlappt es um 30px.
 */
export function PublicProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { venueProfile, venueId, praesenz, hasRealVenue, showcase } = useStore();
  const { briefing, source } = useDailyBriefing(venueId);
  // Die Adresse, deren Laden scheiterte - dann zurück zur Fläche statt eines
  // leeren Rechtecks. Als Adresse statt Boolean, damit ein neuer Abruf mit
  // anderem Foto es wieder versucht.
  const [kaputtesTitelbild, setKaputtesTitelbild] = useState<string | null>(null);

  /** Demo und Showcase zeigen den Vorführzustand unverändert; nur ein echter Betrieb wird gemessen. */
  const echterBetrieb = hasRealVenue && !showcase;

  /**
   * Die Bewertung - echt oder gar nicht.
   *
   * Hier stand `"★ 4,8 · 128"` fest im Code, mitten zwischen Feldern, die aus dem
   * Betriebsprofil kommen. Auf einem Bildschirm, der zeigt, "wie Gäste dich sehen",
   * ist eine erfundene Bewertung die unangenehmste Sorte Attrappe: Sie sieht aus wie
   * eine Auskunft über den eigenen Ruf.
   *
   * Der Wert kommt jetzt aus dem Tagesbriefing (`stats.rating`, serverseitig aus
   * MaitrReview gemittelt). `source` entscheidet, ob er echt ist: Fällt das Briefing
   * auf seine Fixture zurück (Demomodus, Showcase, kein Netz), wird die Plakette
   * weggelassen statt mit Beispielzahlen gefüllt.
   *
   * Die Anzahl der Bewertungen fehlt bewusst: Der Server liefert im Briefing nur den
   * Durchschnitt. Lieber "★ 4,8" ohne Anzahl als "· 128" zu erfinden.
   *
   * Vorrang hat der Google-Eintrag aus der Präsenzprüfung: Das ist genau die Zahl,
   * die ein Gast bei Maps sieht - Schnitt UND Anzahl über alle Bewertungen, nicht
   * nur über die, die Maitr selbst gesammelt hat. Ohne Google-Schnitt (kein
   * Eintrag, kein Schlüssel) bleibt es beim Briefing.
   */
  const googleSchnitt = praesenz?.bericht.bewertungen.schnitt ?? null;
  const googleAnzahl = praesenz?.bericht.bewertungen.anzahl ?? 0;
  const bewertung =
    typeof googleSchnitt === "number" && googleSchnitt > 0
      ? `★ ${sterneText(googleSchnitt)}${googleAnzahl > 0 ? ` · ${anzahlText(googleAnzahl)}` : ""}`
      : source === "api" && typeof briefing.stats.rating === "number" && briefing.stats.rating > 0
        ? `★ ${briefing.stats.rating.toFixed(1).replace(".", ",")}`
        : null;

  // Das erste Google-Foto ist das, was Maps als Titel zeigt - also das, womit
  // Gäste den Betrieb ohnehin schon verbinden.
  const titelbild = praesenz?.google?.fotos?.[0];
  const zeigeTitelbild = Boolean(titelbild) && titelbild !== kaputtesTitelbild;

  /**
   * Geöffnet-Zeile: Hier stand "Jetzt geöffnet · bis 22:00" fest im Code - um
   * drei Uhr nachts genauso wie am Ruhetag. Für einen echten Betrieb wird sie aus
   * den Öffnungszeiten des heutigen Tags abgeleitet; ist der Tag unbekannt,
   * fällt die Zeile weg. Demo und Showcase behalten den Vorführzustand. Die
   * Rechnung liegt in lib/oeffnungsstatus.ts, weil der Abend-Screen sie teilt.
   */
  const geoeffnet: Oeffnungsstatus | null = echterBetrieb
    ? oeffnungsstatus(new Date(), venueProfile.hours, praesenz?.google?.oeffnungszeiten)
    : { label: "Jetzt geöffnet", offen: true, zusatz: "bis 22:00" };

  const profile = {
    name: venueProfile.name,
    // Leere Teile weglassen: Ein echter Betrieb ohne Slogan stand sonst als
    // " · Köln" da. Die Demo hat beide Teile und sieht unverändert aus.
    tagline: [venueProfile.tagline, venueProfile.city.replace(/^\d+\s/, "")]
      .filter((teil) => teil.trim())
      .join(" · "),
    tags: venueProfile.tags.slice(0, 3),
  };

  /**
   * Route: Hier kam nur der Toast "Route in Karten öffnen" - es öffnete sich
   * nichts. Für einen echten Betrieb führt die Aktion jetzt wirklich zu Karten:
   * bevorzugt zum Google-Eintrag (derselbe, den ein Gast bei Maps findet), sonst
   * zu einer Suche nach der Adresse aus dem Profil. Kennt die App keins von
   * beiden, fehlt die Aktion - ein Knopf ohne Ziel wäre wieder eine Attrappe.
   */
  const route = echterBetrieb
    ? routenUrl(praesenz?.google?.mapsUrl, venueProfile.street, venueProfile.city)
    : null;
  const zeigeRoute = !echterBetrieb || route !== null;
  const oeffneRoute = () => {
    if (!echterBetrieb) {
      toast.show("Route in Karten öffnen");
      return;
    }
    if (route) Linking.openURL(route).catch(() => toast.show("Karten ließ sich nicht öffnen", "fehler"));
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      {zeigeTitelbild ? (
        <Image
          source={{ uri: titelbild }}
          resizeMode="cover"
          accessibilityLabel="Titelbild von Google"
          onError={() => setKaputtesTitelbild(titelbild ?? null)}
          style={{
            width: "100%",
            height: 246,
            alignSelf: "stretch",
            // Fläche während des Ladens, damit die Karte nicht über Leere hängt.
            backgroundColor: theme.colors.surfaceSunken,
          }}
        />
      ) : (
        /* Kein `fill`: das Titelbild hat eine feste Höhe und spannt sich in der Breite -
           `fill` würde stattdessen flex:1 setzen und die ganze Spalte einnehmen. */
        <PhotoTile
          tone="cool"
          size={246}
          radius={0}
          caption="Titelbild"
          style={{ width: "100%", height: 246, alignSelf: "stretch" }}
        />
      )}

      {/* Zurück schwebt über dem Titelbild, damit der Gast das Profil verlassen kann. */}
      {router.canGoBack() ? (
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Zurück"
          hitSlop={10}
          style={({ pressed }) => ({
            position: "absolute",
            top: insets.top + 10,
            left: 20,
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: "rgba(251,253,252,0.85)",
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
            zIndex: 2,
          })}
        >
          <Text variant="numeric" style={{ fontSize: 22, marginTop: -2 }}>
            ‹
          </Text>
        </Pressable>
      ) : null}

      {bewertung ? (
        <View style={{ position: "absolute", top: insets.top + 14, right: 24 }}>
          <View
            style={{
              backgroundColor: "rgba(251,253,252,0.85)",
              borderRadius: theme.radius.pill,
              paddingVertical: 8,
              paddingHorizontal: 14,
            }}
          >
            <Text variant="numeric" style={{ fontSize: 12 }}>
              {bewertung}
            </Text>
          </View>
        </View>
      ) : null}

      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 22,
          marginTop: -30,
          gap: theme.spacing.lg,
        }}
      >
        <Card emphasis="strong" padding={22} style={{ borderRadius: 22, gap: theme.spacing.sm }}>
          <Emphasis variant="screenTitle" style={{ fontSize: 28, lineHeight: 32 }}>
            {profile.name}
          </Emphasis>
          <Text variant="bodySm" tone="secondary" style={{ fontSize: 15 }}>
            {profile.tagline}
          </Text>

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            {profile.tags.map((tag) => (
              <Tag key={tag} label={tag} />
            ))}
          </View>

          {geoeffnet ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
              <StatusLabel
                label={geoeffnet.label}
                color={geoeffnet.offen ? theme.colors.success : theme.colors.textMuted}
              />
              {geoeffnet.zusatz ? (
                <Text variant="bodySm" tone="muted" style={{ fontSize: 14 }}>
                  · {geoeffnet.zusatz}
                </Text>
              ) : null}
            </View>
          ) : null}
        </Card>

        <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
          {zeigeRoute ? (
            <QuickAction
              label="Route"
              icon={<PinIcon size={22} color={theme.colors.primary} />}
              onPress={oeffneRoute}
            />
          ) : null}
          <QuickAction
            label="Speisekarte"
            icon={<CalendarIcon size={22} color={theme.colors.primary} />}
            onPress={() => router.push("/speisekarte")}
          />
        </View>
      </View>

      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: theme.spacing.lg,
          paddingBottom: Math.max(insets.bottom, 26),
          gap: theme.spacing.sm,
        }}
      >
        <PillButton
          label="Tisch reservieren"
          onPress={() => router.push("/gast/reservieren")}
        />
        <Eyebrow tone="faint" style={{ textAlign: "center" }}>
          Provisionsfrei über Maitr
        </Eyebrow>
      </View>
    </View>
  );
}

/**
 * Kartenziel des Betriebs, oder `null`.
 *
 * Die Maps-Suche mit `api=1` ist Googles dokumentierte Adress-URL: Sie öffnet
 * auf dem iPhone die Google-Maps-App, wenn sie installiert ist, sonst den
 * Browser. Eine Stadt allein ist kein Ziel - ohne Straße führte die Route in
 * die Stadtmitte.
 */
function routenUrl(mapsUrl: string | undefined, strasse: string, ort: string): string | null {
  if (mapsUrl && /^https:\/\//.test(mapsUrl)) return mapsUrl;
  if (!strasse.trim()) return null;
  const adresse = [strasse.trim(), ort.trim()].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;
}

function QuickAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress?: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
    >
      <Card
        emphasis="subtle"
        padding={theme.spacing.lg}
        style={{ borderRadius: theme.radius.tile, alignItems: "center" }}
      >
        <View style={{ marginBottom: 4 }}>{icon}</View>
        <Text variant="numeric" style={{ fontSize: 14 }}>
          {label}
        </Text>
      </Card>
    </Pressable>
  );
}
