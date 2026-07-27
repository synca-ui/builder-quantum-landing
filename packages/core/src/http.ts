import { getCoreConfig } from "./config";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly endpoint: string,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Query-Parameter; `undefined`/`null` werden verworfen. */
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Überspringt das Anhängen des Bearer-Tokens (z. B. für öffentliche Gast-Endpunkte). */
  anonymous?: boolean;
}

function buildUrl(
  base: string,
  endpoint: string,
  query: RequestOptions["query"],
): string {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  let url = `${base.replace(/\/$/, "")}${path}`;

  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) params.append(key, String(value));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  return url;
}

/**
 * Einziger HTTP-Einstiegspunkt des Cores. Alle `api/*`-Module gehen hier durch,
 * damit Auth-Header, Fehlerformat und Basis-URL an genau einer Stelle liegen.
 */
export async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const cfg = getCoreConfig();
  const doFetch = cfg.fetch ?? globalThis.fetch;
  const url = buildUrl(cfg.apiBaseUrl, endpoint, options.query);

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(cfg.locale ? { "Accept-Language": cfg.locale } : {}),
    ...options.headers,
  };

  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  if (!options.anonymous && cfg.getAuthToken) {
    const token = await cfg.getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // Default-Timeout gegen hängende Verbindungen; kombiniert mit einem ggf.
  // übergebenen options.signal (beide können den Request abbrechen).
  const controller = new AbortController();
  const timeoutMs = cfg.requestTimeoutMs ?? 15000;
  const timer = setTimeout(() => controller.abort(new Error("Request-Timeout")), timeoutMs);
  const onExternalAbort = () => controller.abort((options.signal as AbortSignal).reason);
  if (options.signal) {
    if (options.signal.aborted) controller.abort(options.signal.reason);
    else options.signal.addEventListener("abort", onExternalAbort, { once: true });
  }

  try {
    const response = await doFetch(url, {
      method: options.method ?? "GET",
      headers,
      signal: controller.signal,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    const text = await response.text();
    const payload = text ? safeParse(text) : undefined;

    if (!response.ok) {
      const message =
        (isRecord(payload) && typeof payload.message === "string" && payload.message) ||
        (isRecord(payload) && typeof payload.error === "string" && payload.error) ||
        `${response.status} ${response.statusText}`;
      throw new ApiError(response.status, endpoint, message, payload);
    }

    return payload as T;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onExternalAbort);
  }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
