import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ApiError, api, isCoreConfigured, type Venue } from "@maitr/core";

import { CheckIcon } from "../../components/icons";
import { Card } from "../../components/ui/Card";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { PillButton } from "../../components/ui/PillButton";
import { ProgressBar } from "../../components/ui/Progress";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { hasRealAuth } from "../../lib/auth";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

interface Step {
  id: string;
  title: string;
  /** Warum der Schritt sich lohnt - nur bei offenen Schritten sichtbar. */
  reason?: string;
  state: "done" | "current" | "open";
}

const steps: Step[] = [
  { id: "google", title: "Google Business verbunden", state: "done" },
  { id: "hours", title: "Öffnungszeiten übernommen", state: "done" },
  {
    id: "instagram",
    title: "Instagram verbinden",
    reason: "Für automatische Beiträge",
    state: "current",
  },
  { id: "photos", title: "3 Fotos hochladen", reason: "Macht das Profil lebendig", state: "open" },
];

/**
 * Wo steht der Betrieb dieses Kontos?
 *
 * - `demo`      Kein Clerk, keine API - der Demo-Betrieb ist die Wahrheit. Der Bildschirm
 *               sieht dann exakt aus wie bisher, es geht kein einziger Aufruf raus.
 * - `pruefen`   `GET /venues` läuft.
 * - `fehlt`     Angemeldet, aber noch kein Betrieb: nach dem Namen fragen.
 * - `anlegen`   `POST /venues` läuft.
 * - `vorhanden` Steht - neu angelegt, oder es gab ihn schon (auch der 409-Fall).
 * - `fehler`    Die Abfrage kam nicht durch; mit „Erneut versuchen" weiter.
 */
type VenueStage = "demo" | "pruefen" | "fehlt" | "anlegen" | "vorhanden" | "fehler";

/**
 * Kann dieses Gerät überhaupt einen Betrieb anlegen?
 *
 * Beide Bedingungen sind nötig, und beide sind über die Prozesslaufzeit konstant
 * (der Clerk-Schlüssel steht zur Bauzeit im Bundle, `configureCore()` läuft einmal
 * beim Import des Root-Layouts) - deshalb darf davon eine Zustandsvorbelegung hängen.
 *
 * `isCoreConfigured()` ist dieselbe Weiche wie in `useDailyBriefing`: ohne sie wirft
 * `getCoreConfig()` in `http.ts`. `hasRealAuth()` kommt hinzu, weil ein Betrieb an
 * einem Konto hängt: `POST /venues` beginnt mit `if (!req.userId) return 401`. Ohne
 * Clerk gibt es kein Konto, der Aufruf könnte also nur scheitern - und anders als
 * beim Briefing gibt es hier keine Fixture, auf die man zurückfiele. Deshalb wird er
 * im Demomodus gar nicht erst versucht.
 */
function kannBetriebAnlegen(): boolean {
  return hasRealAuth() && isCoreConfigured();
}

/**
 * Screen 15 · Onboarding.
 *
 * Kurzfassung der Journey nach dem ersten Login: was schon steht, was noch fehlt.
 * Anders als die siebenteilige Journey (18-25) ist das eine Checkliste, kein Ablauf.
 *
 * Der erste Punkt der Liste ist seit dem Anschluss an `POST /api/maitr/venues` echt:
 * Ohne Betrieb liefert `GET /venues` eine leere Liste und jeder betriebsgebundene
 * Aufruf endet in 403 - die Checkliste darunter hätte gar keinen Gegenstand.
 */
export function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { connectChannel, adoptVenue, venueProfile } = useStore();

  const [stage, setStage] = useState<VenueStage>(() => (kannBetriebAnlegen() ? "pruefen" : "demo"));
  const [name, setName] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);

  // Der Bildschirm kann während eines laufenden Aufrufs verlassen werden („Später
  // erledigen"). Dann darf die Antwort keinen Zustand mehr anfassen.
  const aktiv = useRef(true);
  useEffect(() => {
    aktiv.current = true;
    return () => {
      aktiv.current = false;
    };
  }, []);

  /* Gibt es schon einen Betrieb? Läuft nur in `pruefen` - und dorthin kommt der
     Bildschirm nur, wenn `kannBetriebAnlegen()` zugestimmt hat. Im Demomodus steht
     `stage` von Anfang an auf `demo`, dieser Effekt tut dann nichts. */
  useEffect(() => {
    if (stage !== "pruefen") return;

    api.venues
      .mine()
      .then((list) => {
        if (!aktiv.current) return;
        // Form prüfen, nicht nur den Erfolg: Zeigt die Basis-URL versehentlich auf einen
        // fremden Dienst, kommt ebenfalls ein 200 zurück (dieselbe Lehre wie in
        // `useDailyBriefing`). Ohne diese Prüfung stünde „Betrieb angelegt" über nichts.
        const vorhanden = Array.isArray(list) ? list[0] : undefined;
        if (vorhanden?.id) {
          adoptVenue(vorhanden);
          setName(vorhanden.name ?? "");
          setStage("vorhanden");
          return;
        }
        setStage("fehlt");
      })
      .catch((err: unknown) => {
        if (!aktiv.current) return;
        setFehler(fehlerText(err));
        setStage("fehler");
      });
  }, [stage, adoptVenue]);

  const betriebAnlegen = useCallback(() => {
    const gewuenscht = name.trim();
    if (!gewuenscht) return;

    setFehler(null);
    setStage("anlegen");

    api.venues
      .create({ name: gewuenscht })
      .then((venue) => {
        if (!aktiv.current) return;
        adoptVenue(venue);
        setName(venue.name ?? gewuenscht);
        setStage("vorhanden");
        toast.show("Betrieb angelegt");
      })
      .catch((err: unknown) => {
        if (!aktiv.current) return;

        // 409 ist keine Absage, sondern die Auskunft „hast du schon" - mitsamt dem
        // vorhandenen Betrieb im Rumpf. Ihn als Fehler zu zeigen wäre die schlechteste
        // aller Antworten: Der Nutzer hätte alles richtig gemacht und stünde vor einer
        // Sackgasse. Also übernehmen und weitergehen. Passiert real beim Doppeltipp
        // und bei jedem zweiten Anlauf nach einem abgebrochenen ersten.
        const bestehend = venueAusKonflikt(err);
        if (bestehend) {
          adoptVenue(bestehend);
          setName(bestehend.name ?? gewuenscht);
          setStage("vorhanden");
          toast.show("Dein Betrieb war schon angelegt");
          return;
        }

        // Alles andere zurück auf „fehlt": Das Namensfeld bleibt gefüllt stehen, der
        // Grund steht daneben. Bei 422 ist das der Servertext zur Adresse - dann ist
        // ein anderer Name die Lösung, und die Zeile sagt das auch.
        setFehler(fehlerText(err));
        setStage("fehlt");
      });
  }, [name, adoptVenue, toast]);

  const connectInstagram = useCallback(() => {
    connectChannel("instagram");
    toast.show("Instagram verbunden");
    router.push("/kanaele");
  }, [connectChannel, toast, router]);

  const betriebSteht = stage === "demo" || stage === "vorhanden";
  const nameEingeben = stage === "fehlt" || stage === "anlegen";

  /* Der Betriebsschritt steht nur in der Liste, wenn er etwas aussagt. Im Demomodus
     bleibt die Checkliste unverändert vierteilig - genau wie vor dem Anschluss. */
  const venueStep: Step | null =
    stage === "demo"
      ? null
      : {
          id: "venue",
          title: venueStepTitel(stage, name || venueProfile.name),
          reason: betriebSteht ? undefined : (fehler ?? "Ohne Betrieb hat Maitr nichts zu verwalten"),
          state: stage === "vorhanden" ? "done" : "current",
        };

  // Zwei „current"-Karten nebeneinander wären zwei Aufforderungen gleichzeitig. Solange
  // der Betrieb fehlt, tritt Instagram einen Schritt zurück - der Reihenfolge nach ist
  // das ohnehin richtig.
  const alleSchritte: Step[] =
    venueStep === null
      ? steps
      : [
          venueStep,
          ...(venueStep.state === "done"
            ? steps
            : steps.map((s) => (s.state === "current" ? { ...s, state: "open" as const } : s))),
        ];

  const erledigt = alleSchritte.filter((s) => s.state === "done").length;
  const laufend = alleSchritte.some((s) => s.state === "current") ? 1 : 0;

  return (
    <Screen surface="deep" contentStyle={{ paddingHorizontal: 26 }}>
      <NavHeader fallback="/start" />
      <View style={{ marginTop: theme.spacing.sm }}>
        <ProgressBar current={erledigt + laufend} total={alleSchritte.length} />
      </View>

      <View style={{ marginTop: 70 }}>
        <Eyebrow tone="accent" variant="eyebrowLg">
          {stage === "demo" ? "Fast fertig, Sofia" : betriebSteht ? "Fast fertig" : "Erster Schritt"}
        </Eyebrow>
        <Text
          variant="heroTitle"
          accessibilityRole="header"
          style={{ fontSize: 40, lineHeight: 42, marginTop: 10 }}
        >
          {betriebSteht ? "Deine Gäste finden dich ab jetzt" : "Wie heißt dein Betrieb"}
          <Text variant="heroTitle" tone="accent" style={{ fontSize: 40 }}>
            .
          </Text>
        </Text>
        <Text variant="body" tone="secondary" style={{ fontSize: 17, lineHeight: 25, marginTop: 14 }}>
          {betriebSteht
            ? "Wir haben dein Google Profil verbunden. Zwei Dinge fehlen noch, dann läuft alles von selbst."
            : "Unter diesem Namen legen wir deinen Betrieb an - Bewertungen, Tische und Beiträge hängen daran."}
        </Text>
      </View>

      {nameEingeben ? (
        <View style={{ marginTop: 26 }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="z. B. Café Goldstück"
            placeholderTextColor={theme.colors.textFaint}
            accessibilityLabel="Name deines Betriebs"
            autoCapitalize="words"
            autoCorrect={false}
            editable={stage !== "anlegen"}
            returnKeyType="done"
            onSubmitEditing={betriebAnlegen}
            style={[
              theme.text.body,
              {
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.control,
                paddingVertical: 14,
                paddingHorizontal: 16,
                color: theme.colors.textPrimary,
              },
            ]}
          />
        </View>
      ) : null}

      <View style={{ marginTop: 34, gap: theme.spacing.md }}>
        {alleSchritte.map((step) => (
          <StepCard key={step.id} step={step} />
        ))}
      </View>

      <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
        <PrimaryAction
          stage={stage}
          nameLeer={name.trim().length === 0}
          onAnlegen={betriebAnlegen}
          onErneutPruefen={() => setStage("pruefen")}
          onInstagram={connectInstagram}
        />
        <Text
          variant="bodySm"
          tone="secondary"
          style={{ fontSize: 15, textAlign: "center" }}
          onPress={() => router.replace("/start")}
        >
          Später erledigen
        </Text>
      </View>
    </Screen>
  );
}

/**
 * Die eine Aktion, die zum aktuellen Zustand passt.
 *
 * Bewusst kein zweiter Knopf daneben: Solange der Betrieb fehlt, ist „Instagram
 * verbinden" gegenstandslos - der Kanal würde an nichts hängen.
 */
function PrimaryAction({
  stage,
  nameLeer,
  onAnlegen,
  onErneutPruefen,
  onInstagram,
}: {
  stage: VenueStage;
  nameLeer: boolean;
  onAnlegen: () => void;
  onErneutPruefen: () => void;
  onInstagram: () => void;
}) {
  const theme = useTheme();

  if (stage === "pruefen") {
    return (
      <View style={{ alignItems: "center", paddingVertical: 18, gap: 10 }}>
        <ActivityIndicator size="small" color={theme.colors.textMuted} />
        <Eyebrow tone="faint">Betrieb wird geprüft</Eyebrow>
      </View>
    );
  }

  if (stage === "fehler") {
    return <PillButton label="Erneut versuchen" onPress={onErneutPruefen} />;
  }

  if (stage === "fehlt" || stage === "anlegen") {
    return (
      <PillButton
        label={stage === "anlegen" ? "Wird angelegt …" : "Betrieb anlegen"}
        onPress={onAnlegen}
        // Ohne Namen gäbe es nichts zu senden; während des Anlegens würde ein zweiter
        // Tipp den 409-Weg auslösen. Beides lieber gar nicht erst zulassen.
        disabled={stage === "anlegen" || nameLeer}
      />
    );
  }

  return <PillButton label="Instagram verbinden" onPress={onInstagram} />;
}

/** Überschrift des Betriebsschritts - sagt, was gerade wirklich passiert. */
function venueStepTitel(stage: VenueStage, name: string): string {
  if (stage === "vorhanden") return name ? `Betrieb „${name}" angelegt` : "Betrieb angelegt";
  if (stage === "anlegen") return "Betrieb wird angelegt …";
  if (stage === "pruefen") return "Betrieb wird geprüft …";
  return "Betrieb anlegen";
}

/**
 * Steckt im Fehler ein brauchbarer Betrieb?
 *
 * Nur dann ist der 409 die gute Nachricht „hast du schon". Ein 409 ohne verwertbaren
 * Rumpf (alter Server, Proxy dazwischen) darf NICHT als „übernommen" durchgehen -
 * sonst zeigte der Bildschirm einen Betrieb an, dessen Kennung niemand kennt.
 */
function venueAusKonflikt(err: unknown): Venue | null {
  if (!(err instanceof ApiError) || err.status !== 409) return null;
  const body = err.body as { venue?: Venue } | undefined;
  return body?.venue?.id ? body.venue : null;
}

/** Fehler in eine Zeile übersetzen, die hinter der Theke etwas sagt. */
function fehlerText(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Nicht angemeldet. Bitte neu anmelden.";
    // 422 (Name taugt nicht als Adresse) und 409 ohne Rumpf tragen einen deutschen
    // Servertext - den zeigen wir wörtlich, er ist genauer als jede Ersatzformel.
    return err.message;
  }
  return "Keine Verbindung zum Server. Bitte später noch einmal versuchen.";
}

function StepCard({ step }: { step: Step }) {
  const theme = useTheme();
  const done = step.state === "done";
  const current = step.state === "current";

  return (
    <Card
      emphasis={current ? "strong" : "subtle"}
      padding={0}
      style={{
        borderRadius: 18,
        paddingVertical: theme.spacing.lg,
        paddingHorizontal: 18,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        ...(current ? { borderWidth: 2, borderColor: theme.colors.primary } : {}),
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: done ? theme.colors.success : "transparent",
          borderWidth: done ? 0 : 2,
          borderColor: current ? theme.colors.primary : theme.colors.borderStrong,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {done ? <CheckIcon size={16} color="#FFFFFF" strokeWidth={2.6} /> : null}
      </View>

      <View style={{ flex: 1 }}>
        <Text
          variant="cardTitleSm"
          tone={done ? "faint" : "primary"}
          style={{ fontSize: 16, textDecorationLine: done ? "line-through" : "none" }}
        >
          {step.title}
        </Text>
        {step.reason ? <Eyebrow style={{ marginTop: 1 }}>{step.reason}</Eyebrow> : null}
      </View>
    </Card>
  );
}
