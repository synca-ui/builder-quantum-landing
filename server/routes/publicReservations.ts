import { Router, Request, Response } from "express";
import crypto from "crypto";
import prisma from "../db/prisma";
import { z } from "zod";
import {
  sendReservationPending,
  sendOwnerNotification,
  sendReservationConfirmation,
  sendReservationDeclined,
} from "../utils/email";
import { slotsFuerDatum } from "@maitr/core/reservierungsSlots";
import { pushAnBetrieb } from "../services/push";
import type { OpeningHours } from "@maitr/core/types";

const router = Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────

/* ── Grenzen der Eingabe ─────────────────────────────────────────────────────
 *
 * ANLASS: Diese beiden Schemata waren die EINZIGE Pruefung zwischen einem
 * unangemeldeten Aufrufer und (a) der HTML-Vorlage in `server/utils/email.ts`
 * sowie (b) dem Reservierungskalender eines Betriebs. Gemessen gingen durch:
 * ein `guestName` mit 100 000 Zeichen, `guestCount: 999999` und eine
 * `reservationTime` im Jahr 2099.
 *
 * Die Maskierung in `email.ts` schliesst die Einschleusung von HTML; hier geht
 * es um das, was Maskierung NICHT loest - Menge und Sinnhaftigkeit. Ein
 * 100-kB-Name ist auch maskiert noch eine unlesbare Mail, und eine Buchung im
 * Jahr 2099 belegt einen Platz, den niemand je einloest.
 */
const MAX_NAME = 100;
const MAX_WUNSCH = 500;
const MAX_TELEFON = 40;
const MAX_GAESTE = 50;

const modifySchema = z.object({
  guestName: z.string().trim().min(1).max(MAX_NAME).optional(),
  guestCount: z.number().int().min(1).max(MAX_GAESTE).optional(),
  reservationTime: z.string().datetime().optional(),
  specialRequests: z.string().trim().max(MAX_WUNSCH).optional(),
  status: z.enum(["PENDING", "CANCELLED"]).optional(),
});

const createSchema = z.object({
  configId: z.string().uuid(),
  guestName: z.string().trim().min(1).max(MAX_NAME),
  guestEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
  guestPhone: z.string().trim().max(MAX_TELEFON).optional().or(z.literal("")),
  guestCount: z.number().int().min(1).max(MAX_GAESTE).default(2),
  reservationTime: z.string().datetime(),
  specialRequests: z.string().trim().max(MAX_WUNSCH).optional(),
});

/**
 * Liegt der Wunschtermin in einem Zeitraum, den dieser Betrieb ueberhaupt
 * annimmt?
 *
 * Getrennt vom Schema, weil die Obergrenze aus der Konfiguration kommt und
 * nicht statisch sein kann. `daysAhead` spiegelt dieselbe Einstellung, nach der
 * sich `GET /slots` richtet - eine Buchung, die dort nie angeboten wuerde, soll
 * auch ueber den unmittelbaren Aufruf nicht hereinkommen.
 */
export function terminImRahmen(
  zeit: Date,
  daysAhead: number,
  jetzt: Date = new Date(),
): boolean {
  if (Number.isNaN(zeit.getTime())) return false;
  // Eine kleine Toleranz nach hinten: Zwischen Auswahl im Formular und Ankunft
  // der Anfrage vergehen Sekunden, und eine Uhr darf leicht abweichen.
  const frueheste = jetzt.getTime() - 5 * 60_000;
  const spaeteste = jetzt.getTime() + daysAhead * 24 * 60 * 60_000;
  return zeit.getTime() >= frueheste && zeit.getTime() <= spaeteste;
}

// ─── Was ein Gast über den Link aus seiner Bestätigungsmail sehen darf ────────
/**
 * ANLASS, gemessen ohne jedes Konto: `GET`/`PUT /api/public/reservations/:id`
 * gaben die GANZE Zeile zurück - `guestEmail`, `guestPhone`, `businessId`,
 * `tableId`, `source`, Zeitstempel, alles, was Prisma kennt. Die einzige
 * Seite, die diese Antwort liest (`client/pages/ManageReservation.tsx`, über
 * den Link `${PUBLIC_URL}/r/:id` aus der Bestätigungsmail, siehe
 * `server/utils/email.ts`), zeigt genau sechs Felder plus den Namen des
 * Betriebs an - nicht einmal die eigene E-Mail-Adresse oder Telefonnummer
 * wird dem Gast dort angezeigt.
 *
 * `id` ist ein UUID (`Reservation.id String @id @default(uuid())`) - Raten
 * ist damit unrealistisch, das eigentliche Risiko ist die WEITERGABE: eine
 * weitergeleitete Bestätigungsmail, ein Server-Log, ein Browser-Verlauf. Je
 * weniger diese Antwort trägt, desto weniger ist an jeder dieser Stellen zu
 * verlieren, wenn die ID doch einmal über den vorgesehenen Empfänger
 * hinausgeht - ohne einen Nachweis zu verlangen, den niemand verschickt (die
 * Bestätigungsmail enthält kein separates Token, nur die ID selbst).
 *
 * Wird zusätzlich zu (nicht statt) der Prisma-`select`-Einschränkung in GET
 * und PUT benutzt: Selbst wenn dort später ein Feld ergänzt wird, ohne diese
 * Funktion mitzudenken, bleibt die Antwort auf der Positivliste stehen.
 */
const RESERVIERUNGS_AUSWAHL = {
  id: true,
  guestName: true,
  guestCount: true,
  reservationTime: true,
  specialRequests: true,
  status: true,
  business: { select: { name: true } },
} as const;

function oeffentlicheReservierungsAnsicht(reservation: {
  id: string;
  guestName: string;
  guestCount: number;
  reservationTime: Date;
  specialRequests: string | null;
  status: string;
  business: { name: string };
}) {
  return {
    id: reservation.id,
    guestName: reservation.guestName,
    guestCount: reservation.guestCount,
    reservationTime: reservation.reservationTime,
    specialRequests: reservation.specialRequests,
    status: reservation.status,
    business: { name: reservation.business.name },
    // ABSICHTLICH NICHT dabei: guestEmail, guestPhone (ManageReservation.tsx
    // zeigt sie nicht einmal dem Gast selbst an), businessId, tableId, source,
    // createdAt/updatedAt, business.logoUrl (unbenutzt) - siehe Kommentar oben.
  };
}

// ─── GET /api/public/reservations/slots ──────────────────────────────────────
/**
 * Returns available time slots for a given configId and date.
 * Slot intervals and days ahead are stored on the configuration.
 */
/* ── One-Click-Aktionen aus der Betreiber-Mail ────────────────────────────────
 *
 * Der Betreiber bekommt in der Benachrichtigungs-Mail zwei Links:
 * Bestätigen und Ablehnen. Beide tragen eine HMAC-Signatur über
 * (Reservierungs-ID + Aktion) — nur wer die Mail besitzt, kann sie auslösen;
 * raten ist aussichtslos, und ein Bestätigen-Token taugt nicht zum Ablehnen.
 *
 * Ohne Secret in der Umgebung entstehen KEINE Links (die Mail zeigt wie
 * bisher nur den Dashboard-Knopf) — das Feature degradiert, statt mit einem
 * erratbaren Token online zu gehen.
 */
const AKTIONS_SECRET =
  process.env.RESERVATION_ACTION_SECRET ||
  process.env.MAITR_OAUTH_STATE_SECRET ||
  null;

export function reservierungsAktionsToken(
  reservationId: string,
  aktion: "confirm" | "decline",
  secret: string,
): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${reservationId}.${aktion}`)
    .digest("hex");
}

function tokenGueltig(
  reservationId: string,
  aktion: "confirm" | "decline",
  token: string,
): boolean {
  if (!AKTIONS_SECRET) return false;
  const erwartet = reservierungsAktionsToken(reservationId, aktion, AKTIONS_SECRET);
  const a = Buffer.from(erwartet, "utf8");
  const b = Buffer.from(token, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Kleine deutsche Antwortseite für den Mail-Klick (öffnet im Browser). */
function aktionsSeite(titel: string, text: string): string {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titel} – Maitr</title></head>
<body style="font-family:-apple-system,system-ui,sans-serif;background:#f9fafb;margin:0;padding:40px 16px;">
<div style="max-width:420px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;text-align:center;">
<h1 style="font-size:20px;margin:0 0 12px;">${titel}</h1>
<p style="color:#4b5563;line-height:1.6;margin:0;">${text}</p>
</div></body></html>`;
}

router.get("/slots", async (req: Request, res: Response) => {
  try {
    const { configId, date } = req.query;

    if (!configId || !date) {
      return res.status(400).json({ error: "configId und date sind erforderlich" });
    }

    const config = await prisma.configuration.findUnique({
      where: { id: configId as string },
    });

    if (!config) {
      return res.status(404).json({ error: "Konfiguration nicht gefunden" });
    }

    if (!config.reservationsEnabled) {
      return res.json({ success: true, slots: [] });
    }

    // Parse configured values
    const intervalMinutes: number = (config as any).reservationTimeSlotInterval ?? 30;
    const dayStr = date as string; // format: "YYYY-MM-DD"

    // Build slots list based on configured timeslots in config
    const konfiguriert: string[] = Array.isArray((config as any).timeSlots)
      ? (config as any).timeSlots
      : ["12:00", "13:00", "18:00", "19:00", "20:00"];

    // Nur Zeitfenster innerhalb der Öffnungszeiten anbieten — vorher kamen
    // die Slots auch an Ruhetagen. Gleiche Logik wie die Vorschau
    // (@maitr/core/reservierungsSlots); leere Altbestände filtern nicht.
    const rawSlots: string[] = slotsFuerDatum(
      konfiguriert,
      (config.openingHours as OpeningHours | null) ?? null,
      dayStr,
    );

    // Build all slot datetimes for the given day
    const slots = rawSlots.map((timeStr: string) => {
      const [h, m] = timeStr.split(":").map(Number);
      const dt = new Date(`${dayStr}T${String(h).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}:00.000Z`);
      return { time: timeStr, datetime: dt.toISOString() };
    });

    // Find already-booked slots for this business on this day
    let bookedSlots: string[] = [];
    if (config.businessId) {
      const dayStart = new Date(`${dayStr}T00:00:00.000Z`);
      const dayEnd = new Date(`${dayStr}T23:59:59.999Z`);
      const existing = await prisma.reservation.findMany({
        where: {
          businessId: config.businessId,
          reservationTime: { gte: dayStart, lte: dayEnd },
          status: { notIn: ["CANCELLED"] },
        },
        select: { reservationTime: true },
      });
      bookedSlots = existing.map((r) =>
        r.reservationTime.toISOString().slice(11, 16)
      );
    }

    // Mark slots as available/unavailable
    const result = slots.map((s) => ({
      ...s,
      available: !bookedSlots.includes(s.time),
    }));

    res.json({ success: true, slots: result });
  } catch (error) {
    console.error("Error fetching slots:", error);
    res.status(500).json({ error: "Fehler beim Laden der Zeitslots" });
  }
});

// ─── GET /api/public/reservations/:id/action ─────────────────────────────────
// One-Click aus der Betreiber-Mail: bestätigt oder lehnt eine PENDING-
// Reservierung ab. GET, weil Mail-Clients Links öffnen, keine Formulare
// senden. Die Signatur (siehe reservierungsAktionsToken) ersetzt den Login.
router.get("/:id/action", async (req: Request, res: Response) => {
  const { id } = req.params;
  const aktion = req.query.a === "confirm" ? "confirm" : req.query.a === "decline" ? "decline" : null;
  const token = typeof req.query.t === "string" ? req.query.t : "";

  const ablehnen = (code: number, titel: string, text: string) =>
    res.status(code).type("html").send(aktionsSeite(titel, text));

  if (!aktion || typeof id !== "string" || !tokenGueltig(id, aktion, token)) {
    return ablehnen(403, "Link ungültig", "Dieser Link ist ungültig oder abgelaufen. Bitte nutze das Dashboard.");
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { business: { select: { name: true } } },
    });
    if (!reservation) {
      return ablehnen(404, "Nicht gefunden", "Diese Reservierung existiert nicht mehr.");
    }

    const wann = reservation.reservationTime.toLocaleString("de-DE", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Europe/Berlin",
    });
    const wer = `${reservation.guestName} · ${reservation.guestCount} ${reservation.guestCount === 1 ? "Person" : "Personen"}`;

    // Idempotent: Ein zweiter Klick auf denselben Link erklärt den Stand,
    // statt zu fehlschlagen oder den Status erneut zu ändern.
    if (reservation.status !== "PENDING") {
      const stand =
        reservation.status === "CONFIRMED"
          ? "Diese Reservierung ist bereits bestätigt."
          : reservation.status === "CANCELLED"
            ? "Diese Reservierung wurde bereits abgelehnt oder storniert."
            : "Diese Reservierung wurde bereits bearbeitet.";
      return ablehnen(200, "Bereits bearbeitet", `${stand}<br><br>${wer}<br>${wann}`);
    }

    if (aktion === "confirm") {
      await prisma.reservation.update({ where: { id }, data: { status: "CONFIRMED" } });
      if (reservation.guestEmail) {
        await sendReservationConfirmation(
          reservation.guestEmail,
          reservation.guestName,
          reservation.id,
          reservation.reservationTime,
          reservation.guestCount,
          reservation.business?.name ?? "dem Betrieb"
        );
      }
      return ablehnen(200, "Reservierung bestätigt ✓", `Der Gast bekommt jetzt eine Bestätigung per E-Mail.<br><br>${wer}<br>${wann}`);
    }

    await prisma.reservation.update({ where: { id }, data: { status: "CANCELLED" } });
    if (reservation.guestEmail) {
      await sendReservationDeclined(
        reservation.guestEmail,
        reservation.guestName,
        reservation.reservationTime,
        reservation.business?.name ?? "dem Betrieb"
      );
    }
    return ablehnen(200, "Reservierung abgelehnt", `Der Gast wird per E-Mail informiert.<br><br>${wer}<br>${wann}`);
  } catch (error) {
    console.error("Error handling reservation action:", error);
    return ablehnen(500, "Fehler", "Die Aktion konnte nicht ausgeführt werden. Bitte nutze das Dashboard.");
  }
});

// ─── GET /api/public/reservations/:id ────────────────────────────────────────
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id: id as string },
      // Nur was ManageReservation.tsx zeigt - siehe RESERVIERUNGS_AUSWAHL oben.
      select: RESERVIERUNGS_AUSWAHL,
    });

    if (!reservation) {
      return res.status(404).json({ error: "Reservierung nicht gefunden" });
    }

    res.json({ success: true, data: oeffentlicheReservierungsAnsicht(reservation) });
  } catch (error) {
    console.error("Error fetching public reservation:", error);
    res.status(500).json({ error: "Fehler beim Laden der Reservierung" });
  }
});

// ─── POST /api/public/reservations ───────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = createSchema.parse(req.body);
    const { configId, ...rest } = validatedData;

    const config = await prisma.configuration.findUnique({
      where: { id: configId },
      include: { business: true },
    });

    if (!config || !config.businessId || !config.business) {
      return res.status(404).json({ error: "Restaurant nicht gefunden" });
    }

    // Nimmt dieser Betrieb ueberhaupt noch Anfragen an? Ohne diese Pruefung
    // liess sich ueber den unmittelbaren Aufruf buchen, obwohl das Formular auf
    // der Website gar nicht angeboten wird - `GET /slots` haelt sich schon
    // daran (siehe oben), der Schreibweg tat es nicht.
    if (!config.reservationsEnabled) {
      return res
        .status(403)
        .json({ error: "Dieser Betrieb nimmt derzeit keine Reservierungen an." });
    }

    const wunschzeit = new Date(rest.reservationTime);
    if (!terminImRahmen(wunschzeit, config.reservationDaysAhead ?? 7)) {
      return res.status(400).json({
        error: `Termin liegt ausserhalb des buchbaren Zeitraums (max. ${
          config.reservationDaysAhead ?? 7
        } Tage im Voraus).`,
      });
    }

    const reservation = await prisma.reservation.create({
      data: {
        businessId: config.businessId,
        guestName: rest.guestName,
        guestEmail: rest.guestEmail || null,
        guestPhone: rest.guestPhone || null,
        guestCount: rest.guestCount,
        // Den GEPRUEFTEN Wert schreiben, nicht noch einmal aus der Anfrage
        // parsen: Sonst pruefte man den einen Wert und schriebe den anderen.
        reservationTime: wunschzeit,
        specialRequests: rest.specialRequests || null,
        source: "website",
      },
    });

    // Push an die Betreiber-App — bewusst fire-and-forget: Der Gast wartet
    // nicht auf Expo, und ein Push-Fehler macht die Anfrage nicht kaputt.
    void pushAnBetrieb(
      config.businessId,
      "Neue Reservierungsanfrage",
      `${reservation.guestName} · ${reservation.guestCount} ${
        reservation.guestCount === 1 ? "Person" : "Personen"
      } · ${reservation.reservationTime.toLocaleString("de-DE", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Berlin",
      })}`,
      { type: "reservation", reservationId: reservation.id },
    ).catch((err) => console.error("[Push] Reservierungs-Push:", err));

    // Send "Anfrage erhalten" email to guest
    if (reservation.guestEmail) {
      await sendReservationPending(
        reservation.guestEmail,
        reservation.guestName,
        reservation.id,
        reservation.reservationTime,
        reservation.guestCount,
        config.business.name
      );
    }

    // Send owner notification
    const ownerEmail =
      (config as any).reservationNotificationEmail ||
      (config as any).reservationEmail ||
      null;
    if (ownerEmail) {
      // One-Click-Links nur mit Signatur-Secret — sonst wie bisher Dashboard.
      const basis = process.env.PUBLIC_URL || "https://www.maitr.de";
      const aktionen = AKTIONS_SECRET
        ? {
            bestaetigenUrl: `${basis}/api/public/reservations/${reservation.id}/action?a=confirm&t=${reservierungsAktionsToken(reservation.id, "confirm", AKTIONS_SECRET)}`,
            ablehnenUrl: `${basis}/api/public/reservations/${reservation.id}/action?a=decline&t=${reservierungsAktionsToken(reservation.id, "decline", AKTIONS_SECRET)}`,
          }
        : undefined;
      await sendOwnerNotification(
        ownerEmail,
        reservation.guestName,
        reservation.guestEmail ?? null,
        reservation.guestPhone ?? null,
        reservation.id,
        reservation.reservationTime,
        reservation.guestCount,
        config.business.name,
        reservation.specialRequests ?? null,
        aktionen
      );
    }

    // Dieselbe Positivliste wie bei GET/PUT - der Client liest den Rumpf
    // dieser Antwort zwar nirgends (ReservationFormModern.tsx prüft nur
    // `data.success`), aber sie unnötig breiter zu lassen als nötig wäre
    // dieselbe Nachlässigkeit, die dort schon einmal zum Leck führte.
    res.json({
      success: true,
      data: oeffentlicheReservierungsAnsicht({
        ...reservation,
        business: { name: config.business.name },
      }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error creating public reservation:", error);
    res.status(500).json({ error: "Fehler beim Erstellen der Reservierung" });
  }
});

// ─── PUT /api/public/reservations/:id ────────────────────────────────────────
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = modifySchema.parse(req.body);

    const existing = await prisma.reservation.findUnique({
      where: { id: id as string },
      // `business.configurations` liefert den buchbaren Zeitraum - dieselbe
      // Grenze wie beim Anlegen. Ohne sie liesse sich eine gueltige Buchung
      // anlegen und anschliessend per PUT ins Jahr 2099 schieben; die Grenze
      // beim Anlegen waere damit wirkungslos.
      select: {
        status: true,
        business: {
          select: {
            configurations: {
              select: { reservationDaysAhead: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Reservierung nicht gefunden" });
    }

    if (["CANCELLED", "COMPLETED", "NO_SHOW"].includes(existing.status)) {
      return res
        .status(400)
        .json({ error: "Diese Reservierung kann nicht mehr geändert werden." });
    }

    const updateData: any = {};
    if (validatedData.guestName) updateData.guestName = validatedData.guestName;
    if (validatedData.guestCount) updateData.guestCount = validatedData.guestCount;
    if (validatedData.reservationTime) {
      const neueZeit = new Date(validatedData.reservationTime);
      const daysAhead =
        existing.business?.configurations?.[0]?.reservationDaysAhead ?? 7;
      if (!terminImRahmen(neueZeit, daysAhead)) {
        return res.status(400).json({
          error: `Termin liegt ausserhalb des buchbaren Zeitraums (max. ${daysAhead} Tage im Voraus).`,
        });
      }
      updateData.reservationTime = neueZeit;
    }
    if (validatedData.specialRequests !== undefined)
      updateData.specialRequests = validatedData.specialRequests;
    if (validatedData.status === "CANCELLED") updateData.status = "CANCELLED";

    const updated = await prisma.reservation.update({
      where: { id: id as string },
      data: updateData,
      // Nur was ManageReservation.tsx zeigt - siehe RESERVIERUNGS_AUSWAHL oben.
      select: RESERVIERUNGS_AUSWAHL,
    });

    res.json({ success: true, data: oeffentlicheReservierungsAnsicht(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error modifying public reservation:", error);
    res.status(500).json({ error: "Fehler beim Ändern der Reservierung" });
  }
});

export default router;
