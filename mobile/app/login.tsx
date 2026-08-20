import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { AppleMark } from "../src/components/icons";
import { Card } from "../src/components/ui/Card";
import { Eyebrow } from "../src/components/ui/Eyebrow";
import { PillButton } from "../src/components/ui/PillButton";
import { Screen } from "../src/components/ui/Screen";
import { Text } from "../src/components/ui/Text";
import { TextFeld } from "../src/components/ui/TextFeld";
import { hasRealAuth, requireClerk } from "../src/lib/auth";
import { useStore } from "../src/lib/store";
import { useToast } from "../src/lib/toast";
import { useTheme } from "../src/theme";

/**
 * Screen 01 · Login.
 *
 * Zwei Wege, eine Oberfläche:
 * - Mit `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` läuft die echte Anmeldung. Das
 *   Session-Token geht danach als Bearer an die API, der Server legt das Konto
 *   in der Datenbank an (`getOrCreateUser` in `server/middleware/auth.ts`).
 * - Ohne Schlüssel bleibt die Demo-Anmeldung. Das ist der gewollte Rückfall: ohne
 *   Konfiguration muss die App trotzdem starten und bedienbar sein.
 *
 * Die Entscheidung fällt einmal und bleibt für die Prozesslaufzeit gleich (der
 * Schlüssel steht zur Bauzeit fest), deshalb ist die Verzweigung auf zwei Komponenten
 * hier hook-sicher.
 */
export default function LoginScreen() {
  const router = useRouter();
  const { signedIn } = useStore();

  // Wer hier steht und trotzdem angemeldet IST, muss weitergeschickt werden.
  //
  // Die Weiche in app/index.tsx ist ein <Redirect> und entscheidet deshalb nur
  // EINMAL, beim Mounten. Meldet sich Clerk später — die Sitzungslage kommt über
  // ein Abo, und der Store hat dafür eine Notbremse von vier Sekunden —, dann
  // steht signedIn auf true, aber niemand navigiert mehr: Der Nutzer bliebe mit
  // gültiger Sitzung auf dem Login und tippte gegen eine bereits offene Sitzung.
  //
  // Deshalb hier reaktiv statt einmalig. Im Demobetrieb ist das folgenlos: Dort
  // setzt erst der Knopf signedIn, und der navigiert ohnehin selbst.
  //
  // Ziel ist "/" und NICHT "/start": Dort steht die einzige Weiche der App, und
  // sie entscheidet, ob dieses Konto schon einen Betrieb hat. Wer direkt nach
  // "/start" springt, umgeht sie - und genau daran hing der Fehler, den das
  // Onboarding beheben sollte: Ein frisch angemeldeter Wirt landete trotz allem
  // in den Beispieldaten eines fremden Betriebs, weil die Anmeldung an der
  // Weiche vorbeiführte.
  useEffect(() => {
    if (signedIn) router.replace("/");
  }, [signedIn, router]);

  return hasRealAuth() ? <ClerkLogin /> : <DemoLogin />;
}

/** Ohne Clerk-Schlüssel: ein Knopf, der den Demobetrieb anmeldet. Es fließt kein Token. */
function DemoLogin() {
  const router = useRouter();
  const { signIn } = useStore();

  return (
    <LoginRahmen footnote="Demomodus · Anmeldung noch nicht verbunden">
      <PillButton
        label="Demo betreten"
        variant="primary"
        onPress={() => {
          signIn();
          // Über die Weiche, nicht daran vorbei - siehe die Begründung oben.
          router.replace("/");
        }}
      />
      <Text variant="bodySm" tone="secondary" style={styles.hinweisZeile}>
        Ohne hinterlegten Clerk-Schlüssel läuft die App mit Beispieldaten.
      </Text>
    </LoginRahmen>
  );
}

/**
 * Mit Clerk-Schlüssel: nativer Apple-Dialog, E-Mail mit Passwort, Einmalcode als Alternative.
 *
 * Google ist bewusst raus. Es war der einzige Weg, der zuverlässig lief, aber die
 * Freigabe des Google-Business-Profils steht aus - jeder Tester lief in eine
 * Fehlermeldung, die wie ein Fehler der App aussah. Ein Knopf, der nicht liefert,
 * gehört entfernt und nicht beschriftet (dieselbe Begründung wie beim früheren
 * E-Mail-Feld, das nie angeschlossen war).
 */
function ClerkLogin() {
  return (
    <LoginRahmen footnote="Geschützt durch Clerk">
      {/* Nur auf iOS: `useSignInWithApple` setzt `expo-apple-authentication`
          voraus, und den nativen Dialog gibt es nur dort. Eigene Komponente,
          damit der Hook nicht bedingt aufgerufen wird. */}
      {Platform.OS === "ios" ? <AppleKnopf /> : null}
      <Trennlinie />
      <EmailAnmeldung />
    </LoginRahmen>
  );
}

/** Nativer „Mit Apple anmelden"-Dialog (Face ID statt Browserwechsel). */
function AppleKnopf() {
  const router = useRouter();
  const toast = useToast();
  const { signIn } = useStore();
  const { startAppleAuthenticationFlow } = requireClerk().useSignInWithApple();
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { createdSessionId, setActive } = await startAppleAuthenticationFlow();

      if (!createdSessionId) {
        // Der Normalfall bei Abbruch im Systemdialog - kein Fehler.
        return;
      }

      await setActive?.({ session: createdSessionId });
      signIn();
      router.replace("/");
    } catch (error) {
      // Ein Abbruch durch den Nutzer kommt hier als Fehler an (`ERR_REQUEST_CANCELED`).
      // Den still schlucken: Wer selbst abbricht, braucht keine Fehlermeldung.
      if (istAbbruch(error)) return;
      console.warn("[login] Apple-Anmeldung fehlgeschlagen", error);
      toast.show("Anmeldung mit Apple fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PillButton
      label={busy ? "Anmeldung läuft …" : "Weiter mit Apple"}
      variant="outline"
      icon={<AppleMark size={16} />}
      disabled={busy}
      onPress={() => void start()}
    />
  );
}

type Schritt = "zugangsdaten" | "code";

/**
 * Woher der erwartete Code stammt - davon hängt ab, welche Clerk-Methode ihn prüft.
 *
 * Drei Quellen, ein Eingabefeld: Der Nutzer tippt in allen drei Fällen sechs
 * Ziffern aus einer Mail. Für ihn ist das derselbe Schritt, deshalb sieht er
 * auch denselben Bildschirm.
 */
type CodeQuelle =
  /** Passwortlose Anmeldung: Code IST der erste Faktor. */
  | { art: "erstfaktor" }
  /** Passwort stimmte, Clerk verlangt einen zweiten Faktor (z. B. wegen Device Trust). */
  | { art: "zweitfaktor"; strategie: "phone_code" | "totp" | "backup_code" }
  /** Neues Konto: die E-Mail-Adresse wird bestätigt. */
  | { art: "registrierung" };

/**
 * E-Mail-Anmeldung mit Passwort, Einmalcode als Alternative.
 *
 * Warum beides: Die Clerk-Instanz hat `password.required = true` - ein neues Konto
 * OHNE Passwort kann sie gar nicht anlegen. Gleichzeitig ist `email_code` der
 * einzige Erstfaktor, den sie für die E-Mail-Adresse führt. Wer sein Passwort
 * vergisst, käme mit nur einem der beiden Wege nicht mehr herein.
 *
 * Warum kein getrennter „Registrieren"-Knopf: `signIn` scheitert bei unbekannter
 * Adresse mit `form_identifier_not_found`, und genau dann legen wir das Konto an.
 * Der Nutzer muss nicht wissen, ob er neu ist.
 */
function EmailAnmeldung() {
  const router = useRouter();
  const toast = useToast();
  const { signIn: storeSignIn } = useStore();
  const clerk = requireClerk();
  const { signIn, setActive: setActiveNachAnmeldung, isLoaded: anmeldungBereit } = clerk.useSignIn();
  const { signUp, setActive: setActiveNachRegistrierung, isLoaded: registrierungBereit } =
    clerk.useSignUp();

  const [schritt, setSchritt] = useState<Schritt>("zugangsdaten");
  const [quelle, setQuelle] = useState<CodeQuelle>({ art: "erstfaktor" });
  const [adresse, setAdresse] = useState("");
  const [passwort, setPasswort] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const bereit = anmeldungBereit && registrierungBereit;
  const email = adresse.trim();

  /** Angemeldet - Sitzung aktivieren, lokalen Zustand nachziehen, über die Weiche schicken. */
  const abschliessen = async (
    setActive: typeof setActiveNachAnmeldung,
    sitzung: string | null,
  ) => {
    await setActive?.({ session: sitzung });
    storeSignIn();
    router.replace("/");
  };

  /** Aus einer unvollständigen Anmeldung in den Code-Schritt wechseln - oder ehrlich abbrechen. */
  const weiterNachAnmeldung = async (status: string) => {
    if (status !== "needs_second_factor") {
      // `needs_new_password` und `needs_identifier` führt dieser Screen nicht.
      // Lieber ehrlich sagen als stumm stehen bleiben.
      console.warn("[login] Anmeldung unvollständig", status);
      toast.show("Anmeldung braucht einen weiteren Schritt. Bitte im Web anmelden.");
      return;
    }

    // Device Trust und MFA landen hier. Die erste Strategie nehmen, die dieser
    // Screen bedienen kann - alle drei sind ein Zifferncode.
    const faktor = signIn?.supportedSecondFactors?.find(
      (f) => f.strategy === "phone_code" || f.strategy === "totp" || f.strategy === "backup_code",
    );

    if (!faktor) {
      toast.show("Zusätzliche Bestätigung nötig. Bitte im Web anmelden.");
      return;
    }

    // `totp` und `backup_code` liest der Nutzer aus seiner App ab, da ist nichts
    // vorzubereiten; nur der SMS-Code muss angefordert werden.
    if (faktor.strategy === "phone_code") {
      await signIn!.prepareSecondFactor({ strategy: "phone_code" });
    }

    setQuelle({ art: "zweitfaktor", strategie: faktor.strategy });
    setSchritt("code");
    toast.show(
      faktor.strategy === "phone_code"
        ? "Code per SMS verschickt."
        : "Bitte den Code aus deiner Authenticator-App eingeben.",
    );
  };

  /** Konto anlegen, wenn es die Adresse noch nicht gibt. Passwort ist dabei Pflicht. */
  const registrieren = async () => {
    await signUp!.create({ emailAddress: email, password: passwort });
    await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
    setQuelle({ art: "registrierung" });
    setSchritt("code");
    toast.show("Konto angelegt. Bestätige die Adresse mit dem Code aus der E-Mail.");
  };

  const mitPasswortAnmelden = async () => {
    if (busy || !bereit) return;
    if (!email.includes("@")) {
      toast.show("Bitte eine vollständige E-Mail-Adresse eingeben.");
      return;
    }
    if (passwort.length < 8) {
      toast.show("Das Passwort braucht mindestens acht Zeichen.");
      return;
    }

    setBusy(true);
    try {
      const ergebnis = await signIn!.create({ identifier: email, password: passwort });

      if (ergebnis.status === "complete") {
        await abschliessen(setActiveNachAnmeldung, ergebnis.createdSessionId);
        return;
      }
      await weiterNachAnmeldung(ergebnis.status ?? "");
    } catch (error) {
      if (istUnbekanntesKonto(error)) {
        try {
          await registrieren();
        } catch (registrierungsFehler) {
          console.warn("[login] Registrierung fehlgeschlagen", registrierungsFehler);
          toast.show(klartext(registrierungsFehler) ?? "Konto konnte nicht angelegt werden.");
        }
        return;
      }
      console.warn("[login] Anmeldung fehlgeschlagen", error);
      toast.show(klartext(error) ?? "Anmeldung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  };

  /** Passwortloser Weg - fängt auch den Fall „Passwort vergessen" ab. */
  const codeAnfordern = async () => {
    if (busy || !bereit) return;
    if (!email.includes("@")) {
      toast.show("Bitte eine vollständige E-Mail-Adresse eingeben.");
      return;
    }

    setBusy(true);
    try {
      await signIn!.create({ identifier: email, strategy: "email_code" });
      setQuelle({ art: "erstfaktor" });
      setSchritt("code");
      toast.show("Code verschickt. Schau in dein Postfach.");
    } catch (error) {
      if (istUnbekanntesKonto(error)) {
        toast.show("Zu dieser Adresse gibt es kein Konto. Vergib ein Passwort, dann legen wir eins an.");
        return;
      }
      console.warn("[login] Code anfordern fehlgeschlagen", error);
      toast.show(klartext(error) ?? "Code konnte nicht verschickt werden.");
    } finally {
      setBusy(false);
    }
  };

  const codePruefen = async () => {
    const eingabe = code.trim();
    if (busy || !bereit || eingabe.length < 6) return;

    setBusy(true);
    try {
      if (quelle.art === "registrierung") {
        const ergebnis = await signUp!.attemptEmailAddressVerification({ code: eingabe });
        if (ergebnis.status === "complete") {
          await abschliessen(setActiveNachRegistrierung, ergebnis.createdSessionId);
          return;
        }
        console.warn("[login] Registrierung unvollständig", ergebnis.status);
        toast.show("Die Registrierung braucht noch Angaben. Bitte im Web fortfahren.");
        return;
      }

      const ergebnis =
        quelle.art === "erstfaktor"
          ? await signIn!.attemptFirstFactor({ strategy: "email_code", code: eingabe })
          : await signIn!.attemptSecondFactor({ strategy: quelle.strategie, code: eingabe });

      if (ergebnis.status === "complete") {
        await abschliessen(setActiveNachAnmeldung, ergebnis.createdSessionId);
        return;
      }
      await weiterNachAnmeldung(ergebnis.status ?? "");
    } catch (error) {
      console.warn("[login] Code-Prüfung fehlgeschlagen", error);
      toast.show(klartext(error) ?? "Der Code stimmt nicht. Bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  };

  if (schritt === "code") {
    const ausSms = quelle.art === "zweitfaktor" && quelle.strategie === "phone_code";
    const ausApp = quelle.art === "zweitfaktor" && quelle.strategie !== "phone_code";

    return (
      <View style={styles.formular}>
        <TextFeld
          label={ausApp ? "Code aus deiner Authenticator-App" : "Code aus der Nachricht"}
          wert={code}
          onChange={setCode}
          placeholder="123456"
          maxLength={6}
          keyboardType="number-pad"
          // Erst damit schlägt iOS den Code aus der Vorschau zum Antippen vor.
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          autoFocus
          editable={!busy}
          hinweis={ausApp ? undefined : `Gesendet ${ausSms ? "per SMS" : `an ${email}`}`}
          onSubmit={() => void codePruefen()}
        />
        <PillButton
          label={busy ? "Wird geprüft …" : "Bestätigen"}
          variant="primary"
          disabled={busy || code.trim().length < 6}
          onPress={() => void codePruefen()}
        />
        <PillButton
          label="Zurück"
          variant="ghost"
          disabled={busy}
          onPress={() => {
            setCode("");
            setSchritt("zugangsdaten");
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.formular}>
      <TextFeld
        label="E-Mail-Adresse"
        wert={adresse}
        onChange={setAdresse}
        placeholder="name@betrieb.de"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        editable={!busy}
      />
      <TextFeld
        label="Passwort"
        wert={passwort}
        onChange={setPasswort}
        placeholder="Mindestens acht Zeichen"
        autoCapitalize="none"
        // `password` statt `new-password`: Derselbe Bildschirm meldet an UND legt
        // an, und für Bestandsnutzer - die häufigere Gruppe - ist das Vorschlagen
        // eines neuen Passworts falsch.
        autoComplete="password"
        textContentType="password"
        editable={!busy}
        onSubmit={() => void mitPasswortAnmelden()}
      />
      <PillButton
        label={busy ? "Einen Moment …" : "Anmelden"}
        variant="primary"
        disabled={busy || !bereit}
        onPress={() => void mitPasswortAnmelden()}
      />
      <PillButton
        label="Stattdessen Code per E-Mail"
        variant="ghost"
        disabled={busy || !bereit}
        onPress={() => void codeAnfordern()}
      />
      <Text variant="bodySm" tone="secondary" style={styles.hinweisZeile}>
        Neu hier? Adresse und Wunschpasswort eingeben - dein Konto entsteht dabei.
      </Text>
    </View>
  );
}

/** Dünne Linie zwischen Apple-Knopf und Formular. */
function Trennlinie() {
  const theme = useTheme();
  return (
    <View style={styles.trennlinie}>
      <View style={[styles.strich, { backgroundColor: theme.colors.border }]} />
      <Text variant="bodySm" tone="muted" style={{ fontSize: 12.5 }}>
        oder
      </Text>
      <View style={[styles.strich, { backgroundColor: theme.colors.border }]} />
    </View>
  );
}

/**
 * Clerk-Fehler in einen Satz übersetzen, den ein Wirt versteht.
 *
 * `null`, wenn nichts Brauchbares drinsteht - der Aufrufer setzt dann seinen
 * eigenen Text. Clerks englische Rohmeldungen ungefiltert anzuzeigen wäre
 * schlechter als ein allgemeiner deutscher Satz.
 */
function klartext(error: unknown): string | null {
  const fehler = clerkFehler(error);
  if (!fehler) return null;

  switch (fehler.code) {
    case "form_password_incorrect":
    case "form_password_validation_failed":
      return "Das Passwort stimmt nicht.";
    case "form_password_pwned":
      return "Dieses Passwort taucht in bekannten Datenlecks auf. Bitte ein anderes wählen.";
    case "form_password_length_too_short":
      return "Das Passwort ist zu kurz.";
    case "form_code_incorrect":
    case "verification_failed":
      return "Der Code stimmt nicht. Bitte prüfe die Nachricht.";
    case "verification_expired":
      return "Der Code ist abgelaufen. Fordere einen neuen an.";
    case "form_identifier_exists":
      return "Für diese Adresse gibt es bereits ein Konto. Melde dich mit deinem Passwort an.";
    case "form_param_format_invalid":
      return "Diese E-Mail-Adresse sieht nicht gültig aus.";
    case "too_many_requests":
    case "rate_limit_exceeded":
      return "Zu viele Versuche. Bitte einen Moment warten.";
    default:
      return null;
  }
}

interface ClerkFehler {
  code?: string;
}

/** Clerk verpackt seine Fehler in `errors[]`; alles andere ist ein Netz- oder Programmfehler. */
function clerkFehler(error: unknown): ClerkFehler | null {
  if (typeof error !== "object" || error === null) return null;
  const errors = (error as { errors?: unknown }).errors;
  if (!Array.isArray(errors) || errors.length === 0) return null;
  return errors[0] as ClerkFehler;
}

/** „Zu dieser Adresse gibt es kein Konto" - das Signal zum Umschwenken auf Registrierung. */
function istUnbekanntesKonto(error: unknown): boolean {
  return clerkFehler(error)?.code === "form_identifier_not_found";
}

/** Abbruch im Apple-Systemdialog. Kein Fehler, sondern eine Entscheidung des Nutzers. */
function istAbbruch(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return code === "ERR_REQUEST_CANCELED" || code === "ERR_CANCELED";
}

interface LoginRahmenProps {
  children: React.ReactNode;
  footnote: string;
}

/** Reine Darstellung - identisch in beiden Betriebsarten, damit das Layout nicht driftet. */
function LoginRahmen({ children, footnote }: LoginRahmenProps) {
  const theme = useTheme();

  return (
    <Screen surface="deep" contentStyle={styles.container}>
      <View style={{ marginTop: 96 }}>
        <Text variant="heroTitle" accessibilityRole="header">
          Schön, dass du wieder da bist
          <Text variant="heroTitle" color={theme.colors.accent}>
            .
          </Text>
        </Text>
        <Text variant="body" tone="secondary" style={{ fontSize: 17, marginTop: 14 }}>
          Anmelden, deine Aufgaben warten schon.
        </Text>
      </View>

      <Card emphasis="strong" padding={0} style={styles.card}>
        {children}
      </Card>

      {/* `secondary` statt des Vorgabetons: Diese Zeile liegt auf dem
          animierten Verlauf, nicht auf der Karte darüber - dort war sie im
          Simulator kaum zu lesen. Siehe die Begründung an `textMuted`. */}
      <Eyebrow tone="secondary" style={styles.footnote}>{footnote}</Eyebrow>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 26, paddingBottom: 40 },
  card: {
    marginTop: 28,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 22,
    gap: 14,
  },
  formular: { gap: 14 },
  hinweisZeile: { textAlign: "center", fontSize: 14 },
  trennlinie: { flexDirection: "row", alignItems: "center", gap: 12 },
  strich: { flex: 1, height: StyleSheet.hairlineWidth },
  footnote: { marginTop: 22, textAlign: "center", letterSpacing: 0.53 },
});
