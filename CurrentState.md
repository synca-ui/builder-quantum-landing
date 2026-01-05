# CurrentState.md — Maitr Application

Date: 2026-01-05
Author: Senior Software Architect (automated audit)

---

## 1. Structural Overview

High-level architecture:

- Client (client/)
  - React 18 + TypeScript + Vite
  - Routes in `client/pages/` (Index, ModeSelection, Configurator, AutoConfigurator, Dashboard, Site)
  - UI primitives in `client/components/ui/` (buttons, cards, dialog, toast)
  - Domain components in `client/components/` (MaitrScoreCircle, LoadingOverlay, template registry, editor cards)
  - Lightweight local stores in `client/data/` (analysisStore)
  - API client in `client/lib/apiClient.ts`

- Server (server/)
  - Express-based API server integrated with Vite dev server
  - Route handlers in `server/routes/` (auth, configurations, n8nProxy, schema, orders, webhooks)
  - Services in `server/services/` (orderService, schemaGenerator)
  - Uses file-based persistence (data/configurations.json) with optional DB provisioning when DATABASE_URL present

- Shared (shared/)
  - Type definitions and shared helpers

- Tooling/Config
  - Vite config (vite.config.ts & vite.config.server.ts), pnpm, TailwindCSS, Vitest available

Purpose of layering:
- Clear separation between frontend UI and backend API
- Server proxies external integrations (n8n, Stripe) to avoid CORS and hide secrets
- Shared types ensure consistent client-server contracts


## 2. Component Breakdown (What is What)

Key files and their roles:

- client/data/analysisStore.ts
  - External store implemented with `useSyncExternalStore`.
  - Holds: isLoading, n8nData (N8nResult | null), sourceLink
  - Persists n8nData to localStorage under key `maitr_analysis_data`
  - Exposes setIsLoading, setN8nData, setSourceLink, clearAnalysisData and hook `useAnalysis()`

- client/pages/Index.tsx
  - Landing page with "magic link" input.
  - On submit, POSTs to `/api/forward-to-n8n` and then navigates to `/mode-selection?sourceLink=...`

- client/pages/ModeSelection.tsx
  - Orchestrates analysis flow.
  - Reads `sourceLink` from URL and the analysis store via `useAnalysis()`.
  - Triggers analysis when needed with `runAnalysis(link)` which POSTs to `/api/forward-to-n8n` and stores the result.
  - Renders `MaitrScoreCircle`, `LoadingOverlay`, and two CTAs (Manual vs Automatic configurator).
  - Visual nudges: if maitr_score > 80, Automatic button gets gradient + pulse + ✨ emoji.

- client/components/LoadingOverlay.tsx
  - Fullscreen overlay used while waiting for n8n (20–25s typical)
  - Rotating star, cyan-orange glow, text loop.
  - Exposes optional onCancel handler.

- client/components/MaitrScoreCircle.tsx
  - SVG circular progress gauge.
  - Animates numeric counter and stroke-dashoffset for the ring.

- client/types/n8n.ts
  - Type definitions for N8nResult, N8nAnalysis, N8nBranding, N8nRestaurant.

- server/routes/n8nProxy.ts
  - Forwards client-provided payloads to the production n8n webhook and returns parsed JSON or text.
  - Hardcoded n8n URL (should be env-driven).

- client/lib/apiClient.ts
  - Axios instance with Authorization header injection from stored token.

- server/routes/configurations.ts
  - CRUD for site configuration, publish flow, preview/publish caches, optional DB provisioning


## 3. The App’s Mission

Maitr is an AI-assisted site builder for local businesses (cafés, restaurants, shops) that:
- Extracts business data (name, hours, menus, images) from a single input link
- Produces a ready-to-publish web app or a step-based configurator for manual editing
- Provides an automated path (High-Confidence: "Full Automatic") for fast launches

Primary user problem solved:
- Dramatically reduces friction & time-to-launch for local businesses without requiring developer resources.


## 4. Logical Flow (Happy Path)

1. User on Index page pastes a link and submits.
2. Client POSTs to `/api/forward-to-n8n` (server-side proxy).
3. Server forwards to external n8n webhook which runs an analysis workflow.
4. n8n returns structured analysis (N8nResult): restaurant.name, branding, analysis.maitr_score and recommendation.
5. Server returns the response to client; client stores n8nData in analysisStore (persisted to localStorage).
6. ModeSelection consumes the store and displays the score (MaitrScoreCircle) and CTAs.
7. User selects Automatic or Manual configurator (navigates to /configurator/auto or /configurator/manual).
8. Configurator assembles site configuration and publishes the site.


## 5. Unserious or Unprofessional Code Audit

Summary: Codebase is generally professional. A few leftover debugging artifacts exist and should be cleaned up or gated.

Findings:
- Console debug logs and blocks:
  - `client/pages/Configurator.tsx` contains large debug `console.log` blocks (e.g., "=== Configurator Initialization ===") and many restoration logs.
  - `client/pages/TestSite.tsx` contains `console.log` debugging messages.
  - `client/components/test/PersistenceTest.tsx` and other test utilities log state for debugging.
- Debug UI exposed in production:
  - Configurator contains a "Persistence Debug Panel" with Export/Import and a togglable Debug button. This should be hidden or gated behind development mode or a feature flag.
- Hardcoded external endpoints:
  - `server/routes/n8nProxy.ts` uses a hardcoded production n8n webhook URL. This is a security/ops smell — move to env.

No offensive jokes, easter eggs, or intentionally silly names were found in the analyzed files.


## 6. Optimization Suggestions

1. Move n8n webhook URL into env var (e.g., `N8N_WEBHOOK_URL`).
2. Make client and server n8n timeouts configurable via env var (`N8N_TIMEOUT_MS`).
3. Extract LoadingOverlay messages into central constants or i18n for reuse.
4. Gate debug UI/panels behind NODE_ENV or a feature flag to prevent accidental exposure.
5. Consider server-side caching for analysis results keyed by source link to protect against n8n outages and reduce cost/latency.
6. Improve localStorage telemetry (send non-sensitive failure events to server logs) so persistence failures are visible.
7. For larger state needs, consider adopting a small state library (Zustand or similar) if analysisStore grows.
8. Remove leftover console.* debug statements or limit them to development builds.


## 7. Testing & Validation Recommendations

- Unit tests:
  - analysisStore: snapshot and set/get behavior, localStorage persistence.
  - MaitrScoreCircle: animation progression and final displayed value.
  - LoadingOverlay: message rotation and visible state transitions.

- Integration tests:
  - ModeSelection flow: Given an n8nResponse mock, verify UI branches (high score highlighting) and navigation.

- E2E tests:
  - Simulate user pasting link -> mock n8n response -> automatic configuration flow -> publish.


## 8. Risk Assessment & Operational Notes

- Single external dependency: n8n webhook (hardcoded). Outage affects the main "analysis" flow.
- Recommendation: Add a server-side cache and circuit-breaker behavior to protect UX (return cached response or friendly error messaging).


## 9. File References

- client/data/analysisStore.ts
- client/pages/Index.tsx
- client/pages/ModeSelection.tsx
- client/components/LoadingOverlay.tsx
- client/components/MaitrScoreCircle.tsx
- client/types/n8n.ts
- server/routes/n8nProxy.ts
- server/routes/configurations.ts
- client/lib/apiClient.ts
- client/pages/Configurator.tsx (debug panel)


## 10. Actionable Next Steps (prioritized)

1. Create `CurrentState.md` (this document) — completed.
2. Move `N8N` URL to env variable and update `server/routes/n8nProxy.ts`.
3. Make n8n timeouts configurable and replace hardcoded 25000 ms.
4. Remove or gate debug logs and Debug Panel in `Configurator.tsx`.
5. Extract LoadingOverlay messages and reuse across ModeSelection and LoadingOverlay.
6. Implement server-side caching for analysis results.
7. Add unit and integration tests for store and UI components.
8. Add telemetry for localStorage failures.

---

End of `CurrentState.md`.
