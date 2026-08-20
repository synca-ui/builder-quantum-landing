import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");
const FROM = "Maitr Reservierungen <reservierung@reservierung.maitr.de>";
const PUBLIC_URL = process.env.PUBLIC_URL || "https://www.maitr.de";

function hasApiKey(): boolean {
  const key = process.env.RESEND_API_KEY;
  return !!key && key !== "re_dummy";
}

/* ── Maskierung ──────────────────────────────────────────────────────────────
 *
 * ANLASS, ohne jedes Konto nachgestellt: Jeder Wert dieser Datei ging roh in
 * die HTML-Vorlage. `guestName` und `specialRequests` stammen aus
 * `POST /api/public/reservations` - unangemeldet erreichbar, und das Schema
 * verlangte nur `z.string().min(1)`, also weder eine Zeichenbeschraenkung noch
 * eine Laenge. Gemessen ging diese Eingabe durch die Pruefung:
 *
 *     guestName: 'Max</strong></p><a href="https://phish.example/login"
 *                 style="background:#c00;color:#fff;padding:14px 28px">
 *                 Reservierung bestaetigen</a><p style="display:none">'
 *
 * und erzeugte im Postfach des BETREIBERS einen fremden Knopf - in einer Mail
 * von `reservierung@reservierung.maitr.de`, also von einer Adresse, der er
 * vertraut und die SPF/DKIM besteht. Das ist Phishing mit uns als beglaubigtem
 * Absender; nebenbei ruiniert es den Ruf der Versanddomaene.
 *
 * WARUM KEINE BIBLIOTHEK: Hier wird kein fremdes HTML bereinigt (dann waere
 * DOMPurify richtig), sondern TEXT in eine Vorlage gesetzt. Dafuer sind die
 * fuenf Zeichen unten vollstaendig - im Textknoten wie im
 * anfuehrungszeichen-begrenzten Attribut. Eine Abhaengigkeit mehr waere hier
 * mehr Flaeche, nicht weniger.
 */
const MASKEN: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Maskiert einen Wert fuer den HTML-Rumpf.
 *
 * Nimmt bewusst auch `null`/`undefined`/Zahlen: Die Aufrufer unten reichen
 * `guestPhone: string | null` und `guestCount: number` durch, und eine
 * Funktion, die man bei manchen Werten weglassen DARF, wird irgendwann bei
 * einem weggelassen, bei dem man es nicht darf.
 */
export function maskiereHtml(wert: string | number | null | undefined): string {
  if (wert === null || wert === undefined) return "";
  return String(wert).replace(/[&<>"']/g, (zeichen) => MASKEN[zeichen]);
}

/**
 * Bereinigt eine Betreffzeile.
 *
 * NICHT dieselbe Funktion wie oben: Der Betreff ist Klartext, kein HTML - ein
 * maskiertes `&amp;` stuende dort sichtbar als solches im Postfach. Gefaehrlich
 * sind hier Zeilenumbrueche (Kopfzeilen-Injektion) und Ueberlaenge. Ueber die
 * JSON-API von Resend ist eine Kopfzeilen-Injektion ohnehin nicht moeglich -
 * der Riegel steht hier fuer den Fall, dass der Versandweg einmal wechselt.
 */
export function bereinigeBetreff(wert: string | null | undefined): string {
  if (wert === null || wert === undefined) return "";
  return String(wert)
    // Steuerzeichen (CR, LF, TAB, NUL …) und die JS-Zeilentrenner U+2028/U+2029
    // zu einem Leerzeichen zusammenziehen.
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 120);
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
      subject: bereinigeBetreff(`Reservierungsanfrage erhalten – ${businessName}`),
      html: buildEmailHtml({
        title: "Anfrage erhalten!",
        headerColor: "#f59e0b",
        body: `
          <p>Hallo <strong>${maskiereHtml(guestName)}</strong>,</p>
          <p>wir haben deine Reservierungsanfrage bei <strong>${maskiereHtml(businessName)}</strong> erhalten und werden sie bald bestätigen.</p>
          ${buildInfoBox(formatDate(time), guestCount)}
          <p>Du kannst deine Anfrage jederzeit einsehen, ändern oder stornieren:</p>
          ${buildButton(manageUrl, "Reservierung verwalten", "#f59e0b")}
          <p>Wir melden uns bald!</p>
          <p style="color:#6b7280;font-size:14px;margin-top:32px;">Dein Team von ${maskiereHtml(businessName)}</p>
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
      subject: bereinigeBetreff(`Reservierung bestätigt ✓ – ${businessName}`),
      html: buildEmailHtml({
        title: "Reservierung bestätigt!",
        headerColor: "#14b8a6",
        body: `
          <p>Hallo <strong>${maskiereHtml(guestName)}</strong>,</p>
          <p>deine Reservierung bei <strong>${maskiereHtml(businessName)}</strong> ist bestätigt. Wir freuen uns auf deinen Besuch!</p>
          ${buildInfoBox(formatDate(time), guestCount)}
          <p>Falls sich deine Pläne ändern, kannst du hier stornieren oder ändern:</p>
          ${buildButton(manageUrl, "Reservierung verwalten", "#14b8a6")}
          <p style="color:#6b7280;font-size:14px;margin-top:32px;">Dein Team von ${maskiereHtml(businessName)}</p>
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
/**
 * Absage an den Gast. Bisher erfuhr ein Gast von einer Ablehnung schlicht
 * nichts — die Anfrage blieb aus seiner Sicht für immer "eingegangen".
 */
export async function sendReservationDeclined(
  guestEmail: string,
  guestName: string,
  time: Date,
  businessName: string
) {
  if (!hasApiKey()) {
    console.warn("[Email] RESEND_API_KEY nicht gesetzt – Absage-Mail übersprungen.");
    return;
  }
  try {
    await resend.emails.send({
      from: FROM,
      to: [guestEmail],
      subject: bereinigeBetreff(`Deine Reservierungsanfrage bei ${businessName}`),
      html: buildEmailHtml({
        title: "Leider keine Bestätigung",
        headerColor: "#6B7280",
        body: `
          <p>Hallo ${maskiereHtml(guestName)},</p>
          <p>leider kann <strong>${maskiereHtml(businessName)}</strong> deine
          Reservierungsanfrage für <strong>${formatDate(time)}</strong> nicht
          bestätigen.</p>
          <p>Vielleicht klappt es zu einer anderen Zeit — der Betrieb freut
          sich über eine neue Anfrage.</p>
        `,
      }),
    });
  } catch (err) {
    console.error("[Email] Fehler beim Senden der Absage-Mail:", err);
  }
}

export async function sendOwnerNotification(
  ownerEmail: string,
  guestName: string,
  guestEmail: string | null,
  guestPhone: string | null,
  reservationId: string,
  time: Date,
  guestCount: number,
  businessName: string,
  specialRequests: string | null,
  /**
   * One-Click-Links (signiert): Bestätigen/Ablehnen direkt aus der Mail,
   * ohne Login. Optional — ohne Signatur-Secret bleibt es beim
   * Dashboard-Knopf wie bisher.
   */
  aktionen?: { bestaetigenUrl: string; ablehnenUrl: string }
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
      subject: bereinigeBetreff(`Neue Reservierungsanfrage von ${guestName} – ${businessName}`),
      html: buildEmailHtml({
        title: "Neue Reservierung!",
        headerColor: "#6366f1",
        body: `
          <p>Es gibt eine neue Reservierungsanfrage für <strong>${maskiereHtml(businessName)}</strong>.</p>
          <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:4px 0;"><strong>Gast:</strong> ${maskiereHtml(guestName)}</p>
            ${guestEmail ? `<p style="margin:4px 0;"><strong>E-Mail:</strong> ${maskiereHtml(guestEmail)}</p>` : ""}
            ${guestPhone ? `<p style="margin:4px 0;"><strong>Telefon:</strong> ${maskiereHtml(guestPhone)}</p>` : ""}
            <p style="margin:4px 0;"><strong>Datum & Zeit:</strong> ${formatDate(time)}</p>
            <p style="margin:4px 0;"><strong>Personen:</strong> ${maskiereHtml(guestCount)}</p>
            ${specialRequests ? `<p style="margin:4px 0;"><strong>Sonderwünsche:</strong> ${maskiereHtml(specialRequests)}</p>` : ""}
          </div>
          ${
            aktionen
              ? `<p>Mit einem Klick antworten:</p>
                 <div>
                   ${buildButton(aktionen.bestaetigenUrl, "✓ Bestätigen", "#059669")}
                   &nbsp;&nbsp;
                   ${buildButton(aktionen.ablehnenUrl, "✕ Ablehnen", "#DC2626")}
                 </div>
                 <p style="margin-top:16px;">Oder im Dashboard verwalten:</p>`
              : `<p>Bitte bestätige oder lehne die Anfrage im Dashboard ab:</p>`
          }
          ${buildButton(dashboardUrl, "Zum Dashboard", "#6366f1")}
        `,
      }),
    });
  } catch (err) {
    console.error("[Email] Fehler beim Senden der Betreiber-Benachrichtigung:", err);
  }
}

// ─── HTML Helpers ────────────────────────────────────────────────────────────

/**
 * Auch hier maskiert, obwohl beide Werte HEUTE serverseitig entstehen
 * (`formatDate` aus einem Date, `guestCount` aus einer Zahl): Diese Bausteine
 * sind allgemein und werden vom naechsten Aufrufer irgendwann mit etwas
 * gefuettert, das aus einer Anfrage stammt. Dann soll der Schutz schon
 * dastehen und nicht erst nachgetragen werden muessen.
 */
function buildInfoBox(dateStr: string, guestCount: number): string {
  return `
    <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:24px 0;">
      <p style="margin:4px 0;"><strong>Datum & Zeit:</strong> ${maskiereHtml(dateStr)}</p>
      <p style="margin:4px 0;"><strong>Personen:</strong> ${maskiereHtml(guestCount)}</p>
    </div>
  `;
}

/**
 * `url` landet in einem Attribut, nicht in einem Textknoten. Die Maskierung
 * deckt beide Zusammenhaenge ab (`"` und `'` sind dabei), solange das Attribut
 * - wie hier - in Anfuehrungszeichen steht.
 */
function buildButton(url: string, label: string, color: string): string {
  return `
    <div style="text-align:center;margin:32px 0;">
      <a href="${maskiereHtml(url)}" style="background-color:${color};color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">
        ${maskiereHtml(label)}
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
        <h1 style="margin:0;font-size:22px;">${maskiereHtml(title)}</h1>
        <p style="margin:8px 0 0;opacity:.85;font-size:14px;">Powered by Maitr</p>
      </div>
      <div style="padding:28px 24px;">
        ${/* ABSICHTLICH NICHT maskiert: `body` ist bereits zusammengesetztes
             HTML der Aufrufer oben, die ihre Einzelwerte selbst maskiert
             haben. Wer hier einen neuen Aufrufer ergaenzt, maskiert dort -
             niemals ungeprueften Text direkt als `body` hereinreichen. */ ""}
        ${body}
      </div>
      <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">Diese E-Mail wurde automatisch von Maitr gesendet.</p>
      </div>
    </div>
  `;
}
