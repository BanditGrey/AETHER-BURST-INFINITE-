#!/usr/bin/env bash
# ============================================================
# Setup do harness de BROWSER REAL (Chromium headless local).
# O sandbox não tem Chrome nem root — este script resolve tudo:
#   1) instala jsdom + puppeteer-core + @sparticuz/chromium em ~/.uitest
#      (o Chromium vem empacotado via npm — não depende de CDN de browser)
#   2) extrai as libs de sistema embutidas (libnss3/libnspr4/…) p/ /tmp
#      (/tmp é limpo entre sessões → rode de novo se o browser não abrir)
# Idempotente.  Uso:  bash tests/setup_browser.sh
# ============================================================
set -e
UITEST="$HOME/.uitest"

echo "→ pacotes em $UITEST (jsdom, puppeteer-core, @sparticuz/chromium)"
mkdir -p "$UITEST"
npm install --prefix "$UITEST" --silent jsdom puppeteer-core @sparticuz/chromium

echo "→ libs de sistema p/ /tmp/al2023/lib"
cd "$UITEST"
node -e "
const fs=require('fs'),zlib=require('zlib');
const p='node_modules/@sparticuz/chromium/bin/al2023.tar.br';
fs.writeFileSync('/tmp/al2023.tar', zlib.brotliDecompressSync(fs.readFileSync(p)));
"
mkdir -p /tmp/al2023 && tar -xf /tmp/al2023.tar -C /tmp/al2023

echo ""
echo "✅ pronto. Com o servidor local no ar (python3 -m http.server 8000):"
echo "   node tests/st.js           # auto-teste completo no browser real"
echo "   node tests/shot.js game    # screenshot do gameplay em /tmp/shot_game.png"
echo "   node tests/shot.js gear    # screenshot do painel gear + equip/scroll reais"
