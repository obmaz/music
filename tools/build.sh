#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
GODOT_BIN="${GODOT:-godot}"
EXPORT_DIR="${1:-build/web}"
version="$($GODOT_BIN --version)"
if [[ "$version" != 4.7.2.stable.* ]]; then
  echo "Godot 4.7.2 stable is required; found $version" >&2
  exit 1
fi
"$GODOT_BIN" --headless --path . --editor --import --quit
"$GODOT_BIN" --headless --path . --script tests/game_test.gd
node --test tests/sng.test.mjs
mkdir -p "$EXPORT_DIR"
"$GODOT_BIN" --headless --path . --export-release Web "$EXPORT_DIR/index.html"
cp web/sng.mjs web/importer.mjs "$EXPORT_DIR/"
cp licenses/GODOT-LICENSE.txt licenses/GODOT-THIRD-PARTY.txt assets/FONT-LICENSE.txt "$EXPORT_DIR/"
cp ASSETS.md "$EXPORT_DIR/ASSETS.md"
cp LICENSE "$EXPORT_DIR/PROJECT-LICENSE.txt"
touch "$EXPORT_DIR/.nojekyll"
python3 - "$EXPORT_DIR/index.html" <<'PYTHON'
from pathlib import Path
import sys
p = Path(sys.argv[1])
p.write_text(p.read_text().rstrip() + "\n")
PYTHON
