const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo Config Plugin: repariert die Build-Skripte, die am Leerzeichen im Projektpfad
 * ("Antigravity Projects") zerbrechen. Läuft bei jedem `expo prebuild` erneut, überlebt
 * also auch `prebuild --clean`, das die nativen Projekte neu generiert.
 *
 * Zwei Baustellen:
 *  1) App-Projekt: die "Bundle React Native code and images"-Phase führt
 *     `\`"$NODE_BINARY" --print "…react-native-xcode.sh"\`` aus - der zurückgegebene Pfad
 *     wird beim Ausführen am Leerzeichen zerteilt und der Build bricht ab ("No such file
 *     or directory: …/Antigravity"). Wir umschließen die Command-Substitution mit
 *     Anführungszeichen (pbxproj der App).
 *  2) Pods (EXConstants): die Phase "[CP-User] Generate app.config …" ruft
 *     `bash -l -c "$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh"`. Die äusseren
 *     Quotes schützen nur die Übergabe an `bash -c`; `bash -c` zerlegt den Pfad danach
 *     selbst am Leerzeichen. → den Pfad INNERHALB des `bash -c`-Kommandos zusätzlich
 *     quoten. Da das Pods-Projekt erst `pod install` erzeugt, hängen wir diesen Fix in
 *     den `post_install`-Hook der generierten Podfile ein.
 */

// (1) App-pbxproj: Command-Substitution der RN-Bundle-Phase quoten.
// Zwei Zeichen im pbxproj: Backslash + Anführungszeichen. In JS als \\\" geschrieben.
const RAW =
  "`\\\"$NODE_BINARY\\\" --print \\\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\\"`";
const QUOTED = `\\"${RAW}\\"`;

function withBundleScriptFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const projectName = cfg.modRequest.projectName;
      const pbxproj = path.join(
        cfg.modRequest.platformProjectRoot,
        `${projectName}.xcodeproj`,
        "project.pbxproj",
      );

      let contents = fs.readFileSync(pbxproj, "utf8");
      if (contents.includes(RAW) && !contents.includes(QUOTED)) {
        contents = contents.split(RAW).join(QUOTED);
        fs.writeFileSync(pbxproj, contents);
      }
      return cfg;
    },
  ]);
}

// (2) Podfile: post_install-Hook einhängen, der das EXConstants-get-app-config-Skript quotet.
const PODFILE_ANCHOR = "post_install do |installer|\n";
const PODFILE_MARKER = "get-app-config-ios.sh"; // schon gepatcht?
// Ruby, das direkt hinter `post_install do |installer|` eingefügt wird. Setzt die
// shell_script-Phase auf die fertig gequotete Variante:
//   bash -l -c "\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\""
const PODFILE_PATCH = [
  "post_install do |installer|",
  "    # Leerzeichen-im-Pfad-Fix (siehe withSpacePathFix.js): den EXConstants-app.config-",
  "    # Aufruf so quoten, dass bash -c den Pfad nicht am Leerzeichen zerteilt.",
  "    installer.pods_project.targets.each do |t|",
  "      t.build_phases.each do |ph|",
  "        next unless ph.respond_to?(:shell_script) && ph.shell_script.to_s.include?('get-app-config-ios.sh')",
  "        ph.shell_script = 'bash -l -c \"\\\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\\"\"'",
  "      end",
  "    end",
  "",
  "    ",
].join("\n");

function withPodfileFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfile, "utf8");
      if (contents.includes(PODFILE_ANCHOR) && !contents.includes(PODFILE_MARKER)) {
        contents = contents.replace(PODFILE_ANCHOR, PODFILE_PATCH);
        fs.writeFileSync(podfile, contents);
      }
      return cfg;
    },
  ]);
}

module.exports = function withSpacePathFix(config) {
  config = withBundleScriptFix(config);
  config = withPodfileFix(config);
  return config;
};
