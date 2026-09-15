import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "@maitr/core";

import { GoogleMark } from "../../components/icons";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { Tag } from "../../components/ui/Chip";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { LinkAction, PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Toggle } from "../../components/ui/Toggle";
import { Text } from "../../components/ui/Text";
import { standText } from "../../lib/praesenz";
import {
  PROFIL_GRENZEN,
  betriebAusListe,
  googleKarte,
  instagramKonto,
  instagramUrl,
  leereWoche,
  patchGegenServerstand,
  profilAusAntwort,
  profilPatch,
  speicherFehlerText,
  type GoogleKarte,
  type ProfilFehler,
  type ProfilFormular,
} from "../../lib/profilSpeichern";
import { useStore, type OpeningHour } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

/**
 * Profil verwalten - der „ein Ort"-Kern des Produkts.
 *
 * DEMO/SHOWCASE: Von hier pflegt der Betrieb Name, Beschreibung, Öffnungszeiten
 * (Google) und die Instagram-Bio. Alles landet im Store und wirkt sofort dort, wo es
 * angezeigt wird (öffentliches Gastprofil, Journey-Zeiten). `focus`
 * (google|instagram) hebt den relevanten Block hervor. Dieser Weg bleibt, wie er war.
 *
 * ECHTER BETRIEB: Name, Kurzbeschreibung, Beschreibung und Öffnungszeiten gehen über
 * `api.venues.update` an den Server - „Profil gespeichert" erst nach dessen
 * Bestätigung, das Profil aus seiner Antwort. ANLASS (Integrationsprüfung 15.09.,
 * Punkte 8, 14, 25): Vorher speicherte der Knopf nur auf dem Gerät, meldete trotzdem
 * Erfolg, und der nächste Kaltstart überschrieb die Änderung wieder. Weil
 * `openingHours` am Server den ganzen Wochenplan ersetzt, lädt der Screen den Betrieb
 * beim Öffnen frisch und gleicht die Woche direkt vor dem Speichern mit dem
 * Serverstand ab - nur angefasste Tage gehen mit (Prüfbefund zu Punkt 8). Google und
 * Instagram stehen daneben nur LESEND: Es gibt keinen Schreibweg dorthin, also
 * behauptet der Screen auch keinen.
 */
export function ProfileManagementScreen({ focus }: { focus?: string }) {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const {
    venueProfile,
    updateVenueProfile,
    updateHour,
    venueId,
    hasRealVenue,
    showcase,
    praesenz,
    praesenzLaedt,
    aktualisierePraesenz,
    bumpBriefing,
  } = useStore();
  const echterBetrieb = hasRealVenue && !showcase;

  const [name, setName] = useState(venueProfile.name);
  const [tagline, setTagline] = useState(venueProfile.tagline);
  const [bio, setBio] = useState(venueProfile.bio);
  const [instagramBio, setInstagramBio] = useState(venueProfile.instagramBio);
  /**
   * Hat der Wirt schon etwas eingegeben? Dann darf der frische Stand beim Öffnen
   * (Effekt unten) das Formular nicht mehr umschreiben - seine Eingabe ginge verloren.
   */
  const angefasst = useRef(false);

  /* ── Nur echter Betrieb ─────────────────────────────────────────────────────
     Die Hooks stehen trotzdem immer da (Hook-Regeln); im Demo-Weg bleiben sie
     unbenutzt. */

  /** Stand beim Öffnen - wogegen `profilPatch` „geändert" misst. */
  const ausgang = useRef<ProfilFormular>({
    name: venueProfile.name,
    tagline: venueProfile.tagline,
    bio: venueProfile.bio,
    hours: venueProfile.hours,
  });
  /**
   * Die Zeilen als ENTWURF im Screen, nicht im Store: Schriebe die Zeile wie im
   * Demo-Weg sofort in den Store, stünde eine Zeit, die der Server gleich abweist,
   * schon im Profil (und im Gerätespeicher) - „bei Fehler Formular stehen lassen"
   * hieße dann „Fehler ins Profil übernehmen".
   */
  const [zeilen, setZeilen] = useState<OpeningHour[]>(venueProfile.hours);
  /**
   * Der zuletzt GETIPPTE Text je Zeile. `HourRow` meldet Uhrzeiten erst beim
   * Verlassen des Feldes - aber `Screen` lässt Tipps bei offener Tastatur zum Knopf
   * durch (`keyboardShouldPersistTaps="handled"`), das Feld verliert den Fokus also
   * nicht vor dem Speichern. Ohne diese Ref ginge die gerade getippte Zeit verloren.
   * Ref statt State: kein Neuaufbau des Screens je Tastendruck.
   */
  const getippt = useRef<Record<string, string>>({});
  const [fehler, setFehler] = useState<ProfilFehler | null>(null);
  const [speicherFehler, setSpeicherFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const aktiv = useRef(true);
  useEffect(() => {
    aktiv.current = true;
    return () => {
      aktiv.current = false;
    };
  }, []);
  // Für die Antwort: gehört sie noch zum Betrieb, der gerade angemeldet ist?
  const aktuelleVenueId = useRef(venueId);
  aktuelleVenueId.current = venueId;
  /** Ab dem ersten Speicherversuch ist eine ältere Antwort des Öffnen-Abrufs wertlos. */
  const speichernBegonnen = useRef(false);
  /**
   * Zählt hoch, wenn die Zeilen durch den frischen Serverstand ersetzt werden.
   * `HourRow` hält den Text in eigenem State (Startwert beim Einhängen) - ohne neuen
   * Schlüssel zeigte die Zeile weiter die alte Zeit.
   */
  const [zeilenStand, setZeilenStand] = useState(0);

  /*
   * Beim Öffnen den Betrieb frisch holen. ANLASS (Prüfbefund zu Punkt 8): Der Store
   * holt das Profil nur beim Anmelden bzw. Kaltstart - nach einem Tag im Hintergrund
   * zeigte das Formular sonst Zeiten, die längst anders am Server stehen (etwa nach
   * einer Veröffentlichung der Web-App). Vor Überschreiben schützt erst der Abgleich
   * beim Speichern (`patchGegenServerstand`); das hier sorgt dafür, dass der Wirt
   * überhaupt den aktuellen Stand sieht.
   *
   * `api.venues.mine()` nimmt kein AbortSignal an - deshalb das `alive`-Muster wie
   * im Store. Scheitert der Abruf, bleibt das Formular beim Store-Stand; das ist
   * kein Fehler für den Wirt, der Abgleich beim Speichern fragt ohnehin erneut.
   */
  useEffect(() => {
    if (!echterBetrieb) return;
    let alive = true;
    const betrieb = venueId;
    api.venues
      .mine()
      .then((liste) => {
        if (!alive || speichernBegonnen.current || aktuelleVenueId.current !== betrieb) return;
        const profil = profilAusAntwort(betriebAusListe(liste, betrieb), betrieb);
        if (!profil) return;
        updateVenueProfile(profil);
        if (angefasst.current) return;
        ausgang.current = { name: profil.name, tagline: profil.tagline, bio: profil.bio, hours: profil.hours };
        setName(profil.name);
        setTagline(profil.tagline);
        setBio(profil.bio);
        getippt.current = {};
        setZeilen(profil.hours);
        setZeilenStand((n) => n + 1);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [echterBetrieb, venueId, updateVenueProfile]);

  const zeileAendern = useCallback((id: string, value: string, closed?: boolean) => {
    // `HourRow` öffnet einen geschlossenen Tag mit dessen bisherigem Wert -
    // „Geschlossen". Das ist keine Uhrzeit; das Feld steht dann leer und verlangt
    // beim Speichern eine Angabe, statt „Geschlossen" als Öffnungszeit zu senden.
    const wert = !closed && value === "Geschlossen" ? "" : value;
    angefasst.current = true;
    if (!closed) getippt.current[id] = wert;
    setZeilen((liste) => liste.map((z) => (z.id === id ? { ...z, value: wert, closed } : z)));
  }, []);
  const zeileTippen = useCallback((id: string, text: string) => {
    angefasst.current = true;
    getippt.current[id] = text;
  }, []);
  const textAendern = (setzen: (text: string) => void) => (text: string) => {
    angefasst.current = true;
    setzen(text);
  };

  const wocheAnlegen = () => {
    angefasst.current = true;
    getippt.current = {};
    setZeilen(leereWoche());
  };

  const save = () => {
    updateVenueProfile({ name, tagline, bio, instagramBio });
    toast.show("Profil gespeichert");
    router.back();
  };

  const speichernEcht = async () => {
    if (speichert) return;
    const hours = zeilen.map((z) =>
      z.closed ? z : { ...z, value: getippt.current[z.id] ?? z.value },
    );
    const plan = profilPatch(ausgang.current, { name, tagline, bio, hours });
    if (!plan.ok) {
      setFehler(plan.fehler);
      setSpeicherFehler("Nicht gespeichert - bitte die markierten Angaben korrigieren.");
      return;
    }
    setFehler(null);
    setSpeicherFehler(null);
    if (Object.keys(plan.patch).length === 0) {
      toast.show("Keine Änderungen");
      router.back();
      return;
    }

    const betrieb = venueId;
    speichernBegonnen.current = true;
    setSpeichert(true);
    try {
      let patch = plan.patch;
      let uebrigeTageNeuer = false;
      if (patch.openingHours) {
        // Die Woche aus dem Formular trägt unangefasste Tage im Stand beim Öffnen.
        // Direkt vor dem Speichern gegen den Serverstand abgleichen, damit nur die
        // geänderten Tage ankommen (siehe `patchGegenServerstand`).
        const abgleich = patchGegenServerstand(ausgang.current, patch, await api.venues.mine(), betrieb);
        if (!abgleich.ok) {
          if (aktiv.current) setSpeicherFehler(abgleich.fehler);
          toast.show(abgleich.fehler, "fehler");
          return;
        }
        patch = abgleich.patch;
        uebrigeTageNeuer = abgleich.uebrigeTageNeuer;
        if (Object.keys(patch).length === 0) {
          // Steht schon genau so am Server: nichts senden, nichts „gespeichert" melden -
          // aber das Profil auf den Serverstand bringen, den das Formular nicht zeigte.
          const profil = profilAusAntwort(abgleich.venue, betrieb);
          if (profil && aktuelleVenueId.current === betrieb) updateVenueProfile(profil);
          toast.show("Keine Änderungen - so steht es schon im Profil");
          if (aktiv.current) router.back();
          return;
        }
      }
      const antwort = await api.venues.update(betrieb, patch);
      const profil = profilAusAntwort(antwort, betrieb);
      if (!profil) {
        // 200 heißt: gespeichert. Nur die Antwort taugt nicht als Profil - dann nichts
        // Halbes übernehmen, sondern ehrlich sagen, woran es liegt.
        if (aktiv.current) {
          setSpeicherFehler(
            "Gespeichert, aber die Antwort des Servers war unlesbar. Das Profil lädt beim nächsten Start neu.",
          );
        }
        return;
      }
      // Inzwischen abgemeldet oder anderer Betrieb: dessen Profil nicht überschreiben.
      if (aktuelleVenueId.current !== betrieb) return;
      updateVenueProfile(profil);
      // Der Präsenzbericht misst Beschreibung und Öffnungszeiten - ohne neuen Bericht
      // bliebe der Hebel „Beschreibung ergänzen" nach dem Speichern stehen. Der Server
      // drosselt Fremdabrufe auf zehn Minuten und rechnet den Bericht trotzdem neu.
      // Danach das Briefing auf Start nachladen: Der gedrosselte Abruf bringt kein
      // neues `fetchedAt`, und nur daran hing Start bisher (Prüfer-Befund 25).
      // `aktualisierePraesenz` wirft nie.
      void aktualisierePraesenz().then(() => bumpBriefing());
      toast.show(
        uebrigeTageNeuer
          ? "Profil gespeichert - die übrigen Tage waren inzwischen anders hinterlegt und bleiben so"
          : "Profil gespeichert",
      );
      if (aktiv.current) router.back();
    } catch (err) {
      const text = speicherFehlerText(err);
      if (aktiv.current) setSpeicherFehler(text);
      toast.show(text, "fehler");
    } finally {
      if (aktiv.current) setSpeichert(false);
    }
  };

  const field = {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: theme.colors.textPrimary,
  } as const;

  const google = googleKarte(praesenz, praesenzLaedt);
  const googleStand = standText(praesenz?.fetchedAt, Date.now());

  return (
    <Screen animated="subtle" contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title="Profil verwalten" fallback="/profil-check" />

      {echterBetrieb ? (
        <Text variant="bodySm" tone="secondary" style={{ fontSize: 14 }}>
          Hier änderst du dein Profil in Maitr. Google und Instagram bleiben davon unberührt - dort
          änderst du deine Angaben selbst.
        </Text>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Avatar initials="G" size={38} color="#4285F4" />
          <Avatar initials="Ig" size={38} color="#C13584" />
          <Text variant="bodySm" tone="secondary" style={{ flex: 1, fontSize: 14 }}>
            Änderungen gehen an alle verbundenen Kanäle.
          </Text>
        </View>
      )}

      {/* Betriebsinfo: Demo „Google Business", echter Betrieb das Profil in Maitr */}
      <Card
        padding={theme.spacing.lg}
        style={{
          gap: theme.spacing.md,
          ...(!echterBetrieb && focus === "google" ? { borderWidth: 2, borderColor: theme.colors.primary } : {}),
        }}
      >
        {echterBetrieb ? (
          <Eyebrow>Profil in Maitr</Eyebrow>
        ) : (
          <Eyebrow tone={focus === "google" ? "accent" : "muted"}>Google Business</Eyebrow>
        )}

        <View style={{ gap: 6 }}>
          <Eyebrow>Name</Eyebrow>
          <TextInput
            value={name}
            onChangeText={textAendern(setName)}
            maxLength={echterBetrieb ? PROFIL_GRENZEN.nameMax : undefined}
            style={[theme.text.body, field]}
            accessibilityLabel="Betriebsname"
          />
          {echterBetrieb ? <FeldFehler text={fehler?.name} /> : null}
        </View>

        <View style={{ gap: 6 }}>
          <Eyebrow>Kurzbeschreibung</Eyebrow>
          <TextInput
            value={tagline}
            onChangeText={textAendern(setTagline)}
            maxLength={echterBetrieb ? PROFIL_GRENZEN.tagline : undefined}
            style={[theme.text.body, field]}
            accessibilityLabel="Kurzbeschreibung"
          />
          {echterBetrieb ? <FeldFehler text={fehler?.tagline} /> : null}
        </View>

        <View style={{ gap: 6 }}>
          <Eyebrow>Beschreibung</Eyebrow>
          <TextInput
            value={bio}
            onChangeText={textAendern(setBio)}
            multiline
            maxLength={echterBetrieb ? PROFIL_GRENZEN.beschreibung : undefined}
            style={[theme.text.body, field, { minHeight: 92, textAlignVertical: "top" }]}
            accessibilityLabel="Beschreibung"
          />
          {echterBetrieb ? <FeldFehler text={fehler?.bio} /> : null}
        </View>

        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {venueProfile.tags.map((t) => (
            <Tag key={t} label={t} />
          ))}
        </View>
      </Card>

      {/* Öffnungszeiten */}
      <Card padding={theme.spacing.lg} style={{ gap: theme.spacing.md }}>
        <Eyebrow>Öffnungszeiten</Eyebrow>
        {!echterBetrieb ? (
          venueProfile.hours.map((h) => (
            <HourRow key={h.id} id={h.id} label={h.label} value={h.value} closed={h.closed} onChange={updateHour} />
          ))
        ) : zeilen.length === 0 ? (
          <View style={{ gap: 4, alignItems: "flex-start" }}>
            <Text variant="bodySm" tone="secondary" style={{ fontSize: 14 }}>
              Noch keine Öffnungszeiten hinterlegt.
            </Text>
            <LinkAction label="Öffnungszeiten eintragen" labelSize={14} onPress={wocheAnlegen} />
          </View>
        ) : (
          zeilen.map((h) => (
            <HourRow
              key={`${zeilenStand}-${h.id}`}
              id={h.id}
              label={h.label}
              value={h.value}
              closed={h.closed}
              onChange={zeileAendern}
              onTippen={zeileTippen}
              fehler={fehler?.zeilen[h.id]}
            />
          ))
        )}
      </Card>

      {echterBetrieb ? (
        <GoogleStand karte={google} stand={googleStand} hervorheben={focus === "google"} />
      ) : null}

      {/* Instagram: Demo die Bio, echter Betrieb nur der verlinkte Stand */}
      <Card
        padding={theme.spacing.lg}
        style={{
          gap: theme.spacing.md,
          ...(focus === "instagram" ? { borderWidth: 2, borderColor: theme.colors.primary } : {}),
        }}
      >
        {echterBetrieb ? (
          <InstagramStand verweis={venueProfile.instagram} hervorheben={focus === "instagram"} />
        ) : (
          <>
            <Eyebrow tone={focus === "instagram" ? "accent" : "muted"}>Instagram-Bio</Eyebrow>
            <TextInput
              value={instagramBio}
              onChangeText={setInstagramBio}
              multiline
              maxLength={150}
              style={[theme.text.body, field, { minHeight: 72, textAlignVertical: "top" }]}
              accessibilityLabel="Instagram-Bio"
            />
            <Eyebrow tone="faint" style={{ textTransform: "none" }}>
              {instagramBio.length} / 150 Zeichen
            </Eyebrow>
          </>
        )}
      </Card>

      {echterBetrieb ? (
        <View style={{ gap: theme.spacing.sm }}>
          {/* Die Veröffentlichung legt Kurzbeschreibung, Beschreibung und Zeiten neu
              an (server/services/businessProfil.ts) - ohne diesen Satz wundert sich
              der Wirt, warum seine Änderung nach dem nächsten Veröffentlichen weg ist. */}
          <Text variant="bodySm" tone="muted" style={{ fontSize: 13.5, lineHeight: 19 }}>
            Eine erneute Veröffentlichung der Web-App kann diese Angaben überschreiben.
          </Text>
          <FeldFehler text={speicherFehler ?? undefined} />
        </View>
      ) : null}

      <View style={{ marginTop: theme.spacing.sm }}>
        {echterBetrieb ? (
          <PillButton
            label={speichert ? "Wird gespeichert …" : "Profil speichern"}
            onPress={() => void speichernEcht()}
            disabled={speichert}
          />
        ) : (
          <PillButton label="Profil speichern" onPress={save} />
        )}
      </View>
    </Screen>
  );
}

/** Fehlertext unter einem Feld - nichts, solange es keinen gibt. */
function FeldFehler({ text }: { text?: string }) {
  const theme = useTheme();
  if (!text) return null;
  return (
    <Text
      variant="bodySm"
      color={theme.colors.destructive}
      style={{ fontSize: 13.5, lineHeight: 19 }}
      accessibilityRole="alert"
    >
      {text}
    </Text>
  );
}

/**
 * Was Google über den Betrieb zeigt - nur lesend (Integrationsprüfung, Punkt 14).
 *
 * Quelle ist der Places-Abruf (`praesenz.google`), ohne Google-Freigabe. Die Karte
 * sagt ausdrücklich, dass Maitr dort nichts ändert, und verlinkt dorthin, wo der
 * Inhaber es selbst tut.
 */
function GoogleStand({ karte, stand, hervorheben }: { karte: GoogleKarte; stand: string | null; hervorheben: boolean }) {
  const theme = useTheme();
  const oeffnen = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Card
      padding={theme.spacing.lg}
      style={{
        gap: theme.spacing.md,
        ...(hervorheben ? { borderWidth: 2, borderColor: theme.colors.primary } : {}),
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <GoogleMark size={15} />
        <Eyebrow tone={hervorheben ? "accent" : "muted"}>So steht es bei Google</Eyebrow>
      </View>

      {karte.art === "laedt" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ActivityIndicator color={theme.colors.textMuted} />
          <Text variant="bodySm" tone="secondary" style={{ fontSize: 14 }}>
            Google-Eintrag wird abgerufen …
          </Text>
        </View>
      ) : karte.art === "leer" ? (
        <View style={{ gap: 4, alignItems: "flex-start" }}>
          <Text variant="bodySm" tone="secondary" style={{ fontSize: 14, lineHeight: 20 }}>
            {karte.text}
          </Text>
          <LinkAction label="Google-Unternehmensprofil öffnen" labelSize={14} onPress={() => oeffnen(karte.link)} />
        </View>
      ) : (
        <>
          <View style={{ gap: 2 }}>
            <Text variant="cardTitleSm" style={{ fontSize: 17 }}>
              {karte.google.name}
            </Text>
            {karte.google.adresse ? (
              <Text variant="bodySm" tone="muted" style={{ fontSize: 13.5, lineHeight: 19 }}>
                {karte.google.adresse}
              </Text>
            ) : null}
          </View>

          <View style={{ gap: 4 }}>
            <GoogleZeile label="Telefon" wert={karte.google.telefon} />
            <GoogleZeile label="Website" wert={karte.google.website} />
          </View>

          <View style={{ gap: 4 }}>
            <Eyebrow>Öffnungszeiten bei Google</Eyebrow>
            {karte.zeilen.map((z) => (
              <GoogleZeile key={z.id} label={z.label} wert={z.value} />
            ))}
            {karte.tageMitPause > 0 ? (
              // Tage mit Mittagspause fehlen in `zeilen` (je Tag nur ein Fenster) -
              // ohne diesen Satz stünde bei einem Betrieb mit Pause "keine Zeiten".
              <Text variant="bodySm" tone="muted" style={{ fontSize: 14 }}>
                {karte.tageMitPause === 1 ? "Ein Tag" : `${karte.tageMitPause} Tage`} mit Mittagspause - Details bei Google.
              </Text>
            ) : null}
            {!karte.zeilen.length && karte.tageMitPause === 0 ? (
              <Text variant="bodySm" tone="muted" style={{ fontSize: 14 }}>
                Google nennt keine Öffnungszeiten.
              </Text>
            ) : null}
          </View>

          <View style={{ gap: 2, alignItems: "flex-start" }}>
            <Text variant="bodySm" tone="muted" style={{ fontSize: 13.5, lineHeight: 19 }}>
              Nur zur Ansicht - Maitr ändert bei Google nichts.
              {stand ? ` ${stand}.` : ""}
            </Text>
            <LinkAction label="Bei Google ändern" labelSize={14} onPress={() => oeffnen(karte.link)} />
          </View>
        </>
      )}
    </Card>
  );
}

/** Eine Zeile „Telefon · 0221 …"; fehlt der Wert, steht „nicht angegeben" statt eines Beispiels. */
function GoogleZeile({ label, wert }: { label: string; wert?: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
      <Text variant="numeric" tone="secondary" style={{ fontSize: 14, width: 96 }}>
        {label}
      </Text>
      <Text
        variant="bodySm"
        tone={wert ? "primary" : "faint"}
        style={{ flex: 1, fontSize: 14 }}
        selectable={Boolean(wert)}
      >
        {wert || "nicht angegeben"}
      </Text>
    </View>
  );
}

/**
 * Instagram für den echten Betrieb: Die Bio hat keine Serverspalte, und Maitr kann
 * sie weder lesen noch setzen (Setzen geht auch mit Meta-Freigabe nicht). Statt
 * eines Eingabefelds, dessen Inhalt nirgends ankommt, steht hier, was die Web-App
 * über das Konto weiß - verlinkt, nicht verbunden.
 */
function InstagramStand({ verweis, hervorheben }: { verweis?: string; hervorheben: boolean }) {
  const konto = instagramKonto(verweis);
  const url = instagramUrl(verweis);
  return (
    <>
      <Eyebrow tone={hervorheben ? "accent" : "muted"}>Instagram</Eyebrow>
      <Text variant="bodySm" tone="secondary" style={{ fontSize: 14, lineHeight: 20 }}>
        {konto
          ? `${konto} ist in deiner Web-App verlinkt, aber nicht mit Maitr verbunden.`
          : verweis
            ? "In deiner Web-App ist ein Instagram-Link hinterlegt, aber nicht mit Maitr verbunden."
            : "In deiner Web-App ist kein Instagram-Konto hinterlegt."}
      </Text>
      <Text variant="bodySm" tone="muted" style={{ fontSize: 13.5, lineHeight: 19 }}>
        Die Bio änderst du in der Instagram-App - Maitr kann sie nicht ändern.
      </Text>
      {url ? (
        <View style={{ alignItems: "flex-start" }}>
          <LinkAction
            label="Instagram öffnen"
            labelSize={14}
            onPress={() => {
              Linking.openURL(url).catch(() => {});
            }}
          />
        </View>
      ) : null}
    </>
  );
}

/**
 * Öffnungszeit-Zeile: Wert editierbar, „Geschlossen" schaltet den Tag ab.
 *
 * Der Wert geht beim Verlassen des Feldes in den Store, nicht bei jedem Zeichen.
 * Das war die teuerste Tastatur der App: Auf dem Simulator gemessen kostete ein
 * einzelner Tastendruck hier **einen kompletten Neubau des Store-Kontexts, einen
 * vollen `AsyncStorage`-Schreibvorgang und zwei Renders des Start-Screens** - eines
 * Screens, der gar nicht sichtbar ist, sondern hinter diesem Modal liegt. Bei
 * „8:00 – 18:00" sind das 12 Zeichen, also 12-mal alles.
 *
 * Name, Kurzbeschreibung und Bio machen es in dieser Datei schon lange so
 * (lokaler State, Schreiben beim Speichern) - die Öffnungszeiten waren die
 * Ausnahme.
 *
 * `onTippen` und `fehler` braucht nur der echte Betrieb (siehe `getippt` im Screen):
 * `onTippen` schreibt in eine Ref, nicht in State - der teure Weg oben bleibt zu.
 */
function HourRow({
  id,
  label,
  value,
  closed,
  onChange,
  onTippen,
  fehler,
}: {
  id: string;
  label: string;
  value: string;
  closed?: boolean;
  onChange: (id: string, value: string, closed?: boolean) => void;
  onTippen?: (id: string, text: string) => void;
  fehler?: string;
}) {
  const theme = useTheme();
  const [text, setText] = useState(closed ? "" : value);

  /*
   * Beim Verlassen schreiben - und beim Verschwinden der Zeile ebenfalls.
   *
   * `onBlur` allein wäre eine Falle: Wer tippt und dann sofort das Modal zuzieht
   * (Wischen von links), verlässt das Feld nie regulär. Deshalb halten zwei Refs den
   * zuletzt getippten und den zuletzt geschriebenen Stand, und die Aufräumfunktion
   * schreibt nach, falls beide auseinanderliegen. Refs statt State, weil beim
   * Aufräumen kein Render mehr stattfindet.
   */
  const latest = useRef(text);
  const committed = useRef(text);

  const commit = useCallback(() => {
    if (latest.current === committed.current) return;
    committed.current = latest.current;
    onChange(id, latest.current, false);
  }, [id, onChange]);

  // Aufräumen = nachschreiben. Beim Unmount der Zeile ist das die letzte Gelegenheit.
  useEffect(() => commit, [commit]);

  const zeile = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
      <Text variant="numeric" style={{ fontSize: 15, width: 96 }}>
        {label}
      </Text>
      {closed ? (
        <View style={{ flex: 1 }}>
          <Text variant="numeric" tone="faint" style={{ fontSize: 15 }}>
            Geschlossen
          </Text>
        </View>
      ) : (
        <TextInput
          value={text}
          onChangeText={(t) => {
            latest.current = t;
            setText(t);
            onTippen?.(id, t);
          }}
          onBlur={commit}
          placeholder="8:00 – 18:00"
          placeholderTextColor={theme.colors.textFaint}
          accessibilityLabel={`Öffnungszeit ${label}`}
          style={[
            theme.text.body,
            {
              flex: 1,
              fontSize: 15,
              color: theme.colors.textPrimary,
              borderBottomWidth: 1,
              borderBottomColor: fehler ? theme.colors.destructive : theme.colors.border,
              paddingVertical: 6,
            },
          ]}
        />
      )}
      <Toggle
        value={!closed}
        onValueChange={(open) => {
          // Der Schalter schreibt selbst - also gilt der getippte Stand als abgegolten.
          // Ohne diese Zeile würde die Aufräumfunktion oben einen gerade geschlossenen
          // Tag beim Verlassen des Screens wieder öffnen.
          committed.current = latest.current;
          onChange(id, open ? latest.current || value || "9:00 – 17:00" : "Geschlossen", !open);
        }}
        accessibilityLabel={`${label} geöffnet`}
      />
    </View>
  );

  if (!fehler) return zeile;
  return (
    <View style={{ gap: 4 }}>
      {zeile}
      <FeldFehler text={fehler} />
    </View>
  );
}
