# Maitr — Project Overview

## Kurze Projektbeschreibung Maitr.

Maitr ist ein Full‑Stack‑Starter für die schnelle Erstellung von Restaurant‑Apps. Die Anwendung bietet:

- Eine moderne SPA-Frontend (React + Vite + TypeScript) mit TailwindCSS für Styling
- Eine integrierte Express‑API (server/), gehostet zusammen mit Vite im Entwicklungsmodus
- Zwei Hauptmodi: Manuelle Konfiguration (Configurator) und Automatische Generierung (Auto) aus einer Website/Google Maps URL

## Architektur & Ordnerstruktur (Kurzüberblick)

- client/ — Frontend (React + TypeScript + Vite)
  - pages/ — Route‑Komponenten (Index.tsx, ModeSelection.tsx, AutoConfigurator.tsx, Configurator.tsx, Dashboard.tsx, uvm.)
  - components/ — Wiederverwendbare UI‑ und Helferkomponenten
    - ui/ — primitives: button.tsx, card.tsx, input.tsx, toast/sonner etc.
    - Headbar.tsx — wiederverwendbare Headbar / Breadcrumb Komponente

- server/ — Express API (integriert mit Vite dev server)
  - routes/ — API-Hander (autogen, configurations, instagram, orders, webhooks/stripe usw.)
  - middleware/ — Auth und weitere Middlewares

- shared/ — geteilte Typen/Interfaces

## Technologie-Stack

- Frontend
  - React 18, React Router 6
  - TypeScript
  - Vite
  - TailwindCSS 3 (Design Tokens in client/global.css)
  - Radix UI primitives & Lucide Icons

- Backend
  - Express
  - Node.js
  - Webhook-Support (Stripe raw body handling)

- Dev / Build / Test
  - pnpm (empfohlen)
  - Vitest für Unit Tests
  - Prettier, TypeScript (tsc) für Typprüfung

- Optional / empfohlen (MCP Integrationen)
  - Supabase: Auth und Postgres DB (empfohlen für Konfigurationspersistenz)
  - Netlify / Vercel: Hosting & Deployments
  - Sentry: Fehlerüberwachung
  - Stripe: Payments / Abonnements
  - Builder.io, Notion, Linear, Zapier, Semgrep, Prisma Postgres, Context7 (siehe MCP-Liste weiter unten)

> Verfügbare MCP Integrationen (empfohlen bei Bedarf): Supabase, Zapier, Figma (Plugin), Builder.io, Linear, Notion, Atlassian, Sentry, Context7, Semgrep, Stripe, Prisma Postgres, Netlify, Vercel, Notion, HubSpot. (Du kannst über die "Open MCP popover" UI verbinden.)

## Wichtige Dateien & Pfade

- client/pages/Index.tsx — Landing / Hero / Beispiel Dashboard
- client/pages/ModeSelection.tsx — Auswahl zwischen Guided / Automatic
- client/pages/AutoConfigurator.tsx — Formular für automatische Generierung + Preview
- client/pages/Configurator.tsx — Manuelle Editor/Configurator Seite
- client/components/ui/button.tsx, input.tsx, card.tsx — Basis UI primitives
- client/components/Headbar.tsx — Top-Breadcrumb / Brand (Maitr / Page)
- server/routes/autogen.ts — Endpoint zur automatischen Generierung
- server/index.ts — Server-Setup, Routen-Registrierung, Middleware

## Lokale Entwicklung

Empfohlene Schritte (pnpm empfohlen):

1. Installiere Abhängigkeiten:

   pnpm install

2. Entwickeln (Vite dev server + Express):

   pnpm dev

3. Production Build:

   pnpm build
   pnpm start

4. Tests:

   pnpm test
   pnpm typecheck

## Deployment Empfehlungen

- Netlify oder Vercel funktionieren gut mit diesem Setup. Beide unterstützen Serverless/Edge Funktionen und statische Builds.
- Wenn du eine relationale DB verwendest, empfehle ich Supabase oder Neon (Postgres). Verbinde diese über die MCP-Integrationen in der Builder UI: [Open MCP popover](#open-mcp-popover)

Deployment Hinweise:

- Stelle sicher, dass Environment-Variablen gesetzt sind (DATABASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SITE_URL, ...)
- Stripe Webhooks benötigen die raw body handling middleware — die ist bereits im server/index.ts konfiguriert.

## Roadmap & nächste Schritte (Empfohlen)

- UI / UX
  - Globales Vereinheitlichen der Headbar / Header (done partially)
  - Mobile-first Audit; Sticky action bars optimieren
  - Accessibility / keyboard nav audit

- Features
  - Persistenz: Supabase/Postgres für user configs & auth
  - Auth: Email/SSO via Supabase
  - Payments: Stripe Checkout & Subscriptions
  - Improve Auto-Generation: bessere Menü-Parsing, OCR/ML für Bilder

- Infra & Maintenance
  - CI (tests + lint) und Deploy Previews (Netlify/Vercel)
  - Sentry für Error Monitoring
  - Semgrep for security

- Tests
  - Vitest unit tests for utils & mapping
  - Integration tests for autogen API

## Troubleshooting (häufige Probleme)

- Sharp / native binaries: sharp versions may require specific Node versions (>=18 recommended). If you see native module errors during install, ensure your node version meets sharp's engine requirements.

- Webhook raw body: Stripe webhooks must use express.raw for signature verification. The server includes a rawBody handler for Netlify edge cases; ensure it remains before JSON body parsing where needed.

## How it could continue

- Multi-tenant marketplace for templates
- Agency flow (bulk site creation)
- Analytics & conversion tracking per site
- AI-driven visuals: color extraction, image crop suggestions, improved fonts mapping

---

If you want, I can now:

- Add this section directly to README.md in the repo (I can write the file).
- Create a separate docs/MAITR_OVERVIEW.md file.

Which option do you prefer? (I will update the todo list accordingly.)
