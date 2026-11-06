#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
GODOT_BIN="${GODOT:-godot}"
version="$($GODOT_BIN --version)"
if [[ "$version" != 4.7.2.stable.* ]]; then
  echo "Godot 4.7.2 stable is required; found $version" >&2
  exit 1
fi
"$GODOT_BIN" --headless --path . --editor --import --quit
"$GODOT_BIN" --headless --path . --script tests/game_test.gd
node --test tests/sng.test.mjs
mkdir -p docs
"$GODOT_BIN" --headless --path . --export-release Web docs/index.html
cp web/sng.mjs web/importer.mjs docs/
touch docs/.nojekyll
python3 - <<'PYTHON'
from pathlib import Path
p = Path("docs/index.html")
p.write_text(p.read_text().rstrip() + "\n")
PYTHON
