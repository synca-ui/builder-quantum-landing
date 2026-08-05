/**
 * `asyncHandler` — schliesst die Luecke zwischen async-Handlern und Express 4.
 *
 * WARUM ES DAS GEBEN MUSS
 *
 * Express 4 umschliesst jeden Handler-Aufruf mit try/catch
 * (`node_modules/express/lib/router/layer.js`, `Layer.prototype.handle_request`):
 *
 *     try { fn(req, res, next); } catch (err) { next(err); }
 *
 * Das faengt SYNCHRONE Wuerfe zuverlaessig. Eine `async`-Funktion wirft aber
 * nicht synchron: Sie kehrt sofort mit einem Promise zurueck, das try/catch ist
 * da laengst verlassen, und die spaetere Ablehnung landet nirgends.
 *
 * Gemessen gegen das installierte express@4.22.1 (Node 22.21.1), ein Handler,
 * der `throw new Error(...)` macht:
 *  - ohne jeden Waechter: der Prozess stirbt mit Exitcode 1, der Client bekommt
 *    NIE eine Antwort — eine einzige fehlgeschlagene Prisma-Abfrage reisst die
 *    gesamte API mit, nicht nur die eine Anfrage;
 *  - mit einem blossen `process.on("unhandledRejection")`, der nur protokolliert:
 *    der Prozess lebt, aber der Client haengt bis in seinen eigenen Timeout, und
 *    die Fehler-Middleware wird NIE erreicht.
 *
 * Der Prozesswaechter allein ist also KEINE Loesung — er verhindert nur den
 * Absturz, nicht die haengende Anfrage. Nur der Umweg ueber `next(err)` bringt
 * den Fehler in die Express-Fehlerkette und damit zu einer echten Antwort.
 * Deshalb gilt: `asyncHandler` ist das Netz fuer den Anfragepfad, der Waechter in
 * `node-build.ts` ist das letzte Netz fuer alles ausserhalb davon.
 */
import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Ein Handler oder eine Middleware, die ein Promise zurueckgibt. Bewusst
 * `unknown` als Ergebnis: Die Handler in `routes.ts` geben teils `res.json(...)`
 * zurueck, teils nichts — was sie zurueckgeben, interessiert hier niemanden,
 * nur ob das Promise ablehnt.
 */
export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    // `Promise.resolve(...)` statt direkt `.catch(...)`: Wirft der Handler
    // ausnahmsweise doch synchron (weil jemand spaeter das `async` entfernt),
    // fliegt der Wurf hier heraus und Express' eigenes try/catch faengt ihn wie
    // gehabt. Beide Wege enden bei `next(err)`.
    Promise.resolve(handler(req, res, next)).catch((err: unknown) => {
      // Fallstrick: `next(undefined)` heisst fuer Express NICHT "Fehler",
      // sondern "weiter zur naechsten Route" — die Anfrage liefe dann still
      // durch bis zum 404 statt zur Fehler-Middleware. Genau das passiert bei
      // `throw null` oder `Promise.reject()`. Deshalb wird jeder falsy Grund zu
      // einem echten Fehlerobjekt verdichtet.
      next(err ?? new Error("Abgelehntes Promise ohne Fehlergrund"));
    });
  };
}
