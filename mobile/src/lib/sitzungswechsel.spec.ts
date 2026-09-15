/**
 * Sitzungswechsel im Store (mobile/src/lib/sitzungswechsel.ts) -
 * Prüfer-Befunde 15.09., Nr. 22, 23, 24, 28.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  kaltstartOhneSitzung,
  type Kaltstartlage,
  type Kaltstartschritt,
  wendeZustandAn,
  zustandNachWechsel,
  type Gesamtzustand,
  type Setzer,
  type Startwerte,
} from "./sitzungswechsel";

const SEED_KANAELE = { google: true, instagram: true, yelp: false, thefork: false, facebook: false };
const KEINE = { google: false, instagram: false, yelp: false, thefork: false, facebook: false };
const SEED_KONTEN = { google: { account: "Sofia Brandt · Inhaberin", since: "verbunden vor 4 Min" } };

function start(teil: Partial<Startwerte> = {}): Startwerte {
  return {
    venueId: "venue_goldstueck",
    venueKnown: "unbekannt",
    praesenzEintrag: null,
    praesenzLaedt: false,
    kanaeleGeprueftFuer: null,
    lastBooking: null,
    channels: SEED_KANAELE,
    channelMeta: SEED_KONTEN,
    menu: [],
    venueProfile: {
      name: "Café Goldstück",
      tagline: "",
      bio: "",
      instagramBio: "",
      street: "",
      city: "",
      tags: [],
      hours: [],
    },
    taskDone: {},
    profileDone: { photos: true },
    posts: [{ id: "p_live", state: "live", title: "Seed", channels: [], when: "Mo 9:00", tone: "warm" }],
    inboxRead: {},
    reviewAnswered: { rev_tobias: true },
    days: [],
    guests: [],
    activityLog: [],
    autopilot: { reviews: false, winback: false, posts: false },
    currentPlan: "pro",
    keineKanaele: KEINE,
    ...teil,
  };
}

const ECHT = { echterAnmeldebetrieb: true, showcase: false };
const ECHT_SHOWCASE = { echterAnmeldebetrieb: true, showcase: true };
const DEMO = { echterAnmeldebetrieb: false, showcase: false };

describe("zustandNachWechsel", () => {
  it("echte Sitzung endet: Betrieb, Präsenz, Kanalprüfung und Betriebswissen weg, Kanäle „nicht geprüft“ statt Seed", () => {
    const z = zustandNachWechsel("abmelden", ECHT, start());
    expect(z).toMatchObject({
      venueId: "venue_goldstueck",
      venueKnown: "unbekannt",
      praesenzEintrag: null,
      praesenzLaedt: false,
      kanaeleGeprueftFuer: null,
      lastBooking: null,
      channels: KEINE,
      channelMeta: {},
      menu: [],
      taskDone: {},
      inboxRead: {},
      profileDone: { photos: true },
    });
    // Befund 24: nie der Seed „Google verbunden · Sofia Brandt“ für ein echtes Konto.
    expect(z?.channels).not.toEqual(SEED_KANAELE);
    expect(z?.channelMeta).toEqual({});
    // Die Vorführdaten bleiben unberührt.
    expect(z).not.toHaveProperty("days");
    expect(z).not.toHaveProperty("activityLog");
  });

  it("Abmelden AUS DEM SHOWCASE räumt genauso - kein Vorführgericht blockiert die Server-Karte (Befund 22)", () => {
    const ausShowcase = zustandNachWechsel("abmelden", ECHT_SHOWCASE, start());
    expect(ausShowcase).toEqual(zustandNachWechsel("abmelden", ECHT, start()));
    expect(ausShowcase).toMatchObject({ menu: [], taskDone: {}, inboxRead: {} });
    expect(ausShowcase?.posts?.map((p) => p.id)).toEqual(["p_live"]);
  });

  it("Clerk beendet die Sitzung ohne Abmelden-Knopf: dasselbe Räumen (Befund 23)", () => {
    expect(zustandNachWechsel("sitzung_beendet", ECHT, start())).toEqual(
      zustandNachWechsel("abmelden", ECHT, start()),
    );
  });

  it("Clerks „keine Sitzung“ lässt den Showcase in Ruhe", () => {
    expect(zustandNachWechsel("sitzung_beendet", ECHT_SHOWCASE, start())).toBeNull();
  });

  it("Showcase betreten: kuratierter Startzustand samt Vorführkanälen, egal was vorher auf dem Gerät lag (Befund 28)", () => {
    const z = zustandNachWechsel("showcase_betreten", ECHT, start());
    expect(z?.channels).toEqual(SEED_KANAELE);
    expect(z?.channelMeta).toEqual(SEED_KONTEN);
    expect(z?.venueId).toBe("venue_goldstueck");
    expect(z?.venueProfile?.name).toBe("Café Goldstück");
    expect(z?.menu).toEqual([]);
    expect(z?.profileDone).toEqual({ photos: true });
    expect(z?.reviewAnswered).toEqual({ rev_tobias: true });
    expect(z?.currentPlan).toBe("pro");
    expect(z).not.toHaveProperty("keineKanaele");
  });

  it("Demomodus bleibt wie vorher: Abmelden setzt nur die Betriebsbindung, sonst nichts", () => {
    const demoStart = start({ venueKnown: "bekannt" });
    expect(zustandNachWechsel("abmelden", DEMO, demoStart)).toEqual({
      venueId: "venue_goldstueck",
      venueKnown: "bekannt",
      praesenzEintrag: null,
      lastBooking: null,
    });
    expect(zustandNachWechsel("sitzung_beendet", DEMO, demoStart)).toBeNull();
    expect(zustandNachWechsel("showcase_betreten", DEMO, demoStart)).toBeNull();
  });
});

describe("wendeZustandAn", () => {
  function setzerMitSpionen(): Setzer & Record<string, ReturnType<typeof vi.fn>> {
    const schluessel = Object.keys(start()).filter((k) => k !== "keineKanaele") as (keyof Gesamtzustand)[];
    return Object.fromEntries(schluessel.map((k) => [k, vi.fn()])) as unknown as Setzer &
      Record<string, ReturnType<typeof vi.fn>>;
  }

  it("setzt auch null-Werte und lässt fehlende Schlüssel unberührt", () => {
    const setzer = setzerMitSpionen();
    wendeZustandAn({ praesenzEintrag: null, channels: KEINE }, setzer);
    expect(setzer.praesenzEintrag).toHaveBeenCalledWith(null);
    expect(setzer.channels).toHaveBeenCalledWith(KEINE);
    expect(setzer.menu).not.toHaveBeenCalled();
  });

  it("jeder Teil des Räumens erreicht seinen Setter", () => {
    const setzer = setzerMitSpionen();
    const z = zustandNachWechsel("showcase_betreten", ECHT, start())!;
    wendeZustandAn(z, setzer);
    for (const k of Object.keys(z)) expect(setzer[k]).toHaveBeenCalledTimes(1);
  });

  it("null heißt: nichts anfassen", () => {
    const setzer = setzerMitSpionen();
    wendeZustandAn(null, setzer);
    for (const spion of Object.values(setzer)) expect(spion).not.toHaveBeenCalled();
  });
});

/*
 * Nachprüfung zu Befund 23 (15.09.): Endete die Sitzung, während die App beendet
 * war, räumte beim Kaltstart niemand - das Abo räumt nur beim Wechsel angemeldet →
 * abgemeldet, und `signedIn` beginnt im echten Anmeldebetrieb auf false.
 */
describe("kaltstartOhneSitzung", () => {
  const lage = (teil: Partial<Kaltstartlage>): Kaltstartlage => ({
    echterAnmeldebetrieb: true,
    ersteClerkMeldung: false,
    schnappschussEingelesen: true,
    showcase: false,
    ...teil,
  });

  /**
   * Spielt eine Ereignisfolge so durch, wie der Store-Effekt sie sieht: nach jedem
   * Ereignis einmal prüfen, beim ersten Ergebnis außer „warten" ist Schluss.
   * Liefert, ob geräumt wurde und ob die Hydrierung danach noch lief (dann wäre
   * das Räumen überschrieben).
   */
  function spiele(
    ereignisse: ("clerk_nein" | "clerk_ja" | "eingelesen" | "eingelesen_showcase" | "notbremse")[],
  ): { geraeumt: boolean; danachEingelesen: boolean } {
    let l: Kaltstartlage = { echterAnmeldebetrieb: true, ersteClerkMeldung: null, schnappschussEingelesen: false, showcase: false };
    let ergebnis: Kaltstartschritt = "warten";
    let danachEingelesen = false;
    for (const e of ereignisse) {
      if (e === "clerk_nein" && l.ersteClerkMeldung === null) l = { ...l, ersteClerkMeldung: false };
      if (e === "clerk_ja" && l.ersteClerkMeldung === null) l = { ...l, ersteClerkMeldung: true };
      if (e === "eingelesen" || e === "eingelesen_showcase") {
        if (ergebnis === "raeumen") danachEingelesen = true;
        l = { ...l, schnappschussEingelesen: true, showcase: e === "eingelesen_showcase" };
      }
      // „notbremse" setzt im Store nur `sessionKnown` - an der Lage ändert sich nichts.
      if (ergebnis === "warten") ergebnis = kaltstartOhneSitzung(l);
    }
    return { geraeumt: ergebnis === "raeumen", danachEingelesen };
  }

  it("Sitzung während der App-Pause widerrufen: räumt, egal ob Clerk oder AsyncStorage zuerst antwortet", () => {
    expect(spiele(["eingelesen", "clerk_nein"])).toEqual({ geraeumt: true, danachEingelesen: false });
    // Clerk schneller als AsyncStorage: erst nach dem Einlesen, sonst überschriebe
    // die Hydrierung das Räumen gleich wieder.
    expect(spiele(["clerk_nein", "eingelesen"])).toEqual({ geraeumt: true, danachEingelesen: false });
    expect(kaltstartOhneSitzung(lage({ schnappschussEingelesen: false }))).toBe("warten");
  });

  it("gültige Sitzung beim Kaltstart: nichts räumen - ein späteres Ende ist Sache des Abos", () => {
    expect(spiele(["clerk_ja", "eingelesen", "clerk_nein"]).geraeumt).toBe(false);
    expect(spiele(["eingelesen", "clerk_ja", "clerk_nein"]).geraeumt).toBe(false);
  });

  it("Notbremse ohne Netz ist keine Clerk-Meldung: der Stand einer womöglich gültigen Sitzung bleibt", () => {
    expect(spiele(["eingelesen", "notbremse"]).geraeumt).toBe(false);
    expect(kaltstartOhneSitzung(lage({ ersteClerkMeldung: null }))).toBe("warten");
    // Kommt Clerk später doch und sagt „keine Sitzung", wird nachgeholt.
    expect(spiele(["eingelesen", "notbremse", "clerk_nein"]).geraeumt).toBe(true);
  });

  it("Showcase aus dem Schnappschuss: Clerks „keine Sitzung“ lässt die Vorführung stehen", () => {
    expect(spiele(["clerk_nein", "eingelesen_showcase"]).geraeumt).toBe(false);
    expect(spiele(["eingelesen_showcase", "clerk_nein"]).geraeumt).toBe(false);
  });

  it("Demomodus bleibt wie vorher: nie räumen", () => {
    expect(kaltstartOhneSitzung(lage({ echterAnmeldebetrieb: false }))).toBe("nichts");
    expect(kaltstartOhneSitzung(lage({ echterAnmeldebetrieb: false, ersteClerkMeldung: null }))).toBe("nichts");
  });

  it("geräumt wird mit demselben Wechsel wie beim laufenden Sitzungsende", () => {
    // Das Räumen selbst ist oben geprüft (Befund 23); hier nur: Kaltstart ohne
    // Showcase trifft den Zweig, der Karte, Profil, Beiträge und Merker zurücksetzt.
    const z = zustandNachWechsel("sitzung_beendet", ECHT, start());
    expect(z).toMatchObject({ venueId: "venue_goldstueck", menu: [], taskDone: {}, inboxRead: {} });
  });

  /*
   * Ohne React-Native-Testaufbau lässt sich die Verdrahtung nur am Quelltext prüfen
   * (dasselbe Vorgehen wie in features/growth/kanaele.spec.ts).
   */
  it("store.tsx verdrahtet die Prüfung: erste Clerk-Meldung merken, nach dem Einlesen räumen", () => {
    const store = readFileSync(resolve(__dirname, "store.tsx"), "utf8");
    expect(store).toContain("setErsteClerkMeldung((vorher) => (vorher === null ? signedInAtClerk : vorher))");
    expect(store).toMatch(/kaltstartOhneSitzung\(\{[\s\S]*?ersteClerkMeldung,[\s\S]*?schnappschussEingelesen: storageHydrated,[\s\S]*?showcase,[\s\S]*?\}\)/);
    expect(store).toContain('if (schritt === "raeumen") wechsleSitzung("sitzung_beendet", showcase);');
    // Die Notbremse darf die erste Meldung nicht vortäuschen.
    const notbremse = store.match(/const notbremse = setTimeout\(([^;]*)\);/)?.[1] ?? "";
    expect(notbremse).toContain("setSessionKnown(true)");
    expect(notbremse).not.toContain("ErsteClerkMeldung");
  });
});
