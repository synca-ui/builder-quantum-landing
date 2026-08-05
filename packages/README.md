# packages/

Geteilter Code zwischen Web-App (`/client` + `/server`) und Mobile-App (`/mobile`).

| Paket | Inhalt |
| --- | --- |
| [`core`](./core) | API-Aufrufe, Domain-Typen, Auth-Vertrag, Supabase-Zugriff – plattformneutral |

Die Pakete werden **nicht gebaut**. Beide Seiten kompilieren die TypeScript-Quellen
selbst mit: Metro über `mobile/metro.config.js`, Vite später über einen Alias in
`vite.config.ts`. Das spart einen Build-Schritt und hält Sprünge in die Definition
im Editor intakt.

Es gibt bewusst **kein** npm-Workspace-Setup. `mobile/` installiert seine
Abhängigkeiten eigenständig, damit das Expo-SDK (React 19.2.3, React Native 0.86)
nicht mit den Versionen der Web-App kollidiert.
