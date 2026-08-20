/**
 * Pass-Aktualisierung nach einer inhaltlichen Änderung (Stempel, Prämie,
 * Entwertung): Änderungs-Tag fortschreiben und registrierte Geräte anstoßen.
 *
 * Aufgerufen NACH der Buchungs-Transaktion, fire-and-forget — ein
 * APNs-Schluckauf darf keinen Stempel zurückrollen. `contentChangedAt`
 * schreibt die Buchung selbst (in ihrer Transaktion); hier kommt nur dazu,
 * was ausschließlich Wallet betrifft.
 *
 * `passUpdateSeq` wird als EIN atomares UPDATE mit nextval() gesetzt — und
 * nur, wenn die Karte überhaupt eine serialNumber hat: vorher existiert kein
 * Pass, den ein Tag ordnen könnte, und auf einer Datenbank ohne die
 * Wallet-Migration bliebe nextval() ein sicherer Fehlschlag (genau davor
 * warnt der Schema-Kommentar).
 */
import prisma from "../db/prisma";
import { walletReadiness } from "./env";
import { walletPushSenden } from "./apns";

/** Nach so vielen Fehlversuchen in Folge ist eine Registrierung tot. */
const MAX_FEHLVERSUCHE = 5;

export async function passInhaltFortschreiben(cardId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "StampCard"
    SET "passUpdateSeq" = nextval('wallet_pass_update_seq')
    WHERE "id" = ${cardId} AND "serialNumber" IS NOT NULL`;
}

export async function passUpdatePushen(cardId: string): Promise<void> {
  if (!walletReadiness().apple) return;

  await passInhaltFortschreiben(cardId);

  const registrierungen = await prisma.walletDeviceRegistration.findMany({
    where: { stampCardId: cardId },
    select: { id: true, pushToken: true, failedPushes: true },
  });
  if (registrierungen.length === 0) return;

  const ergebnisse = await walletPushSenden(
    registrierungen.map((r) => r.pushToken),
  );
  const jetzt = new Date();

  for (const reg of registrierungen) {
    const ergebnis = ergebnisse.find((e) => e.pushToken === reg.pushToken);
    if (!ergebnis) continue;

    const erfolg = ergebnis.status === 200;
    const tot =
      ergebnis.status === 410 ||
      ergebnis.grund === "BadDeviceToken" ||
      ergebnis.grund === "Unregistered";

    if (tot || (!erfolg && reg.failedPushes + 1 >= MAX_FEHLVERSUCHE)) {
      await prisma.walletDeviceRegistration.delete({ where: { id: reg.id } });
    } else if (erfolg) {
      await prisma.walletDeviceRegistration.update({
        where: { id: reg.id },
        data: { lastPushAt: jetzt, lastPushError: null, failedPushes: 0 },
      });
    } else {
      await prisma.walletDeviceRegistration.update({
        where: { id: reg.id },
        data: {
          lastPushError: ergebnis.grund ?? `HTTP ${ergebnis.status}`,
          failedPushes: { increment: 1 },
        },
      });
    }
  }
}
