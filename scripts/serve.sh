#!/usr/bin/env bash
# Serve src/ with Python's http.server, killing any previous instance on the same port first.
set -euo pipefail

PORT="${1:-8000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$SCRIPT_DIR/../src"

EXISTING_PID="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
if [[ -n "$EXISTING_PID" ]]; then
  echo "Killing existing server on port $PORT (pid $EXISTING_PID)"
  kill $EXISTING_PID
  sleep 0.5
fi

echo "Serving $SRC_DIR at http://localhost:$PORT/"
cd "$SRC_DIR"
exec python3 -m http.server "$PORT"
