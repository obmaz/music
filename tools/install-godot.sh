#!/usr/bin/env bash
# Install the pinned official editor and matching web templates on Linux x86_64.
set -euo pipefail
GODOT_VERSION=4.7.2
GODOT_INSTALL_DIR="${GODOT_INSTALL_DIR:-$HOME/.cache/fivefold/godot-$GODOT_VERSION}"
GODOT_DOWNLOAD_DIR="${GODOT_DOWNLOAD_DIR:-${RUNNER_TEMP:-/tmp}/fivefold-godot-downloads}"
TEMPLATE_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/godot/export_templates/$GODOT_VERSION.stable"
EDITOR_ARCHIVE="Godot_v$GODOT_VERSION-stable_linux.x86_64.zip"
TEMPLATE_ARCHIVE="Godot_v$GODOT_VERSION-stable_export_templates.tpz"
RELEASE_URL="https://github.com/godotengine/godot/releases/download/$GODOT_VERSION-stable"
mkdir -p "$GODOT_INSTALL_DIR" "$GODOT_DOWNLOAD_DIR" "$TEMPLATE_DIR"
cd "$GODOT_DOWNLOAD_DIR"
for archive in "$EDITOR_ARCHIVE" "$TEMPLATE_ARCHIVE"; do
  if [[ ! -s "$archive" ]]; then
    curl --fail --location --retry 3 --output "$archive" "$RELEASE_URL/$archive"
  fi
done
curl --fail --location --retry 3 --output SHA512-SUMS.txt "$RELEASE_URL/SHA512-SUMS.txt"
awk -v editor="$EDITOR_ARCHIVE" -v templates="$TEMPLATE_ARCHIVE" \
  '$2 == editor || $2 == templates {print}' SHA512-SUMS.txt > selected-checksums.txt
[[ "$(wc -l < selected-checksums.txt)" -eq 2 ]]
sha512sum --check selected-checksums.txt
unzip -p "$EDITOR_ARCHIVE" "Godot_v$GODOT_VERSION-stable_linux.x86_64" > "$GODOT_INSTALL_DIR/godot"
chmod +x "$GODOT_INSTALL_DIR/godot"
unzip -jo "$TEMPLATE_ARCHIVE" \
  templates/web_nothreads_debug.zip templates/web_nothreads_release.zip templates/version.txt \
  -d "$TEMPLATE_DIR"
"$GODOT_INSTALL_DIR/godot" --version
