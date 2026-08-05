import { useState } from "react";
import { TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { request } from "@maitr/core";

import { Card } from "../../components/ui/Card";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { mobileAuthAdapter } from "../../lib/auth";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

/**
 * Das Wort, das getippt werden muss. Beide Schreibweisen zählen: Auf der
 * deutschen iOS-Tastatur liegt das Ö hinter einem langen Druck auf das O -
 * daran soll niemand scheitern, der wirklich löschen will.
 */
const BESTAETIGUNG = ["LÖSCHEN", "LOESCHEN"];

/**
 * Was mit dem Konto verschwindet - in der Sprache des Betriebs, nicht der
 * Datenbank.
 *
 * Jede Zeile muss durch DELETE /api/users/me gedeckt sein, sonst steht hier ein
 * Versprechen, das der Server nicht hält:
 *  - Betriebsprofil, Öffnungszeiten, Speisekarte: Business + MenuCategory/
 *    MenuItem, die per Cascade daran hängen (server/routes/users.ts).
 *  - Fotos: server/services/supabaseStorage.ts löscht alles unter "<userId>/".
 *    Das ist nicht nebensächlich - der Bucket ist öffentlich, jede dieser
 *    Adressen funktioniert ohne Anmeldung. Bis das dort stand, war diese Zeile
 *    schlicht falsch.
 *  - Reservierungen, Gästeliste, Kanäle, Bewertungsantworten: Reservation,
 *    MaitrGuest, ChannelConnection, MaitrReview - alle am Betrieb.
 *  - Abo und Rechnungen: Subscription + BillingEvent am Nutzer.
 * Die zwei Einschränkungen (geteilter Betrieb, Zahlung beim Anbieter) stehen
 * unter der Liste - sie wegzulassen wäre bequemer und unehrlich.
 */
const VERLIERT = [
  "Dein Betriebsprofil samt Öffnungszeiten, Speisekarte und Fotos",
  "Alle Reservierungen und die gesamte Gästeliste",
  "Verbundene Kanäle, geplante Beiträge und Bewertungsantworten",
  "Dein Abo und die Rechnungshistorie",
];

/**
 * Konto endgültig löschen.
 *
 * Pflicht nach Apple App Store Review 5.1.1(v): Wer in der App ein Konto anlegen
 * kann, muss es dort auch löschen können - deaktivieren oder „schreib uns eine
 * Mail" reicht nicht.
 *
 * Bewusst zwei Schritte und kein Alert-Dialog: Ein Dialog mit „Löschen" rechts
 * ist mit einem Fehltipp weg. Hier braucht es erst ein Aufklappen, dann ein
 * getipptes Wort - und beides steht neben der Liste dessen, was verloren geht.
 */
export function DeleteAccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { user, deleteLocalData } = useStore();

  const [aufgeklappt, setAufgeklappt] = useState(false);
  const [wort, setWort] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const bestaetigt = BESTAETIGUNG.includes(wort.trim().toUpperCase());

  const loeschen = async () => {
    setLaeuft(true);
    setFehler(null);

    try {
      const token = await mobileAuthAdapter.getToken();

      if (token) {
        // Der Server löscht die hochgeladenen Bilder, den Datensatz des
        // angemeldeten Nutzers und das Clerk-Konto - in dieser Reihenfolge. Die
        // Nutzer-ID steht bewusst nirgends im Aufruf; sie kommt dort aus dem
        // verifizierten Token.
        //
        // Der Server antwortet mit 503 und einem Klartext, wenn er die Bilder
        // nicht wegbekommt und deshalb gar nichts gelöscht hat. `request()`
        // reicht das error-Feld als Fehlermeldung durch (packages/core/src/
        // http.ts), sie landet unten unverändert im Fehlerfeld - der Nutzer
        // erfährt also, dass sein Konto noch steht, statt ein stummes „ging
        // nicht" zu sehen.
        await request("/users/me", { method: "DELETE" });
      }
      // Ohne Token gibt es serverseitig (noch) kein Konto: Die Anmeldung ist
      // heute eine Demo, `persistSession()` wird nirgends aufgerufen (siehe
      // lib/auth.ts). Dann bleibt nur der lokale Teil - was hier NICHT passiert,
      // ist so zu tun, als sei serverseitig etwas gelöscht worden.

      await mobileAuthAdapter.signOut();
      await deleteLocalData();

      toast.show("Konto gelöscht");
      router.replace("/login");
    } catch (e) {
      // Nichts lokal löschen, solange der Server nicht bestätigt hat - sonst
      // stünde die App leer da, während das Konto weiterläuft.
      setFehler(
        e instanceof Error
          ? e.message
          : "Das Konto konnte nicht gelöscht werden. Bitte versuche es später noch einmal.",
      );
      setLaeuft(false);
    }
  };

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title="Konto löschen" fallback="/konto" />

      <Card
        padding={theme.spacing.lg}
        style={{
          gap: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.destructive,
        }}
      >
        <Eyebrow color={theme.colors.destructive}>Endgültig</Eyebrow>

        <Text variant="sectionTitle" style={{ fontSize: 21 }}>
          Das lässt sich nicht rückgängig machen.
        </Text>

        {/*
          Vorher stand hier „Es gibt danach keine Kopie, aus der wir sie
          zurückholen könnten." Das ist eine Aussage über den Betrieb der
          Datenbank, die niemand hier belegen kann - eine verwaltete Postgres
          hält üblicherweise Snapshots für eine Rückholung zu einem Zeitpunkt
          vor. Was sich belegen lässt, ist die Aussage über das Produkt: Es gibt
          keinen Weg zurück, den diese App oder ein Support anbieten könnte.
        */}
        <Text variant="body" tone="secondary">
          Mit dem Konto {user?.email ? `(${user.email}) ` : ""}werden die Daten deines
          Betriebs gelöscht. Es gibt danach keinen Weg, sie wiederherzustellen - auch
          nicht auf Nachfrage bei uns.
        </Text>

        <View style={{ gap: 8, marginTop: theme.spacing.xs }}>
          {VERLIERT.map((zeile) => (
            <View key={zeile} style={{ flexDirection: "row", gap: 10 }}>
              <Text variant="body" color={theme.colors.destructive}>
                ·
              </Text>
              <Text variant="body" tone="secondary" style={{ flex: 1 }}>
                {zeile}
              </Text>
            </View>
          ))}
        </View>

        {/*
          Zwei Einschränkungen, die der Server nachweislich NICHT auflöst.

          1. Geteilter Betrieb: DELETE /api/users/me löscht einen Betrieb nur,
             wenn danach niemand mehr daran hängt. Das ist richtig so - sonst
             risse die Löschung fremde Gästedaten mit. Erreichbar ist der Fall,
             weil BusinessService.ensureUserBusiness den Betrieb über den Slug
             per upsert anlegt: Wer denselben Betriebsnamen konfiguriert, landet
             auf demselben Datensatz und wird zweites Mitglied.
          2. Zahlung: Der Server löscht Subscription und BillingEvent, ruft aber
             keinen Zahlungsanbieter. In server/routes/subscriptions.ts steht
             die Stripe-Kündigung bis heute als TODO. „Ein laufendes Abo endet
             mit der Löschung" wäre also eine Zusage, die niemand einlöst.
        */}
        <Text variant="body" tone="muted" style={{ fontSize: 14 }}>
          Arbeitet noch jemand mit demselben Betrieb, bleibt dessen Zugang bestehen -
          mit den Reservierungen und der Gästeliste dieses Betriebs. Gelöscht wird dann
          alles, was allein an deinem Konto hängt.
        </Text>

        <Text variant="body" tone="muted" style={{ fontSize: 14 }}>
          Abo und Rechnungen verschwinden hier mit. Eine laufende Zahlung beim
          Zahlungsanbieter beendet die App nicht - die kündigst du dort selbst. Bereits
          bezahlte Zeiträume werden nicht erstattet.
        </Text>
      </Card>

      {!aufgeklappt ? (
        <View style={{ gap: theme.spacing.md }}>
          <PillButton
            label="Konto löschen"
            variant="outline"
            onPress={() => setAufgeklappt(true)}
            accessibilityHint="Öffnet die Bestätigung. Gelöscht wird erst danach."
          />
          <PillButton label="Zurück zum Konto" variant="ghost" onPress={() => router.back()} />
        </View>
      ) : (
        <Card padding={theme.spacing.lg} style={{ gap: theme.spacing.md }}>
          <Eyebrow>Bestätigen</Eyebrow>
          <Text variant="body" tone="secondary">
            Tippe <Text variant="body">LÖSCHEN</Text> ein, um die Löschung auszulösen.
          </Text>

          <TextInput
            value={wort}
            onChangeText={setWort}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!laeuft}
            placeholder="LÖSCHEN"
            placeholderTextColor={theme.colors.textFaint}
            accessibilityLabel="Bestätigungswort"
            style={[
              theme.text.body,
              {
                color: theme.colors.textPrimary,
                borderWidth: 1,
                borderColor: bestaetigt ? theme.colors.destructive : theme.colors.border,
                borderRadius: theme.radius.tile,
                paddingHorizontal: 14,
                paddingVertical: 12,
                letterSpacing: 1.5,
              },
            ]}
          />

          {fehler ? (
            <Text variant="body" color={theme.colors.destructive} style={{ fontSize: 14 }}>
              {fehler}
            </Text>
          ) : null}

          <PillButton
            label={laeuft ? "Wird gelöscht …" : "Konto endgültig löschen"}
            disabled={!bestaetigt || laeuft}
            onPress={loeschen}
            style={{ backgroundColor: theme.colors.destructive }}
            labelColor="#FFFFFF"
            accessibilityHint="Löscht dein Konto, deine Betriebsdaten und deine hochgeladenen Fotos unwiderruflich."
          />
          <PillButton
            label="Abbrechen"
            variant="ghost"
            disabled={laeuft}
            onPress={() => router.back()}
          />
        </Card>
      )}
    </Screen>
  );
}
