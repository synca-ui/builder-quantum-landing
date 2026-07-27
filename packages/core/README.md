# @maitr/core

Plattformneutrale Kernlogik, die sich Web (`/client`) und Mobile (`/mobile`) teilen.

## Regeln

1. **Kein Plattform-Code.** Keine DOM-APIs, keine React-Native-Imports, kein `import.meta.env`,
   kein `process.env`. Alles Umgebungsabhaengige kommt ueber `configureCore()` herein.
2. **Kein UI.** Keine React-Komponenten, keine Styles. Nur Typen, HTTP, Auth-Vertrag, Adapter.
3. **Source-only.** Das Paket wird nicht gebaut. Metro (Mobile) und Vite (Web) kompilieren
   die TypeScript-Quellen direkt mit.

## Verwendung

```ts
import { configureCore, api } from "@maitr/core";

configureCore({
  apiBaseUrl: "https://api.maitr.app/api",
  getAuthToken: async () => session?.accessToken ?? null,
  storage: AsyncStorage, // mobil; im Web optional
});

const today = await api.briefing.today(venueId);
```

## Einbindung

**Mobile** (bereits eingerichtet): `mobile/metro.config.js` nimmt `packages/core` in
`watchFolders` auf, `mobile/tsconfig.json` mappt `@maitr/core` auf die Quellen.

**Web** (noch offen): im Root-`tsconfig.json` und in `vite.config.ts` denselben Alias
`@maitr/core` -> `packages/core/src` ergaenzen, dann `client/lib/apiClient.ts` und
`client/lib/supabaseClient.ts` schrittweise dagegen austauschen.
