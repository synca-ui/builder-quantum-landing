import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, TextInput, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { api, type Day } from "@maitr/core";

import { CheckIcon, ClockIcon, GoogleMark, PinIcon } from "../../components/icons";
import { Card } from "../../components/ui/Card";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { ListCard, ListRow } from "../../components/ui/ListCard";
import { Banner } from "../../components/ui/Media";
import { Text } from "../../components/ui/Text";
import { Toggle } from "../../components/ui/Toggle";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import { AblaufRahmen } from "./AblaufRahmen";
import {
  ablaufAusServerdaten,
  ANFANGSZUSTAND,
  brauchtNeueAnmeldung,
  eigenerVenue,
  entwurfAusZeiten,
  fehlerText,
  fortschritt,
  googleVerbunden,
  hatOeffnungszeiten,
  OEFFNUNGSZEITEN_VORSCHLAG,
  schrittListe,
  venueAusKonflikt,
  zeitenAusEntwurf,
  type AblaufZustand,
  type SchrittId,
  type TagEntwurf,
  type ZeitenEntwurf,
  type ZeitenFeldFehler,
} from "./ablauf";

/**
 * Die vier Bildschirme des Onboardings plus Abschluss.
 *
 * Sie haben zwei Vorgänger abgelöst, die beide gelöscht und nicht repariert
 * wurden: eine siebenteilige „Journey", die Betriebsnamen, Adresse und
 * Öffnungszeiten fest verdrahtet hatte, nichts davon speicherte und am Ende
 * `signIn()` ohne Clerk-Sitzung rief - der Nutzer war danach lokal angemeldet,
 * hatte kein Konto und bekam auf jeden Aufruf 401. Und eine Checkliste, deren
 * Betriebsanlage echt war, während die vier Häkchen darüber („Google Business
 * verbunden", „Öffnungszeiten übernommen") behauptet waren.
 *
 * Zustand lebt bewusst NICHT in einem gemeinsamen Kontext über alle vier Schritte
 * hinweg - es gibt keinen Ort, an dem er einen App-Neustart überleben würde, ein
 * Kontext wäre also nur eine zweite, verderbliche Wahrheit neben dem Server. Jeder
 * Schritt prüft seinen eigenen Stand deshalb selbst frisch (Store bzw. Server):
 *
 *   - Betrieb:  `useStore().hasRealVenue` (übersteht einen Neustart, siehe
 *     `store.tsx`s persistierte `venueId`), im Zweifel klärt der 409-Fall von
 *     `POST /venues` den Rest.
 *   - Google:   `GET /integrations` beim Öffnen des Schritts.
 *   - Zeiten:   `GET /venues` beim Öffnen des Schritts.
 *   - Abschluss: beides noch einmal frisch, für die Häkchen.
 *
 * Der Weg zurück: Verlässt ein Wirt die App mitten im Ablauf und öffnet sie neu,
 * schickt ihn die Weiche in `app/index.tsx` wieder hierher, solange kein Betrieb
 * an seinem Konto hängt - danach nach `/start`. Kommt er von dort oder über einen
 * Deep-Link in einen dieser Schritte zurück, zeigt jeder sofort den echten,
 * aktuellen Stand statt eines veralteten oder leeren Formulars - genau deshalb die
 * frische Prüfung oben statt eines mitgeschleppten Zustands.
 */

/**
 * DREI Schritte, nicht vier.
 *
 * Der Willkommen-Bildschirm ist eine Einleitung und keine Aufgabe - er trägt
 * deshalb gar keine Fortschrittsleiste mehr. Vorher zählte er mit, und auf
 * demselben Bildschirm standen „Dafür drei kurze Schritte" und „1 / 4"
 * nebeneinander. Zwei Zählungen für dieselbe Sache sind kein Detail: Der Wirt
 * rechnet mit, und eine Leiste, die mehr verspricht als die Liste darunter,
 * lässt ihn beim vermeintlich letzten Schritt auf einen weiteren warten.
 */
const ONBOARDING_SCHRITTE = 3;

/* ── 1 · Willkommen ──────────────────────────────────────────────────────── */

export function AblaufWillkommen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <AblaufRahmen
      surface="deep"
      primaryAction={{ label: "Los geht's", onPress: () => router.push("/onboarding/betrieb") }}
      // KEINE Fußzeile mehr. Sie sagte „Betrieb anlegen ist Pflicht, der Rest
      // lässt sich überspringen" - also Wort für Wort das, was die Liste darüber
      // je Zeile schon trägt. Dazu lag sie über dem kräftigsten Teil des
      // Verlaufs und war dort auch mit dunklerem Ton schlecht zu lesen. Eine
      // Zeile, die nichts hinzufügt, gewinnt man nicht durch mehr Kontrast.
    >
      <View style={{ marginTop: 44 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text variant="numeric" color={theme.colors.surface} style={{ fontSize: 44, lineHeight: 50 }}>
            M
            <Text variant="numeric" color={theme.colors.accent} style={{ fontSize: 44 }}>
              .
            </Text>
          </Text>
        </View>

        <Text
          variant="heroTitle"
          accessibilityRole="header"
          style={{ fontSize: 40, lineHeight: 42, marginTop: 22 }}
        >
          Willkommen bei Maitr
          <Text variant="heroTitle" tone="accent" style={{ fontSize: 40 }}>
            .
          </Text>
        </Text>
        {/*
         * Bewusst KEINE Zusage über sieben Schritte oder eine fertige "Präsenz" am
         * Ende (das versprach die alte Journey und hielt es nicht - siehe Befund 2
         * der Bestandsaufnahme). Stattdessen: was wirklich als Nächstes kommt.
         */}
        <Text variant="body" tone="secondary" style={{ fontSize: 17, lineHeight: 25.5, marginTop: 12 }}>
          Maitr übernimmt, was sich automatisieren lässt, und fragt nur nach dem, was es
          wirklich braucht. Dafür drei kurze Schritte.
        </Text>
      </View>

      <ListCard>
        <ListRow
          title="Betrieb anlegen"
          meta="Pflicht - sonst hat Maitr nichts zu verwalten"
          leading={<PinIcon size={22} color={theme.colors.primary} />}
        />
        <ListRow
          title="Google verbinden"
          meta="Optional - für Bewertungen & Sichtbarkeit"
          leading={<GoogleMark size={20} />}
        />
        <ListRow
          title="Öffnungszeiten hinterlegen"
          meta="Optional - bestätigen oder eintragen"
          leading={<ClockIcon size={22} color={theme.colors.primary} />}
        />
      </ListCard>
    </AblaufRahmen>
  );
}

/* ── 2 · Betrieb anlegen ─────────────────────────────────────────────────── */

type BetriebStufe = "eingabe" | "anlegen" | "steht";

export function AblaufBetrieb() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { hasRealVenue, venueProfile, adoptVenue } = useStore();

  // Schon ein echter Betrieb bekannt (frisch angelegt und zurücknavigiert, oder die
  // Kennung hat einen App-Neustart überlebt, siehe store.tsx) → sofort der
  // bestätigte Zustand, kein leeres Formular für etwas, das schon steht.
  const [stufe, setStufe] = useState<BetriebStufe>(hasRealVenue ? "steht" : "eingabe");
  // venueProfile.name NICHT als Vorgabe übernehmen, solange kein echter Betrieb
  // adoptiert wurde: er trägt bis dahin die Demo-Vorgabe "Café Goldstück" - ein
  // leeres Feld ist ehrlicher als ein fremder Name im eigenen Formular.
  const [name, setName] = useState(hasRealVenue ? venueProfile.name : "");
  const [fehler, setFehler] = useState<string | null>(null);
  const [anmeldungNoetig, setAnmeldungNoetig] = useState(false);

  // Der Bildschirm kann während eines laufenden Aufrufs verlassen werden. Danach
  // darf die Antwort keinen Zustand mehr anfassen (React warnt sonst über ein
  // Update auf einer abgehängten Komponente, und im schlimmsten Fall navigierte
  // ein spät ankommendes 409 den Wirt aus einem längst anderen Bildschirm heraus).
  const aktiv = useRef(true);
  useEffect(() => {
    aktiv.current = true;
    return () => {
      aktiv.current = false;
    };
  }, []);

  const betriebAnlegen = useCallback(() => {
    const gewuenscht = name.trim();
    if (!gewuenscht) return;

    setFehler(null);
    setAnmeldungNoetig(false);
    setStufe("anlegen");

    api.venues
      .create({ name: gewuenscht })
      .then((venue) => {
        if (!aktiv.current) return;
        adoptVenue(venue);
        setName(venue.name ?? gewuenscht);
        setStufe("steht");
        toast.show("Betrieb angelegt");
      })
      .catch((err: unknown) => {
        if (!aktiv.current) return;

        // 409 ist keine Absage, sondern "hast du schon" - mitsamt dem vorhandenen
        // Betrieb im Rumpf. Das ist kein Fehlerzustand, sondern der Zielzustand.
        const bestehend = venueAusKonflikt(err);
        if (bestehend) {
          adoptVenue(bestehend);
          setName(bestehend.name ?? gewuenscht);
          setStufe("steht");
          toast.show("Dein Betrieb war schon angelegt");
          return;
        }

        setFehler(fehlerText(err));
        // Der Text rät zur neuen Anmeldung - dann muss der Bildschirm sie auch
        // anbieten. Ohne das ist der Rat eine halbe Sackgasse (im Simulator so
        // gemessen: 401, richtige Meldung, kein Weg dorthin).
        setAnmeldungNoetig(brauchtNeueAnmeldung(err));
        setStufe("eingabe");
      });
  }, [name, adoptVenue, toast]);

  // `replace`, nicht `push`: Wer sich neu anmelden muss, soll nicht per
  // Zurück-Geste in einen Schritt zurückfallen, dessen Aufrufe weiterhin 401
  // ergeben. Nach der Anmeldung entscheidet die Weiche in `app/index.tsx` neu,
  // wohin es geht.
  const zurAnmeldung = useCallback(() => router.replace("/login"), [router]);

  const primaryAction =
    stufe === "steht"
      ? { label: "Weiter", onPress: () => router.push("/onboarding/google") }
      : {
          label: stufe === "anlegen" ? "Wird angelegt …" : "Betrieb anlegen",
          onPress: betriebAnlegen,
          // Ohne Namen gäbe es nichts zu senden; während des Anlegens würde ein
          // zweiter Tipp den 409-Weg unnötig ein zweites Mal auslösen.
          disabled: stufe === "anlegen" || name.trim().length === 0,
        };

  return (
    <AblaufRahmen
      step={1}
      totalSteps={ONBOARDING_SCHRITTE}
      title={stufe === "steht" ? "Betrieb angelegt" : "Wie heißt dein Betrieb?"}
      subtitle={
        stufe === "steht"
          ? `„${name}" ist jetzt dein Betrieb bei Maitr.`
          : "Unter diesem Namen legen wir deinen Betrieb an. Ohne ihn hat Maitr nichts zu verwalten - dieser Schritt lässt sich nicht überspringen."
      }
      primaryAction={primaryAction}
      secondaryAction={
        anmeldungNoetig ? { label: "Zur Anmeldung", onPress: zurAnmeldung } : undefined
      }
    >
      {stufe === "steht" ? (
        <Card
          emphasis="strong"
          padding={theme.spacing.xl}
          style={{ borderRadius: 22, flexDirection: "row", alignItems: "center", gap: 14 }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.colors.successSurface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckIcon size={20} color={theme.colors.success} strokeWidth={2.4} />
          </View>
          <Text variant="cardTitleSm" style={{ fontSize: 18, flex: 1 }}>
            {name}
          </Text>
        </Card>
      ) : (
        <View style={{ marginTop: 4, gap: 10 }}>
          <TextInput
            value={name}
            onChangeText={(value) => {
              setName(value);
              if (fehler) setFehler(null);
            }}
            placeholder="z. B. Café Goldstück"
            placeholderTextColor={theme.colors.textFaint}
            accessibilityLabel="Name deines Betriebs"
            autoCapitalize="words"
            autoCorrect={false}
            editable={stufe !== "anlegen"}
            returnKeyType="done"
            onSubmitEditing={betriebAnlegen}
            style={[
              theme.text.body,
              {
                borderWidth: 1,
                borderColor: fehler ? theme.colors.destructive : theme.colors.border,
                borderRadius: theme.radius.control,
                paddingVertical: 14,
                paddingHorizontal: 16,
                color: theme.colors.textPrimary,
              },
            ]}
          />
          {fehler ? (
            <Text variant="bodySm" color={theme.colors.destructive} style={{ fontSize: 14.5 }}>
              {fehler}
            </Text>
          ) : null}
        </View>
      )}
    </AblaufRahmen>
  );
}

/* ── 3 · Google verbinden ────────────────────────────────────────────────── */

type GoogleStufe = "prueft" | "bereit" | "laeuft" | "verbunden" | "fehlgeschlagen";

export function AblaufGoogle() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { venueId } = useStore();

  const [stufe, setStufe] = useState<GoogleStufe>("prueft");
  const [fehler, setFehler] = useState<string | null>(null);

  const aktiv = useRef(true);
  useEffect(() => {
    aktiv.current = true;
    return () => {
      aktiv.current = false;
    };
  }, []);

  // Beim Öffnen frisch prüfen statt "bereit" anzunehmen: Kommt der Wirt über
  // Zurück-Navigation hierher, nachdem er den Schritt schon erledigt hat, soll er
  // das bestätigt sehen statt ein zweites Mal zum Verbinden aufgefordert zu werden.
  useEffect(() => {
    api.integrations
      .list(venueId)
      .then((liste) => {
        if (!aktiv.current) return;
        setStufe(googleVerbunden(liste) ? "verbunden" : "bereit");
      })
      .catch(() => {
        if (!aktiv.current) return;
        // Prüfen fehlgeschlagen heißt nicht "nicht verbunden", nur: unbekannt. Der
        // Wirt kann es trotzdem versuchen, statt mit einer Fehlermeldung
        // festzuhängen, die ein Tipp auf "Verbinden" ohnehin gleich mit klärt.
        setStufe("bereit");
      });
  }, [venueId]);

  const verbinden = useCallback(() => {
    setFehler(null);
    setStufe("laeuft");

    api.integrations
      .connectUrl(venueId, "google")
      .then(({ url }) => WebBrowser.openAuthSessionAsync(url, "maitr://"))
      .then((ergebnis) => {
        if (!aktiv.current) return undefined;

        if (ergebnis.type !== "success") {
          setStufe("fehlgeschlagen");
          setFehler("Verbindung abgebrochen. Du kannst es erneut versuchen oder später nachholen.");
          return undefined;
        }

        // Der Rücksprung aus dem Consent-Screen ist eine Behauptung, kein Beleg -
        // erst die Liste vom Server sagt, ob wirklich eine aktive Verbindung steht.
        return api.integrations.list(venueId).then((liste) => {
          if (!aktiv.current) return;
          if (googleVerbunden(liste)) {
            setStufe("verbunden");
            toast.show("Google verbunden");
          } else {
            setStufe("fehlgeschlagen");
            setFehler(
              "Die Verbindung wurde nicht bestätigt. Du kannst es erneut versuchen oder später nachholen.",
            );
          }
        });
      })
      .catch((err: unknown) => {
        if (!aktiv.current) return;
        setStufe("fehlgeschlagen");
        setFehler(fehlerText(err));
      });
  }, [venueId, toast]);

  const weiterZuZeiten = useCallback(() => router.push("/onboarding/zeiten"), [router]);

  // Der Knopf darf nie in einem Zustand hängen bleiben, aus dem es nicht
  // weitergeht: "prueft" und "laeuft" sind die einzigen deaktivierten Zustände,
  // und beide enden garantiert in einem `.then`/`.catch` oben - nie in nichts.
  const primaryAction =
    stufe === "verbunden"
      ? { label: "Weiter", onPress: weiterZuZeiten }
      : stufe === "prueft" || stufe === "laeuft"
        ? {
            label: stufe === "prueft" ? "Wird geprüft …" : "Verbindet …",
            onPress: () => {},
            disabled: true,
          }
        : {
            label: stufe === "fehlgeschlagen" ? "Erneut versuchen" : "Mit Google verbinden",
            onPress: verbinden,
          };

  return (
    <AblaufRahmen
      step={2}
      totalSteps={ONBOARDING_SCHRITTE}
      title={"Google\nverbinden"}
      /* Kein „- nicht mehr" mehr. Der angeforderte Bereich ist
         `https://www.googleapis.com/auth/business.manage`
         (packages/core/src/integrations/google.ts): der volle Verwaltungszugriff
         auf das Unternehmensprofil. Was Maitr davon HEUTE benutzt, ist Lesen -
         aber Googles eigener Zustimmungsbildschirm sagt dem Wirt zwei Sekunden
         später „verwalten", und wer diesen Widerspruch bemerkt, glaubt der App
         nichts mehr. Also beides nennen: den Umfang und den Gebrauch. */
      subtitle="Du gibst Maitr die Verwaltung deines Unternehmensprofils frei. Genutzt wird davon heute das Lesen deiner Bewertungen und deiner Sichtbarkeit."
      primaryAction={primaryAction}
      secondaryAction={
        stufe === "verbunden" ? undefined : { label: "Später verbinden", onPress: weiterZuZeiten }
      }
      footnote={stufe === "verbunden" ? undefined : "Widerrufbar in deinem Google-Konto"}
    >
      <Card emphasis="default" padding={theme.spacing.xl} style={{ borderRadius: 22, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: theme.colors.surfaceSunken,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <GoogleMark size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="cardTitleSm" style={{ fontSize: 18 }}>
              Google Unternehmensprofil
            </Text>
            <Eyebrow style={{ fontSize: 10, marginTop: 1 }}>
              {stufe === "verbunden" ? "Verbunden" : "Noch nicht verbunden"}
            </Eyebrow>
          </View>
          {stufe === "verbunden" ? <CheckIcon size={20} color={theme.colors.success} /> : null}
        </View>

        <View style={{ height: 1, backgroundColor: theme.colors.surfaceSunken }} />

        {/*
         * NUR, was der Connector wirklich tut (packages/core/src/integrations/google.ts):
         * Bewertungen und Performance-Daten LESEN. Kein "beantworten", kein
         * "Öffnungszeiten halten", kein "Beiträge veröffentlichen" - die alte
         * Journey versprach das, aber kein Connector schreibt heute etwas zu
         * Google zurück.
         */}
        {["Bewertungen lesen", "Sichtbarkeit bei Google auswerten"].map((scope) => (
          <View key={scope} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <CheckIcon size={16} color={theme.colors.textMuted} />
            <Text variant="bodySm" color={theme.colors.textOnSunken} style={{ fontSize: 15 }}>
              {scope}
            </Text>
          </View>
        ))}
      </Card>

      {fehler ? <Banner>{fehler}</Banner> : null}
    </AblaufRahmen>
  );
}

/* ── 4 · Öffnungszeiten ──────────────────────────────────────────────────── */

const WOCHENTAGE: { id: Day; label: string }[] = [
  { id: "monday", label: "Montag" },
  { id: "tuesday", label: "Dienstag" },
  { id: "wednesday", label: "Mittwoch" },
  { id: "thursday", label: "Donnerstag" },
  { id: "friday", label: "Freitag" },
  { id: "saturday", label: "Samstag" },
  { id: "sunday", label: "Sonntag" },
];

/* Formular-Zustand, Umrechnung und Uhrzeitregel liegen in `ablauf.ts` - sie
   entscheiden, WAS an den Server geht, und genau das gehört unter Test. Der
   Bildschirm hier stellt nur dar und sammelt Eingaben ein. */

function ZeitFeld({
  value,
  onChangeText,
  accessibilityLabel,
  fehlerhaft,
}: {
  value: string;
  onChangeText: (value: string) => void;
  accessibilityLabel: string;
  /** Genau dieses Feld ist beim letzten Absenden durchgefallen. */
  fehlerhaft: boolean;
}) {
  const theme = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="09:00"
      placeholderTextColor={theme.colors.textFaint}
      accessibilityLabel={accessibilityLabel}
      // Der Wirt soll am Feld selbst sehen, welches gemeint ist. Vorher trug die
      // Antwort des Servers nur „Ungültige Eingabe" - bei bis zu vierzehn Feldern
      // ist das keine Auskunft, sondern eine Suchaufgabe.
      accessibilityHint={fehlerhaft ? "Diese Uhrzeit ist ungültig. Erwartet wird HH:MM." : undefined}
      keyboardType="numbers-and-punctuation"
      autoCorrect={false}
      maxLength={5}
      style={[
        theme.text.numeric,
        {
          flex: 1,
          borderWidth: fehlerhaft ? 2 : 1,
          borderColor: fehlerhaft ? theme.colors.destructive : theme.colors.border,
          borderRadius: theme.radius.control,
          paddingVertical: 10,
          paddingHorizontal: 12,
          color: theme.colors.textPrimary,
          textAlign: "center",
          fontSize: 15,
        },
      ]}
    />
  );
}

/**
 * Eine Tageszeile. Der Schalter kennt drei Ausgangslagen, aber nur zwei
 * Zielzustände: Wer ihn anfasst, trifft eine Aussage - „geöffnet" oder
 * „geschlossen". „Keine Angabe" ist der Zustand VOR der ersten Berührung und
 * lässt sich nicht absichtlich herstellen; er verschwindet still, sobald der
 * Wirt sich äußert. Das ist der Grund für die dritte Stufe: Ein Tag, zu dem er
 * nichts gesagt hat, darf nicht als „sonntags zu" in der Datenbank landen.
 */
function TagZeile({
  label,
  entwurf,
  fehler,
  onChange,
}: {
  label: string;
  entwurf: TagEntwurf;
  /** Welche Felder dieses Tages beim letzten Absenden durchfielen. */
  fehler: ZeitenFeldFehler[];
  onChange: (next: TagEntwurf) => void;
}) {
  const offen = entwurf.stand === "geoeffnet";
  const standText =
    entwurf.stand === "geoeffnet"
      ? "Geöffnet"
      : entwurf.stand === "geschlossen"
        ? "Geschlossen"
        : "Keine Angabe";

  return (
    <View style={{ paddingVertical: 13, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="cardTitleSm" style={{ fontSize: 15.5 }}>
          {label}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Eyebrow tone={offen ? "faint" : "muted"} style={{ fontSize: 10 }}>
            {standText}
          </Eyebrow>
          <Toggle
            value={offen}
            onValueChange={(an) => onChange({ ...entwurf, stand: an ? "geoeffnet" : "geschlossen" })}
            accessibilityLabel={`${label} geöffnet`}
          />
        </View>
      </View>
      {offen ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ZeitFeld
            value={entwurf.open}
            onChangeText={(value) => onChange({ ...entwurf, open: value })}
            accessibilityLabel={`${label}, öffnet um`}
            fehlerhaft={fehler.some((f) => f.feld === "open")}
          />
          <Text variant="bodySm" tone="faint">
            bis
          </Text>
          <ZeitFeld
            value={entwurf.close}
            onChangeText={(value) => onChange({ ...entwurf, close: value })}
            accessibilityLabel={`${label}, schließt um`}
            fehlerhaft={fehler.some((f) => f.feld === "close")}
          />
        </View>
      ) : null}
    </View>
  );
}

type ZeitenLadezustand = "laedt" | "bereit" | "ladefehler";

export function AblaufZeiten() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { venueId } = useStore();

  const [ladezustand, setLadezustand] = useState<ZeitenLadezustand>("laedt");
  const [modus, setModus] = useState<"bestehend" | "vorschlag">("vorschlag");
  const [entwurf, setEntwurf] = useState<ZeitenEntwurf>(() => entwurfAusZeiten(OEFFNUNGSZEITEN_VORSCHLAG));
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);
  const [speichertGerade, setSpeichertGerade] = useState(false);
  const [speicherFehler, setSpeicherFehler] = useState<string | null>(null);
  /** Felder, die beim letzten Absenden durchfielen - markiert die Zeilen unten. */
  const [feldFehler, setFeldFehler] = useState<ZeitenFeldFehler[]>([]);

  const aktiv = useRef(true);
  useEffect(() => {
    aktiv.current = true;
    return () => {
      aktiv.current = false;
    };
  }, []);

  const zeitenLaden = useCallback(() => {
    setLadezustand("laedt");
    api.venues
      .mine()
      .then((liste) => {
        if (!aktiv.current) return;
        // Dieselbe Auswahl wie beim Speichern - `eigenerVenue` besteht auf der
        // bekannten Kennung. Ein Rückfall auf „den ersten aus der Liste" hätte
        // hier Betrieb A zum Bearbeiten gezeigt und gegen Kennung B gespeichert.
        const eigener = eigenerVenue(liste, venueId);

        if (eigener && hatOeffnungszeiten(eigener)) {
          setModus("bestehend");
          setEntwurf(entwurfAusZeiten(eigener.openingHours));
        } else {
          setModus("vorschlag");
          setEntwurf(entwurfAusZeiten(OEFFNUNGSZEITEN_VORSCHLAG));
        }
        setLadezustand("bereit");
      })
      .catch((err: unknown) => {
        if (!aktiv.current) return;
        setLadeFehler(fehlerText(err));
        setLadezustand("ladefehler");
      });
  }, [venueId]);

  useEffect(() => {
    zeitenLaden();
  }, [zeitenLaden]);

  const speichern = useCallback(() => {
    setSpeicherFehler(null);

    // Erst prüfen, dann senden. Der Server wiese „9:00" mit 422 „Ungültige
    // Eingabe" ab - ohne zu sagen, welches der vierzehn Felder gemeint ist.
    const ergebnis = zeitenAusEntwurf(entwurf);
    if (!ergebnis.ok) {
      setFeldFehler(ergebnis.fehler);
      setSpeicherFehler(
        ergebnis.fehler.length === 1
          ? "Eine Uhrzeit stimmt nicht. Erwartet wird HH:MM, zum Beispiel 09:00."
          : `${ergebnis.fehler.length} Uhrzeiten stimmen nicht. Erwartet wird HH:MM, zum Beispiel 09:00.`,
      );
      return;
    }

    setFeldFehler([]);
    setSpeichertGerade(true);

    api.venues
      .update(venueId, { openingHours: ergebnis.werte })
      .then(() => {
        if (!aktiv.current) return;
        // Zurücksetzen, BEVOR weitergegangen wird: `router.push` hängt diesen
        // Bildschirm nicht ab, er bleibt im Stack. Wer vom Abschluss zurückkommt
        // (die Zeilen dort sind ausdrücklich antippbar), fände sonst dauerhaft
        // einen deaktivierten Knopf „Wird gespeichert …".
        setSpeichertGerade(false);
        toast.show("Zeiten gespeichert");
        router.push("/onboarding/fertig");
      })
      .catch((err: unknown) => {
        if (!aktiv.current) return;
        setSpeicherFehler(fehlerText(err));
        setSpeichertGerade(false);
      });
  }, [venueId, entwurf, toast, router]);

  const ueberspringen = useCallback(() => router.push("/onboarding/fertig"), [router]);

  const primaryAction =
    ladezustand === "ladefehler"
      ? { label: "Erneut versuchen", onPress: zeitenLaden }
      : ladezustand === "laedt"
        ? { label: "Wird geladen …", onPress: () => {}, disabled: true }
        : { label: speichertGerade ? "Wird gespeichert …" : "Zeiten speichern", onPress: speichern, disabled: speichertGerade };

  return (
    <AblaufRahmen
      step={3}
      totalSteps={ONBOARDING_SCHRITTE}
      title={
        ladezustand !== "bereit"
          ? "Öffnungszeiten"
          : modus === "bestehend"
            ? "Stimmen deine Zeiten noch?"
            : "Wann hast du geöffnet?"
      }
      subtitle={
        ladezustand !== "bereit"
          ? undefined
          : modus === "bestehend"
            ? "Diese Zeiten sind für deinen Betrieb hinterlegt. Kurz prüfen, bei Bedarf anpassen."
            : "Noch nichts hinterlegt. Hier ein Vorschlag zum Anpassen - das sind nicht deine echten Zeiten."
      }
      primaryAction={primaryAction}
      // In JEDEM Zustand erreichbar, auch im Ladefehler. Vorher wurde der Ausweg
      // nur bei „bereit" gezeigt: Ein Wirt ohne Netz hing damit auf genau dem
      // Schritt fest, für den die Überspringbarkeit gedacht war - vorwärts ging
      // nichts, und Öffnungszeiten sind das Letzte, woran eine Einrichtung
      // scheitern darf.
      secondaryAction={{ label: "Überspringen", onPress: ueberspringen }}
    >
      {ladezustand === "laedt" ? (
        <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <ActivityIndicator color={theme.colors.textMuted} />
        </View>
      ) : ladezustand === "ladefehler" ? (
        <Banner>{ladeFehler}</Banner>
      ) : (
        <>
          {modus === "vorschlag" ? <Eyebrow tone="accent">Vorschlag - noch nicht gespeichert</Eyebrow> : null}

          <ListCard>
            {WOCHENTAGE.map(({ id, label }) => (
              <TagZeile
                key={id}
                label={label}
                entwurf={entwurf[id]}
                fehler={feldFehler.filter((f) => f.tag === id)}
                onChange={(next) => {
                  setEntwurf((e) => ({ ...e, [id]: next }));
                  // Die Meldung des vorigen Versuchs darf nicht über einer
                  // bereits korrigierten Eingabe stehen bleiben.
                  setFeldFehler((f) => f.filter((eintrag) => eintrag.tag !== id));
                }}
              />
            ))}
          </ListCard>

          {/*
           * Zwei Dinge, die dieser Bildschirm NICHT behaupten darf (Auftrag):
           * weder dass sich die veröffentlichte Website mitändert (sie liest ihre
           * Zeiten aus der Configuration, nicht aus Business.openingHours - siehe
           * server/maitr/routes.ts, Kommentar bei geprüfteOeffnungszeiten), noch
           * dass die Zeiten an Google gehen (das schreibt kein Connector). Was sie
           * WIRKLICH tun: App-Profil und öffentliches Gästeprofil speisen -
           * genau das und nicht mehr steht hier.
           */}
          <Banner>
            Diese Zeiten gelten für dein Gästeprofil in Maitr. Deine veröffentlichte Website
            liest ihre Zeiten separat und ändert sich hier nicht mit.
          </Banner>

          {speicherFehler ? (
            <Text variant="bodySm" color={theme.colors.destructive} style={{ fontSize: 14.5 }}>
              {speicherFehler}
            </Text>
          ) : null}
        </>
      )}
    </AblaufRahmen>
  );
}

/* ── Abschluss ───────────────────────────────────────────────────────────── */

const SCHRITT_TITEL: Record<SchrittId, string> = {
  betrieb: "Betrieb angelegt",
  google: "Google verbunden",
  zeiten: "Öffnungszeiten hinterlegt",
};
const SCHRITT_OFFEN_TEXT: Record<SchrittId, string> = {
  betrieb: "Noch offen",
  google: "Noch offen - hier antippen zum Nachholen",
  zeiten: "Noch offen - hier antippen zum Nachholen",
};
const SCHRITT_ROUTE: Record<SchrittId, Href> = {
  betrieb: "/onboarding/betrieb",
  google: "/onboarding/google",
  zeiten: "/onboarding/zeiten",
};

export function AblaufFertig() {
  const theme = useTheme();
  const router = useRouter();
  const { venueId, venueProfile } = useStore();

  const [ladezustand, setLadezustand] = useState<"laedt" | "bereit">("laedt");
  const [zustand, setZustand] = useState<AblaufZustand>(ANFANGSZUSTAND);
  const [pruefUnvollstaendig, setPruefUnvollstaendig] = useState(false);

  const aktiv = useRef(true);
  useEffect(() => {
    aktiv.current = true;
    return () => {
      aktiv.current = false;
    };
  }, []);

  useEffect(() => {
    // `hasRealVenue` kommt bewusst NICHT aus dem Store, sondern gilt hier als
    // gesetzt: Wer diesen Bildschirm erreicht, kam zwingend durch Schritt 2 (er
    // lässt sich nicht überspringen). Google und Zeiten dagegen MÜSSEN frisch vom
    // Server kommen - beide sind überspringbar, ein mitgeschleppter Zustand aus
    // einem früheren Schritt wüsste nicht, ob "übersprungen" oder "erledigt" gilt.
    Promise.allSettled([api.venues.mine(), api.integrations.list(venueId)]).then(
      ([venuesErgebnis, integrationenErgebnis]) => {
        if (!aktiv.current) return;

        // Dieselbe Auswahlregel wie überall im Fluss: auf der bekannten Kennung
        // bestehen, statt auf „den ersten aus der Liste" zurückzufallen.
        const venue =
          venuesErgebnis.status === "fulfilled" ? eigenerVenue(venuesErgebnis.value, venueId) : null;
        const integrationen = integrationenErgebnis.status === "fulfilled" ? integrationenErgebnis.value : [];

        // `betrieb` wird NICHT mehr behauptet: Das Häkchen hängt jetzt daran, dass
        // hier wirklich ein Betrieb ankommt. Es war das einzige im Fluss, das
        // gegen nichts geprüft wurde.
        setZustand(ablaufAusServerdaten({ integrationen, venue }));
        // Bei einem fehlgeschlagenen Abruf zeigt der Zustand oben sicherheitshalber
        // "offen" statt zu raten (Haekchen NUR für Belegtes) - dieser Hinweis sagt
        // dazu, dass "offen" hier auch "nicht geprüft" heißen kann.
        setPruefUnvollstaendig(venuesErgebnis.status === "rejected" || integrationenErgebnis.status === "rejected");
        setLadezustand("bereit");
      },
    );
  }, [venueId]);

  const stand = fortschritt(zustand);
  // Bewusst am Zählwerk und nicht an einem eigenen Merker: Übersprungene Schritte
  // zählen dort NICHT als erledigt, "alles fertig" kann hier also nicht durch
  // Wegklicken entstehen.
  const allesErledigt = ladezustand === "bereit" && stand.erledigt === stand.gesamt;

  return (
    <AblaufRahmen
      surface="deep"
      primaryAction={{
        label: "Zum Start",
        onPress: () => router.replace("/start"),
        disabled: ladezustand === "laedt",
      }}
    >
      {/* Das große Signal muss dasselbe sagen wie die Zeile darunter.
          Vorher stand über „1 von 3 Schritten stehen." ein 88 Pixel großes grünes
          Häkchen und „ist eingerichtet." - das Bild behauptete Fertigstellung, die
          der Text im selben Atemzug widerrief. Wer offene Punkte hat, sieht deshalb
          jetzt seinen Stand als Zahl auf ruhigem Grund; das Häkchen ist dem Fall
          vorbehalten, in dem es stimmt. */}
      <View style={{ alignItems: "center", gap: theme.spacing.lg, marginTop: 70 }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: allesErledigt ? theme.colors.primary : theme.colors.surfaceSunken,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {allesErledigt ? (
            <CheckIcon size={42} color={theme.colors.onPrimary} strokeWidth={2.4} />
          ) : (
            <Text variant="numeric" tone="secondary" style={{ fontSize: 30, lineHeight: 36 }}>
              {stand.erledigt}/{stand.gesamt}
            </Text>
          )}
        </View>

        <Text
          variant="heroTitle"
          accessibilityRole="header"
          style={{ fontSize: 38, lineHeight: 40, textAlign: "center" }}
        >
          {/* „eingerichtet" nur, wenn wirklich alles steht. Sonst die Aussage, die
              in jedem Fall zutrifft: der Betrieb existiert, der Rest ist offen. */}
          {venueProfile.name} {allesErledigt ? "ist eingerichtet" : "ist angelegt"}
          <Text variant="heroTitle" tone="accent" style={{ fontSize: 38 }}>
            .
          </Text>
        </Text>

        <Text
          variant="body"
          tone="secondary"
          style={{ fontSize: 17, lineHeight: 25.5, textAlign: "center", maxWidth: 300 }}
        >
          {ladezustand === "laedt"
            ? "Wir prüfen kurz, was schon steht …"
            : allesErledigt
              ? "Alles erledigt. Gäste finden dich jetzt über Maitr."
              : // Numerus: bei genau einem Schritt „steht", sonst „stehen".
                `${stand.erledigt} von ${stand.gesamt} Schritten ${stand.erledigt === 1 ? "steht" : "stehen"}. Den Rest holst du jederzeit nach.`}
        </Text>
      </View>

      {ladezustand === "laedt" ? (
        <ActivityIndicator color={theme.colors.textMuted} style={{ marginTop: 6 }} />
      ) : (
        <>
          {/*
           * Haekchen NUR für das, was wirklich steht (Auftrag) - die alte Journey
           * behauptete hier "Google verbunden und synchron", "8 Tische bereit",
           * "Instagram teilt deine Beiträge", und nichts davon war wahr. `zustand`
           * kommt oben frisch vom Server, kein Schritt wird geglaubt, nur weil er
           * durchlaufen wurde.
           */}
          <ListCard style={{ marginTop: 6 }}>
            {schrittListe(zustand).map(({ id, status }) => {
              const erledigt = status === "erledigt";
              return (
                <ListRow
                  key={id}
                  title={SCHRITT_TITEL[id]}
                  meta={erledigt ? undefined : SCHRITT_OFFEN_TEXT[id]}
                  leading={
                    erledigt ? (
                      <CheckIcon size={18} color={theme.colors.success} />
                    ) : (
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 9,
                          borderWidth: 2,
                          borderColor: theme.colors.borderStrong,
                        }}
                      />
                    )
                  }
                  onPress={erledigt ? undefined : () => router.push(SCHRITT_ROUTE[id])}
                />
              );
            })}
          </ListCard>

          {pruefUnvollstaendig ? (
            <Banner>
              Nicht alles ließ sich gerade prüfen - was hier offen aussieht, kann in
              Wirklichkeit schon stehen.
            </Banner>
          ) : null}
        </>
      )}
    </AblaufRahmen>
  );
}
