/**
 * NetlifyPublishService.ts
 *
 * Publish-Lifecycle für einen Nutzer-Website-Eintrag im Maitr-Baukasten.
 *
 * ARCHITEKTUR-HINWEIS:
 * ─────────────────────────────────────────────────────────────────────
 * Maitr verwendet ein SINGLE-DEPLOYMENT-Modell auf Netlify:
 *
 *   hey.maitr.de
 *       │
 *       ▼  (*.maitr.de CNAME → maitr.netlify.app  –  EIN DNS-Eintrag)
 *   Netlify liefert immer dieselbe index.html (die React-SPA)
 *       │
 *       ▼
 *   HostAwareRoot.tsx liest window.location.hostname
 *       │  subdomain = "hey"
 *       ▼
 *   fetch("/api/sites/hey")  → Railway-Backend → DB
 *       │
 *       ▼
 *   AppRenderer rendert die Nutzer-Konfiguration
 *
 * Deshalb ist KEIN Build-Hook / Re-Deploy nötig – die Website-Daten
 * werden zur Laufzeit aus der DB geladen.
 *
 * Was dieser Service erledigt:
 *   1. DB: Configuration.status  "draft" → "published"
 *   2. DB: Configuration.publishedUrl + hasDomain setzen
 *   3. DB: WebApp-Eintrag upserten (macht /api/sites/:subdomain live)
 *   4. Netlify API: EINMALIG prüfen ob *.maitr.de als Wildcard-Alias
 *      registriert ist – falls nicht, automatisch eintragen.
 *      (Muss nur EINMAL passieren, nicht pro Nutzer!)
 *
 * Benötigte Umgebungsvariablen:
 *   NETLIFY_PAT        – Personal Access Token  (optional, für Schritt 4)
 *   NETLIFY_SITE_ID    – Site-ID des maitr.de-Netlify-Sites (optional)
 *   PUBLIC_BASE_DOMAIN – z.B. "maitr.de"  (default: "maitr.de")
 */

import prisma from "../db/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PublishOptions {
  /** DB-ID der Configuration */
  configurationId: string;
  /** Clerk / interner userId */
  userId: string;
}

export interface PublishResult {
  success: boolean;
  publishedUrl: string;
  subdomain: string;
  /** true wenn der *.maitr.de-Wildcard-Alias bereits existiert oder gerade registriert wurde */
  wildcardAliasActive: boolean;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Netlify – Wildcard-Alias (einmalige Setup-Prüfung)
// ---------------------------------------------------------------------------

const NETLIFY_API = "https://api.netlify.com/api/v1";

function netlifyHeaders() {
  const token = process.env.NETLIFY_PAT;
  if (!token) throw new Error("NETLIFY_PAT ist nicht konfiguriert");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Stellt sicher, dass *.maitr.de als Wildcard-Alias auf dem Netlify-Site
 * registriert ist. Muss nur EINMAL eingerichtet werden.
 *
 * Netlify erlaubt Wildcards in domain_aliases:
 *   PATCH /sites/{id}  { "domain_aliases": ["*.maitr.de"] }
 */
async function ensureWildcardAlias(): Promise<boolean> {
  const siteId = process.env.NETLIFY_SITE_ID;
  if (!siteId || !process.env.NETLIFY_PAT) {
    console.warn(
      "[NetlifyPublish] NETLIFY_SITE_ID oder NETLIFY_PAT nicht gesetzt – Alias-Prüfung übersprungen"
    );
    return false;
  }

  const baseDomain = process.env.PUBLIC_BASE_DOMAIN || "maitr.de";
  const wildcardAlias = `*.${baseDomain}`;

  // 1. Aktuelle Aliases abrufen
  const siteRes = await fetch(`${NETLIFY_API}/sites/${siteId}`, {
    headers: netlifyHeaders(),
  });

  if (!siteRes.ok) {
    const body = await siteRes.text();
    throw new Error(`Netlify GET /sites schlug fehl (${siteRes.status}): ${body}`);
  }

  const site = (await siteRes.json()) as { domain_aliases?: string[] };
  const existing: string[] = site.domain_aliases ?? [];

  // 2. Wildcard bereits drin? Nichts tun.
  if (existing.includes(wildcardAlias)) {
    console.log(`[NetlifyPublish] ✅ Wildcard-Alias ${wildcardAlias} ist bereits registriert`);
    return true;
  }

  // 3. Wildcard-Alias registrieren
  const patchRes = await fetch(`${NETLIFY_API}/sites/${siteId}`, {
    method: "PATCH",
    headers: netlifyHeaders(),
    body: JSON.stringify({ domain_aliases: [...existing, wildcardAlias] }),
  });

  if (!patchRes.ok) {
    const body = await patchRes.text();
    throw new Error(
      `Netlify PATCH /sites schlug fehl (${patchRes.status}): ${body}`
    );
  }

  console.log(`[NetlifyPublish] ✅ Wildcard-Alias ${wildcardAlias} erfolgreich registriert`);
  return true;
}

// ---------------------------------------------------------------------------
// Main service function
// ---------------------------------------------------------------------------

export async function publishConfiguration(
  options: PublishOptions
): Promise<PublishResult> {
  const { configurationId, userId } = options;
  const baseDomain = process.env.PUBLIC_BASE_DOMAIN || "maitr.de";
  const warnings: string[] = [];

  // ── Step 0: Konfiguration laden ─────────────────────────────────────────
  const config = await prisma.configuration.findFirst({
    where: { id: configurationId, userId },
  });

  if (!config) {
    throw new Error(
      `Konfiguration ${configurationId} nicht gefunden oder nicht diesem Nutzer (${userId}) gehörend`
    );
  }

  // Subdomain aus selectedDomain oder businessName ableiten
  const rawSubdomain =
    (config as any).selectedDomain ||
    (config.businessName ?? "site")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 30) ||
    `site-${Date.now().toString(36)}`;

  const subdomain = rawSubdomain as string;
  const publishedUrl = `https://${subdomain}.${baseDomain}`;
  const now = new Date();

  // ── Step 1: DB – status → "published", URL setzen ───────────────────────
  console.log(`[NetlifyPublish] Step 1: DB-Update für ${configurationId} (${subdomain})`);
  await prisma.configuration.update({
    where: { id: configurationId },
    data: {
      status: "published",
      publishedUrl,
      hasDomain: true,       // ✅ true, weil *.maitr.de via Wildcard-Alias aktiv ist
      updatedAt: now,
    },
  });

  // ── Step 2: WebApp upserten – macht /api/sites/:subdomain live ──────────
  // Das ist der KRITISCHE Schritt: HostAwareRoot.tsx ruft
  //   fetch("/api/sites/hey")
  // auf. Ohne diesen Eintrag in der DB gibt es einen 404.
  console.log(`[NetlifyPublish] Step 2: WebApp-Eintrag für Subdomain "${subdomain}" sicherstellen`);
  await prisma.webApp.upsert({
    where: { subdomain },
    create: {
      userId,
      configId: configurationId,
      subdomain,
      configData: config as any,
      publishedAt: now,
    },
    update: {
      // Konfigurationsdaten aktuell halten, damit erneutes Publishen wirkt
      configData: config as any,
      publishedAt: now,
      updatedAt: now,
    },
  });

  console.log(`[NetlifyPublish] ✅ ${publishedUrl} ist jetzt live via /api/sites/${subdomain}`);

  // ── Step 3: Netlify – Wildcard-Alias sicherstellen (einmalig) ───────────
  // Kein Re-Deploy! Nur prüfen ob *.maitr.de registriert ist.
  console.log(`[NetlifyPublish] Step 3: Netlify Wildcard-Alias prüfen`);
  let wildcardAliasActive = false;
  try {
    wildcardAliasActive = await ensureWildcardAlias();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[NetlifyPublish] Wildcard-Alias-Prüfung fehlgeschlagen (non-fatal):", msg);
    warnings.push(`Netlify-Alias-Prüfung: ${msg}`);
    // ⚠️ Non-fatal – die Seite ist trotzdem live, wenn *.maitr.de
    // bereits manuell als DNS-Eintrag konfiguriert ist.
  }

  return {
    success: true,
    publishedUrl,
    subdomain,
    wildcardAliasActive,
    warnings,
  };
}
