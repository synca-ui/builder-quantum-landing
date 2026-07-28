/**
 * Regeln für Subdomains – eine Quelle für Client und Server.
 *
 * Der Server hat diese Liste und die Normalisierung bislang privat in
 * server/routes/webapps.ts geführt. Solange nur der manuelle Konfigurator
 * veröffentlicht hat, fiel das nicht auf: Dort tippt ein Mensch die Subdomain
 * und liest die Fehlermeldung.
 *
 * Der automatische Modus leitet die Subdomain dagegen selbst aus dem
 * gescrapten Betriebsnamen ab. Ohne gemeinsame Regeln würde er Vorschläge
 * erzeugen, die die serverseitige Prüfung ablehnt – und der Nutzer bekäme am
 * Ende einer minutenlangen Analyse einen Validierungsfehler zu sehen, den
 * niemand mehr einordnen kann. Deshalb liegen die Regeln hier, und
 * server/routes/webapps.ts importiert sie.
 *
 * Bewusst ohne Abhängigkeiten, damit sowohl der Express-Server als auch der
 * Browser-Bundle das Modul laden können.
 */

/**
 * Namen, die für die eigene Infrastruktur reserviert sind. Unverändert aus
 * server/routes/webapps.ts übernommen.
 */
export const RESERVED_SUBDOMAINS = [
  "www",
  "admin",
  "api",
  "app",
  "mail",
  "ftp",
  "blog",
  "shop",
  "store",
  "help",
  "support",
  "info",
  "news",
  "test",
  "demo",
  "staging",
  "dev",
  "dashboard",
  "portal",
  "account",
  "accounts",
  "login",
  "signin",
  "signup",
  "auth",
  "oauth",
  "static",
  "assets",
  "cdn",
  "media",
  "images",
  "img",
  "files",
  "download",
  "downloads",
  "docs",
  "documentation",
  "status",
  "health",
  "ping",
  "metrics",
  "analytics",
  "tracking",
  "webhook",
  "webhooks",
  "graphql",
  "rest",
  "socket",
  "ws",
  "wss",
  "ssl",
  "secure",
  "maitr",
];

export const SUBDOMAIN_MIN_LENGTH = 3;
export const SUBDOMAIN_MAX_LENGTH = 63;

/** Muss mit der Prüfung in validateSubdomain übereinstimmen. */
const SUBDOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

/**
 * Bringt eine Eingabe in die Form, die als Subdomain zulässig ist.
 * Unverändert aus server/routes/webapps.ts übernommen.
 */
export function normalizeSubdomain(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, SUBDOMAIN_MAX_LENGTH);
}

/**
 * Leitet aus einem Betriebsnamen einen Subdomain-Vorschlag ab.
 *
 * Umlaute werden ausgeschrieben statt weggeworfen: normalizeSubdomain allein
 * würde aus "Café Müller" ein "caf-m-ller" machen, weil é und ü nicht im
 * erlaubten Zeichensatz liegen und einzeln zu Bindestrichen werden. Für
 * deutsche Gastronomienamen ist das der Regelfall, nicht die Ausnahme.
 *
 * Gibt null zurück, wenn sich kein zulässiger Name ableiten lässt – dann muss
 * der Nutzer selbst einen eingeben, statt dass wir etwas Unbrauchbares
 * veröffentlichen.
 */
export function suggestSubdomain(businessName: string | undefined | null): string | null {
  if (!businessName || typeof businessName !== "string") return null;

  const transliterated = businessName
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    // Alles Übrige (é, à, ç …) auf den Grundbuchstaben zurückführen.
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const candidate = normalizeSubdomain(transliterated);
  return validateSubdomain(candidate).valid ? candidate : null;
}

export interface SubdomainCheck {
  valid: boolean;
  /** Für die Oberfläche: warum nicht. Leer, wenn gültig. */
  reason?: string;
}

/**
 * Dieselben Prüfungen, die validatePublishData serverseitig anwendet.
 * Wird an beiden Enden benutzt, damit der Client nicht etwas anbietet, das der
 * Server anschließend ablehnt.
 */
export function validateSubdomain(subdomain: string): SubdomainCheck {
  if (!subdomain || subdomain.length < SUBDOMAIN_MIN_LENGTH) {
    return {
      valid: false,
      reason: `Subdomain muss mindestens ${SUBDOMAIN_MIN_LENGTH} Zeichen haben`,
    };
  }
  if (!SUBDOMAIN_PATTERN.test(subdomain)) {
    return {
      valid: false,
      reason: "Subdomain darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten",
    };
  }
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return { valid: false, reason: "Diese Subdomain ist reserviert" };
  }
  return { valid: true };
}

/**
 * Nächster freier Vorschlag, wenn der erste vergeben ist.
 *
 * Der Publish-Endpunkt kennt keine Verfügbarkeitsabfrage – er antwortet erst
 * beim Veröffentlichen mit 409. Deshalb hängt diese Funktion einen Zähler an,
 * damit der Nutzer nach einer Kollision nicht selbst raten muss.
 *
 * Die Längengrenze wird eingehalten, indem der Stamm gekürzt wird und nicht
 * das Suffix – sonst entstünden erneut Kollisionen.
 */
export function nextSubdomainCandidate(base: string, attempt: number): string {
  if (attempt <= 0) return base;
  const suffix = `-${attempt + 1}`;
  const stem = base.substring(0, SUBDOMAIN_MAX_LENGTH - suffix.length);
  return normalizeSubdomain(`${stem}${suffix}`);
}
