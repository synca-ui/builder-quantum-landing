#!/usr/bin/env bash
#
# Erzeugt EXConstants.bundle/app.config, das im Release-Build das Expo-Manifest
# transportiert. Ersetzt expo-constants' eigenes get-app-config-ios.sh.
#
# Warum ein Ersatz: Das Original macht in Zeile 14
#     PROJECT_DIR_BASENAME=$(basename $PROJECT_DIR)
# ohne Anfuehrungszeichen. Enthaelt der Projektpfad ein Leerzeichen
# ("Antigravity Projects"), bekommt basename zwei Argumente und deutet das
# zweite als abzuschneidende Endung: es liefert "Antigravity" statt "Pods".
# Die Pruefung darunter schlaegt fehl und das Skript steigt mit exit 0 aus,
# ohne etwas getan zu haben.
#
# Folge: Constants.expoConfig ist im Release null, expo-linking findet kein
# URI-Schema und wirft schon beim Start - die App stuerzt beim Oeffnen ab.
# Weil der Ausstieg den Code 0 liefert, meldet Xcode dabei keinen Fehler und
# das Archiv gilt als fehlerfrei.
#
# Aufruf: generate-expo-app-config.sh <expo-constants-dir> <projektwurzel> <ziel-bundle>

set -euo pipefail

EXPO_CONSTANTS_DIR="${1:?expo-constants-Verzeichnis fehlt}"
PROJECT_ROOT="${2:?Projektwurzel fehlt}"
DEST_DIR="${3:?Zielordner fehlt}"

mkdir -p "$DEST_DIR"

# with-node.sh liest NODE_BINARY aus ios/.xcode.env(.local) und bricht laut ab,
# wenn kein Node auffindbar ist.
"$EXPO_CONSTANTS_DIR/scripts/with-node.sh" \
  "$EXPO_CONSTANTS_DIR/scripts/getAppConfig.js" \
  "$PROJECT_ROOT" \
  "$DEST_DIR"

# Diese Pruefung ist der eigentliche Punkt: Ein stiller Fehlschlag hier hat den
# ersten TestFlight-Build unbrauchbar gemacht. Lieber der Bau bricht ab.
if [ ! -s "$DEST_DIR/app.config" ]; then
  echo "error: app.config wurde nicht erzeugt in $DEST_DIR" >&2
  exit 1
fi
