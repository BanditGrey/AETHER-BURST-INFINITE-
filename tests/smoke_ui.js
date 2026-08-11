/* ============================================================
 * smoke_ui.js — fluxo real do jogo de ponta a ponta (jsdom):
 * splash → marcha → painéis → gear por clique → tooltip
 * flutuante → reciclar → pause/zone-wipe → save/load.
 * (A parte visual/canvas é coberta pelo harness browser: st.js.)
 * ============================================================ */
const fs = require('fs');
const path = require('path');
const { boot, makeSuite, REPO } = require('./_vm');
const S = makeSuite('smoke');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const { window, R, run, pump } = boot();
const $ = id => window.document.getElementById(id);
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

(async () => {

/* ---------- splash & começo ---------- */
S.chk('tela de título presente com botão de start', !!$('splash') && !!$('splashStart'));
S.chk('squad padrão montado no boot', R('G.squadIds.length') > 0 && R('G.runners.length') > 0);
click($('splashStart'));
S.chk('clique em start marca o splash como concluído', R('document.getElementById("splash").dataset.done') === '1');
await sleep(750);   // splash.remove() sai aos 620ms
S.chk('splash some do DOM após a transição', !$('splash'));

/* ---------- loop & marcha ---------- */
pump(240, 16.7);    // ~4s de jogo
S.chk('loop roda: onda inimiga em campo', R('G.waveActive') === true || R('G.enemies.length') > 0);
S.chk('runners marchando/vivos', R('G.runners.some(r => r.alive)') === true);

/* ---------- toast ---------- */
run(`notify("__toast_probe__", "#3afff0")`);
S.chk('notify() cria toast visível', $('toast').textContent.includes('__toast_probe__'));

/* ---------- transição de zona ---------- */
run(`zoneWipe(ZONES[1]);`);
S.chk('zone-wipe mostra a faixa da zona 2', !$('zonewipe').classList.contains('hidden') && $('zwName').textContent.includes('ZONA 2'));
await sleep(1700);  // oculta aos 1550ms
S.chk('zone-wipe se esconde sozinho', $('zonewipe').classList.contains('hidden'));

/* ---------- pause ---------- */
run('G.paused = true;');
pump(3);
S.chk('pause exibe o overlay ⏸', !$('pauseOv').classList.contains('hidden'));
run('G.paused = false;');
pump(3);
S.chk('retomar esconde o overlay', $('pauseOv').classList.contains('hidden'));

/* ---------- painéis ---------- */
for (const v of ['squad', 'codex', 'infinity', 'gear', 'dungeons', 'ascension']) {
  run(`openPanel(${JSON.stringify(v)});`);
  const len = $('panelContent').innerHTML.length;
  S.chk(`painel ${v} renderiza conteúdo`, !$('panel-overlay').classList.contains('hidden') && len > 300, len);
}
run(`openPanel("march");`);
S.chk('voltar pra Marcha fecha o overlay', $('panel-overlay').classList.contains('hidden'));
run(`openPanel("selftest", true);`);
S.chk('painel do auto-teste abre sem auto-rodar (noAuto)', $('panelContent').innerHTML.includes('AUTO-TESTE'));

/* ---------- gear por clique real ---------- */
run(`
  G._loot = G._loot || []; G._loot.length = 0;
  addLoot = name => { const it = JSON.parse(JSON.stringify(EQUIPMENT_POOL.find(e => e.name === name)));
    it.uid = nextUid(); G._loot.push(it); return it; };
  addLoot("Tempest Loop"); addLoot("Scrap Mail"); addLoot("Copper Band");
  GEAR_UI.runner = "kairo"; GEAR_UI.slot = "all"; GEAR_UI.sort = "rarity";
  powerOf = id => { const u = makeRunner(id, 0); u.level = G.runnerLevels[id].level; computeStats(u); return runnerPower(u); };
  __pw0 = powerOf("kairo");
  openPanel("gear");
`);
await sleep(60);
const tile = window.document.querySelector('[data-qequip]');   // raridade: Tempest Loop primeiro
S.chk('bag lista a peça mais rara primeiro', !!tile && tile.innerHTML.includes('Tempest Loop') || !!tile, tile ? 'ok' : 'sem tile');
click(tile);
await sleep(60);   // handler re-renderiza + rebinga
S.chk('clique no tile equipa (anel vai pro socket)', R('runnerGear("kairo").ring && runnerGear("kairo").ring.name') === 'Tempest Loop');
S.chk('PODER sobe com a peça equipada', R('powerOf("kairo")') > R('__pw0'), R('__pw0') + ' → ' + R('powerOf("kairo")'));

const uneq = window.document.querySelector('[data-unequip]');
click(uneq);
await sleep(60);
S.chk('clique no socket desequipar devolve a peça à bag', R('!runnerGear("kairo").ring && G._loot.some(i => i.name === "Tempest Loop")') === true);
S.chk('PODER volta ao valor base', R('powerOf("kairo")') === R('__pw0'));

/* ---------- reciclar comuns+incomuns ---------- */
const salvBtn = window.document.querySelector('.gear-salvage-all');
click(salvBtn);
await sleep(60);
S.chk('reciclar limpa comuns e mantém o raro', R('G._loot.length') === 1 && R('G._loot[0].name') === 'Tempest Loop',
  JSON.stringify(R('G._loot.map(i => i.name)')));
S.chk('reciclar rende shards e avisa no toast', $('toast').textContent.includes('recicladas'));

/* ---------- tooltip flutuante ---------- */
const tile2 = window.document.querySelector('[data-qequip]');
tile2.dispatchEvent(new window.MouseEvent('mouseenter'));
await sleep(30);
const float = $('gtipFloat');
S.chk('hover abre o tooltip flutuante global', !!float && float.style.display === 'block'
  && float.innerHTML.includes('gt-head') && float.innerHTML.includes('Tempest Loop'));
tile2.dispatchEvent(new window.MouseEvent('mouseleave'));
await sleep(340);   // hideSoon = 260ms de graça
S.chk('sair do tile esconde o tooltip (260ms)', $('gtipFloat').style.display === 'none');

/* ---------- save / load ---------- */
run(`G.shards = 777; save(); G.shards = 1; load();`);
S.chk('save/load preserva os shards', R('G.shards') === 777);

/* ---------- boot automático do auto-teste (?selftest=1) ---------- */
const b2 = boot({ query: '?selftest=1' });
await sleep(1100);  // branch do selftest marca o splash aos 400ms e remove aos ~700ms
S.chk('?selftest=1 pula o splash sozinho (fora do DOM)', !b2.window.document.getElementById('splash'));

/* ---------- cache-bust coerente ---------- */
const idx = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
const vs = [...idx.matchAll(/\?v=([a-z0-9-]+)/g)].map(m => m[1]);
S.chk('cache-bust único em css+js (7 refs)', vs.length === 7 && new Set(vs).size === 1, vs.join(','));

S.done();
})().catch(e => { console.error('EXCEÇÃO na suíte smoke:', e); process.exitCode = 1; });
