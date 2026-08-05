import { Router } from "express";
import { clerkClient } from "@clerk/clerk-sdk-node";
import prisma from "../db/prisma";
import { deleteUserMedia } from "../services/supabaseStorage";

export const usersRouter = Router();

usersRouter.get("/me", async (req, res) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user });
  } catch (e) {
    console.error("users/me error", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Audit-Eintrag für die Kontolöschung.
 *
 * Bewusst nicht über createAuditLogger aus utils/audit.ts: der schreibt fest
 * resource: "configuration", und ein Konto ist keine Konfiguration – der
 * Compliance-Bericht würde die Löschung unter der falschen Ressource führen.
 *
 * Kein Eintrag überlebt eine ERFOLGREICHE Löschung: AuditLog.userId ist ein
 * Fremdschlüssel mit onDelete: Cascade, die Zeilen gehen mit dem Nutzer. Was in
 * der Tabelle stehen bleibt, sind genau die FEHLGESCHLAGENEN Versuche – ein
 * "account_deletion_requested" plus ein "account_deleted" mit success=false –
 * und die sind die, die man später nachvollziehen muss. Ein dauerhafter Beleg
 * der geglückten Löschung ginge nur mit einer Tabelle ohne Nutzer-Fremdschlüssel;
 * bis dahin ist es die Server-Logzeile weiter unten.
 */
async function auditAccountDeletion(
  userId: string,
  req: { ip?: string; get(name: string): string | undefined },
  action: "account_deletion_requested" | "account_deleted",
  success: boolean,
  errorMessage?: string,
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource: "user",
        resourceId: userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent")?.substring(0, 500),
        success,
        errorMessage: errorMessage?.substring(0, 255),
      },
    });
  } catch (error) {
    // Protokollieren darf den eigentlichen Vorgang nie kippen.
    console.error("[Kontolöschung] Audit-Eintrag fehlgeschlagen:", error);
  }
}

/**
 * DELETE /api/users/me – das eigene Konto endgültig löschen.
 *
 * Pflicht nach Apple App Store Review 5.1.1(v): Wer sich in der App ein Konto
 * anlegen kann, muss es in der App auch löschen können – nicht deaktivieren,
 * nicht per Mail-Anfrage. Bis hierher gab es nur den reaktiven Clerk-Webhook
 * (user.deleted), der eine ANDERSWO ausgelöste Löschung nachvollzog; einen Weg,
 * sie auszulösen, gab es nirgends.
 *
 * Die Identität kommt ausschließlich aus req.user – das setzt requireAuth aus
 * dem verifizierten Clerk-Token. Es gibt hier absichtlich weder einen
 * Routen-Parameter noch ein Body-Feld für die Nutzer-ID: eine unwiderrufliche
 * Löschung darf kein Ziel haben, das der Aufrufer bestimmt.
 */
usersRouter.delete("/me", async (req, res) => {
  const userId = req.user!.id;
  const clerkId = req.user!.clerkId;

  try {
    // Welche Betriebe hängen nach dieser Löschung an niemandem mehr?
    //
    // Business hängt nicht direkt am User, sondern über BusinessMember – ein
    // Cascade greift dort also nur für die Mitgliedschaft, nicht für den
    // Betrieb. Bliebe der stehen, blieben mit ihm die Gästeliste (Namen,
    // Telefonnummern), Reservierungen, Speisekarte und die veröffentlichte
    // Seite herrenlos in der Datenbank liegen. „Konto gelöscht" wäre gelogen.
    const memberships = await prisma.businessMember.findMany({
      where: { userId },
      select: { businessId: true },
    });
    const businessIds = memberships.map((m) => m.businessId);

    let orphanBusinessIds: string[] = [];
    if (businessIds.length > 0) {
      // Zwei Gründe, einen Betrieb stehen zu lassen: es gibt weitere Mitglieder,
      // oder eine fremde Konfiguration zeigt darauf (Configuration ist über
      // @@unique([userId, businessId]) mehrfach pro Betrieb möglich). In beiden
      // Fällen träfe die Löschung Daten, die nicht diesem Konto gehören.
      const [otherMembers, foreignConfigs] = await Promise.all([
        prisma.businessMember.findMany({
          where: { businessId: { in: businessIds }, userId: { not: userId } },
          select: { businessId: true },
        }),
        prisma.configuration.findMany({
          where: { businessId: { in: businessIds }, userId: { not: userId } },
          select: { businessId: true },
        }),
      ]);

      const keep = new Set<string>([
        ...otherMembers.map((m) => m.businessId),
        ...foreignConfigs
          .map((c) => c.businessId)
          .filter((id): id is string => Boolean(id)),
      ]);
      orphanBusinessIds = businessIds.filter((id) => !keep.has(id));
    }

    await auditAccountDeletion(userId, req, "account_deletion_requested", true);

    // ZUERST die Bilder, erst danach die Datenbank. Der Grund ist die
    // Wiederholbarkeit:
    //
    // Der Objektpfad im Speicher ist "<userId>/…", und diese userId ist NUR
    // erreichbar, solange die Nutzerzeile steht. Löschte man die Datenbank
    // zuerst und der Speicher-Teil ginge schief, legte requireAuth beim
    // nächsten Login per Lazy Sync eine NEUE Zeile mit einer NEUEN UUID an
    // (getOrCreateUser sucht über clerkId) – das alte Präfix wäre danach von
    // keinem Aufruf mehr adressierbar. Die Fotos lägen für immer in einem
    // öffentlichen Bucket, dessen Adressen ohne Anmeldung funktionieren.
    //
    // Andersherum ist jeder Zwischenstand harmlos: Schlägt das Löschen der
    // Bilder fehl, ist noch NICHTS weg, derselbe Aufruf lässt sich mit
    // derselben userId beliebig oft wiederholen.
    let geloeschteMedien = 0;
    try {
      const media = await deleteUserMedia(userId);
      geloeschteMedien = media.deleted;
    } catch (mediaError) {
      console.error(
        `[Kontolöschung] Medien von ${userId} konnten nicht gelöscht werden:`,
        mediaError,
      );
      await auditAccountDeletion(
        userId,
        req,
        "account_deleted",
        false,
        mediaError instanceof Error ? mediaError.message : String(mediaError),
      );
      // 503 statt 500: Das ist ein vorübergehender Zustand eines fremden
      // Dienstes, kein kaputter Aufruf. Und es wird ausdrücklich gesagt, dass
      // nichts gelöscht wurde – die Alternative (weitermachen und die Bilder
      // liegen lassen) würde dem Nutzer eine Löschung melden, die keine ist.
      return res.status(503).json({
        error:
          "Deine Fotos konnten gerade nicht gelöscht werden. Es wurde nichts gelöscht – bitte versuche es in ein paar Minuten noch einmal.",
      });
    }

    // Reihenfolge bewusst: erst die eigenen Daten, dann die Clerk-Identität.
    //
    // Andersherum wäre ein Abbruch nach dem Clerk-Schritt nicht mehr
    // wiederholbar – anmelden ginge nicht mehr, die Daten lägen aber noch hier.
    // So bleibt jeder Zwischenstand wiederholbar: Scheitert der Clerk-Schritt,
    // legt requireAuth beim nächsten Login per Lazy Sync einen leeren Datensatz
    // an, und derselbe Aufruf räumt ihn samt Clerk-Konto erneut ab.
    await prisma.$transaction([
      // ScraperJob.userId ist optional; Prisma setzt es beim Löschen des Nutzers
      // sonst nur auf NULL (Standard für optionale Relationen). Die Zeilen
      // enthalten E-Mail, Telefon und die vollständige Analyse eines Betriebs.
      prisma.scraperJob.deleteMany({ where: { userId } }),
      ...(orphanBusinessIds.length > 0
        ? [prisma.business.deleteMany({ where: { id: { in: orphanBusinessIds } } })]
        : []),
      // Alles Übrige hängt per onDelete: Cascade am User und geht mit ihm:
      // Configuration (+ AddOnInstance), WebApp (+ OrderEvent), Subscription,
      // BillingEvent, TemplateRating, Tenant (+ Restaurant), AuditLog,
      // BusinessMember.
      prisma.user.delete({ where: { id: userId } }),
    ]);

    // Ohne diesen Schritt könnte sich der Nutzer weiter anmelden und bekäme über
    // den Lazy Sync ein leeres Konto – aus seiner Sicht wäre die Löschung
    // wirkungslos. Die Gegenrichtung (Clerk-Webhook user.deleted) läuft danach
    // ins Leere und protokolliert das; das ist harmlos.
    try {
      await clerkClient.users.deleteUser(clerkId);
    } catch (clerkError) {
      console.error(
        `[Kontolöschung] Clerk-Konto ${clerkId} konnte nicht gelöscht werden:`,
        clerkError,
      );
      return res.status(502).json({
        error:
          "Deine Daten wurden gelöscht, die Anmeldung konnte nicht entfernt werden. Bitte versuche es noch einmal.",
      });
    }

    console.log(
      `[Kontolöschung] Nutzer ${userId} (clerk=${clerkId}) gelöscht, ` +
        `${orphanBusinessIds.length} verwaiste(r) Betrieb(e) und ` +
        `${geloeschteMedien} Medienobjekt(e) mit entfernt.`,
    );
    return res.json({
      success: true,
      deletedBusinesses: orphanBusinessIds.length,
      deletedMedia: geloeschteMedien,
    });
  } catch (e) {
    console.error("users/me delete error", e);
    // Der Nutzer existiert hier noch, der Fremdschlüssel hält – dieser Eintrag
    // bleibt also stehen und ist der einzige dauerhafte Beleg des Fehlversuchs.
    await auditAccountDeletion(
      userId,
      req,
      "account_deleted",
      false,
      e instanceof Error ? e.message : String(e),
    );
    return res.status(500).json({ error: "Konto konnte nicht gelöscht werden" });
  }
});

usersRouter.put("/profile", async (req, res) => {
  try {
    const userId = req.user!.id;
    const clerkId = req.user!.sub || req.user!.id;
    const { fullName } = req.body || {};

    // CRITICAL FIX: Update both NeonDB and Clerk simultaneously
    // Step 1: Update Prisma database
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: fullName || null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    // Step 2: Update Clerk user object to prevent desync
    // This ensures user.reload() on the frontend gets fresh data from Clerk
    try {
      if (fullName) {
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        await clerkClient.users.updateUser(clerkId, {
          firstName: firstName,
          lastName: lastName,
        });

        console.log(
          `[Profile Sync] Updated Clerk user ${clerkId} with name: ${fullName}`,
        );
      }
    } catch (clerkError) {
      // Log the error but don't fail the request - DB update already succeeded
      console.warn(
        `[Profile Sync] Warning: Failed to update Clerk user ${clerkId}:`,
        clerkError,
      );
    }

    return res.json({ user: updated });
  } catch (e) {
    console.error("users/profile update error", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});
