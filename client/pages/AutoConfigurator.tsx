import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import Headbar from "@/components/Headbar";
import { useConfiguratorStore } from "@/store/configuratorStore";
import {
  suggestedConfigToDraft,
  describeDraft,
  type ConfiguratorDraft,
  type SuggestedConfig,
} from "@shared/suggestedConfig";
import { buildPublishConfig, countExternalImages } from "@shared/autoPublish";
import {
  suggestSubdomain,
  nextSubdomainCandidate,
  normalizeSubdomain,
  validateSubdomain,
} from "@shared/subdomain";
import { menuQuality, type ParsedMenuItem } from "@shared/menuParser";
import { API_PATHS } from "@/lib/apiPaths";
import {
  Sparkles,
  Upload,
  X,
  ChevronRight,
  ArrowLeft,
  Globe,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Utensils,
  Camera,
  Zap,
  Search,
  Rocket,
  ExternalLink,
} from "lucide-react";

// ─── Typen ────────────────────────────────────────────────────────────────────
type GenStatus = "idle" | "loading" | "done" | "error";

/** Zustand des Veröffentlichens, unabhängig vom Zustand der Analyse. */
type PublishStatus = "idle" | "publishing" | "published" | "error";

/** Zustand der Speisekarten-Erkennung, unabhängig von beidem. */
type MenuStatus = "idle" | "running" | "done" | "failed";

/**
 * Wie oft bei belegter Subdomain ein Zähler angehängt wird, bevor der Nutzer
 * selbst einen Namen wählen muss. Der Publish-Endpunkt kennt keine
 * Verfügbarkeitsabfrage – jeder Versuch ist ein echter Aufruf, deshalb eine
 * kleine Zahl.
 */
const MAX_SUBDOMAIN_ATTEMPTS = 5;

interface ScraperJob {
  id?: string;
  status?: string;
  businessName?: string | null;
  businessType?: string | null;
  websiteUrl?: string;
  phone?: string | null;
  email?: string | null;
  instagramUrl?: string | null;
  menuUrl?: string | null;
  hasReservation?: boolean;
  analysisFeedback?: string | null;
  maitrScore?: number | null;
  suggestedConfig?: SuggestedConfig | null;
  photos?: string[];
  extractedData?: any;
}

/**
 * Woran der Job beim Abfragen erkannt wird.
 *
 * "id"  -> GET /api/scraper/:id, angemeldet und auf den Besitzer eingegrenzt.
 * "websiteUrl" -> GET /api/scraper-job/full, ohne Anmeldung. Dieser Weg gibt zu
 * jeder bekannten URL die Kontaktdaten des Betriebs heraus, auch fremde. Er ist
 * nur der Übergangsweg, bis die Zeile von der App selbst angelegt wird und wir
 * eine jobId haben.
 */
/**
 * Abgefragt wird ausschließlich über die Job-ID gegen den besitzgebundenen
 * GET /api/scraper/:id. Der frühere Weg über die websiteUrl lief gegen
 * /api/scraper-job/full — einen unauthentifizierten Endpunkt, der die
 * Kontaktdaten jedes gescrapten Betriebs herausgab. Der ist jetzt geschlossen.
 */
type JobLookup = { kind: "id"; jobId: string };

type PollOutcome =
  /** Zeile gefunden – kann trotzdem noch unvollständig sein. */
  | { kind: "job"; job: ScraperJob }
  /** Noch nichts da oder Netz-Aussetzer – weiter versuchen. */
  | { kind: "pending" }
  /** Zeile existiert nicht (mehr) – nach ein paar Versuchen abbrechen. */
  | { kind: "missing" }
  /** Abbruch: nicht angemeldet oder der Job gehört jemand anderem. */
  | { kind: "denied"; reason: "unauthenticated" | "foreign" };

// Der Deep-Scrape braucht üblicherweise 1–3 Minuten. Danach hängt er, und ewiges
// Warten hilft niemandem.
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 6 * 60 * 1000;
const SLOW_HINT_AFTER_MS = 100 * 1000;

/**
 * Index von "business-info" in CONFIGURATOR_STEPS_CONFIG (client/pages/Configurator.tsx).
 * Dorthin springen wir nach dem Übernehmen: Dort stehen genau die Felder, die der
 * Scrape gefüllt hat, und die Vorschau daneben zeigt den echten Namen statt
 * "Dein Geschäft".
 */
const STEP_BUSINESS_INFO = 1;

/**
 * Die Spalte suggestedConfig ist mal ein Objekt, mal ein JSON-String – der
 * Deep-Scrape-Flow schreibt sie per JSON.stringify, und ob das beim Lesen
 * geparst zurückkommt, hängt am Spaltentyp. /api/scraper-job/full räumt das
 * bereits auf, /api/scraper/:id reicht die Prisma-Zeile roh durch.
 */
function parseSuggested(value: unknown): SuggestedConfig | null {
  if (!value) return null;
  if (typeof value === "object") return value as SuggestedConfig;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object"
        ? (parsed as SuggestedConfig)
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeJob(raw: any): ScraperJob | null {
  if (!raw || typeof raw !== "object") return null;
  return { ...raw, suggestedConfig: parseSuggested(raw.suggestedConfig) };
}

/**
 * Eine einzelne Abfrage des Jobs. Beide Wege liefern dieselbe Form, damit der
 * Wechsel vom unauthentifizierten auf den authentifizierten Endpunkt nur die
 * Wahl des JobLookup betrifft und nicht die Schleife darüber.
 */
async function fetchScraperJob(
  lookup: JobLookup,
  getToken: () => Promise<string | null>,
  signal: AbortSignal,
): Promise<PollOutcome> {
  const token = await getToken();

  // Ohne Token braucht die Anfrage gar nicht erst rauszugehen: Der Endpunkt
  // verlangt Anmeldung, und ein 401 würde sonst als "gehört einem anderen
  // Konto" gedeutet – die falsche Ursache.
  if (!token) return { kind: "denied", reason: "unauthenticated" };

  const res = await fetch(`/api/scraper/${encodeURIComponent(lookup.jobId)}`, {
    signal,
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) {
    return { kind: "denied", reason: "foreign" };
  }
  // 404 heißt hier nicht "noch nicht fertig": Die Zeile wurde soeben angelegt,
  // sie MUSS existieren. Ein paar Versuche Toleranz für Replikationsverzug,
  // danach abbrechen statt den Nutzer die volle Zeit warten zu lassen.
  if (res.status === 404) return { kind: "missing" };
  if (!res.ok) return { kind: "pending" };

  const payload = await res.json();
  const job = normalizeJob(payload?.data);
  return job ? { kind: "job", job } : { kind: "pending" };
}

type TriggerResult =
  | { kind: "ok"; lookup: JobLookup }
  | { kind: "error"; message: string };

/**
 * Stößt die Analyse an und sagt, worüber danach abgefragt wird.
 *
 * Beide Wege stehen hier vollständig; welcher genommen wird, entscheidet
 * USE_OWNED_SCRAPER_JOB (siehe dort).
 */
async function triggerScrape(params: {
  link: string;
  mapsLink: string;
  businessName: string;
  menuFile: { name: string; base64: string } | null;
  getToken: () => Promise<string | null>;
  isSignedIn: boolean;
}): Promise<TriggerResult> {
  const { link, mapsLink, businessName, menuFile, getToken, isSignedIn } =
    params;

  if (!isSignedIn) {
    return {
      kind: "error",
      message:
        "Bitte melde dich an — die Analyse wird deinem Konto zugeordnet, damit nur du sie abrufen kannst.",
    };
  }

  const token = await getToken();
  if (!token) {
    return {
      kind: "error",
      message: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.",
    };
  }

  try {
    // Ein einziger Weg: Die App legt die Zeile mit userId an und stößt n8n an.
    // Der Entry-Flow upsertet danach auf websiteUrl, ohne userId zu schreiben —
    // der Besitzer bleibt also erhalten, und nur er kann das Ergebnis abrufen.
    const res = await fetch("/api/scraper", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        websiteUrl: link,
        businessName: businessName || undefined,
        mapsLink: mapsLink || undefined,
        menuFile: menuFile
          ? { name: menuFile.name, base64: menuFile.base64 }
          : undefined,
      }),
    });
    const payload = await res.json().catch(() => null);

    if (res.ok && typeof payload?.jobId === "string") {
      return { kind: "ok", lookup: { kind: "id", jobId: payload.jobId } };
    }

    return {
      kind: "error",
      message:
        payload?.message ||
        payload?.error ||
        `Die Analyse konnte nicht gestartet werden (HTTP ${res.status}).`,
    };
  } catch (err) {
    console.error("[AutoKonfigurator] POST /api/scraper fehlgeschlagen", err);
    return {
      kind: "error",
      message:
        "Die Analyse konnte nicht gestartet werden — bitte prüfe deine Verbindung.",
    };
  }
}

// ─── Schritt-Definitionen für Loading-Animation ───────────────────────────────
const STEPS = [
  { icon: Search, label: "Webseite wird analysiert", delay: 0 },
  { icon: MapPin, label: "Google Maps Daten werden extrahiert", delay: 6000 },
  { icon: Utensils, label: "Speisekarte wird gescrappt", delay: 14000 },
  { icon: Camera, label: "Fotos werden gesammelt", delay: 22000 },
  { icon: Zap, label: "Vibe & Atmosphäre wird analysiert", delay: 32000 },
  { icon: Sparkles, label: "Konfiguration wird erstellt", delay: 42000 },
];

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function getFileTypeLabel(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf"].includes(ext)) return "PDF";
  if (["csv", "xlsx", "xls"].includes(ext)) return "Tabelle";
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "Bild";
  return "Datei";
}

// ─── Haupt-Komponente ────────────────────────────────────────────────────────
export default function AutoConfigurator() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { toast } = useToast();
  const { getToken, isSignedIn } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Beendet die laufende Abfrage-Schleife (Timer + offener Request). */
  const stopPollRef = useRef<(() => void) | null>(null);

  // Formular-Felder
  const [url, setUrl] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    base64: string;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Status
  const [genStatus, setGenStatus] = useState<GenStatus>("idle");
  const [activeStep, setActiveStep] = useState(0);
  const [result, setResult] = useState<ScraperJob | null>(null);
  const [slowHint, setSlowHint] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ergebnis der Übersetzung Scrape -> Konfigurator
  const [draft, setDraft] = useState<ConfiguratorDraft | null>(null);

  // Speisekarten-Erkennung
  const [menuStatus, setMenuStatus] = useState<MenuStatus>("idle");
  const [menuNote, setMenuNote] = useState<string | null>(null);
  const menuFileInputRef = useRef<HTMLInputElement>(null);

  // Direkt veröffentlichen (ohne den manuellen Konfigurator)
  const [subdomain, setSubdomain] = useState("");
  const [publishStatus, setPublishStatus] = useState<PublishStatus>("idle");
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Konfigurator-Zustand: nur was für die Warnung und das Übernehmen nötig ist.
  const applyScrapedDraft = useConfiguratorStore((s) => s.applyScrapedDraft);
  const pushHistory = useConfiguratorStore((s) => s.pushHistory);
  const setCurrentStep = useConfiguratorStore((s) => s.setCurrentStep);
  const existingBusinessName = useConfiguratorStore((s) => s.business.name);
  const existingMenuCount = useConfiguratorStore(
    (s) => s.content.menuItems.length,
  );
  const existingGalleryCount = useConfiguratorStore(
    (s) => s.content.gallery.length,
  );
  const hasExistingData =
    Boolean(existingBusinessName?.trim()) ||
    existingMenuCount > 0 ||
    existingGalleryCount > 0;

  const draftLines = describeDraft(draft);

  // Was beim direkten Veröffentlichen herauskäme. useMemo, weil das Ergebnis
  // in mehrere Stellen der Anzeige einfließt und der Entwurf sich nur beim
  // Abschluss der Analyse ändert.
  const publishPlan = useMemo(() => buildPublishConfig(draft), [draft]);
  const menuItemCount = draft?.content.menuItems?.length ?? 0;
  const menuCategoryCount = draft?.content.categories?.length ?? 0;
  const externalImageCount = useMemo(() => countExternalImages(draft), [draft]);
  const subdomainCheck = useMemo(
    () => validateSubdomain(subdomain),
    [subdomain],
  );
  const canPublish =
    Boolean(publishPlan.config) &&
    subdomainCheck.valid &&
    publishStatus !== "publishing";

  // Clerk gibt getToken bei jedem Render als neue Funktion heraus. Direkt in
  // Abhängigkeitslisten benutzt, würde der Vorlade-Effekt unten bei jedem
  // Render erneut laufen – und weil er setBusinessName aufruft, wäre das eine
  // Schleife. Über die Ref bleibt der Zugriff stabil.
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const getAuthToken = useCallback(() => getTokenRef.current(), []);

  // ── URL-Params auslesen + ScraperJob pre-fill ────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(search);
    const src = params.get("sourceLink");
    if (!src) return;
    const decoded = decodeURIComponent(src);
    if (/maps/i.test(decoded)) setMapsLink(decoded);
    else setUrl(decoded);

    // Früher wurde hier über die websiteUrl der Betriebsname vorgeladen. Das
    // lief gegen /api/scraper-job/full — unauthentifiziert und für jede fremde
    // URL abfragbar. Ohne jobId gibt es keinen besitzgebundenen Weg dorthin,
    // und der Name ist ein optionales Feld, das der Nutzer ohnehin tippt.
    // Deshalb ersatzlos gestrichen statt durch einen 401-Aufruf ersetzt.
  }, [search]);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopPollRef.current?.();
    };
  }, []);

  // ── Datei-Upload ─────────────────────────────────────────────────────────
  const handleFile = useCallback(
    async (f?: File) => {
      if (!f) {
        setFileInfo(null);
        return;
      }
      try {
        const base64 = await fileToBase64(f);
        setFileInfo({ name: f.name, base64 });
      } catch {
        toast({
          title: "Fehler",
          description: "Datei konnte nicht gelesen werden.",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  // ── Step-Animation ────────────────────────────────────────────────────────
  function startStepAnimation() {
    setActiveStep(0);
    STEPS.forEach((step, i) => {
      if (i === 0) return;
      setTimeout(() => setActiveStep(i), step.delay);
    });
  }

  // ── Polling für Job-Abschluss ─────────────────────────────────────────────
  const failWith = useCallback(
    (title: string, description: string) => {
      setGenStatus("error");
      setErrorMessage(description);
      toast({ title, description, variant: "destructive" });
    },
    [toast],
  );

  // ── Speisekarte erkennen ──────────────────────────────────────────────────

  /**
   * Lässt eine Speisekarte serverseitig erkennen und übernimmt die Gerichte
   * in den Entwurf.
   *
   * Zwei Auslöser: automatisch nach der Analyse, wenn der Scrape eine
   * Menü-Adresse gefunden, daraus aber keine Gerichte gezogen hat – und von
   * Hand, wenn jemand ein Foto der Karte hochlädt.
   *
   * Das ist bewusst ein eigener Schritt nach der Analyse und kein Teil davon:
   * Der n8n-Zweig für Speisekarten war nie funktionsfähig (siehe
   * server/services/gemini.ts), und selbst wenn er es wäre, soll ein Fehlschlag
   * hier nicht den ganzen Durchlauf verwerfen. Ohne Karte ist die Web-App
   * schwächer, aber immer noch brauchbar.
   */
  const recogniseMenu = useCallback(
    async (input: { url: string } | { file: File }) => {
      setMenuStatus("running");
      setMenuNote(null);

      const token = await getAuthToken();
      if (!token) {
        setMenuStatus("failed");
        setMenuNote("Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.");
        return;
      }

      try {
        // Datei als multipart, Adresse als JSON – derselbe Endpunkt.
        const isFile = "file" in input;
        const res = await fetch(API_PATHS.extractMenu, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            ...(isFile ? {} : { "Content-Type": "application/json" }),
          },
          body: isFile
            ? (() => {
                const form = new FormData();
                form.append("file", input.file);
                return form;
              })()
            : JSON.stringify({ url: input.url }),
        });

        const payload = await res.json().catch(() => null);

        if (!res.ok || !payload?.success) {
          setMenuStatus("failed");
          setMenuNote(
            payload?.error ??
              `Die Speisekarte konnte nicht gelesen werden (HTTP ${res.status}).`,
          );
          return;
        }

        const items = Array.isArray(payload.items) ? payload.items : [];
        if (!items.length) {
          setMenuStatus("failed");
          // Die Begründung kommt vom Server (diagnostics) – sie sagt, ob es an
          // der Datei lag oder an fehlender Konfiguration.
          setMenuNote(
            Array.isArray(payload.diagnostics) && payload.diagnostics.length
              ? String(payload.diagnostics[payload.diagnostics.length - 1])
              : "In dieser Datei war keine Speisekarte zu erkennen.",
          );
          return;
        }

        setDraft((current) => {
          if (!current) return current;
          const categories = [
            ...new Set(
              items
                .map((i: { category?: string }) => i.category)
                .filter(Boolean) as string[],
            ),
          ];
          return {
            ...current,
            content: {
              ...current.content,
              menuItems: items,
              ...(categories.length ? { categories } : {}),
            },
          };
        });

        setMenuStatus("done");
        setMenuNote(null);
        toast({
          title: "Speisekarte erkannt",
          description: `${items.length} ${items.length === 1 ? "Gericht" : "Gerichte"} übernommen.`,
        });
      } catch (err) {
        console.error("[AutoKonfigurator] Speisekarten-Erkennung fehlgeschlagen", err);
        setMenuStatus("failed");
        setMenuNote(
          "Die Speisekarte konnte nicht gelesen werden — bitte prüfe deine Verbindung.",
        );
      }
    },
    [getAuthToken, toast],
  );

  const handleMenuUpload = useCallback(
    (f?: File) => {
      if (f) void recogniseMenu({ file: f });
    },
    [recogniseMenu],
  );

  /**
   * Fragt den Job bis zum Ergebnis ab.
   *
   * Bewusst eine Kette aus setTimeout statt setInterval: Bei einer langsamen
   * Antwort würde setInterval den nächsten Aufruf starten, bevor der vorige
   * durch ist – Antworten überholen sich dann gegenseitig. Die Abbruchgrenze
   * hängt außerdem an der Uhr und nicht an der Zahl der Versuche, sonst
   * verschiebt sie sich mit jeder langsamen Antwort.
   */
  const startPolling = useCallback(
    (lookup: JobLookup) => {
      stopPollRef.current?.();

      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let missingCount = 0;
      const controller = new AbortController();
      const deadline = Date.now() + POLL_TIMEOUT_MS;

      const hintTimer = setTimeout(() => setSlowHint(true), SLOW_HINT_AFTER_MS);

      const stop = () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
        clearTimeout(hintTimer);
        controller.abort();
        // Nur die eigene Anmeldung zurücknehmen – sonst würde ein spät
        // eintreffendes stop() einen bereits gestarteten neuen Lauf abmelden.
        if (stopPollRef.current === stop) stopPollRef.current = null;
      };
      stopPollRef.current = stop;

      const tick = async () => {
        if (cancelled) return;

        if (Date.now() > deadline) {
          stop();
          failWith(
            "Zeitüberschreitung",
            "Die Analyse läuft seit über sechs Minuten ohne Ergebnis. Der Scraper hängt vermutlich – bitte versuche es später noch einmal.",
          );
          return;
        }

        try {
          const outcome = await fetchScraperJob(
            lookup,
            getAuthToken,
            controller.signal,
          );
          if (cancelled) return;

          if (outcome.kind === "denied") {
            stop();
            failWith(
              "Kein Zugriff",
              outcome.reason === "unauthenticated"
                ? "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an."
                : "Diese Analyse gehört zu einem anderen Konto. Bitte melde dich mit dem richtigen Konto an.",
            );
            return;
          }

          // Die Zeile wurde soeben angelegt — ein 404 ist also ein echter
          // Fehler, kein "noch nicht fertig". Ein paar Versuche Toleranz für
          // Replikationsverzug, dann abbrechen statt sechs Minuten warten.
          if (outcome.kind === "missing") {
            missingCount += 1;
            if (missingCount >= 3) {
              stop();
              failWith(
                "Analyse nicht gefunden",
                "Die gestartete Analyse ist nicht mehr auffindbar. Bitte versuche es erneut.",
              );
              return;
            }
          } else {
            missingCount = 0;
          }

          if (outcome.kind === "job") {
            const job = outcome.job;

            // Zwischenergebnisse sofort anzeigen, statt den Nutzer bis zum
            // Abschluss vor einem leeren Bildschirm warten zu lassen.
            setResult(job);

            // FERTIG ist der Vorgang erst, wenn suggestedConfig da ist – nicht
            // bei status === "completed".
            //
            // Grund: Es gibt zwei n8n-Flows. Der Entry-Flow legt die Zeile an
            // und setzt dabei bereits status: "completed" (fest verdrahtet in
            // seinem Code-Knoten, ebenso isDeepScrapeReady: true), BEVOR er den
            // Deep-Scrape-Flow überhaupt anstößt. Erst dieser zweite Flow
            // ermittelt Speisekarte, Galerie, Farben und Öffnungszeiten und
            // schreibt sie als suggestedConfig weg.
            //
            // Auf status zu warten hieß also, auf das flache Ergebnis des ersten
            // Flows zu reagieren – die eigentlichen Daten waren dann noch gar
            // nicht erhoben. isDeepScrapeReady taugt aus demselben Grund nicht
            // als Signal.
            if (job.suggestedConfig) {
              stop();
              const nextDraft = suggestedConfigToDraft(job.suggestedConfig);
              if (!nextDraft) {
                // Ehrlich bleiben: Die Analyse ist durchgelaufen, hat aber
                // nichts geliefert, womit sich ein Entwurf füllen ließe.
                failWith(
                  "Nichts Verwertbares gefunden",
                  "Die Analyse ist durchgelaufen, konnte der Seite aber keine brauchbaren Daten entnehmen. Der manuelle Konfigurator führt hier schneller zum Ziel.",
                );
                return;
              }
              setDraft(nextDraft);
              const scrapedMenu = (nextDraft.content.menuItems ??
                []) as ParsedMenuItem[];
              // Subdomain aus dem gefundenen Namen vorschlagen. Schlägt das
              // fehl (kein Name, oder nach dem Bereinigen zu kurz), bleibt das
              // Feld leer und die Oberfläche verlangt eine Eingabe – besser
              // als unter einem unbrauchbaren Namen zu veröffentlichen.
              setSubdomain(suggestSubdomain(nextDraft.business.name) ?? "");
              setGenStatus("done");

              // Speisekarte nachziehen, wenn der Scrape keine brauchbare
              // geliefert hat.
              //
              // Bewusst an der QUALITÄT festgemacht und nicht daran, ob
              // überhaupt etwas da ist: Der Menü-Zweig des n8n-Flows lieferte
              // durch den Binärfehler nie etwas (siehe server/services/gemini.ts),
              // und selbst repariert liefe er über einen ungetesteten
              // Regex-Ausdruck. Ein einzelnes Gericht aus einer zwölfseitigen
              // Karte hieße "erkannt" und würde unseren geprüften Weg
              // überspringen – deshalb entscheidet menuQuality.
              if (!menuQuality(scrapedMenu).usable && job.menuUrl) {
                void recogniseMenu({ url: job.menuUrl });
              }
              toast({
                title: "Analyse fertig",
                description: "Schau dir an, was wir gefunden haben.",
              });
              return;
            }

            if (job.status === "failed") {
              stop();
              failWith(
                "Analyse fehlgeschlagen",
                "Der Scraper konnte die Seite nicht auswerten. Bitte prüfe die URL.",
              );
              return;
            }
          }
        } catch {
          // Netz-Aussetzer oder abgebrochener Request: einfach weiter versuchen.
        }

        if (cancelled) return;
        timer = setTimeout(tick, POLL_INTERVAL_MS);
      };

      void tick();
    },
    // recogniseMenu wird aus der Schleife heraus angestoßen, sobald der Entwurf
    // steht – deshalb muss es hier stehen. Es ist oberhalb definiert, sonst
    // liefe diese Liste beim ersten Render in die temporale Todeszone.
    [failWith, getAuthToken, toast, recogniseMenu],
  );

  // ── Generierung starten ───────────────────────────────────────────────────
  const generate = useCallback(async () => {
    const link = url.trim() || mapsLink.trim();
    if (!link) {
      toast({
        title: "URL fehlt",
        description: "Bitte gib eine Website-URL oder Google Maps Link ein.",
        variant: "destructive",
      });
      return;
    }

    setGenStatus("loading");
    setResult(null);
    setDraft(null);
    setErrorMessage(null);
    setSlowHint(false);
    startStepAnimation();

    const trigger = await triggerScrape({
      link,
      mapsLink,
      businessName,
      menuFile: fileInfo,
      getToken: getAuthToken,
      isSignedIn: Boolean(isSignedIn),
    });

    if (trigger.kind === "error") {
      failWith("Analyse nicht möglich", trigger.message);
      return;
    }

    startPolling(trigger.lookup);
  }, [
    url,
    mapsLink,
    businessName,
    fileInfo,
    toast,
    startPolling,
    failWith,
    getAuthToken,
    isSignedIn,
  ]);

  // ── Direkt veröffentlichen ────────────────────────────────────────────────

  /**
   * Veröffentlicht den Entwurf unter einer Subdomain, ohne Umweg über den
   * manuellen Konfigurator.
   *
   * Die Kollisionsbehandlung steckt hier und nicht im Server: Der
   * Publish-Endpunkt hat keine Verfügbarkeitsabfrage, er antwortet erst beim
   * Schreiben mit 409. Statt den Nutzer raten zu lassen, wird der Name
   * durchnummeriert – aber nur ein paar Mal, denn jeder Versuch ist ein
   * echter Schreibvorgang.
   *
   * Wichtig: Ein 409 kommt NUR, wenn die Subdomain jemand anderem gehört.
   * Gehört sie dem Aufrufer selbst, aktualisiert der Endpunkt sie – erneutes
   * Veröffentlichen derselben Seite überschreibt also die eigene und legt
   * keine Kopie an.
   */
  const publishDirectly = useCallback(async () => {
    const config = publishPlan.config;
    if (!config) return;

    const base = normalizeSubdomain(subdomain);
    const check = validateSubdomain(base);
    if (!check.valid) {
      setPublishError(check.reason ?? "Subdomain ist ungültig");
      setPublishStatus("error");
      return;
    }

    setPublishStatus("publishing");
    setPublishError(null);

    const token = await getAuthToken();
    if (!token) {
      setPublishStatus("error");
      setPublishError("Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.");
      return;
    }

    for (let attempt = 0; attempt < MAX_SUBDOMAIN_ATTEMPTS; attempt++) {
      const candidate = nextSubdomainCandidate(base, attempt);
      try {
        const res = await fetch(API_PATHS.publishApp, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ subdomain: candidate, config }),
        });
        const payload = await res.json().catch(() => null);

        if (res.status === 409) {
          // Vergeben – nächsten Namen probieren, ohne den Nutzer zu fragen.
          continue;
        }

        if (!res.ok || !payload?.success) {
          setPublishStatus("error");
          // errors[] enthält die einzelnen Validierungsgründe; sie sind
          // aussagekräftiger als das pauschale "Validierung fehlgeschlagen".
          setPublishError(
            Array.isArray(payload?.errors) && payload.errors.length
              ? payload.errors.join(" · ")
              : (payload?.error ??
                `Veröffentlichen fehlgeschlagen (HTTP ${res.status}).`),
          );
          return;
        }

        setSubdomain(candidate);
        setPublishedUrl(
          payload.publishedUrl ?? `https://${candidate}.maitr.de`,
        );
        setPublishStatus("published");
        toast({
          title: "Web-App ist live",
          description: `Erreichbar unter ${candidate}.maitr.de`,
        });
        return;
      } catch (err) {
        console.error("[AutoKonfigurator] Veröffentlichen fehlgeschlagen", err);
        setPublishStatus("error");
        setPublishError(
          "Veröffentlichen fehlgeschlagen — bitte prüfe deine Verbindung.",
        );
        return;
      }
    }

    setPublishStatus("error");
    setPublishError(
      `„${base}" und die nächsten ${MAX_SUBDOMAIN_ATTEMPTS - 1} Varianten sind vergeben. Bitte wähle selbst einen Namen.`,
    );
  }, [publishPlan.config, subdomain, getAuthToken, toast]);

  // ── Entwurf übernehmen → Konfigurator ─────────────────────────────────────
  const applyDraftAndOpenConfigurator = useCallback(() => {
    if (!draft) return;

    // Erst sichern, dann überschreiben: Im Konfigurator holt "Rückgängig" den
    // vorherigen Stand zurück, falls der Scrape danebenlag.
    pushHistory();
    applyScrapedDraft(draft);
    setCurrentStep(STEP_BUSINESS_INFO);

    toast({
      title: "Daten übernommen",
      description: "Prüfe die Angaben und passe an, was nicht stimmt.",
    });
    navigate("/configurator/manual");
  }, [draft, pushHistory, applyScrapedDraft, setCurrentStep, toast, navigate]);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-teal-50/40 to-gray-100">
      {/* Maitr-Standard-Header */}
      <Headbar title="Automatisch" />

      {/* Zurück-Button direkt unter Header */}
      <div className="max-w-6xl mx-auto px-5 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Auswahl
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-5 pb-16">
        {/* Seiten-Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-50 to-orange-50">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              Website automatisch generieren
            </h1>
          </div>
          <p className="text-sm text-gray-500">
            Gib eine Website-URL oder einen Google Maps Link ein. Wir
            extrahieren alles automatisch — Fotos, Speisekarte, Kontakt, Vibe.
          </p>
        </div>

        {/* Zwei-Spalten-Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ── LINKS: Formular ─────────────────────────────────────────── */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col">
            <div className="space-y-4 flex-1">
              <Field
                label="Website URL"
                value={url}
                onChange={setUrl}
                placeholder="https://kleiner-kiepenkerl.de"
              />

              <Field
                label="Google Maps Link"
                value={mapsLink}
                onChange={setMapsLink}
                placeholder="https://maps.app.goo.gl/..."
                hint="Optional — hilft uns Adresse & Kontaktdaten zu finden"
              />

              <Field
                label="Restaurantname"
                value={businessName}
                onChange={setBusinessName}
                placeholder="Café Central"
                hint="Optional — wird als Fallback genutzt, falls nicht auf der Website gefunden"
              />

              {/* Datei-Upload: PDF, Bild, CSV */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Speisekarte{" "}
                  <span className="font-normal normal-case text-gray-400">
                    (optional)
                  </span>
                </label>

                {!fileInfo ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${dragOver
                      ? "border-purple-400 bg-purple-50"
                      : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                      }`}
                  >
                    <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1.5" />
                    <p className="text-xs text-gray-500">
                      <span className="font-semibold text-purple-600">
                        Klicken zum Hochladen
                      </span>{" "}
                      oder per Drag & Drop
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      PDF, JPG, PNG oder CSV
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800 truncate max-w-[180px]">
                          {fileInfo.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {getFileTypeLabel(fileInfo.name)} hochgeladen
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFileInfo(null)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.csv,.xlsx,.xls,image/*"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                  className="hidden"
                />
              </div>
            </div>

            {/* CTA */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <Button
                onClick={generate}
                disabled={genStatus === "loading"}
                className="w-full bg-gradient-to-r from-purple-500 to-orange-500 text-white text-sm font-bold shadow-sm hover:shadow-md transition-shadow h-12 rounded-xl"
              >
                {genStatus === "loading" ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Analyse läuft…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Automatisch generieren
                  </span>
                )}
              </Button>

              {genStatus === "idle" && (
                <p className="text-xs text-gray-400 text-center mt-2">
                  Dauert ca. 1–3 Minuten · Fotos, Menü & Atmosphäre werden
                  analysiert
                </p>
              )}
            </div>
          </div>

          {/* ── RECHTS: Loading-Animation / Ergebnis-Preview ────────────── */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col overflow-hidden">
            {/* Idle-Zustand */}
            {genStatus === "idle" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-orange-100 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    Noch keine Analyse
                  </p>
                  <p className="text-xs text-gray-400 max-w-[220px]">
                    Klicke auf „Automatisch generieren" um den Workflow zu
                    starten.
                  </p>
                </div>
                {/* Was wird extrahiert */}
                <div className="grid grid-cols-2 gap-2 mt-2 w-full max-w-xs text-left">
                  {[
                    { icon: Globe, text: "Kontaktdaten" },
                    { icon: Utensils, text: "Speisekarte" },
                    { icon: Camera, text: "Fotos" },
                    { icon: Zap, text: "Vibe-Analyse" },
                  ].map(({ icon: Icon, text }) => (
                    <div
                      key={text}
                      className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <Icon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading-Zustand: Schritt-Animation */}
            {genStatus === "loading" && (
              <div className="flex-1 flex flex-col justify-center p-8">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6 text-center">
                  Workflow läuft
                </p>

                <div className="space-y-3">
                  {STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const done = i < activeStep;
                    const active = i === activeStep;
                    const pending = i > activeStep;
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500 ${active
                          ? "bg-purple-50 border border-purple-100"
                          : done
                            ? "bg-green-50 border border-green-100 opacity-70"
                            : "bg-gray-50 border border-transparent opacity-40"
                          }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active
                            ? "bg-purple-100"
                            : done
                              ? "bg-green-100"
                              : "bg-gray-100"
                            }`}
                        >
                          {done ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <Icon
                              className={`w-4 h-4 ${active ? "text-purple-500" : "text-gray-400"}`}
                            />
                          )}
                        </div>
                        <span
                          className={`text-sm font-medium ${active
                            ? "text-purple-700"
                            : done
                              ? "text-green-700"
                              : "text-gray-400"
                            }`}
                        >
                          {step.label}
                        </span>
                        {active && (
                          <span className="ml-auto">
                            <svg
                              className="animate-spin h-4 w-4 text-purple-400"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                              />
                            </svg>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-gray-400 text-center mt-6">
                  Bitte warte — dies kann 1–3 Minuten dauern.
                </p>

                {slowHint && (
                  <p className="text-xs text-amber-600 text-center mt-2">
                    Das dauert diesmal länger als üblich. Wir warten noch bis zu
                    sechs Minuten, danach brechen wir ab.
                  </p>
                )}
              </div>
            )}

            {/* Fehler-Zustand */}
            {genStatus === "error" && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-red-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700">
                  Analyse fehlgeschlagen
                </p>
                <p className="text-xs text-gray-500 max-w-[260px] leading-relaxed">
                  {errorMessage ??
                    "Bitte überprüfe die URL und versuche es erneut."}
                </p>
                <div className="flex flex-col items-center gap-2 mt-2">
                  <Button
                    onClick={() => {
                      setErrorMessage(null);
                      setGenStatus("idle");
                    }}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Nochmal versuchen
                  </Button>
                  <button
                    onClick={() => navigate("/configurator/manual")}
                    className="text-xs text-gray-400 underline hover:text-gray-600 transition-colors"
                  >
                    Stattdessen manuell konfigurieren
                  </button>
                </div>
              </div>
            )}

            {/* Done-Zustand: gefundene Daten zeigen und bestätigen lassen */}
            {genStatus === "done" && draft && (
              <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="px-6 pt-5 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      Analyse abgeschlossen
                    </span>
                  </div>
                </div>

                {/* Extrahierte Daten */}
                <div className="flex-1 overflow-auto p-5 space-y-3">
                  {/* Was übernommen wird – ein Scrape kann danebenliegen,
                      deshalb erst zeigen, dann übernehmen. */}
                  <div className="p-3.5 bg-teal-50/70 rounded-xl border border-teal-100">
                    <p className="text-xs font-semibold text-teal-800 mb-2">
                      Das übernehmen wir in deine Konfiguration
                    </p>
                    {draftLines.length > 0 ? (
                      <ul className="space-y-1">
                        {draftLines.map((line) => (
                          <li
                            key={line}
                            className="flex items-start gap-2 text-xs text-gray-700"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-px" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-600">
                        Nur Basisdaten — Farben, Bilder und Speisekarte konnten
                        wir auf der Seite nicht finden.
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                      Alles lässt sich danach im Konfigurator ändern.
                    </p>
                  </div>

                  {/* Speisekarte: der wichtigste Einzelposten. Deshalb eigener
                      Block mit eigenem Zustand statt einer Zeile in der Liste. */}
                  <div className="p-3.5 rounded-xl border border-gray-200 bg-white">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Utensils className="w-4 h-4 text-purple-500 shrink-0" />
                      <span className="text-xs font-semibold text-gray-800">
                        Speisekarte
                      </span>
                      {menuStatus === "running" && (
                        <svg
                          className="animate-spin h-3.5 w-3.5 text-purple-400 ml-auto"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          />
                        </svg>
                      )}
                    </div>

                    {menuItemCount > 0 ? (
                      <p className="text-xs text-gray-700">
                        {menuItemCount}{" "}
                        {menuItemCount === 1 ? "Gericht" : "Gerichte"} erkannt
                        {menuCategoryCount > 1
                          ? ` in ${menuCategoryCount} Kategorien`
                          : ""}
                        .
                      </p>
                    ) : menuStatus === "running" ? (
                      <p className="text-xs text-gray-500">
                        Die Karte wird gelesen — das dauert bei einem PDF
                        einen Moment.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {menuNote ??
                            "Auf der Website war keine Speisekarte zu finden."}{" "}
                          Lade ein Foto oder ein PDF hoch — wir lesen es aus.
                        </p>
                        <button
                          onClick={() => menuFileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Speisekarte hochladen
                        </button>
                      </div>
                    )}

                    <input
                      ref={menuFileInputRef}
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleMenuUpload(e.target.files?.[0])}
                      className="hidden"
                    />
                  </div>

                  {/* Was NICHT aus dem Scrape stammt, sondern angenommen wurde.
                      Ohne diesen Hinweis veröffentlicht jemand einen
                      angenommenen Geschäftstyp, ohne es zu merken. */}
                  {publishPlan.defaulted.length > 0 && (
                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs font-semibold text-gray-700 mb-1.5">
                        Nicht gefunden — wir haben angenommen
                      </p>
                      <ul className="space-y-1">
                        {publishPlan.defaulted.map((line) => (
                          <li key={line} className="text-xs text-gray-600">
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Fremd gehostete Bilder: siehe countExternalImages. */}
                  {externalImageCount > 0 && (
                    <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2">
                      <ImageIcon className="w-4 h-4 text-amber-500 shrink-0 mt-px" />
                      <p className="text-xs text-amber-800 leading-relaxed">
                        {externalImageCount === 1
                          ? "Ein Bild liegt noch"
                          : `${externalImageCount} Bilder liegen noch`}{" "}
                        auf dem Server der analysierten Website. Sie
                        verschwinden, sobald sie dort ausgetauscht werden — lade
                        sie im Konfigurator als eigene Bilder hoch.
                      </p>
                    </div>
                  )}

                  {publishPlan.blocking.length > 0 && (
                    <div className="p-3.5 bg-red-50 rounded-xl border border-red-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-px" />
                      <div>
                        <p className="text-xs font-semibold text-red-900 mb-0.5">
                          Direkt veröffentlichen geht nicht
                        </p>
                        {publishPlan.blocking.map((line) => (
                          <p
                            key={line}
                            className="text-xs text-red-800 leading-relaxed"
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasExistingData && (
                    <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-px" />
                      <div>
                        <p className="text-xs font-semibold text-amber-900 mb-0.5">
                          Dein bisheriger Entwurf wird ersetzt
                        </p>
                        <p className="text-xs text-amber-800 leading-relaxed">
                          {existingBusinessName?.trim()
                            ? `„${existingBusinessName}“ und die bereits erfassten Inhalte werden überschrieben.`
                            : "Die bereits erfassten Inhalte werden überschrieben."}{" "}
                          Im Konfigurator kannst du das mit „Rückgängig“
                          zurückholen.
                        </p>
                      </div>
                    </div>
                  )}

                  {result && (
                    <>
                      <ResultRow
                        icon={<Globe />}
                        label="Name"
                        value={result.businessName}
                      />
                      <ResultRow
                        icon={<Utensils />}
                        label="Typ"
                        value={result.businessType}
                      />
                      <ResultRow
                        icon={<Globe />}
                        label="E-Mail"
                        value={result.email}
                      />
                      <ResultRow
                        icon={<Globe />}
                        label="Telefon"
                        value={result.phone}
                      />
                      <ResultRow
                        icon={<Globe />}
                        label="Instagram"
                        value={result.instagramUrl ? "Gefunden" : undefined}
                      />
                      <ResultRow
                        icon={<Utensils />}
                        label="Speisekarte"
                        value={result.menuUrl ? "Online verfügbar" : undefined}
                      />
                      <ResultRow
                        icon={<Globe />}
                        label="Score"
                        value={
                          result.maitrScore
                            ? `${result.maitrScore}/100`
                            : undefined
                        }
                      />
                      {result.analysisFeedback && (
                        <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                          <p className="text-xs text-gray-500 font-medium mb-1">
                            KI-Feedback
                          </p>
                          <p className="text-xs text-gray-700 leading-relaxed">
                            {result.analysisFeedback}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer: veröffentlichen oder anpassen */}
                <div className="p-5 border-t border-gray-100 space-y-3">
                  {publishStatus === "published" && publishedUrl ? (
                    // Fertig – ab hier ist die Adresse das Einzige, was zählt.
                    <div className="space-y-2.5">
                      <div className="p-3.5 bg-green-50 rounded-xl border border-green-200">
                        <p className="text-xs font-semibold text-green-900 mb-1.5">
                          Deine Web-App ist live
                        </p>
                        <a
                          href={publishedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-bold text-green-700 underline break-all hover:text-green-900"
                        >
                          {publishedUrl.replace(/^https?:\/\//, "")}
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>
                      </div>
                      <button
                        onClick={applyDraftAndOpenConfigurator}
                        className="w-full text-xs text-gray-500 hover:text-gray-800 transition-colors py-1 underline"
                      >
                        Inhalte noch anpassen
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Subdomain – vorgeschlagen, aber änderbar */}
                      <div>
                        <label
                          htmlFor="auto-subdomain"
                          className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5"
                        >
                          Adresse deiner Web-App
                        </label>
                        <div className="flex items-center gap-1.5">
                          <Input
                            id="auto-subdomain"
                            value={subdomain}
                            onChange={(e) =>
                              setSubdomain(
                                normalizeSubdomain(e.target.value),
                              )
                            }
                            placeholder="mein-restaurant"
                            className="rounded-xl border-gray-200 focus:border-purple-400 focus:ring-purple-100 text-sm"
                          />
                          <span className="text-sm text-gray-400 shrink-0">
                            .maitr.de
                          </span>
                        </div>
                        {subdomain && !subdomainCheck.valid && (
                          <p className="mt-1 text-xs text-red-500">
                            {subdomainCheck.reason}
                          </p>
                        )}
                      </div>

                      {publishStatus === "error" && publishError && (
                        <div className="p-3 bg-red-50 rounded-xl border border-red-200 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-px" />
                          <p className="text-xs text-red-800 leading-relaxed">
                            {publishError}
                          </p>
                        </div>
                      )}

                      <Button
                        onClick={publishDirectly}
                        disabled={!canPublish}
                        className="w-full bg-gradient-to-r from-purple-500 to-orange-500 text-white text-sm font-bold h-11 rounded-xl shadow-sm hover:shadow-md transition-shadow disabled:opacity-50"
                      >
                        {publishStatus === "publishing" ? (
                          <span className="flex items-center gap-2">
                            <svg
                              className="animate-spin h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                              />
                            </svg>
                            Wird veröffentlicht…
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Rocket className="w-4 h-4" />
                            Jetzt veröffentlichen
                          </span>
                        )}
                      </Button>

                      <button
                        onClick={applyDraftAndOpenConfigurator}
                        className="w-full text-xs text-gray-500 hover:text-gray-800 transition-colors py-1"
                      >
                        {hasExistingData
                          ? "Lieber erst anpassen (ersetzt deinen Entwurf)"
                          : "Lieber erst anpassen"}
                        <ChevronRight className="w-3.5 h-3.5 ml-1 inline" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Hilfs-Komponenten ────────────────────────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl border-gray-200 focus:border-purple-400 focus:ring-purple-100 text-sm"
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function ResultRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 text-teal-500">
        {React.cloneElement(icon as React.ReactElement, {
          className: "w-3.5 h-3.5",
        })}
      </div>
      <span className="text-xs text-gray-400 font-medium w-24 shrink-0">
        {label}
      </span>
      <span className="text-xs font-semibold text-gray-800 truncate">
        {value}
      </span>
    </div>
  );
}
