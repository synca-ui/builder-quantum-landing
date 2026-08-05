/**
 * Der Sync darf WhatsApp-Verbindungen nicht anfassen.
 *
 * WARUM DAS EINEN EIGENEN TEST BRAUCHT: Mit `WHATSAPP` im Enum `ChannelProvider`
 * lief eine WhatsApp-Zeile bis eben durch dieselbe Schleife wie Google und Meta.
 * Dort steht `const provider = conn.provider === "GOOGLE" ? "google" : "meta"` -
 * alles, was nicht Google ist, GILT ALS META. Eine WhatsApp-Verbindung wäre also
 * mit ihrem Token gegen den Meta-Connector gelaufen, wäre gescheitert, und der
 * `catch`-Zweig in `syncAll` hätte sie auf `EXPIRED` gesetzt.
 *
 * Die Folge wäre nicht ein Fehler gewesen, den jemand sieht, sondern eine
 * Anbindung, die sich bei JEDEM Cron-Lauf selbst abschaltet - und deren
 * `waPhoneNumberId` an der toten Zeile hängen bleibt und die Neuverbindung
 * blockiert. Genau die Sorte Fehler, die man erst Wochen später bemerkt.
 *
 * Der Ausstieg muss VOR `ensureFreshToken` stehen: schon dort wird jede
 * Nicht-Google-Verbindung mit abgelaufenem Token auf `EXPIRED` gesetzt.
 *
 * Beide Tests sind so gebaut, dass sie SCHEITERN, wenn man den Ausstieg wieder
 * entfernt - nachgemessen, nicht angenommen.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const findMany = vi.fn();
const findUniqueOrThrow = vi.fn();
const update = vi.fn();
const upsert = vi.fn();

vi.mock("../db/prisma", () => ({
  prisma: {
    channelConnection: {
      findMany: (...a: unknown[]) => findMany(...a),
      findUniqueOrThrow: (...a: unknown[]) => findUniqueOrThrow(...a),
      update: (...a: unknown[]) => update(...a),
    },
    maitrReview: { upsert: (...a: unknown[]) => upsert(...a) },
    maitrEngagementPoint: { upsert: vi.fn() },
    business: { findUnique: vi.fn() },
    insightsCache: { upsert: vi.fn() },
  },
}));

// Die Connectors dürfen für WhatsApp GAR NICHT gerufen werden - das ist die
// eigentliche Behauptung. Deshalb zählen wir die Aufrufe, statt sie nur zu
// stubben.
const fetchReviews = vi.fn();
const fetchEngagement = vi.fn();
vi.mock("@maitr/core/integrations", () => ({
  connectors: {
    google: { fetchReviews: (...a: unknown[]) => fetchReviews(...a), fetchEngagement: (...a: unknown[]) => fetchEngagement(...a) },
    meta: { fetchReviews: (...a: unknown[]) => fetchReviews(...a), fetchEngagement: (...a: unknown[]) => fetchEngagement(...a) },
  },
  GOOGLE_OAUTH: { tokenEndpoint: "https://example.invalid/token" },
}));

vi.mock("./briefing", () => ({ computeBriefing: vi.fn() }));
vi.mock("../maitr/briefing", () => ({ computeBriefing: vi.fn() }));

import { pullChannel, syncAll } from "../maitr/sync";

/** Abgelaufenes Token - damit ensureFreshToken sofort auf EXPIRED ginge. */
const whatsappVerbindung = {
  id: "wa-1",
  businessId: "betrieb-1",
  provider: "WHATSAPP",
  accountId: "123456789",
  encAccessToken: "verschluesselt",
  encRefreshToken: null,
  expiresAt: new Date(Date.now() - 60_000),
  scopes: [],
  status: "ACTIVE",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Sync fasst WhatsApp-Verbindungen nicht an", () => {
  beforeEach(() => {
    [findMany, findUniqueOrThrow, update, upsert, fetchReviews, fetchEngagement].forEach((m) => m.mockReset());
  });

  it("pullChannel steigt bei WHATSAPP aus, ohne den Anbieter zu rufen", async () => {
    findUniqueOrThrow.mockResolvedValue(whatsappVerbindung);

    await pullChannel("wa-1");

    // Kein Anbieter-Aufruf: der Meta-Connector hätte mit einem WhatsApp-Token
    // nichts anfangen können.
    expect(fetchReviews).not.toHaveBeenCalled();
    expect(fetchEngagement).not.toHaveBeenCalled();
    // Und nichts geschrieben - insbesondere kein status: "EXPIRED".
    expect(update).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("pullChannel würde ohne den Ausstieg auf EXPIRED laufen - Gegenprobe am Nachbarfall", async () => {
    // Dieselbe Zeile, nur als META. Sie MUSS in den Ablauf laufen und dort
    // scheitern. Damit ist belegt, dass der Test oben nicht bloss deshalb grün
    // ist, weil ohnehin nichts passiert - der Unterschied ist wirklich der
    // Provider.
    findUniqueOrThrow.mockResolvedValue({ ...whatsappVerbindung, provider: "META" });
    update.mockResolvedValue({});

    await expect(pullChannel("wa-1")).rejects.toThrow(/Reconnect/);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "EXPIRED" }) }),
    );
  });

  it("syncAll holt WhatsApp-Verbindungen gar nicht erst aus der Datenbank", async () => {
    findMany.mockResolvedValue([]);

    await syncAll();

    // Der Filter muss im WHERE stehen, nicht erst in der Schleife: sonst zählt
    // die Zeile als "aktiv zu synchronisieren" und landet im catch-Zweig.
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "ACTIVE",
          provider: { in: ["GOOGLE", "META"] },
        }),
      }),
    );
  });
});
