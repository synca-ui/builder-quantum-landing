/**
 * Maitr-spezifische Middleware.
 *
 * `requireVenueAccess` ist der wichtigste Sicherheits-Baustein: es verhindert den
 * Cross-Tenant-Leak. Der von `requireAuth` gesetzte `req.userId` wird gegen die
 * `BusinessMember`-Tabelle geprüft - nur wer Mitglied des angefragten Betriebs ist,
 * darf dessen Daten sehen. Ein client-geliefertes `venueId` allein genügt NIE.
 */
import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { prisma } from "../db/prisma";

/**
 * Ergebnis der Auflösung. `conflict` bedeutet: Die Anfrage nennt mehrere
 * Betriebskennungen, die nicht übereinstimmen.
 */
type VenueResolution =
  | { venueId: string; conflict: false }
  | { venueId: null; conflict: boolean };

/**
 * Betriebskennung aus der Anfrage lesen — aus GENAU EINER Quelle.
 *
 * Die frühere Fassung nahm `params ?? query ?? body` und gab den ersten Treffer
 * zurück. Das war ausnutzbar: `requireVenueAccess` prüfte damit die Query-Kennung,
 * während der Reservierungs-Handler die Body-Kennung schrieb. Wer Mitglied in
 * Betrieb A ist, konnte mit `?venueId=A` und `{"venueId":"B"}` im Rumpf eine
 * Reservierung in den fremden Betrieb B schreiben — Prüfobjekt und Schreibobjekt
 * fielen auseinander. Die fremde Kennung ist dabei nicht einmal geheim, sie steht
 * im öffentlichen Endpunkt `/venues/:slug/public`.
 *
 * Deshalb: Weichen zwei genannte Quellen voneinander ab, wird die Anfrage
 * abgewiesen statt stillschweigend eine davon bevorzugt.
 *
 * Dieselbe Abweisung gilt, wenn eine Quelle die Kennung zwar NENNT, sie aber
 * nicht als Zeichenkette lesbar ist. Express parst Query und Rumpf mit `qs`:
 * ein doppelter Parameter (`?venueId=a&venueId=a`) oder eine Klammerform
 * (`?venueId[0]=a`, `?venueId[not]=zzz`) wird zu einem Array oder Objekt, nie
 * zu einem String; im JSON-Rumpf kann dieselbe Stelle ebenso eine Zahl, `null`
 * oder ein verschachteltes Objekt tragen. Der alte Filter (`typeof v ===
 * "string"`) liess solche Werte still aus der Kandidatenliste fallen - übrig
 * blieb dann die Kennung der jeweils anderen Quelle, und die Anfrage sah aus
 * wie der gute Fall "genau eine Kennung in genau einer Quelle". Der
 * Konfliktabbruch griff für genau diese Eingabeform nie. Deshalb zählt eine
 * genannte, aber unlesbare Kennung ab jetzt selbst als Konflikt: Wer etwas
 * schickt, das niemand lesen kann, bekommt das gesagt statt umgangen zu
 * werden. Ein leerer String bleibt davon unberührt - das ist weiterhin
 * gleichwertig zu "nicht angegeben", weil er als Zeichenkette lesbar ist, nur
 * eben leer.
 */
export function resolveVenue(req: Request): VenueResolution {
  const quellen = [req.params?.venueId, req.query?.venueId, req.body?.venueId];

  if (quellen.some((v) => v !== undefined && typeof v !== "string")) {
    return { venueId: null, conflict: true };
  }

  const kandidaten = quellen.filter((v): v is string => typeof v === "string" && v.length > 0);

  if (kandidaten.length === 0) return { venueId: null, conflict: false };
  const eindeutig = new Set(kandidaten);
  if (eindeutig.size > 1) return { venueId: null, conflict: true };
  return { venueId: kandidaten[0], conflict: false };
}

/** Nur noch für Aufrufer, die ohne Konfliktbehandlung auskommen. */
export function resolveVenueId(req: Request): string | null {
  return resolveVenue(req).venueId;
}

/** Die Rolle des Anfragenden IN diesem Betrieb. Siehe `requireVenueAccess`. */
export type VenueRolle = "OWNER" | "STAFF" | "ADMIN";

/** Anfrage mit den beiden Werten, die `requireVenueAccess` festschreibt. */
export type VenueRequest = Request & { venueId?: string; venueRolle?: VenueRolle };

export async function requireVenueAccess(req: Request, res: Response, next: NextFunction) {
  const { venueId, conflict } = resolveVenue(req);
  if (conflict) {
    return res
      .status(400)
      .json({ error: "Widersprüchliche venueId in Pfad, Query und Rumpf" });
  }
  if (!venueId) return res.status(400).json({ error: "venueId fehlt" });
  if (!req.userId) return res.status(401).json({ error: "Nicht angemeldet" });

  const membership = await prisma.businessMember.findUnique({
    where: { userId_businessId: { userId: req.userId, businessId: venueId } },
    // Die Rolle wird jetzt mitgelesen. Vorher stand sie in der Zeile, wurde geladen
    // und weggeworfen: `BusinessMember.role` hat den Vorgabewert STAFF, und jeder
    // Schreibpfad hing allein am Wahrheitswert „Mitglied ja/nein". Eine Aushilfe
    // konnte damit die Prämie ändern, Karten entwerten und Gastdaten löschen.
    select: { role: true },
  });
  if (!membership) return res.status(403).json({ error: "Kein Zugriff auf diesen Betrieb" });

  const angereichert = req as VenueRequest;
  angereichert.venueId = venueId;
  // Hier wird NICHTS erzwungen. Hinter diesem Guard hängen auch alle Lesewege und
  // das Stempeln - beides muss das Personal können. Wer eine Rolle verlangt, setzt
  // dafür einen zweiten, benannten Guard davor (siehe `ownerGuard` in routes.ts).
  angereichert.venueRolle = (membership as { role?: VenueRolle })?.role ?? "STAFF";
  return next();
}

/** Zod-Validierung des Request-Bodys an der Grenze - kein ungeprüfter Input weiter. */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ error: "Ungültige Eingabe", issues: parsed.error.issues });
    }
    req.body = parsed.data;
    return next();
  };
}
