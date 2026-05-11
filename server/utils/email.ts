import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");
const FROM = "Maitr Reservierungen <reservierung@reservierung.maitr.de>";
const PUBLIC_URL = process.env.PUBLIC_URL || "https://www.maitr.de";

function hasApiKey(): boolean {
  const key = process.env.RESEND_API_KEY;
  return !!key && key !== "re_dummy";
}

/**
 * Format a Date to German locale string
 */
function formatDate(date: Date): string {
  return date.toLocaleString("de-DE", { dateStyle: "full", timeStyle: "short" });
}

/**
 * Send "Deine Anfrage ist eingegangen" email to guest after booking
 */
export async function sendReservationPending(
  guestEmail: string,
  guestName: string,
  reservationId: string,
  time: Date,
  guestCount: number,
  businessName: string
) {
  if (!hasApiKey()) {
    console.warn("[Email] RESEND_API_KEY nicht gesetzt – E-Mail übersprungen.");
    return;
  }
  const manageUrl = `${PUBLIC_URL}/r/${reservationId}`;
  try {
    await resend.emails.send({
      from: FROM,
      to: [guestEmail],
      subject: `Reservierungsanfrage erhalten – ${businessName}`,
      html: buildEmailHtml({
        title: "Anfrage erhalten!",
        headerColor: "#f59e0b",
        body: `
          <p>Hallo <strong>${guestName}</strong>,</p>
          <p>wir haben deine Reservierungsanfrage bei <strong>${businessName}</strong> erhalten und werden sie bald bestätigen.</p>
          ${buildInfoBox(formatDate(time), guestCount)}
          <p>Du kannst deine Anfrage jederzeit einsehen, ändern oder stornieren:</p>
          ${buildButton(manageUrl, "Reservierung verwalten", "#f59e0b")}
          <p>Wir melden uns bald!</p>
          <p style="color:#6b7280;font-size:14px;margin-top:32px;">Dein Team von ${businessName}</p>
        `,
      }),
    });
  } catch (err) {
    console.error("[Email] Fehler beim Senden der Pending-Mail:", err);
  }
}

/**
 * Send "Reservierung bestätigt" email to guest (triggered by owner)
 */
export async function sendReservationConfirmation(
  guestEmail: string,
  guestName: string,
  reservationId: string,
  time: Date,
  guestCount: number,
  businessName: string
) {
  if (!hasApiKey()) {
    console.warn("[Email] RESEND_API_KEY nicht gesetzt – E-Mail übersprungen.");
    return;
  }
  const manageUrl = `${PUBLIC_URL}/r/${reservationId}`;
  try {
    await resend.emails.send({
      from: FROM,
      to: [guestEmail],
      subject: `Reservierung bestätigt ✓ – ${businessName}`,
      html: buildEmailHtml({
        title: "Reservierung bestätigt!",
        headerColor: "#14b8a6",
        body: `
          <p>Hallo <strong>${guestName}</strong>,</p>
          <p>deine Reservierung bei <strong>${businessName}</strong> ist bestätigt. Wir freuen uns auf deinen Besuch!</p>
          ${buildInfoBox(formatDate(time), guestCount)}
          <p>Falls sich deine Pläne ändern, kannst du hier stornieren oder ändern:</p>
          ${buildButton(manageUrl, "Reservierung verwalten", "#14b8a6")}
          <p style="color:#6b7280;font-size:14px;margin-top:32px;">Dein Team von ${businessName}</p>
        `,
      }),
    });
  } catch (err) {
    console.error("[Email] Fehler beim Senden der Bestätigungs-Mail:", err);
  }
}

/**
 * Send notification to restaurant owner when a new reservation is made
 */
export async function sendOwnerNotification(
  ownerEmail: string,
  guestName: string,
  guestEmail: string | null,
  guestPhone: string | null,
  reservationId: string,
  time: Date,
  guestCount: number,
  businessName: string,
  specialRequests: string | null
) {
  if (!hasApiKey()) {
    console.warn("[Email] RESEND_API_KEY nicht gesetzt – Betreiber-Mail übersprungen.");
    return;
  }
  const dashboardUrl = `${PUBLIC_URL}/dashboard/reservations`;
  try {
    await resend.emails.send({
      from: FROM,
      to: [ownerEmail],
      subject: `Neue Reservierungsanfrage von ${guestName} – ${businessName}`,
      html: buildEmailHtml({
        title: "Neue Reservierung!",
        headerColor: "#6366f1",
        body: `
          <p>Es gibt eine neue Reservierungsanfrage für <strong>${businessName}</strong>.</p>
          <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:4px 0;"><strong>Gast:</strong> ${guestName}</p>
            ${guestEmail ? `<p style="margin:4px 0;"><strong>E-Mail:</strong> ${guestEmail}</p>` : ""}
            ${guestPhone ? `<p style="margin:4px 0;"><strong>Telefon:</strong> ${guestPhone}</p>` : ""}
            <p style="margin:4px 0;"><strong>Datum & Zeit:</strong> ${formatDate(time)}</p>
            <p style="margin:4px 0;"><strong>Personen:</strong> ${guestCount}</p>
            ${specialRequests ? `<p style="margin:4px 0;"><strong>Sonderwünsche:</strong> ${specialRequests}</p>` : ""}
          </div>
          <p>Bitte bestätige oder lehne die Anfrage im Dashboard ab:</p>
          ${buildButton(dashboardUrl, "Zum Dashboard", "#6366f1")}
        `,
      }),
    });
  } catch (err) {
    console.error("[Email] Fehler beim Senden der Betreiber-Benachrichtigung:", err);
  }
}

// ─── HTML Helpers ────────────────────────────────────────────────────────────

function buildInfoBox(dateStr: string, guestCount: number): string {
  return `
    <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:24px 0;">
      <p style="margin:4px 0;"><strong>Datum & Zeit:</strong> ${dateStr}</p>
      <p style="margin:4px 0;"><strong>Personen:</strong> ${guestCount}</p>
    </div>
  `;
}

function buildButton(url: string, label: string, color: string): string {
  return `
    <div style="text-align:center;margin:32px 0;">
      <a href="${url}" style="background-color:${color};color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">
        ${label}
      </a>
    </div>
  `;
}

function buildEmailHtml({
  title,
  headerColor,
  body,
}: {
  title: string;
  headerColor: string;
  body: string;
}): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background-color:${headerColor};color:white;padding:28px 24px;text-align:center;">
        <h1 style="margin:0;font-size:22px;">${title}</h1>
        <p style="margin:8px 0 0;opacity:.85;font-size:14px;">Powered by Maitr</p>
      </div>
      <div style="padding:28px 24px;">
        ${body}
      </div>
      <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">Diese E-Mail wurde automatisch von Maitr gesendet.</p>
      </div>
    </div>
  `;
}
