import { View } from "react-native";
import { Redirect } from "expo-router";

import { einstiegsWeiche } from "../src/features/onboarding/ablauf";
import { hasRealAuth } from "../src/lib/auth";
import { useStore } from "../src/lib/store";
import { useTheme } from "../src/theme";

/**
 * Einstiegspunkt und einzige Weiche der App - jede weitere Navigation läuft über
 * den Router.
 *
 * ANLASS für den Umbau: Hier stand
 * `<Redirect href={signedIn ? "/start" : "/login"} />`. Das kannte nur zwei
 * Antworten und übersah die, auf die es ankommt. Ein Wirt, der sich zum ersten
 * Mal anmeldet, hat noch keinen Betrieb: `GET /venues` liefert ihm eine leere
 * Liste, jede betriebsgebundene Route antwortet 403 - und er landete trotzdem
 * auf `/start`, wo ihm die Beispieldaten des Demobetriebs entgegenkamen. Das
 * Onboarding existierte, war aber von keiner Stelle der Oberfläche aus
 * erreichbar. Es war der erste Eindruck jedes neuen Wirts, und er war falsch.
 *
 * Die Entscheidung selbst liegt in `einstiegsWeiche` (features/onboarding/ablauf.ts)
 * und ist dort geprüft; hier steht nur ihre Umsetzung. Der Grund für die
 * Trennung: Ein `<Redirect>` in einer Komponente sieht kein Test dieses Repos.
 *
 * Der vierte Fall - „warten" - ist der wichtigste am Umbau. `GET /venues` läuft
 * asynchron, und `<Redirect>` entscheidet nur EINMAL, beim Mounten. Wer in
 * diesem Moment rät, schickt jeden Wirt mit bestehendem Betrieb einmal falsch:
 * ins Onboarding, wo er einen zweiten anlegen will und 409 bekommt. Solange die
 * Antwort aussteht, wird deshalb nichts geroutet, sondern eine ruhige Fläche in
 * der Hintergrundfarbe gezeigt - dieselbe Lösung, die `_layout.tsx` schon für
 * die Hydration aus dem lokalen Speicher benutzt, damit kein Login aufblitzt.
 */
export default function Index() {
  const theme = useTheme();
  const { signedIn, venueKnown } = useStore();

  const ziel = einstiegsWeiche({
    angemeldet: signedIn,
    // Ohne Clerk-Schlüssel gibt es kein Konto, an dem ein Betrieb hängen könnte.
    // Der Demobetrieb ist dort die Wahrheit und darf nicht ins Onboarding laufen -
    // die App muss ohne jede Konfiguration bedienbar bleiben.
    echterAnmeldebetrieb: hasRealAuth(),
    betrieb: venueKnown,
  });

  if (ziel === "warten") {
    return <View style={{ flex: 1, backgroundColor: theme.colors.canvas }} />;
  }

  return (
    <Redirect
      href={
        ziel === "login" ? "/login" : ziel === "onboarding" ? "/onboarding/willkommen" : "/start"
      }
    />
  );
}
