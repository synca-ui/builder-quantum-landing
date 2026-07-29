import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isOwnImage,
  galleryObjectPath,
  ingestGallery,
} from "../services/imageIngest";

/**
 * Die Bildübernahme steht zwischen einer fremden Website und der
 * veröffentlichten Web-App. Zwei Dinge müssen stimmen: Sie darf nichts
 * verlieren, wenn ein Bild nicht erreichbar ist, und sie darf beim erneuten
 * Veröffentlichen keine Kopien anhäufen.
 */

/**
 * Namensauflösung festnageln. Ohne das hängen diese Tests am echten DNS:
 * ".test" ist eine reservierte Domain und löst nirgends auf, jedes Bild wäre
 * also schon vor dem Abruf gescheitert – und in einer CI ohne Netz gälte das
 * für alle Adressen. Die feste öffentliche Adresse lässt safeFetch passieren;
 * die Sperrlisten selbst prüft server/__tests__/safeFetch.spec.ts.
 */
vi.mock("node:dns/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:dns/promises")>();
  const lookup = async () => [{ address: "93.184.216.34", family: 4 }];
  // default MUSS den Ersatz ebenfalls tragen: Bei Node-Builtins läuft ein
  // benannter Import über die CommonJS-Brücke und griff sonst weiter auf die
  // echte Auflösung durch – die Tests hingen dann doch am Netz.
  return { ...actual, lookup, default: { ...actual, lookup } };
});

vi.mock("../services/supabaseStorage", () => ({
  storageConfigured: () => true,
  uploadImageToStorage: vi.fn(
    async (objectPath: string) =>
      `https://projekt.supabase.co/storage/v1/object/public/media/${objectPath}`,
  ),
}));

const png = Buffer.concat([
  Buffer.from([0x89]),
  Buffer.from("PNG\r\n\x1a\n", "latin1"),
  Buffer.alloc(8),
]);

/** Stellt einen erreichbaren Bildserver nach – ohne echtes Netz. */
function stubNetwork(behaviour: (url: string) => "ok" | "fehler" | "html") {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const mode = behaviour(url);
      if (mode === "fehler") {
        return { ok: false, status: 404, headers: new Headers(), body: null } as any;
      }
      const contentType = mode === "html" ? "text/html" : "image/png";
      return {
        ok: true,
        status: 200,
        headers: new Headers({
          "content-type": contentType,
          "content-length": String(png.length),
        }),
        body: {
          getReader() {
            let sent = false;
            return {
              async read() {
                if (sent) return { done: true, value: undefined };
                sent = true;
                return { done: false, value: new Uint8Array(png) };
              },
              async cancel() {},
            };
          },
        },
      } as any;
    }),
  );
}

const img = (id: string, url: string) => ({ id, url });

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isOwnImage", () => {
  it("erkennt bereits übernommene Bilder", () => {
    expect(isOwnImage("https://projekt.supabase.co/storage/v1/object/public/media/a.png")).toBe(true);
    expect(isOwnImage("https://maitr.de/bild.png")).toBe(true);
  });

  it("erkennt fremde Bilder", () => {
    expect(isOwnImage("https://kleiner-kiepenkerl.de/bild.jpg")).toBe(false);
  });
});

describe("galleryObjectPath", () => {
  it("liefert für dieselbe Quelle immer denselben Pfad", () => {
    // Sonst legt jedes erneute Veröffentlichen dieselben Bilder noch einmal ab.
    const a = galleryObjectPath("user_1", "https://x.test/bild.jpg", "jpg");
    const b = galleryObjectPath("user_1", "https://x.test/bild.jpg", "jpg");
    expect(a).toBe(b);
  });

  it("trennt Konten voneinander", () => {
    const a = galleryObjectPath("user_1", "https://x.test/bild.jpg", "jpg");
    const b = galleryObjectPath("user_2", "https://x.test/bild.jpg", "jpg");
    expect(a).not.toBe(b);
    expect(a.startsWith("user_1/")).toBe(true);
  });

  it("unterscheidet verschiedene Quellen", () => {
    const a = galleryObjectPath("u", "https://x.test/eins.jpg", "jpg");
    const b = galleryObjectPath("u", "https://x.test/zwei.jpg", "jpg");
    expect(a).not.toBe(b);
  });
});

describe("ingestGallery", () => {
  it("ersetzt fremde Adressen durch eigene", async () => {
    stubNetwork(() => "ok");
    const report = await ingestGallery(
      [
        img("1", "https://kleiner-kiepenkerl.de/a.png"),
        img("2", "https://kleiner-kiepenkerl.de/b.png"),
      ],
      "user_1",
    );

    expect(report.copied).toBe(2);
    expect(report.failed).toBe(0);
    expect(report.gallery.every((g) => g.url.includes("supabase.co"))).toBe(true);
    // IDs bleiben erhalten, sonst gelten die Bilder als neu.
    expect(report.gallery.map((g) => g.id)).toEqual(["1", "2"]);
  });

  it("behält die Reihenfolge bei", async () => {
    stubNetwork(() => "ok");
    const report = await ingestGallery(
      Array.from({ length: 9 }, (_, i) =>
        img(String(i), `https://x.test/bild-${i}.png`),
      ),
      "user_1",
    );
    expect(report.gallery.map((g) => g.id)).toEqual(
      Array.from({ length: 9 }, (_, i) => String(i)),
    );
  });

  it("lässt ein nicht erreichbares Bild auf seiner Adresse, statt alles zu verwerfen", async () => {
    // Eine Veröffentlichung an einem einzelnen toten Bild scheitern zu lassen
    // wäre die schlechtere Wahl – der Nutzer verlöre alles.
    stubNetwork((url) => (url.includes("kaputt") ? "fehler" : "ok"));
    const report = await ingestGallery(
      [
        img("1", "https://x.test/gut.png"),
        img("2", "https://x.test/kaputt.png"),
      ],
      "user_1",
    );

    expect(report.copied).toBe(1);
    expect(report.failed).toBe(1);
    expect(report.gallery[0].url).toContain("supabase.co");
    expect(report.gallery[1].url).toBe("https://x.test/kaputt.png");
    expect(report.notes.join(" ")).toContain("kaputt.png");
  });

  it("lehnt ab, was gar kein Bild ist", async () => {
    // Ein HTML-Dokument unter einer Bildadresse ist ein Warnzeichen.
    stubNetwork(() => "html");
    const report = await ingestGallery([img("1", "https://x.test/a.png")], "user_1");
    expect(report.copied).toBe(0);
    expect(report.failed).toBe(1);
  });

  it("holt nichts, was schon bei uns liegt", async () => {
    stubNetwork(() => "ok");
    const report = await ingestGallery(
      [img("1", "https://projekt.supabase.co/storage/v1/object/public/media/a.png")],
      "user_1",
    );
    expect(report.skipped).toBe(1);
    expect(report.copied).toBe(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("verweigert Adressen im internen Netz", async () => {
    // safeFetch greift, bevor überhaupt eine Anfrage rausgeht.
    stubNetwork(() => "ok");
    const report = await ingestGallery(
      [img("1", "http://169.254.169.254/latest/meta-data/")],
      "user_1",
    );
    expect(report.copied).toBe(0);
    expect(report.failed).toBe(1);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("schneidet nicht stillschweigend ab", async () => {
    stubNetwork(() => "ok");
    const many = Array.from({ length: 30 }, (_, i) =>
      img(String(i), `https://x.test/${i}.png`),
    );
    const report = await ingestGallery(many, "user_1");
    // Die übrigen bleiben in der Galerie, aber der Grund wird genannt.
    expect(report.gallery).toHaveLength(30);
    expect(report.notes.join(" ")).toMatch(/von 30/);
  });

  it("kommt mit leerer Galerie klar", async () => {
    const report = await ingestGallery([], "user_1");
    expect(report).toMatchObject({ copied: 0, failed: 0, skipped: 0 });
    expect(await ingestGallery(null, "user_1")).toMatchObject({ copied: 0 });
  });
});
