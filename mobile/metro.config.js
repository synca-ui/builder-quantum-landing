// Metro-Konfiguration der Mobile-App.
//
// Die App liegt im selben Repository wie der Web-Generator, hat aber ihr eigenes
// `node_modules` und ist kein npm-Workspace. Damit sie trotzdem `@maitr/core` aus
// `packages/core` bündeln kann, braucht Metro drei Dinge: den Server-Root eine Ebene
// höher, den Ordner in `watchFolders` und einen Resolver für den Paketnamen.

const fs = require("fs");
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..");
const coreRoot = path.resolve(repoRoot, "packages/core");

const config = getDefaultConfig(projectRoot);

// Metro bündelt nur, was es beobachtet. Damit der Ordner auch wirklich gecrawlt wird,
// steht in app.json zusätzlich `experiments.onDemandFilesystem: false` - siehe dort.
config.watchFolders = [coreRoot];

// Kein Build-Schritt: `@maitr/core` wird direkt auf die TypeScript-Quellen aufgelöst.
// `extraNodeModules` reicht dafür nicht - es setzt ein echtes Paketverzeichnis in
// node_modules voraus, und ohne Workspace liegt dort keins.
const CORE_PACKAGE = "@maitr/core";
const coreSrc = path.join(coreRoot, "src");

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === CORE_PACKAGE || moduleName.startsWith(`${CORE_PACKAGE}/`)) {
    const subpath = moduleName.slice(CORE_PACKAGE.length).replace(/^\//, "");
    const candidates = subpath
      ? [path.join(coreSrc, `${subpath}.ts`), path.join(coreSrc, subpath, "index.ts")]
      : [path.join(coreSrc, "index.ts")];

    const filePath = candidates.find((candidate) => fs.existsSync(candidate));
    if (filePath) return { type: "sourceFile", filePath };

    throw new Error(`${moduleName} nicht gefunden. Gesucht in: ${candidates.join(", ")}`);
  }

  return context.resolveRequest(context, moduleName, platform);
};

// Auflösung startet in mobile/node_modules. Die hierarchische Suche bleibt aktiv -
// Pakete wie expo-router legen Abhängigkeiten in ihrem eigenen node_modules ab, und
// ohne den Aufstieg im Baum findet Metro sie nicht.
config.resolver.nodeModulesPaths = [path.join(projectRoot, "node_modules")];

module.exports = config;
