const { withXcodeProject } = require("@expo/config-plugins");

/**
 * Expo Config Plugin: setzt bei jedem `expo prebuild` das Code-Signing-Team des
 * App-Targets auf das lokale Development-Team.
 *
 * Grund: `expo prebuild` (besonders `--clean`) regeneriert `ios/Maitr.xcodeproj` und
 * lässt `DEVELOPMENT_TEAM` leer bzw. auf einem Team ohne lokales Zertifikat. Dann bricht
 * `expo run:ios --device` mit „xcodebuild exited with error code 65" (Signing) ab. Auf
 * diesem Mac hat nur Team `Y9JZ2K33PM` (Apple Development, Personal/Free Team) ein
 * gültiges Zertifikat — prüfbar mit `security find-identity -v -p codesigning`.
 *
 * Nur für LOKALE Dev-Builds: bei EAS-Builds (`EAS_BUILD=true`) übernimmt EAS die
 * Credentials remote, deshalb rühren wir das Team dort NICHT an.
 */

// Personal/Free Team mit lokalem Zertifikat. Bei Wechsel auf ein bezahltes Team hier
// (und im Keychain via Xcode) ändern.
const LOCAL_TEAM_ID = "Y9JZ2K33PM";
const APP_BUNDLE_ID = "app.maitr.mobile";

module.exports = function withLocalSigningTeam(config) {
  return withXcodeProject(config, (cfg) => {
    // EAS signiert remote → lokales Team nicht erzwingen.
    if (process.env.EAS_BUILD === "true" || process.env.CI === "true") {
      return cfg;
    }

    const project = cfg.modResults;
    const configurations = project.pbxXCBuildConfigurationSection();

    for (const key of Object.keys(configurations)) {
      const entry = configurations[key];
      // Kommentar-Einträge (…_comment) sind Strings ohne buildSettings.
      if (!entry || typeof entry !== "object" || !entry.buildSettings) continue;

      const settings = entry.buildSettings;
      const bundleId = String(settings.PRODUCT_BUNDLE_IDENTIFIER || "");
      // Nur das App-Target treffen, nicht Pods/Tests.
      if (!bundleId.includes(APP_BUNDLE_ID)) continue;

      settings.DEVELOPMENT_TEAM = LOCAL_TEAM_ID;
      settings.CODE_SIGN_STYLE = "Automatic";
    }

    return cfg;
  });
};
