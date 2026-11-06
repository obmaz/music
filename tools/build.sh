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
cp web/sng.mjs web/importer.mjs web/app.mjs web/manifest.webmanifest "$EXPORT_DIR/"
mkdir -p "$EXPORT_DIR/icons"
cp web/icons/*.png "$EXPORT_DIR/icons/"
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
python3 - "$EXPORT_DIR" <<'PYTHON'
from pathlib import Path
import sys, hashlib, json
out = Path(sys.argv[1])
files = sorted(p.relative_to(out).as_posix() for p in out.rglob("*")
               if p.is_file() and p.suffix not in (".import",) and p.name not in ("sw.js", ".nojekyll"))
digest = hashlib.sha256()
for name in files:
    digest.update(name.encode())
    digest.update((out / name).read_bytes())
sw = Path("web/sw.js").read_text().replace("__CACHE_VERSION__", digest.hexdigest()[:20])
sw = sw.replace("__APP_FILES__", json.dumps(files))
(out / "sw.js").write_text(sw)
PYTHON
