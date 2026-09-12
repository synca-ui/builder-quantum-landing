import { describe, expect, it } from "vitest";
import { slotInnerhalbOeffnungszeiten } from "../reservierungSlotHinweis";
import type { OpeningHours } from "@/types/domain";

const zeiten: OpeningHours = {
  monday: { open: "11:00", close: "22:00", closed: false },
  tuesday: { open: "11:00", close: "22:00", closed: false },
  sunday: { open: "00:00", close: "00:00", closed: true },
};

describe("slotInnerhalbOeffnungszeiten", () => {
  it("erkennt Zeitfenster vor Öffnung und ab Ladenschluss", () => {
    expect(slotInnerhalbOeffnungszeiten("10:00", zeiten)).toBe(false);
    expect(slotInnerhalbOeffnungszeiten("11:00", zeiten)).toBe(true);
    expect(slotInnerhalbOeffnungszeiten("21:00", zeiten)).toBe(true);
    expect(slotInnerhalbOeffnungszeiten("22:00", zeiten)).toBe(false);
    expect(slotInnerhalbOeffnungszeiten("23:00", zeiten)).toBe(false);
  });

  it("ignoriert Ruhetage – ein Ruhetag mit 00:00/00:00 öffnet nichts", () => {
    const nurRuhetag: OpeningHours = { sunday: zeiten.sunday };
    // Keine offenen Tage → keine Aussage möglich → gilt als innerhalb.
    expect(slotInnerhalbOeffnungszeiten("03:00", nurRuhetag)).toBe(true);
  });

  it("gilt ohne gepflegte Öffnungszeiten überall als innerhalb", () => {
    expect(slotInnerhalbOeffnungszeiten("23:00", undefined)).toBe(true);
    expect(slotInnerhalbOeffnungszeiten("23:00", {})).toBe(true);
  });

  it("versteht Öffnungszeiten über Mitternacht", () => {
    const bar: OpeningHours = {
      friday: { open: "18:00", close: "02:00", closed: false },
    };
    expect(slotInnerhalbOeffnungszeiten("23:00", bar)).toBe(true);
    expect(slotInnerhalbOeffnungszeiten("12:00", bar)).toBe(false);
  });

  it("reicht, wenn EIN Tag das Fenster abdeckt", () => {
    const gemischt: OpeningHours = {
      monday: { open: "11:00", close: "15:00", closed: false },
      friday: { open: "17:00", close: "23:00", closed: false },
    };
    expect(slotInnerhalbOeffnungszeiten("13:00", gemischt)).toBe(true);
    expect(slotInnerhalbOeffnungszeiten("20:00", gemischt)).toBe(true);
    expect(slotInnerhalbOeffnungszeiten("16:00", gemischt)).toBe(false);
  });
});
