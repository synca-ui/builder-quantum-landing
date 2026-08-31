/**
 * Erkennt das Reservierungssystem, das ein Restaurant BEREITS benutzt.
 *
 * Anlass, an einem echten Betrieb gemessen: Der Kleine Kiepenkerl bucht über
 * OpenTable – das Widget steckt als Skript in der Seite:
 *
 *   //www.opentable.de/widget/reservation/loader?rid=169746&…
 *
 * Unser Scrape hat das übersehen (hasReservation kam leer zurück), und unsere
 * App kannte überhaupt nur ihr EIGENES Buchungsformular.
 *
 * Beides einzuschalten wäre der schlimmste Ausgang: Buchungen liefen per
 * E-Mail bei uns ein, während OpenTable nichts davon weiß – derselbe Tisch
 * wird zweimal vergeben. Für einen Gastronomen ist das schlimmer als gar keine
 * Reservierung auf der neuen Seite.
 *
 * Deshalb die Regel: Hat der Betrieb ein System, verlinken wir DORTHIN. Das
 * eigene Formular ist nur für Betriebe ohne bestehendes System.
 *
 * Und deshalb die Reihenfolge unten: Ein Link, der WÖRTLICH auf der Seite
 * steht, wird bevorzugt vor einer aus der Kennung zusammengebauten Adresse.
 * Ein Link von der Seite funktioniert nachweislich; eine geratene Vorlage kann
 * ins Leere führen, und ein toter „Tisch reservieren"-Knopf ist schlimmer als
 * gar keiner.
 */

export interface ReservationDetection {
  /** Anzeigename, z.B. "OpenTable". */
  provider: string;
  /** Adresse, die ein Gast öffnen kann, um zu buchen. */
  url: string;
  /**
   * Woher die Adresse stammt:
   *   "link"     – stand wörtlich auf der Seite (nachweislich gültig)
   *   "template" – aus der Kennung zusammengebaut (plausibel, ungeprüft)
   */
  source: "link" | "template";
  /** Die Kennung des Betriebs beim Anbieter, falls gefunden. */
  restaurantId?: string;
}

interface ProviderSpec {
  name: string;
  /** Hosts, an denen ein Link zu diesem Anbieter erkennbar ist. */
  hosts: RegExp;
  /**
   * Findet die Kennung des Betriebs in Skript- oder Iframe-Einbindungen.
   * Die erste Gruppe muss die Kennung sein.
   */
  idPattern?: RegExp;
  /** Baut aus der Kennung eine Buchungsadresse. Nur als Rückfall. */
  template?: (id: string, html: string) => string | undefined;
}

/**
 * Nach Verbreitung im deutschsprachigen Raum geordnet – die erste
 * Übereinstimmung gewinnt.
 */
const PROVIDERS: ProviderSpec[] = [
  {
    name: "OpenTable",
    hosts: /opentable\.(?:de|com|co\.uk|at|ch)/i,
    // Verifiziert an kleiner-kiepenkerl.de: widget/reservation/loader?rid=169746
    idPattern: /opentable\.(?:de|com|co\.uk|at|ch)\/widget\/reservation\/loader\?[^"'\s]*\brid=(\d+)/i,
    template: (id, html) => {
      // Die Länderdomain aus der Einbindung übernehmen: Ein deutscher Betrieb
      // auf .com landet in der falschen Sprachfassung.
      const domain =
        html.match(/opentable\.(de|com|co\.uk|at|ch)\/widget/i)?.[1] ?? "de";
      return `https://www.opentable.${domain}/restref/client/?rid=${id}&restref=${id}&lang=de-DE`;
    },
  },
  {
    name: "Quandoo",
    hosts: /quandoo\.(?:de|com|at|ch)/i,
    idPattern: /quandoo\.(?:de|com|at|ch)\/[^"'\s]*?merchant[_-]?id[=/](\d+)/i,
    template: (id) => `https://www.quandoo.de/place/${id}`,
  },
  {
    name: "resmio",
    hosts: /resmio\.com/i,
    idPattern: /resmio\.com\/(?:widget|de)\/([a-z0-9_-]+)/i,
    template: (id) => `https://resmio.com/de/${id}/`,
  },
  {
    name: "TheFork",
    hosts: /thefork\.(?:de|com)|lafourchette\.com|bookatable\./i,
  },
  {
    name: "DISH Reservation",
    hosts: /reservation\.dish\.co|dish\.co\/[^"'\s]*reserv/i,
  },
  {
    name: "SevenRooms",
    hosts: /sevenrooms\.com/i,
  },
  {
    name: "formitable",
    hosts: /formitable\.com/i,
  },
  {
    name: "Tischwunsch",
    hosts: /tischwunsch\.de/i,
  },
  {
    name: "aleno",
    hosts: /aleno\.me|aleno\.com/i,
  },
  {
    name: "Zenchef",
    hosts: /zenchef\.com|iframe\.zenchef/i,
  },
  {
    name: "resengo",
    hosts: /resengo\.com/i,
  },
  {
    // Bewusst NUR Link-Erkennung, kein idPattern: Am echten Fall krawummel.de
    // stand die gastronovi-Kennung ausschließlich in einem GUTSCHEIN-Link
    // (…/restaurants/18919/reservation/widget/entry/voucher). Daraus eine
    // Reservierungsadresse zu bauen wäre geraten — der Betrieb reserviert
    // dort über das Wix-Modul (siehe Weg 3 unten), gastronovi nur für
    // Gutscheine.
    name: "gastronovi",
    hosts: /gastronovi\.(?:com|de)/i,
  },
];

/**
 * Sammelt alle Adressen der Seite: aus Links, Skripten und Iframes.
 * Protokollrelative Adressen ("//www.opentable.de/…") kommen häufig vor und
 * müssen mitgelesen werden – sonst entgeht genau der Kiepenkerl-Fall.
 */
export function collectUrls(html: string): { links: string[]; embeds: string[] } {
  const links: string[] = [];
  const embeds: string[] = [];

  for (const m of html.matchAll(/<a[^>]+href\s*=\s*["']([^"']+)["']/gi)) {
    links.push(m[1]);
  }
  for (const m of html.matchAll(
    /<(?:script|iframe)[^>]+(?:src|data-src)\s*=\s*["']([^"']+)["']/gi,
  )) {
    embeds.push(m[1]);
  }
  return { links, embeds };
}

/** Macht "//host/pfad" und relative Adressen absolut. */
function toAbsolute(url: string, baseUrl: string): string | undefined {
  const raw = url.trim();
  if (!raw) return undefined;
  try {
    // Protokollrelativ: das Schema der Basis übernehmen.
    if (raw.startsWith("//")) {
      const scheme = new URL(baseUrl).protocol;
      return new URL(`${scheme}${raw}`).toString();
    }
    return new URL(raw, baseUrl).toString();
  } catch {
    return undefined;
  }
}

/**
 * Sucht das Reservierungssystem des Betriebs.
 *
 * Zwei Wege, in dieser Reihenfolge:
 *   1. Ein Link auf der Seite, der zu einem bekannten Anbieter führt – wörtlich
 *      übernommen. Der funktioniert nachweislich.
 *   2. Eine Widget-Einbindung mit Kennung – daraus wird eine Adresse gebaut.
 *      Nur, wenn kein Link vorliegt, und als "template" gekennzeichnet.
 */
export function detectReservation(
  html: string,
  baseUrl: string,
): ReservationDetection | null {
  const { links, embeds } = collectUrls(html);

  const linkTo = (spec: ProviderSpec): string | undefined => {
    // Gutschein-Einstiege sind NIE der Reservierungsweg — ein „Tisch
    // reservieren“-Knopf, der den Gutschein-Shop öffnet, ist schlimmer als
    // gar keiner (echter Fall: gastronovi-Voucher-Link auf krawummel.de).
    const href = links.find(
      (h) => spec.hosts.test(h) && !/voucher|gutschein/i.test(h),
    );
    return href ? toAbsolute(href, baseUrl) : undefined;
  };

  // ── Weg 1: das EINGEBETTETE Widget ──────────────────────────────────────
  //
  // Eine Einbindung belegt das tatsächlich benutzte System stärker als ein
  // Link. An kleiner-kiepenkerl.de gemessen: Die Seite bindet OpenTable ein
  // (das sichtbare Buchungsfeld) UND verlinkt nebenbei auf Tischwunsch.
  // Nach Links zuerst zu suchen lieferte Tischwunsch – nicht das System, das
  // der Gast auf der Seite vor sich hat.
  //
  // Innerhalb des erkannten Anbieters gilt weiterhin: ein Link auf der Seite
  // schlägt eine zusammengebaute Adresse, weil er nachweislich funktioniert.
  for (const spec of PROVIDERS) {
    const embedded =
      spec.idPattern?.exec(html) ??
      (embeds.some((src) => spec.hosts.test(src)) ? null : undefined);
    // undefined = dieser Anbieter kommt gar nicht vor -> weiter
    if (embedded === undefined) continue;

    const own = linkTo(spec);
    if (own) {
      return {
        provider: spec.name,
        url: own,
        source: "link",
        ...(embedded ? { restaurantId: embedded[1] } : {}),
      };
    }

    if (embedded && spec.template) {
      const url = spec.template(embedded[1], html);
      if (url) {
        return {
          provider: spec.name,
          url,
          source: "template",
          restaurantId: embedded[1],
        };
      }
    }

    // Eingebunden, aber ohne erkennbare Kennung und ohne Link: Wir wissen,
    // DASS es ein System gibt, aber nicht, wohin. Lieber nichts melden als
    // ein Knopf, der ins Leere führt.
    return null;
  }

  // ── Weg 2: nur ein Link, keine Einbindung ───────────────────────────────
  for (const spec of PROVIDERS) {
    const url = linkTo(spec);
    if (url) return { provider: spec.name, url, source: "link" };
  }

  // ── Weg 3: das Baukasten-eigene Buchungsmodul ───────────────────────────
  //
  // Wix-Seiten mit installiertem Reservierungsmodul laden dessen
  // Viewer-Assets („table-reservations-ooi“, ReservationAddOnViewerWidget).
  // Der Gast bucht dann direkt AUF der alten Seite — unser „Tisch
  // reservieren“ verlinkt dorthin, statt ein zweites System danebenzustellen
  // (dieselbe Doppelbuchungs-Logik wie bei OpenTable & Co.).
  //
  // Bewusst NICHT an den „specs.tableReservations.…“-Flags festgemacht: Das
  // sind Wix-Plattform-Experimente, die auch ohne installiertes Modul im
  // HTML stehen können. Die Viewer-Assets laden nur, wenn das Modul wirklich
  // auf der Seite sitzt (echter Fall krawummel.de, „Reserviere hier online“).
  if (/table-reservations-ooi|ReservationAddOnViewerWidget/i.test(html)) {
    return {
      provider: "Wix Reservierungen",
      url: baseUrl,
      source: "template",
    };
  }

  return null;
}

/** Kurzfassung für die Oberfläche. */
export function describeReservation(
  detection: ReservationDetection | null,
): string | null {
  if (!detection) return null;
  const hint =
    detection.source === "template"
      ? " (Adresse aus der Einbindung abgeleitet – bitte einmal prüfen)"
      : "";
  return `Reservierung über ${detection.provider}${hint}`;
}
