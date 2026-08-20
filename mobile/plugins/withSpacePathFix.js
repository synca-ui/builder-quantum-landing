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
 *     `get-app-config-ios.sh`. Dieses Skript macht intern `basename $PROJECT_DIR` OHNE
 *     Anführungszeichen; beim Leerzeichen im Pfad liefert basename dadurch "Antigravity"
 *     statt "Pods", die Pods-Prüfung schlägt fehl und es steigt mit exit 0 aus, ohne die
 *     app.config zu schreiben. Da der Code 0 ist, meldet Xcode keinen Fehler - das Archiv
 *     gilt als fehlerfrei, aber Constants.expoConfig ist im Release null und expo-linking
 *     wirft beim Start (App stürzt beim Öffnen ab). → wir ersetzen den Aufruf durch
 *     scripts/generate-expo-app-config.sh, das vollständig quotet und laut abbricht.
 *     Da das Pods-Projekt erst `pod install` erzeugt, hängen wir das in den
 *     `post_install`-Hook der generierten Podfile ein.
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
const PODFILE_MARKER = "generate-expo-app-config.sh"; // schon gepatcht?
// Ruby, das direkt hinter `post_install do |installer|` eingefügt wird. Lenkt die
// app.config-Phase auf unser eigenes Skript um (siehe oben, Punkt 2).
const PODFILE_PATCH = [
  "post_install do |installer|",
  "    # Leerzeichen-im-Pfad-Fix (siehe withSpacePathFix.js): expo-constants'",
  "    # get-app-config-ios.sh zerlegt $PROJECT_DIR am Leerzeichen (basename ohne",
  "    # Quotes), steigt still mit exit 0 aus und laesst die app.config weg. Im",
  "    # Release ist Constants.expoConfig dann null und die App stuerzt beim Start",
  "    # ab - ohne dass Xcode einen Fehler meldet. Wir rufen stattdessen unser",
  "    # eigenes, vollstaendig gequotetes Skript auf, das laut abbricht.",
  "    installer.pods_project.targets.each do |t|",
  "      t.build_phases.each do |ph|",
  "        next unless ph.respond_to?(:shell_script) && ph.shell_script.to_s.include?('get-app-config-ios.sh')",
  "        ph.shell_path = '/bin/bash'",
  "        ph.shell_script = '\"$PROJECT_DIR/../../scripts/generate-expo-app-config.sh\" \"$PODS_TARGET_SRCROOT/..\" \"$PROJECT_DIR/../..\" \"$CONFIGURATION_BUILD_DIR/EXConstants.bundle\"'",
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
