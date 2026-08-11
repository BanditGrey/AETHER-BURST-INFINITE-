/* ============================================================
 * SHOT.JS — screenshots e interações REAIS no jogo (Chromium
 * headless). Modos:
 *
 *   node tests/shot.js game   → gameplay (inimigos, raio do burst) em /tmp/shot_game.png + /tmp/shot_bolt.png
 *   node tests/shot.js gear   → painel gear: mede layout, clica p/ equipar de verdade, roda a bag, checa stats
 *
 * Pré-requisitos: bash tests/setup_browser.sh  +  servidor no ar na porta 8000.
 * ============================================================ */
const path = require('path');
const fs = require('fs');
const NM = path.join(process.env.HOME, '.uitest', 'node_modules');
let chromium, puppeteer;
try {
  chromium = require(path.join(NM, '@sparticuz/chromium')).default;
  puppeteer = require(path.join(NM, 'puppeteer-core'));
} catch (e) {
  console.error('⚠ Dependências ausentes — rode: bash tests/setup_browser.sh');
  process.exit(2);
}

(async () => {
  const mode = process.argv[2] || 'game';
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
  await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await new Promise(r => setTimeout(r, 1500));
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  if (mode === 'gear') {
    await page.evaluate(() => {
      const sb = document.getElementById('splashStart'); if (sb) sb.click();
      for (let i = 0; i < 60; i++) rollDrop();
      GEAR_UI.runner = 'frost';
      openPanel('gear');
    });
    await sleep(900);
    const info = await page.evaluate(() => {
      const q = s => document.querySelector(s);
      const grid = q('.gw-grid.gi-grid'), detail = q('.gw-detail'), stats = q('.gw-stats');
      const panel = q('.panel.gear-wide').getBoundingClientRect();
      const sr = stats ? stats.getBoundingClientRect() : null;
      return {
        panelBottom: Math.round(panel.bottom),
        statsInside: sr ? (sr.bottom <= panel.bottom + 4 && sr.top >= panel.top) : 'NO .gw-stats',
        gridClient: grid.clientHeight, gridScroll: grid.scrollHeight,
      };
    });
    console.log('LAYOUT:', JSON.stringify(info));
    await page.screenshot({ path: '/tmp/shot_gear.png' });
    // clique físico p/ equipar
    const tile = await page.$('.gw-grid.gi-grid .gi[data-qequip]');
    if (tile) {
      const b = await tile.boundingBox();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await sleep(300);
      await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      await sleep(350);
    }
    const eq = await page.evaluate(() => Object.keys(runnerGear(GEAR_UI.runner)));
    console.log('EQUIP (clique real):', JSON.stringify(eq));
    // rolagem da bag
    const st0 = await page.evaluate(() => document.querySelector('.gw-grid.gi-grid').scrollTop);
    const gb = await (await page.$('.gw-grid.gi-grid')).boundingBox();
    await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
    await page.mouse.wheel({ deltaY: 400 });
    await sleep(250);
    const st1 = await page.evaluate(() => document.querySelector('.gw-grid.gi-grid').scrollTop);
    console.log('BAG SCROLL:', st0, '→', st1);
    await page.screenshot({ path: '/tmp/shot_gear2.png' });
    console.log('📸 /tmp/shot_gear.png + /tmp/shot_gear2.png');
  } else {
    await page.evaluate(() => { const s = document.getElementById('splashStart'); if (s) s.click(); });
    await sleep(7000);
    await page.screenshot({ path: '/tmp/shot_game.png' });
    await page.evaluate(() => {
      const k = G.runners.find(r => r.id === 'kairo' && r.alive);
      if (k && typeof burstVisual === 'function') burstVisual(k, ELEMENTS.lightning);
    });
    await sleep(320);
    await page.screenshot({ path: '/tmp/shot_bolt.png' });
    console.log('📸 /tmp/shot_game.png + /tmp/shot_bolt.png');
  }
  console.log('PAGEERRORS:', errors.length ? errors.slice(0, 8) : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(2); });
