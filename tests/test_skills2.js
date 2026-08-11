/* ============================================================
 * test_skills2.js — skills executam de verdade + TODOS os
 * assets referenciados existem em disco (a regressão "raio do
 * nada sem assets" nasceu de uma referência sem checagem —
 * aqui toda referência visual é validada contra o filesystem).
 * ============================================================ */
const fs = require('fs');
const path = require('path');
const { boot, makeSuite, REPO } = require('./_vm');
const S = makeSuite('skills');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const { R, run } = boot();
const has = p => fs.existsSync(path.join(REPO, p));
const lsdir = p => fs.readdirSync(path.join(REPO, p));

(async () => {

/* ---------- assets: runners / inimigos / fundos ---------- */
const missingRunners = R('RUNNERS.map(r=>r.id)').filter(id => !has(`assets/runners/${id}.png`));
S.chk('todo runner tem assets/runners/<id>.png', missingRunners.length === 0, missingRunners.join(','));

const missingEnemies = R('Object.keys(ENEMY_TYPES)').filter(k => !has(`assets/enemies/${k}.png`));
S.chk('todo ENEMY_TYPE tem assets/enemies/<k>.png', missingEnemies.length === 0, missingEnemies.join(','));

const bgs = lsdir('assets/bg');
const missingZones = R('ZONES.map(z=>z.id)').filter(id => !bgs.some(f => f.startsWith('z' + id + '_') && f.endsWith('.jpg')));
S.chk('toda zona tem assets/bg/z<N>_*.jpg pintado', missingZones.length === 0, missingZones.join(','));

/* ---------- assets: sprites de skill referenciados no código ---------- */
const src = ['js/engine.js', 'js/main.js', 'js/fx.js'].map(f => fs.readFileSync(path.join(REPO, f), 'utf8')).join('\n');
const spriteKeys = [...new Set([...src.matchAll(/FX\.sprite\(\s*"([^"]+)"/g)].map(m => m[1]))];
const skillFiles = lsdir('assets/skills');
const missingSprites = spriteKeys.filter(k => !skillFiles.includes(k + '.png'));
S.chk('todo FX.sprite("k") tem assets/skills/<k>.png (' + spriteKeys.length + ' refs)', missingSprites.length === 0, missingSprites.join(','));

/* ---------- assets: retrato de skill por runner (RUNNER_SKILL_SPRITE) ---------- */
const skillMap = R('RUNNER_SKILL_SPRITE');
const runnerIds = R('RUNNERS.map(r=>r.id)');
const missingSkillArt = runnerIds.filter(id => !skillMap[id] || !skillFiles.includes(skillMap[id] + '.png'));
S.chk('todo runner tem arte de skill mapeada e existente', missingSkillArt.length === 0, missingSkillArt.join(','));

/* ---------- assets: ícone de cada slot de gear ---------- */
const slotIds = R('GEAR_SLOTS.map(g=>g.id)');
const missingIcons = slotIds.filter(s => !has(`assets/icons/slot_${s}.png`));
S.chk('todo slot de gear tem assets/icons/slot_<slot>.png', missingIcons.length === 0, missingIcons.join(','));

/* ---------- raio: procedural, sem imagem estática ---------- */
const refsLightningPng = ['js/engine.js', 'js/main.js', 'js/fx.js', 'js/pixi.js', 'index.html']
  .filter(f => fs.readFileSync(path.join(REPO, f), 'utf8').includes('lightning.png'));
S.chk('nenhum código referencia sprite estático de raio', refsLightningPng.length === 0, refsLightningPng.join(','));
S.chk('FX.lightning existe (raio procedural serrilhado)', R('typeof FX.lightning') === 'function');
S.chk('REFERENCIA_ARTE.md documenta o raio procedural',
  has('assets/REFERENCIA_ARTE.md') && /raio|lightning/i.test(fs.readFileSync(path.join(REPO, 'assets/REFERENCIA_ARTE.md'), 'utf8')));

/* ---------- versões de cache-bust de sprites ---------- */
S.chk('SPRITE_V definido e não-vazio', typeof R('SPRITE_V') === 'string' && R('SPRITE_V').length >= 4);
S.chk('SKILL_SPRITE_V definido e não-vazio', typeof R('SKILL_SPRITE_V') === 'string' && R('SKILL_SPRITE_V').length >= 4);

/* ---------- skills: cada uma executa e causa efeito real ---------- */
run(`rand = v => { Math.random = () => v; }; rand(0.5);`);
for (const id of runnerIds) {
  run(`
    skR = makeRunner(${JSON.stringify(id)}, 0);
    G.enemies = [makeEnemy("hollow", 1), makeEnemy("brute", 1), makeEnemy("surge", 1)];
    G.enemies.forEach((e,i) => { e.x = 480 + i*90; e.spawnDelay = 0; });
    hpTotal0 = G.enemies.reduce((s,e) => s + e.hp, 0);
    skErr = null;
    try { useSkill(skR); } catch(e) { skErr = String(e); }
  `);
  await sleep(500);   // zael/sable têm hits escalonados por setTimeout real
  const err = R('skErr'), dropped = R('hpTotal0 - G.enemies.reduce((s,e) => s + Math.max(0, e.hp||0), 0)');
  S.chk(`skill de ${id}: executa sem erro e tira HP dos inimigos`, !err && dropped > 0.5, err || ('dano=' + dropped));
}

S.done();
})().catch(e => { console.error('EXCEÇÃO na suíte skills:', e); process.exitCode = 1; });
