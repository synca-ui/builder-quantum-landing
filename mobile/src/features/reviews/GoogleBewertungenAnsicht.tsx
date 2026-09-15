import { ActivityIndicator, Linking, View } from "react-native";
import { useRouter } from "expo-router";
import type { VenuePresence } from "@maitr/core";

import { AlertIcon } from "../../components/icons";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { Tag } from "../../components/ui/Chip";
import { DarkPanel, Stars, onDarkPanel } from "../../components/ui/DataDisplay";
import { EmptyState } from "../../components/ui/EmptyState";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { LinkAction, PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { Text } from "../../components/ui/Text";
import { GOOGLE_VERBINDEN_ROUTE } from "../growth/kanaele";
import { anzahlText, standText, sterneText } from "../../lib/praesenz";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

type GoogleEintrag = NonNullable<VenuePresence["google"]>;
type GoogleBewertung = GoogleEintrag["bewertungen"][number];

const GOOGLE_PROFIL_URL = "https://business.google.com/";

/**
 * Bewertungen im echten Betrieb - was Google öffentlich über den Betrieb zeigt.
 *
 * Ohne Google-Freigabe gibt Places höchstens fünf Bewertungen heraus und keine
 * einzige Antwort. Deshalb gibt es hier weder „Freigeben" noch einen Zähler
 * „wartet auf Antwort": Maitr kann ohne Freigabe nichts veröffentlichen und weiß
 * nicht, was schon beantwortet ist. Jede Aktion führt dorthin, wo sie wirklich
 * geht - zu Google Maps oder in die Freigabe.
 *
 * Auch MIT Freigabe bleibt diese Liste die öffentliche Auswahl: Die über die
 * Freigabe synchronisierten Bewertungen und Antworten nutzt bisher nur der Server
 * (Briefing, Score) - einen App-Weg, sie hier zu zeigen, gibt es noch nicht. Das
 * Panel sagt deshalb nie „kommt mit der Freigabe" über diesen Tab.
 */
export function GoogleBewertungenAnsicht({
  praesenz,
  laedt,
  aktualisiere,
  googleVerbunden,
}: {
  praesenz: VenuePresence;
  laedt: boolean;
  aktualisiere: () => Promise<boolean>;
  /** Aktive Google-Freigabe laut Store (`channels.google`) - steuert nur das Panel. */
  googleVerbunden: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();

  const { google, bericht } = praesenz;
  // Schnitt und Anzahl aus Googles Gesamtzahl, nicht aus der Fünfer-Stichprobe.
  // Bewusst NICHT aus dem Bericht: Ohne Eintrag setzt der Server dort `anzahl: 0`
  // ein - das hieße „keine Bewertungen", obwohl die Zahl schlicht unbekannt ist.
  const schnitt = typeof google?.rating === "number" ? google.rating : null;
  const anzahl = typeof google?.reviewCount === "number" ? google.reviewCount : null;
  // Bei `fehler` trägt `fetchedAt` den Zeitpunkt des GESCHEITERTEN Versuchs - der
  // Server speichert ihn so, damit die Zehn-Minuten-Drossel auch Fehlversuche
  // bremst. „Stand gerade eben" über Bewertungen von vor Tagen wäre gelogen; wann
  // der gezeigte Eintrag wirklich geholt wurde, steht in der Antwort nicht.
  const abrufFehlgeschlagen = praesenz.status === "fehler";
  const stand = abrufFehlgeschlagen ? "Letzter Abruf fehlgeschlagen" : standText(praesenz.fetchedAt, Date.now());
  // `istPraesenz` prüft den Bericht, nicht die Innereien des Google-Eintrags. Eine
  // fehlende Liste darf den Tab nicht abstürzen lassen - sie ist dann eben leer.
  const liste = google?.bewertungen ?? [];
  const themen = bericht.bewertungen.themen ?? [];

  const oeffne = (url: string | undefined) => {
    if (!url) return;
    // openURL lehnt ab, wenn kein Browser/keine Maps-App die Adresse nimmt - ohne
    // catch bliebe der Tipp stumm und die Ablehnung unbehandelt.
    Linking.openURL(url).catch(() => toast.show("Link ließ sich nicht öffnen", "fehler"));
  };

  // Kopfzeile unter der großen Zahl. „noch keine" nur, wenn Google selbst null
  // Bewertungen meldet; ohne Eintrag ist die Anzahl unbekannt und wird so benannt.
  const kopfZeile = google
    ? anzahl === 0
      ? "noch keine"
      : anzahl === null
        ? "Google"
        : `${anzahlText(anzahl)} Google`
    : praesenz.status === "nicht_gefunden"
      ? "nicht gefunden"
      : "nicht abgerufen";

  const aktualisieren = async () => {
    const ok = await aktualisiere();
    // Der Store lässt bei einem Fehlschlag den alten Stand stehen. Ohne Meldung
    // sähe das aus, als hätte der Abruf geklappt und nichts Neues gebracht.
    if (!ok) toast.show("Aktualisieren hat nicht geklappt - der bisherige Stand bleibt", "fehler");
  };

  return (
    <Screen withTabBar contentStyle={{ gap: theme.spacing.lg }}>
      <ScreenHeader
        title="Bewertungen"
        trailing={
          <View style={{ alignItems: "flex-end" }}>
            {/* lineHeight muss mitwachsen, sonst wird die große Zahl oben abgeschnitten. */}
            <Text variant="numeric" style={{ fontSize: 26, lineHeight: 30 }}>
              {schnitt !== null ? sterneText(schnitt) : "–"}
            </Text>
            <Eyebrow style={{ fontSize: 10 }}>{kopfZeile}</Eyebrow>
          </View>
        }
      />

      {/* Wie alt die Zahlen sind, steht direkt unter dem Kopf: Places ist ein
          Abruf, kein Live-Strom - eine Bewertung von heute Morgen fehlt womöglich. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.spacing.md,
          marginTop: -theme.spacing.sm,
          // Spinner (≈20 pt) und LinkAction (44 pt Tippfläche) wechseln sich hier ab -
          // ohne feste Höhe hüpft die ganze Liste bei jedem Aktualisieren.
          minHeight: theme.hitSize.minTouch,
        }}
      >
        <Eyebrow style={{ flexShrink: 1 }}>
          {laedt ? "Wird abgerufen …" : (stand ?? "Noch nicht abgerufen")}
        </Eyebrow>
        {laedt ? (
          <ActivityIndicator size="small" color={theme.colors.textMuted} />
        ) : (
          <LinkAction label="Aktualisieren" labelSize={14} onPress={aktualisieren} />
        )}
      </View>

      {google ? (
        <>
          {/* Der Server schickt einen Hinweis neben einem Eintrag nur, wenn etwas
              nicht stimmt - praktisch: Abruf gescheitert, alter Stand bleibt
              stehen. Ohne diese Zeile sähe die alte Liste aus wie frisch geholt. */}
          {praesenz.hinweis || abrufFehlgeschlagen ? (
            <HinweisKarte
              text={
                praesenz.hinweis ??
                "Der letzte Google-Abruf ist fehlgeschlagen - du siehst den vorherigen Stand."
              }
            />
          ) : null}

          {googleVerbunden ? (
            <DarkPanel style={{ borderRadius: 18, gap: theme.spacing.sm }}>
              <Text variant="numeric" color={onDarkPanel.title} style={{ fontSize: 17 }}>
                Google ist verbunden
              </Text>
              {/* Kein zweites „Google verbinden" nach dem Verbinden - und kein
                  Versprechen, das dieser Tab nicht einlöst: Die vollständige Liste
                  samt Antworten fließt bisher nur in die Auswertung, nicht hierher.
                  Antworten schreiben geht heute nur im Unternehmensprofil selbst. */}
              <Text variant="bodySm" color={onDarkPanel.body} style={{ fontSize: 14, lineHeight: 20 }}>
                Maitr wertet jetzt alle Bewertungen samt deinen Antworten aus. Diese Liste
                zeigt aber noch die öffentliche Auswahl - höchstens fünf, ohne Antworten.
                Antworten schreibst du im Google-Unternehmensprofil.
              </Text>
              <PillButton
                label="Unternehmensprofil öffnen"
                size="compact"
                labelColor={onDarkPanel.onAccent}
                onPress={() => oeffne(GOOGLE_PROFIL_URL)}
                style={{ marginTop: theme.spacing.xs, backgroundColor: onDarkPanel.accent }}
              />
            </DarkPanel>
          ) : (
            <DarkPanel style={{ borderRadius: 18, gap: theme.spacing.sm }}>
              <Text variant="numeric" color={onDarkPanel.title} style={{ fontSize: 17 }}>
                Öffentlich bei Google
              </Text>
              {/* Genau benennen, WER etwas nicht zeigt: Bei Google Maps sehen Gäste deine
                  Antworten sehr wohl - nur der öffentliche Abruf (Places) gibt sie nicht
                  heraus. „Google zeigt keine Antworten" läse sich wie ein Fehler im Profil.
                  Und nur versprechen, was die Freigabe wirklich bringt: Sie verbessert die
                  Auswertung, diese Liste bleibt die öffentliche Auswahl. */}
              <Text variant="bodySm" color={onDarkPanel.body} style={{ fontSize: 14, lineHeight: 20 }}>
                Ohne Freigabe gibt Google nur die fünf relevantesten Bewertungen heraus, ohne
                Antworten. Mit der Freigabe wertet Maitr alle Bewertungen samt deinen Antworten
                aus - diese Liste zeigt weiter die öffentliche Auswahl.
              </Text>
              <PillButton
                label="Google verbinden"
                size="compact"
                labelColor={onDarkPanel.onAccent}
                // Kanal-Seite statt Onboarding: Nur sie lädt den Kanalstatus nach dem
                // OAuth-Rücksprung neu (siehe GOOGLE_VERBINDEN_ROUTE).
                onPress={() => router.push(GOOGLE_VERBINDEN_ROUTE)}
                style={{ marginTop: theme.spacing.xs, backgroundColor: onDarkPanel.accent }}
              />
            </DarkPanel>
          )}

          {themen.length ? (
            <View style={{ gap: theme.spacing.sm }}>
              {/* Ehrlich benennen, worauf die Themen beruhen: fünf Texte sind eine
                  Stichprobe, kein Stimmungsbild aller Gäste. */}
              <Eyebrow>Themen in den gezeigten Bewertungen</Eyebrow>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                {themen.map((thema) => (
                  <Tag key={thema.topic} label={`${thema.topic} · ${thema.sentiment}`} />
                ))}
              </View>
            </View>
          ) : null}

          {liste.length ? (
            liste.map((bewertung) => (
              <GoogleBewertungKarte
                key={bewertung.id}
                bewertung={bewertung}
                onOeffnen={() => oeffne(bewertung.url ?? google.mapsUrl)}
                kannOeffnen={Boolean(bewertung.url ?? google.mapsUrl)}
              />
            ))
          ) : (
            <EmptyState
              title={anzahl === 0 ? "Noch keine Google-Bewertungen" : "Google zeigt gerade keine Bewertung"}
              message={
                anzahl === 0
                  ? "Sobald Gäste dich bei Google bewerten, erscheinen die neuesten hier."
                  : "Der Eintrag nennt Bewertungen, gibt über diesen Weg aber keine einzelnen heraus."
              }
            />
          )}

          {google.mapsUrl ? (
            <View style={{ alignItems: "center" }}>
              <LinkAction
                label={
                  anzahl !== null && anzahl > 1
                    ? `Alle ${anzahlText(anzahl)} Bewertungen in Google Maps`
                    : anzahl === 1
                      ? "Bewertung in Google Maps ansehen"
                      : "Eintrag in Google Maps öffnen"
                }
                onPress={() => oeffne(google.mapsUrl)}
              />
            </View>
          ) : null}
        </>
      ) : (
        <OhneGoogleKarte praesenz={praesenz} onOeffnen={oeffne} />
      )}
    </Screen>
  );
}

/**
 * Eine öffentliche Bewertung. Bewusst ohne Antwortvorschlag und ohne „Freigeben":
 * Ohne Freigabe gibt es keinen Weg, eine Antwort bei Google zu veröffentlichen -
 * ein Knopf, der „Antwort veröffentlicht" meldet, wäre gelogen.
 */
function GoogleBewertungKarte({
  bewertung,
  kannOeffnen,
  onOeffnen,
}: {
  bewertung: GoogleBewertung;
  kannOeffnen: boolean;
  onOeffnen: () => void;
}) {
  const theme = useTheme();
  const text = (bewertung.text ?? "").trim();
  const autor = (bewertung.autor ?? "").trim();
  const wann = bewertung.relativ ?? datumText(bewertung.createdAt);

  return (
    <Card emphasis="default" padding={18} style={{ gap: 11 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: theme.spacing.md,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 }}>
          <Avatar initials={initialen(autor)} size={34} />
          <View style={{ flexShrink: 1 }}>
            <Text variant="numeric" style={{ fontSize: 15 }} numberOfLines={1}>
              {autor || "Ohne Namen"}
            </Text>
            {wann ? (
              <Eyebrow color={theme.colors.textMuted} style={{ fontSize: 10 }}>
                {wann}
              </Eyebrow>
            ) : null}
          </View>
        </View>
        <Stars rating={bewertung.rating} color={theme.colors.textSecondary} />
      </View>

      {text ? (
        <Text variant="bodySm" style={{ fontSize: 15, lineHeight: 22.5 }}>
          {text}
        </Text>
      ) : (
        // Eine Bewertung nur mit Sternen ist bei Google häufig - eine leere Karte
        // sähe dagegen nach einem Ladefehler aus.
        <Text variant="bodySm" tone="faint" style={{ fontSize: 14 }}>
          Nur Sterne, kein Kommentar
        </Text>
      )}

      {kannOeffnen ? (
        <View style={{ flexDirection: "row" }}>
          <LinkAction label="Bei Google ansehen" labelSize={14} onPress={onOeffnen} />
        </View>
      ) : null}
    </Card>
  );
}

/** Kurzer Vermerk über der Liste, wenn der gezeigte Stand nicht der aktuelle ist. */
function HinweisKarte({ text }: { text: string }) {
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
      <Text variant="bodySm" tone="secondary" style={{ fontSize: 14, lineHeight: 20, flexShrink: 1 }}>
        {text}
      </Text>
    </Card>
  );
}

/**
 * Präsenz ist da, ein Google-Eintrag nicht. Der Server sagt in `hinweis`, warum
 * (nicht gefunden, kein Schlüssel, Fehler) - den zeigen wir, statt die Liste mit
 * Beispielen zu füllen.
 */
function OhneGoogleKarte({
  praesenz,
  onOeffnen,
}: {
  praesenz: VenuePresence;
  onOeffnen: (url: string) => void;
}) {
  const theme = useTheme();
  const nichtGefunden = praesenz.status === "nicht_gefunden";

  const titel = nichtGefunden
    ? "Bei Google Maps nicht gefunden"
    : praesenz.status === "fehler"
      ? "Google-Abruf fehlgeschlagen"
      : "Google-Bewertungen noch nicht abgerufen";

  const text =
    praesenz.hinweis ??
    (nichtGefunden
      ? "Zu Name und Adresse deines Betriebs gibt es bei Google Maps keinen passenden Eintrag."
      : praesenz.status === "fehler"
        ? "Google hat gerade nicht geantwortet. Versuch es später noch einmal."
        : "Sobald der Abruf gelaufen ist, stehen hier Schnitt, Anzahl und die neuesten Bewertungen.");

  return (
    <Card emphasis="subtle" padding={theme.spacing.xl} style={{ gap: theme.spacing.sm, borderRadius: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
        <AlertIcon size={16} color={theme.colors.textMuted} />
        <Text variant="cardTitleSm" style={{ fontSize: 16, flexShrink: 1 }}>
          {titel}
        </Text>
      </View>
      <Text variant="bodySm" tone="secondary" style={{ fontSize: 14, lineHeight: 20 }}>
        {text}
      </Text>
      {nichtGefunden ? (
        <View style={{ flexDirection: "row" }}>
          <LinkAction
            label="Unternehmensprofil anlegen"
            labelSize={14}
            onPress={() => onOeffnen(GOOGLE_PROFIL_URL)}
          />
        </View>
      ) : null}
    </Card>
  );
}

/**
 * Echter Betrieb, aber noch keine Präsenz: Der erste Abruf läuft oder ist
 * gescheitert. Keine Demo-Bewertungen als Lückenfüller - die sähen aus wie die
 * eigenen.
 */
export function BewertungenLaden({
  laedt,
  aktualisiere,
}: {
  laedt: boolean;
  aktualisiere: () => Promise<boolean>;
}) {
  const theme = useTheme();
  const toast = useToast();

  const erneut = async () => {
    const ok = await aktualisiere();
    if (!ok) toast.show("Hat wieder nicht geklappt. Prüfe die Verbindung.", "fehler");
  };

  return (
    <Screen withTabBar contentStyle={{ gap: theme.spacing.lg }}>
      <ScreenHeader title="Bewertungen" />

      {laedt ? (
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
      ) : (
        <View style={{ gap: theme.spacing.md }}>
          <EmptyState
            title="Bewertungen noch nicht geladen"
            message="Der Abruf bei Google hat nicht geklappt. Deine Bewertungen sind nicht weg - sie ließen sich nur gerade nicht holen."
          />
          <PillButton label="Erneut versuchen" onPress={erneut} />
        </View>
      )}
    </Screen>
  );
}

/** "Marion K." → "MK", "anna" → "A". Leerer Name → "?". */
function initialen(name: string): string {
  const woerter = name.trim().split(/\s+/).filter(Boolean);
  if (!woerter.length) return "?";
  const erste = woerter[0].charAt(0);
  const letzte = woerter.length > 1 ? woerter[woerter.length - 1].charAt(0) : "";
  return (erste + letzte).toUpperCase();
}

/** Fallback, wenn Google keine relative Angabe mitliefert: "3. September 2026". */
function datumText(iso: string): string | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
}
