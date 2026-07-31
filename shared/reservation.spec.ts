import { describe, it, expect } from "vitest";
import {
  detectReservation,
  describeReservation,
  collectUrls,
} from "./reservation";

/**
 * Der Anlass ist ein echter Betrieb: Der Kleine Kiepenkerl bucht über
 * OpenTable, unser Scrape hat das übersehen, und unsere App kannte nur ihr
 * eigenes Formular. Beides einzuschalten hätte denselben Tisch zweimal
 * vergeben – für einen Gastronomen schlimmer als gar keine Reservierung.
 */

const BASE = "https://kleiner-kiepenkerl.de/";

/** Wörtlich aus der Seite des Kleinen Kiepenkerl. */
const OPENTABLE_WIDGET = `<script type='text/javascript' src='//www.opentable.de/widget/reservation/loader?rid=169746&type=standard&theme=tall&color=1&dark=false&iframe=true&domain=de&lang=de-DE&newtab=false&ot_source=Restaurant%20website&cfe=true'></script>`;

describe("collectUrls", () => {
  it("liest protokollrelative Einbindungen mit", () => {
    // "//www.opentable.de/…" ist der Regelfall bei Widgets – wer nur auf
    // "https://" prüft, übersieht genau den Kiepenkerl-Fall.
    const { embeds } = collectUrls(OPENTABLE_WIDGET);
    expect(embeds[0]).toContain("//www.opentable.de/widget");
  });

  it("trennt Links von Einbindungen", () => {
    const { links, embeds } = collectUrls(
      `<a href="https://x.test/a">A</a><iframe src="https://y.test/b"></iframe>`,
    );
    expect(links).toEqual(["https://x.test/a"]);
    expect(embeds).toEqual(["https://y.test/b"]);
  });
});

describe("detectReservation", () => {
  it("erkennt OpenTable am Widget und leitet die Buchungsadresse ab", () => {
    const d = detectReservation(OPENTABLE_WIDGET, BASE);
    expect(d?.provider).toBe("OpenTable");
    expect(d?.restaurantId).toBe("169746");
    expect(d?.source).toBe("template");
    expect(d?.url).toContain("opentable.de");
    expect(d?.url).toContain("169746");
  });

  it("übernimmt die Länderdomain aus der Einbindung", () => {
    // Ein deutscher Betrieb auf .com landete sonst in der falschen Sprachfassung.
    const d = detectReservation(OPENTABLE_WIDGET, BASE);
    expect(d?.url).toContain("opentable.de");
    expect(d?.url).not.toContain("opentable.com");
  });

  it("bevorzugt innerhalb DESSELBEN Anbieters den echten Link", () => {
    // Ein Link von der Seite funktioniert nachweislich; eine geratene Vorlage
    // kann ins Leere führen, und ein toter Knopf ist schlimmer als keiner.
    const html = `
      ${OPENTABLE_WIDGET}
      <a href="https://www.opentable.de/r/kleiner-kiepenkerl-muenster">Tisch reservieren</a>`;
    const d = detectReservation(html, BASE);
    expect(d?.source).toBe("link");
    expect(d?.url).toBe("https://www.opentable.de/r/kleiner-kiepenkerl-muenster");
    // Die Kennung wird trotzdem mitgenommen.
    expect(d?.restaurantId).toBe("169746");
  });

  it("nimmt das eingebettete Widget, nicht einen Link auf einen ANDEREN Anbieter", () => {
    // Genau dieser Fall steht auf kleiner-kiepenkerl.de: Das sichtbare
    // Buchungsfeld ist OpenTable, nebenbei verlinkt die Seite auf Tischwunsch.
    // Nach Links zuerst zu suchen lieferte Tischwunsch – nicht das System, das
    // der Gast vor sich hat.
    const html = `
      ${OPENTABLE_WIDGET}
      <a href="http://www.tischwunsch.de/muenster-westfalen/restaurant/kleiner-kiepenkerl">Tischwunsch</a>`;
    const d = detectReservation(html, BASE);
    expect(d?.provider).toBe("OpenTable");
    expect(d?.restaurantId).toBe("169746");
  });

  it("erkennt weitere im deutschsprachigen Raum verbreitete Anbieter", () => {
    const faelle: Array<[string, string]> = [
      ['<a href="https://www.quandoo.de/place/12345">Reservieren</a>', "Quandoo"],
      ['<a href="https://resmio.com/de/mein-restaurant/">Tisch</a>', "resmio"],
      ['<a href="https://www.thefork.de/restaurant/x">Buchen</a>', "TheFork"],
      ['<a href="https://reservation.dish.co/x">Reservieren</a>', "DISH Reservation"],
      ['<a href="http://www.tischwunsch.de/muenster-westfalen/restaurant/kleiner-kiepenkerl">Tisch</a>', "Tischwunsch"],
      ['<a href="https://sevenrooms.com/reservations/x">Book</a>', "SevenRooms"],
    ];
    for (const [html, erwartet] of faelle) {
      expect(detectReservation(html, BASE)?.provider, html).toBe(erwartet);
    }
  });

  it("macht relative Links absolut", () => {
    const d = detectReservation(
      `<a href="//www.quandoo.de/place/999">Reservieren</a>`,
      BASE,
    );
    expect(d?.url).toBe("https://www.quandoo.de/place/999");
  });

  it("meldet nichts, wenn die Seite kein System hat", () => {
    const html = `<a href="/kontakt">Kontakt</a><p>Reservierungen unter 0251 43416</p>`;
    expect(detectReservation(html, BASE)).toBeNull();
  });

  it("verwechselt das Wort Reservierung nicht mit einem System", () => {
    // Ein telefonischer Hinweis ist kein Buchungssystem. Ein Knopf, der auf
    // die eigene Seite zurückführt, wäre schlimmer als keiner.
    const html = `
      <h2>Reservierungen</h2>
      <p>Bitte reservieren Sie telefonisch.</p>
      <a href="https://kleiner-kiepenkerl.de/#reservierungen">Zu den Reservierungen</a>`;
    expect(detectReservation(html, BASE)).toBeNull();
  });

  it("meldet lieber nichts als einen Knopf ohne Ziel", () => {
    // Einbindung eines Anbieters ohne erkennbare Kennung: Wir wissen, DASS es
    // ein System gibt, aber nicht, wohin.
    const html = `<iframe src="https://sevenrooms.com/widget/embed"></iframe>`;
    expect(detectReservation(html, BASE)).toBeNull();
  });
});

describe("describeReservation", () => {
  it("benennt den Anbieter", () => {
    const d = detectReservation(
      '<a href="https://www.quandoo.de/place/1">x</a>',
      BASE,
    );
    expect(describeReservation(d)).toBe("Reservierung über Quandoo");
  });

  it("kennzeichnet eine abgeleitete Adresse als prüfenswert", () => {
    const d = detectReservation(OPENTABLE_WIDGET, BASE);
    expect(describeReservation(d)).toMatch(/abgeleitet/);
  });

  it("liefert nichts, wenn nichts erkannt wurde", () => {
    expect(describeReservation(null)).toBeNull();
  });
});
