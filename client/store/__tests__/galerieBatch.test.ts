/**
 * Galerie-Upload mit vielen Bildern.
 *
 * checkThrottleGuard im Store wirft ab 50 Zustandsänderungen je Sekunde –
 * ein Schutz gegen Endlosschleifen. Eine Dateiauswahl mit 51+ Fotos lief
 * vorher genau hinein, weil MediaGalleryStep jedes Bild einzeln anhängte
 * (docs/KONFIGURATOR-PRUEFUNG.md, Runde 8, „kritisch“). addGalleryImages
 * hängt alle in einem Zustandswechsel an, wie addMenuItems bei Karten-Importen.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { useConfiguratorStore } from "../configuratorStore";
import type { GalleryImage } from "@/types/domain";

const bilder = (n: number): GalleryImage[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `bild-${i}`,
    url: `blob:${i}`,
    alt: `foto-${i}.jpg`,
  }));

describe("addGalleryImages", () => {
  beforeEach(() => {
    useConfiguratorStore.getState().resetConfig();
  });

  it("hängt 60 Bilder in einem Zustandswechsel an, ohne den Wächter auszulösen", () => {
    const s = useConfiguratorStore.getState();

    expect(() => s.addGalleryImages(bilder(60))).not.toThrow();

    const gallery = useConfiguratorStore.getState().content.gallery;
    expect(gallery).toHaveLength(60);
    expect(gallery[59].id).toBe("bild-59");
  });

  it("behält vorhandene Bilder und ignoriert eine leere Auswahl", () => {
    const s = useConfiguratorStore.getState();
    s.addGalleryImage({ id: "alt", url: "blob:alt" });
    const vorher = useConfiguratorStore.getState().publishing.updatedAt;

    s.addGalleryImages([]);
    expect(useConfiguratorStore.getState().publishing.updatedAt).toBe(vorher);

    s.addGalleryImages(bilder(2));
    expect(
      useConfiguratorStore.getState().content.gallery.map((b) => b.id),
    ).toEqual(["alt", "bild-0", "bild-1"]);
  });

  it("Einzelaufrufe laufen ab dem 51. Bild weiterhin in den Wächter (Grund für den Batch)", () => {
    const s = useConfiguratorStore.getState();

    expect(() => {
      for (const bild of bilder(60)) s.addGalleryImage(bild);
    }).toThrow(/Infinite loop detected/);
  });
});
