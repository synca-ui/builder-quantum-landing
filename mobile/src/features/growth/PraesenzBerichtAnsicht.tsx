import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import type { VenuePresence } from "@maitr/core";

import { AlertIcon, CheckIcon, GoogleMark } from "../../components/icons";
import { Card } from "../../components/ui/Card";
import { ScoreRing, Stars } from "../../components/ui/DataDisplay";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { ListCard } from "../../components/ui/ListCard";
import { LinkAction } from "../../components/ui/PillButton";
import { Text } from "../../components/ui/Text";
import { anzahlText, standText, sterneText } from "../../lib/praesenz";
import { GOOGLE_VERBINDEN_ROUTE } from "./kanaele";
import { useTheme } from "../../theme";

type Bericht = VenuePresence["bericht"];
type Hebel = Bericht["hebel"][number];
type Faktor = Bericht["faktoren"][number];
type Befund = Bericht["websiteBefunde"][number];
type Thema = Bericht["bewertungen"]["themen"][number];
type Google = NonNullable<VenuePresence["google"]>;

export interface PraesenzBerichtAnsichtProps {
  praesenz: VenuePresence;
  /** Ein Abruf läuft gerade (erster Abruf oder „Aktualisieren"). */
  laedt: boolean;
  /** Stößt einen frischen Abruf an; `false`, wenn er nicht geklappt hat. */
  onAktualisieren: () => Promise<boolean>;
}

/**
 * Hebel, die keine Punkte bringen, aber ein Problem melden, das ein Gast sofort
 * bemerkt (nicht auffindbar, als geschlossen gezeigt, falsche Zeiten). Sie stehen
 * als Warnung da - ein „+0" daneben läse sich wie „unwichtig".
 */
const WARN_HEBEL = new Set(["google_nicht_gefunden", "google_geschlossen", "hours_diff"]);

/**
 * Faktoren, die erst die Google-Freigabe (Business-Profile-Zugang) liefert. Nur
 * sie dürfen „kommt mit der Google-Freigabe" sagen und dorthin führen: Der
 * Präsenzbericht führt sie IMMER als unbekannt, egal was der Places-Abruf ergab.
 * Bewertungsschnitt und Aktivität fehlen aus einem anderen Grund (kein
 * Google-Eintrag) - die Freigabe schließt diese Lücke nicht.
 */
const FREIGABE_FAKTOREN = new Set<Faktor["key"]>(["responsiveness", "reach"]);

const QUELLE: Record<Hebel["quelle"], string> = {
  google: "Google",
  website: "Website",
  maitr: "Maitr",
};

/**
 * Profil-Check für den echten Betrieb: der Präsenzbericht, den der Server aus
 * Google-Eintrag, Website-Prüfung und Maitr-Profil rechnet.
 *
 * Anders als die Demo-Ansicht wird hier nichts abgehakt: Ob Fotos oder
 * Öffnungszeiten bei Google stehen, entscheidet der nächste Abruf, nicht ein
 * Tipp in der App. Jede Zahl stammt aus `praesenz`; was dort fehlt, wird als
 * fehlend benannt statt mit einem Beispielwert gefüllt.
 */
export function PraesenzBerichtAnsicht({ praesenz, laedt, onAktualisieren }: PraesenzBerichtAnsichtProps) {
  const theme = useTheme();
  const router = useRouter();
  // Nur für die Rückmeldung nach einem Tipp auf „Aktualisieren": Der Store
  // behält bei einem Fehlschlag den alten Stand, ohne dass der Wirt es merkt.
  const [abrufFehlgeschlagen, setAbrufFehlgeschlagen] = useState(false);

  const { bericht, google } = praesenz;
  const offenePunkte = bericht.hebel.reduce((summe, h) => summe + Math.max(0, h.punkte), 0);
  const stand = standText(praesenz.fetchedAt, Date.now());

  const aktualisieren = async () => {
    setAbrufFehlgeschlagen(false);
    const ok = await onAktualisieren();
    setAbrufFehlgeschlagen(!ok);
  };

  const oeffneHebel = (hebel: Hebel) => {
    if (hebel.route) router.push(hebel.route as Href);
    // Scheitert das Öffnen (kein Browser, kaputte Adresse), bleibt der Wirt
    // einfach auf dem Screen - kein unbehandeltes Promise.
    else if (hebel.url) Linking.openURL(hebel.url).catch(() => {});
  };

  return (
    <View style={{ gap: 18 }}>
      {/* ── Score und worauf er beruht ── */}
      <View style={{ alignItems: "center", gap: 10 }}>
        <ScoreRing score={bericht.score} />
        <Text variant="bodySm" tone="secondary" style={{ textAlign: "center", fontSize: 14, lineHeight: 20 }}>
          {bericht.deckung.hinweis}
        </Text>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            columnGap: 12,
          }}
        >
          <Eyebrow variant="eyebrowLg">{stand ?? "Noch nicht abgerufen"}</Eyebrow>
          {laedt ? (
            // Kein zweiter Abruf, solange einer läuft: Der Server drosselt zwar,
            // aber ein Doppeltipp soll nicht zwei Fremdabrufe anstoßen.
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: theme.hitSize.minTouch }}
              accessibilityRole="progressbar"
              accessibilityLabel="Präsenz wird geprüft"
            >
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text variant="action" tone="muted" style={{ fontSize: 14 }}>
                Wird geprüft …
              </Text>
            </View>
          ) : (
            <LinkAction
              label="Aktualisieren"
              labelSize={14}
              onPress={() => void aktualisieren()}
              accessibilityHint="Ruft Google und deine Website neu ab"
            />
          )}
        </View>

        {praesenz.hinweis ? (
          <Text variant="bodySm" tone="muted" style={{ textAlign: "center", fontSize: 13.5, lineHeight: 19 }}>
            {praesenz.hinweis}
          </Text>
        ) : null}
        {abrufFehlgeschlagen && !laedt ? (
          <Text
            variant="bodySm"
            color={theme.colors.destructive}
            style={{ textAlign: "center", fontSize: 13.5, lineHeight: 19 }}
          >
            Aktualisieren hat nicht geklappt. Du siehst weiter den letzten Stand.
          </Text>
        ) : null}
      </View>

      {google ? <GoogleKarte google={google} /> : null}

      {/* ── Was offen ist ── */}
      {offenePunkte > 0 ? (
        <Text variant="body" tone="secondary">
          Offen · bringt dir{" "}
          <Text variant="body" tone="accent">
            +{offenePunkte} Punkte
          </Text>
        </Text>
      ) : null}

      {bericht.hebel.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          {bericht.hebel.map((hebel) => (
            <HebelKarte key={hebel.id} hebel={hebel} onPress={() => oeffneHebel(hebel)} />
          ))}
        </View>
      ) : (
        <Text variant="bodySm" tone="secondary" style={{ fontSize: 14, lineHeight: 20 }}>
          Aus Google, deiner Website und Maitr ergibt sich gerade nichts, was offen ist.
        </Text>
      )}

      {/* ── Faktoren ── */}
      {bericht.faktoren.length > 0 ? (
        <View style={{ gap: theme.spacing.md, marginTop: 6 }}>
          <Text variant="sectionTitle" accessibilityRole="header">
            So setzt sich dein Score zusammen
          </Text>
          <ListCard>
            {bericht.faktoren.map((faktor) => (
              <FaktorZeile
                key={faktor.key}
                faktor={faktor}
                googleStatus={praesenz.status}
                // Kanal-Seite statt Onboarding: Nur sie lädt den Kanalstatus nach dem
                // OAuth-Rücksprung neu (siehe GOOGLE_VERBINDEN_ROUTE).
                onGoogleFreigabe={() => router.push(GOOGLE_VERBINDEN_ROUTE)}
              />
            ))}
          </ListCard>
        </View>
      ) : null}

      {/* ── Website ── */}
      {bericht.websiteBefunde.length > 0 ? (
        <View style={{ gap: theme.spacing.md, marginTop: 6 }}>
          <View style={{ gap: 2 }}>
            <Text variant="sectionTitle" accessibilityRole="header">
              Deine Website
            </Text>
            {praesenz.website?.url ? (
              <Text variant="bodySm" tone="muted" style={{ fontSize: 13.5, lineHeight: 19 }}>
                {praesenz.website.url}
              </Text>
            ) : null}
          </View>
          <ListCard>
            {bericht.websiteBefunde.map((befund) => (
              <BefundZeile key={befund.id} befund={befund} />
            ))}
          </ListCard>
        </View>
      ) : null}

      {/* ── Themen aus den Bewertungen ── */}
      {bericht.bewertungen.themen.length > 0 ? (
        <View style={{ gap: theme.spacing.md, marginTop: 6 }}>
          <View style={{ gap: 2 }}>
            <Text variant="sectionTitle" accessibilityRole="header">
              Was Gäste erwähnen
            </Text>
            {/* Ehrlich zur Stichprobe: Places zeigt ohne Freigabe nur fünf Bewertungen. */}
            <Text variant="bodySm" tone="muted" style={{ fontSize: 13.5, lineHeight: 19 }}>
              Aus den bis zu fünf Bewertungen, die Google öffentlich zeigt.
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {bericht.bewertungen.themen.map((thema) => (
              <ThemaTag key={thema.topic} thema={thema} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/* ── Google-Maps-Karte ───────────────────────────────────────────────────── */

function GoogleKarte({ google }: { google: Google }) {
  const theme = useTheme();
  const geschlossen = google.status === "CLOSED_TEMPORARILY" || google.status === "CLOSED_PERMANENTLY";

  // Die Places-Antwort trägt höchstens zehn Fotos - „10" heißt also „zehn oder mehr".
  const fotos =
    google.fotoAnzahl <= 0
      ? "Keine Fotos"
      : google.fotoAnzahl === 1
        ? "1 Foto"
        : google.fotoAnzahl >= 10
          ? "10+ Fotos"
          : `${anzahlText(google.fotoAnzahl)} Fotos`;

  return (
    <Card emphasis="subtle" padding={18} style={{ borderRadius: 18, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <GoogleMark size={15} />
        <Eyebrow>Google Maps</Eyebrow>
      </View>

      {/* Der Name zeigt, WELCHEN Eintrag die Suche getroffen hat - trifft sie den
          falschen Betrieb, sieht der Wirt es hier zuerst. */}
      <View style={{ gap: 2 }}>
        <Text variant="cardTitleSm" style={{ fontSize: 17 }}>
          {google.name}
        </Text>
        {google.adresse ? (
          <Text variant="bodySm" tone="muted" style={{ fontSize: 13.5, lineHeight: 19 }}>
            {google.adresse}
          </Text>
        ) : null}
      </View>

      {typeof google.rating === "number" ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 10, rowGap: 4 }}>
          <Text variant="numeric" style={{ fontSize: 28, lineHeight: 32 }}>
            {sterneText(google.rating)}
          </Text>
          <Stars rating={google.rating} size={15} color={theme.colors.ratingStar} />
          <Text variant="bodySm" tone="secondary" style={{ fontSize: 14 }}>
            {google.reviewCount === 1 ? "1 Bewertung" : `${anzahlText(google.reviewCount)} Bewertungen`}
          </Text>
        </View>
      ) : (
        <Text variant="bodySm" tone="secondary" style={{ fontSize: 14 }}>
          Noch keine Bewertungen bei Google
        </Text>
      )}

      <Text variant="bodySm" tone="secondary" style={{ fontSize: 14 }}>
        {fotos}
      </Text>

      {geschlossen ? (
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <AlertIcon size={17} color={theme.colors.destructive} />
          <Text variant="bodySm" color={theme.colors.destructive} style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>
            {google.status === "CLOSED_PERMANENTLY"
              ? "Google zeigt: dauerhaft geschlossen"
              : "Google zeigt: vorübergehend geschlossen"}
          </Text>
        </View>
      ) : google.status === "UNBEKANNT" ? (
        // Kein Status ist keine Schließung - gedeckt statt rot, sonst erschrickt
        // der Wirt über etwas, das Google schlicht nicht angegeben hat.
        <Text variant="bodySm" tone="muted" style={{ fontSize: 13.5 }}>
          Betriebsstatus nennt Google nicht
        </Text>
      ) : null}

      {google.mapsUrl ? (
        <View style={{ alignItems: "flex-start" }}>
          <LinkAction
            label="In Google Maps öffnen"
            labelSize={14}
            onPress={() => {
              if (google.mapsUrl) Linking.openURL(google.mapsUrl).catch(() => {});
            }}
          />
        </View>
      ) : null}
    </Card>
  );
}

/* ── Ein Hebel ───────────────────────────────────────────────────────────── */

function HebelKarte({ hebel, onPress }: { hebel: Hebel; onPress: () => void }) {
  const theme = useTheme();
  const warnung = WARN_HEBEL.has(hebel.id);
  const antippbar = Boolean(hebel.route || hebel.url);

  const inhalt = (
    <Card
      emphasis="subtle"
      padding={0}
      style={{
        borderRadius: 18,
        paddingVertical: theme.spacing.lg,
        paddingHorizontal: 18,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        // Warnungen bekommen einen Rand in der Warnfarbe - die Fläche bleibt ruhig,
        // damit mehrere Warnungen die Liste nicht rot überfluten.
        ...(warnung ? { borderWidth: 1, borderColor: theme.colors.destructive } : null),
      }}
    >
      {warnung ? (
        <View style={{ paddingTop: 2 }}>
          <AlertIcon size={20} color={theme.colors.destructive} />
        </View>
      ) : null}

      <View style={{ flex: 1, gap: 4 }}>
        <Text
          variant="cardTitleSm"
          color={warnung ? theme.colors.destructive : undefined}
          style={{ fontSize: 16.5, lineHeight: 21 }}
        >
          {hebel.titel}
        </Text>
        <Text variant="bodySm" tone="secondary" style={{ fontSize: 13.5, lineHeight: 19 }}>
          {hebel.detail}
        </Text>
        <Eyebrow style={{ fontSize: 10, marginTop: 2 }}>{QUELLE[hebel.quelle]}</Eyebrow>
      </View>

      <View style={{ alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
        {hebel.punkte > 0 ? (
          <Text variant="numeric" color={theme.colors.primary} style={{ fontSize: 16 }}>
            +{hebel.punkte}
          </Text>
        ) : null}
        {antippbar ? (
          <Text variant="numeric" tone="faint" style={{ fontSize: 20, lineHeight: 22 }}>
            ›
          </Text>
        ) : null}
      </View>
    </Card>
  );

  if (!antippbar) return inhalt;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={hebel.route ? "button" : "link"}
      accessibilityLabel={
        hebel.punkte > 0 ? `${hebel.titel}, bringt ${hebel.punkte} Punkte` : hebel.titel
      }
      accessibilityHint={hebel.detail}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      {inhalt}
    </Pressable>
  );
}

/* ── Ein Faktor des Scores ───────────────────────────────────────────────── */

function FaktorZeile({
  faktor,
  googleStatus,
  onGoogleFreigabe,
}: {
  faktor: Faktor;
  googleStatus: VenuePresence["status"];
  onGoogleFreigabe: () => void;
}) {
  const theme = useTheme();
  const unbekannt = faktor.status === "unbekannt";
  // Nur wo die Freigabe die Lücke wirklich schließt, gibt es ein Tipp-Ziel.
  const wartetAufFreigabe = unbekannt && FREIGABE_FAKTOREN.has(faktor.key);
  const prozent = Math.round(Math.max(0, Math.min(1, faktor.achieved)) * 100);

  const statusText = wartetAufFreigabe
    ? "kommt mit der Google-Freigabe"
    : unbekannt
      ? // Ohne Google-Eintrag: sagen, warum er fehlt - „nicht gefunden" ist etwas
        // anderes als „noch nicht abgerufen" (kein Schlüssel, ausstehend, Fehler).
        googleStatus === "nicht_gefunden"
        ? "kein Google-Eintrag gefunden"
        : "fehlt, bis der Google-Eintrag abgerufen ist"
      : faktor.status === "geschaetzt"
        ? `${prozent} % · geschätzt`
        : `${prozent} %`;

  const zeile = (
    <View style={{ paddingVertical: 14, gap: 8, minHeight: theme.hitSize.minTouch }}>
      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", columnGap: 10, rowGap: 2 }}>
        <Text variant="cardTitleSm" style={{ flexGrow: 1, flexShrink: 1, fontSize: 15.5, lineHeight: 20 }}>
          {faktor.label}
        </Text>
        <Text
          variant="numeric"
          color={unbekannt ? theme.colors.textMuted : theme.colors.textPrimary}
          style={{ flexShrink: 1, fontSize: 14 }}
        >
          {statusText}
          {wartetAufFreigabe ? " ›" : ""}
        </Text>
      </View>

      {/* Unbekannte Faktoren bekommen keinen leeren Balken: Ein leerer Balken
          läse sich wie „0 % erreicht", und genau das ist nicht gemessen. */}
      {unbekannt ? null : (
        <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.surfaceTrack, overflow: "hidden" }}>
          <View
            style={{
              width: `${prozent}%`,
              height: "100%",
              borderRadius: 3,
              backgroundColor: theme.colors.primary,
              opacity: faktor.status === "geschaetzt" ? 0.55 : 1,
            }}
          />
        </View>
      )}
    </View>
  );

  if (!wartetAufFreigabe) {
    return (
      <View accessible accessibilityLabel={`${faktor.label}: ${statusText}`}>
        {zeile}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onGoogleFreigabe}
      accessibilityRole="button"
      accessibilityLabel={`${faktor.label}: ${statusText}`}
      accessibilityHint="Öffnet die Google-Verbindung"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {zeile}
    </Pressable>
  );
}

/* ── Ein Website-Befund ──────────────────────────────────────────────────── */

function BefundZeile({ befund }: { befund: Befund }) {
  const theme = useTheme();

  return (
    <View
      style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 13 }}
      accessible
      accessibilityLabel={`${befund.titel}: ${befund.ok ? "in Ordnung" : "fehlt"}${befund.detail ? `. ${befund.detail}` : ""}`}
    >
      <View style={{ paddingTop: 1 }}>
        {befund.ok ? (
          <CheckIcon size={18} color={theme.colors.success} strokeWidth={2.4} />
        ) : (
          <AlertIcon size={18} color={theme.colors.destructive} />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="cardTitleSm" style={{ fontSize: 15.5, lineHeight: 20 }}>
          {befund.titel}
        </Text>
        {befund.detail ? (
          <Text variant="bodySm" tone="secondary" style={{ fontSize: 13.5, lineHeight: 19 }}>
            {befund.detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/* ── Ein Thema aus den Bewertungen ───────────────────────────────────────── */

function ThemaTag({ thema }: { thema: Thema }) {
  const theme = useTheme();
  const farbe =
    thema.sentiment === "positiv"
      ? theme.colors.success
      : thema.sentiment === "negativ"
        ? theme.colors.destructive
        : theme.colors.ratingStar;

  return (
    // Stimmung als Punkt UND als Wort: Farbe allein trägt die Information nicht
    // für alle Gäste des Screens (Farbsehschwäche, Barrierefrei-Modus).
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        backgroundColor: theme.colors.surfaceSunken,
        borderRadius: theme.radius.pill,
        paddingVertical: 7,
        paddingHorizontal: 13,
        maxWidth: "100%",
      }}
      accessible
      accessibilityLabel={`${thema.topic}, ${thema.sentiment}`}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: farbe }} />
      <Text variant="numeric" color={theme.colors.textOnSunken} style={{ fontSize: 12.5, flexShrink: 1 }}>
        {thema.topic}
        <Text variant="numeric" tone="muted" style={{ fontSize: 12.5 }}>
          {" · "}
          {thema.sentiment}
        </Text>
      </Text>
    </View>
  );
}
