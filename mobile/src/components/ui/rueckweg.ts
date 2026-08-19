/**
 * Wohin führt der Zurück-Pfeil?
 *
 * ANLASS: `app/_layout.tsx` setzt `unstable_settings.initialRouteName: "(tabs)"`.
 * Das ist ein ANKER, keine bloße Startangabe: Öffnet die App direkt auf einem
 * gepushten Bildschirm - Deep-Link, Kaltstart, Benachrichtigung -, legt
 * expo-router `(tabs)` darunter in den Stack, und `(tabs)` ankert seinerseits
 * auf `start`.
 *
 * Die Folge war der gemeldete Fehler „manche Zurück-Buttons führen zur
 * Startseite, obwohl sie es nicht sollten": `canGoBack()` meldet in diesem Fall
 * `true` (der Anker liegt ja darunter), `router.back()` landet also auf `/start` -
 * und der an den Bildschirmen sorgfältig gepflegte Elternbildschirm wurde NIE
 * gefragt, weil er nur beim `false`-Fall herangezogen wurde. Aus der Detailkarte
 * eines Gastes ging es damit nicht zur Kartenliste zurück, sondern auf den
 * Startbildschirm.
 *
 * Die Entscheidung steht hier und nicht in `NavHeader`, weil dieses Repo für
 * React-Native-Bildschirme keinen Testaufbau hat - was in einer Komponente
 * steht, ist ungeprüft. Dieselbe Trennung wie bei `features/onboarding/ablauf.ts`
 * und `features/loyalty/aufbereitung.ts`.
 */

/** Was der Zurück-Pfeil tun soll. */
export type Rueckweg =
  /** `router.replace(fallback)` - zum fachlichen Elternbildschirm. */
  | "eltern"
  /** `router.back()` - ein echter Schritt im Verlauf des Nutzers. */
  | "zurueck"
  /** Nichts. Kein Verlauf, kein Elternbildschirm - dann darf auch kein Pfeil stehen. */
  | "nichts";

export interface RueckwegLage {
  /** Ist an diesem Bildschirm ein fachlicher Elternbildschirm hinterlegt? */
  hatEltern: boolean;
  /** Was `router.canGoBack()` sagt. */
  kannZurueck: boolean;
  /**
   * Zahl der Einträge im Stack, oder `null`, wenn der Navigator sie nicht
   * herausgibt (`getState()` ist optional und je nach Navigator nicht gesetzt).
   *
   * Ein einziger Eintrag UNTER dem aktuellen - also Tiefe 2 - ist genau der
   * Ankerfall: Der Nutzer ist nicht durch die App hierher gelaufen, er ist hier
   * eingestiegen. Ab Tiefe 3 liegt echter Verlauf darunter, und dorthin gehört
   * er auch zurück, selbst wenn ein Elternbildschirm hinterlegt ist - „zurück"
   * heißt für ihn, wo er herkam, nicht wo die Hierarchie ihn vermutet.
   */
  stapeltiefe: number | null;
}

/**
 * Bei unbekannter Stapeltiefe bleibt es beim bisherigen Verhalten (echter
 * Schritt zurück, sofern möglich). Lieber die alte, bekannte Antwort als eine
 * geratene: Ein fälschlich angenommener Ankerfall risse den Nutzer aus seinem
 * Verlauf und schickte ihn auf den Elternbildschirm, obwohl er zwei Ebenen tief
 * durch die App gelaufen ist.
 */
export function rueckweg(lage: RueckwegLage): Rueckweg {
  const nurAnkerDarunter = lage.stapeltiefe !== null && lage.stapeltiefe <= 2;

  if (lage.hatEltern && (!lage.kannZurueck || nurAnkerDarunter)) return "eltern";
  if (lage.kannZurueck) return "zurueck";
  return "nichts";
}
