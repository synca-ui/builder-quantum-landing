// @vitest-environment node
/**
 * Reine Bausteine des Push-Versands — Token-Form und Blockbildung.
 * Der eigentliche Versand ist I/O gegen Expo und bleibt bewusst ungemockt.
 */
import { describe, expect, it } from "vitest";
import { inBloecken, istExpoPushToken } from "../services/push";

describe("istExpoPushToken", () => {
  it("erkennt beide Expo-Formen", () => {
    expect(istExpoPushToken("ExponentPushToken[abc123]")).toBe(true);
    expect(istExpoPushToken("ExpoPushToken[abc123]")).toBe(true);
  });

  it("lehnt Fremdes ab (APNs-Hex, Leeres, Prosa)", () => {
    expect(istExpoPushToken("74657374")).toBe(false);
    expect(istExpoPushToken("")).toBe(false);
    expect(istExpoPushToken("ExponentPushToken[]")).toBe(false);
  });
});

describe("inBloecken", () => {
  it("teilt in Expos Blockgröße von 100", () => {
    const liste = Array.from({ length: 250 }, (_, i) => i);
    const bloecke = inBloecken(liste);
    expect(bloecke.map((b) => b.length)).toEqual([100, 100, 50]);
  });

  it("leere Liste → keine Blöcke", () => {
    expect(inBloecken([])).toEqual([]);
  });
});
