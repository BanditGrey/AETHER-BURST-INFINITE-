#!/usr/bin/env bash
# ============================================================
# browser-test.sh — auto-teste no Chromium headless REAL, com
# tudo automatizado: instala o harness se faltar, sobe o
# servidor, roda a suíte in-game (🧪) e derruba o servidor.
#
#   npm run test:browser
#
# Motivo: o /tmp do sandbox é limpo entre sessões, então o
# setup precisava ser redescoberto toda vez. Agora não.
# ============================================================
set -e
cd "$(dirname "$0")/.."
PORT="${PORT:-8000}"

if [ ! -d "$HOME/.uitest/node_modules/puppeteer-core" ] || [ ! -d /tmp/al2023/lib ]; then
  echo "→ harness de browser ausente/limpo — instalando (1× por sessão do sandbox)…"
  bash tests/setup_browser.sh
fi

SERVER_PID=""
if ! curl -sf "http://127.0.0.1:$PORT/index.html" -o /dev/null 2>&1; then
  echo "→ subindo servidor em :$PORT"
  python3 -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 &
  SERVER_PID=$!
  trap '[ -n "$SERVER_PID" ] && kill $SERVER_PID 2>/dev/null || true' EXIT
  for _ in $(seq 1 30); do
    curl -sf "http://127.0.0.1:$PORT/index.html" -o /dev/null 2>&1 && break
    sleep 0.3
  done
else
  echo "→ servidor já no ar em :$PORT"
fi

echo "→ rodando a suíte in-game no Chromium headless…"
PORT="$PORT" node tests/st.js
