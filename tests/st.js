/* ============================================================
 * ST.JS — roda a suíte de auto-teste do jogo (botão 🧪) num
 * Chromium headless REAL e imprime o relatório.
 *
 *   node tests/st.js [--shot]
 *
 * Pré-requisitos: bash tests/setup_browser.sh  +  servidor no ar
 * (python3 -m http.server 8000 na raiz do repo).
 * Env: PORT (padrão 8000), BASE (URL inteira, sobrepõe PORT).
 * Sai com código 1 se algum teste falhar (bom p/ CI).
 * ============================================================ */
const path = require('path');
const fs = require('fs');
// createRequire ancorado no package.json do ~/.uitest — resolve 'exports' dos
// pacotes ESM-only (require de caminho absoluto de DIRETÓRIO ignora exports)
const req = require('node:module').createRequire(path.join(process.env.HOME, '.uitest', 'package.json'));
let chromium, puppeteer;
try {
  chromium = req('@sparticuz/chromium').default;
  puppeteer = req('puppeteer-core');
} catch (e) {
  console.error('⚠ Dependências do harness ausentes — rode: bash tests/setup_browser.sh');
  process.exit(2);
}

(async () => {
  if (fs.existsSync('/tmp/al2023/lib'))
    process.env.LD_LIBRARY_PATH = '/tmp/al2023/lib:/tmp:' + (process.env.LD_LIBRARY_PATH || '');
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--no-sandbox'],
    executablePath: await chromium.executablePath(),
    headless: 'shell',
    defaultViewport: { width: 1600, height: 900 },
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 140)); });
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message.slice(0, 220)));

  const base = process.env.BASE || `http://127.0.0.1:${process.env.PORT || 8000}`;
  await page.goto(base + '/?selftest=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
  try {
    await page.waitForFunction(() => window.__selftestResults !== undefined, { timeout: 90000, polling: 500 });
  } catch (e) { console.log('⚠ TIMEOUT esperando a suíte concluir'); }

  const res = await page.evaluate(() => window.__selftestResults || null);
  if (!res) { console.error('❌ suíte não produziu resultado'); process.exit(1); }
  console.log(`=== ${res.ok}/${res.total} OK em ${res.secs}s (build ${res.ver}) ===`);
  for (const it of res.items)
    console.log((it.ok ? 'PASS ' : 'FAIL ') + '[' + it.cat + '] ' + it.name + (it.ok ? (it.detail ? ' — ' + it.detail : '') : ' — ERRO: ' + it.error));
  if (process.argv.includes('--shot')) {
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: '/tmp/shot_st.png' });
    console.log('📸 /tmp/shot_st.png');
  }
  console.log('PAGEERRORS:', errors.length ? errors.slice(0, 8) : 'none');
  await browser.close();
  process.exit(res.ok === res.total ? 0 : 1);
})().catch(e => { console.error('FATAL', e.message); process.exit(2); });
