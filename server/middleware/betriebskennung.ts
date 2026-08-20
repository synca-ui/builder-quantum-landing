/**
 * Eine Betriebskennung aus einer Anfrage lesen - und zwar so, dass sie eine
 * Kennung IST und kein Filter.
 *
 * ANLASS, gemessen und nachgestellt: In `server/routes/**` stand durchgehend
 *
 *     const businessId = req.query.businessId as string;
 *
 * Das `as string` ist eine Behauptung des Übersetzers, keine Prüfung zur
 * Laufzeit. Express parst die Query mit `qs`, und `qs` baut aus einer Klammer
 * ein Objekt:
 *
 *     ?businessId[not]=zzz   →   { businessId: { not: "zzz" } }
 *
 * Dieses Objekt ging unverändert in die Besitzprüfung - und die BESTAND, weil
 *
 *     prisma.business.findFirst({ where: { id: { not: "zzz" }, members: { some: { userId } } } })
 *
 * gültige Prisma-Filtersyntax ist und den EIGENEN Betrieb des Anfragenden
 * findet. Danach benutzte jeder Handler denselben Wert als vermeintliche
 * Kennung weiter, `where: { businessId }` wurde zu `where: { businessId: { not: "zzz" } }`
 * - und lieferte die Zeilen ALLER Betriebe. Sieben lesende Endpunkte waren so
 * erreichbar, dazu ein schreibender; die Buchungen fremder Kunden kamen mitsamt
 * `guestEmail`, `guestPhone` und `specialRequests` zurück. Die fremde
 * Betriebskennung musste man dafür nicht einmal kennen.
 *
 * `server/maitr/middleware.ts#resolveVenue` war davon nie betroffen: Es filtert
 * seine Kandidaten mit `typeof v === "string"` und lässt ein Objekt gar nicht
 * erst zu. Dieses Modul zieht dieselbe Regel für die ältere Generation nach.
 *
 * WARUM EIN EIGENES MODUL UND KEIN ZOD-SCHEMA AN JEDER ROUTE: Der Fehler ist
 * nicht, dass eine Prüfung falsch war - es gab gar keine. Zwanzig Aufrufstellen
 * einzeln mit einer Prüfung zu versehen hieße, sich darauf zu verlassen, dass
 * die einundzwanzigste auch daran denkt. Eine Funktion, die man benutzen MUSS,
 * um überhaupt an den Wert zu kommen, ist der einzige Weg, der auch für den
 * nächsten Endpunkt noch gilt.
 */
import type { Request } from "express";

/**
 * Die Kennung aus Query, Rumpf oder Pfad - oder `null`, wenn dort nichts
 * Brauchbares steht.
 *
 * Nur eine nicht-leere Zeichenkette gilt. Alles andere - Objekt, Array, Zahl,
 * `null` - ist keine Kennung, und der Aufrufer muss die Anfrage abweisen. Ein
 * stiller Rückfall auf „dann eben ohne Einschränkung" wäre genau der Fehler,
 * um den es hier geht.
 *
 * Die Reihenfolge (Query, Rumpf, Pfad) bildet ab, wie die Routen dieser
 * Generation gebaut sind; anders als bei `resolveVenue` wird hier NICHT auf
 * Widerspruch geprüft, weil keine dieser Routen zwei Quellen zugleich benutzt.
 * Wer das ändert, sollte den Widerspruchsriegel von dort mitnehmen.
 */
export function betriebskennung(req: Request): string | null {
  for (const quelle of [req.query?.businessId, req.body?.businessId, req.params?.businessId]) {
    if (typeof quelle === "string" && quelle.length > 0) return quelle;
    // Ausdrücklich KEIN `continue` bei einem vorhandenen, aber unbrauchbaren
    // Wert: Wer `businessId` in einer Form schickt, die niemand lesen kann, hat
    // einen Fehler gemacht - und soll ihn erfahren, statt dass die nächste
    // Quelle ihn überdeckt.
    if (quelle !== undefined) return null;
  }
  return null;
}

/**
 * Gehört dieser Betrieb dem Anfragenden?
 *
 * Fasst die Prüfung zusammen, die bisher an jeder Route einzeln stand. Der
 * Rückgabewert ist die geprüfte Kennung - so kann der Aufrufer sie benutzen,
 * ohne noch einmal auf die ungeprüfte Anfrage zurückzugreifen. Genau daran ist
 * es schon einmal auseinandergefallen: Geprüft wurde die eine Kennung,
 * geschrieben die andere.
 */
export async function geprueftesBetriebsrecht(
  prisma: {
    business: {
      findFirst(args: {
        where: { id: string; members: { some: { userId: string } } };
        select: { id: true };
      }): Promise<{ id: string } | null>;
    };
  },
  userId: string,
  kennung: string,
): Promise<string | null> {
  const treffer = await prisma.business.findFirst({
    // `id` ist hier garantiert eine Zeichenkette (siehe `betriebskennung`), die
    // Bedingung kann also nicht mehr zum Filter werden.
    where: { id: kennung, members: { some: { userId } } },
    select: { id: true },
  });
  return treffer?.id ?? null;
}
