// @vitest-environment node
/**
 * Der Zurück-Pfeil, als Entscheidung geprüft.
 *
 * Der Fehler, um den es geht, lässt sich in einem Satz sagen: Weil unter jedem
 * per Deep-Link geöffneten Bildschirm ein Anker liegt, meldete `canGoBack()`
 * `true`, und der Pfeil führte auf die Startseite statt zum Elternbildschirm.
 * Die Fälle unten halten fest, dass genau das nicht mehr passiert - und ebenso,
 * dass echter Verlauf weiterhin Vorrang hat.
 */
import { describe, expect, it } from "vitest";
import { rueckweg } from "./rueckweg";

describe("rueckweg: wohin der Zurück-Pfeil führt", () => {
  it("DER BEFUND: nur der Anker darunter - dann zum Elternbildschirm, nicht auf die Startseite", () => {
    // Deep-Link auf die Detailkarte eines Gastes: Stack ist [(tabs), karte].
    // `canGoBack()` sagt true, `back()` landete auf `/start`.
    expect(rueckweg({ hatEltern: true, kannZurueck: true, stapeltiefe: 2 })).toBe("eltern");
  });

  it("echter Verlauf hat Vorrang vor dem Elternbildschirm", () => {
    // start → stempelkarte → karte. Hier IST die Kartenliste der vorige Schritt;
    // ein `replace` auf den Elternbildschirm wäre dasselbe Ziel, würfe aber den
    // Verlauf weg. Wer drei Ebenen tief gelaufen ist, will zurück, nicht hinauf.
    expect(rueckweg({ hatEltern: true, kannZurueck: true, stapeltiefe: 3 })).toBe("zurueck");
    expect(rueckweg({ hatEltern: true, kannZurueck: true, stapeltiefe: 7 })).toBe("zurueck");
  });

  it("gar kein Verlauf, aber ein Elternbildschirm: dorthin (der ursprüngliche Zweck)", () => {
    expect(rueckweg({ hatEltern: true, kannZurueck: false, stapeltiefe: 1 })).toBe("eltern");
  });

  it("ohne Elternbildschirm bleibt es beim echten Schritt zurück", () => {
    // Bildschirme ohne hinterlegten Elternbildschirm (Modals etwa) sollen sich
    // NICHT anders verhalten als bisher - der Anker ist dort kein Problem, weil
    // „zurück" das Schließen des Modals ist.
    expect(rueckweg({ hatEltern: false, kannZurueck: true, stapeltiefe: 2 })).toBe("zurueck");
  });

  it("weder Verlauf noch Elternbildschirm: nichts - dann gehört auch kein Pfeil hin", () => {
    expect(rueckweg({ hatEltern: false, kannZurueck: false, stapeltiefe: 1 })).toBe("nichts");
  });

  it("unbekannte Stapeltiefe: bisheriges Verhalten, nicht geraten", () => {
    // `getState()` ist optional und je nach Navigator nicht gesetzt. Würde bei
    // `null` der Ankerfall angenommen, risse der Pfeil jeden Nutzer aus seinem
    // Verlauf - der Fehler wäre schlimmer als der behobene, weil er JEDEN
    // Bildschirm mit Elternangabe beträfe statt nur die per Deep-Link geöffneten.
    expect(rueckweg({ hatEltern: true, kannZurueck: true, stapeltiefe: null })).toBe("zurueck");
    expect(rueckweg({ hatEltern: true, kannZurueck: false, stapeltiefe: null })).toBe("eltern");
  });
});
