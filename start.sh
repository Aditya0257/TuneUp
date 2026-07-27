#!/usr/bin/env bash
#
# One-command dev startup: sets up both halves if needed, then runs them
# together and shuts both down on Ctrl-C.
#
#   ./start.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

log()  { printf '\033[36m▸ %s\033[0m\n' "$1"; }
warn() { printf '\033[33m! %s\033[0m\n' "$1"; }
die()  { printf '\033[31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

command -v python3 >/dev/null || die "python3 not found."
command -v node    >/dev/null || die "node not found. Install Node 18+ (brew install node)."

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 18 ] || die "Node 18+ required (found $(node -v))."

# ---------------------------------------------------------------- backend ---
cd "$ROOT/backend"

if [ ! -d .venv ]; then
  log "Creating Python virtualenv…"
  python3 -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate

if [ ! -f .venv/.deps-installed ] || [ requirements.txt -nt .venv/.deps-installed ]; then
  log "Installing Python dependencies…"
  pip install --quiet --upgrade pip
  pip install --quiet -r requirements.txt
  touch .venv/.deps-installed
fi

if [ ! -f .env ]; then
  log "Creating backend/.env from the example…"
  cp .env.example .env
  # Give it a real secret key rather than the placeholder.
  SECRET="$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
  python3 - "$SECRET" <<'PY'
import pathlib, re, sys
path = pathlib.Path(".env")
path.write_text(
    re.sub(r"^FLASK_SECRET_KEY=.*$", f"FLASK_SECRET_KEY={sys.argv[1]}",
           path.read_text(), flags=re.M)
)
PY
  warn "MONGODB_URI is blank, so liked songs live in memory and reset on restart."
fi

log "Running backend tests…"
python3 -m unittest discover -s tests -q 2>&1 | tail -3

log "Starting Flask on http://127.0.0.1:5000"
python3 app.py > "$ROOT/.flask.log" 2>&1 &
FLASK_PID=$!

# --------------------------------------------------------------- frontend ---
cd "$ROOT/frontend"

if [ ! -d node_modules ]; then
  log "Installing npm dependencies (first run, may take a minute)…"
  npm install --no-audit --no-fund
fi

cleanup() {
  echo
  log "Shutting down…"
  kill "$FLASK_PID" 2>/dev/null || true
  wait "$FLASK_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Give Flask a moment, then confirm it actually came up.
for _ in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:5000/api/health >/dev/null 2>&1; then break; fi
  sleep 0.5
done

if curl -fsS http://127.0.0.1:5000/api/health >/dev/null 2>&1; then
  log "Backend healthy:"
  curl -fsS http://127.0.0.1:5000/api/health
  echo
else
  warn "Backend did not respond. Check .flask.log"
fi

log "Starting Vite — open http://localhost:5173"
echo
exec npx vite
