/* ============================================================
   AETHER BURST: INFINITE — ENGINE
   Estado, simulação de combate, formação, Aether Burst,
   Burst Sync, progressão, save/offline e renderização.
   ============================================================ */

/* ---------- Constantes de layout ---------- */
const PLAY_W = 1280, PLAY_H = 640;
const GROUND_Y = 478;                 // linha do chão (topo da área de chão)
// formação em bloco: vanguards numa fileira na frente (mesma linha de frente),
// suportes (rear) logo atrás deles, formando um bloco compacto e organizado
const VANGUARD_POS = [
  { x: 300, y: GROUND_Y - 8 },   // vanguard esquerda
  { x: 360, y: GROUND_Y - 8 },   // vanguard centro
  { x: 420, y: GROUND_Y - 8 },   // vanguard direita (mesma linha de frente)
];
const REAR_POS = [
  { x: 315, y: GROUND_Y - 40 },  // suporte esquerda (logo atrás)
  { x: 405, y: GROUND_Y - 40 },  // suporte direita (logo atrás)
];
const VANGUARD_X = 330, VANGUARD_Y = [GROUND_Y - 24, GROUND_Y - 12, GROUND_Y];
const REAR_X     = 215, REAR_Y     = [GROUND_Y - 18, GROUND_Y];
const ENGAGE_X   = 452;          // inimigos param um pouco à direita da vanguard
const SPAWN_X    = 1320;
const ENEMY_HP_BASE = 220;       // base de HP dos inimigos

/* ---------- SFX shim (main.js sobrescreve no browser; no-op fora dele) ---------- */
function sfxLevel(){}
function sfxHit(){}
function sfxCrit(){}
function sfxBurst(){}
function sfxBoss(){}
function notify(){}   // toast UI — main.js sobrescreve no browser

/* ---------- Estado global ---------- */
const G = {
  // recursos
  shards: 0,
  riftTickets: 3,
  infinityFragments: 0,
  // progressão
  zone: 1,
  level: 1,
  maxZone: 1,
  maxLevel: 1,
  // nível da conta — dá Pontos de Ascensão a cada level up (sem reiniciar nada)
  accountLevel: 1,
  accountXp: 0,
  // árvore de passivas (Ascensão): nós desbloqueados + pontos disponíveis
  ascension: {},          // nodeId -> true
  ascensionPoints: 0,     // Pontos de Ascensão para gastar
  // codex: progresso de kills por runner (completar preenche o codex e dá pontos)
  codex: {},              // runnerId -> kills
  codexDone: {},          // runnerId -> true
  // esquadrão
  ownedRunners: ["kairo","zael","seraph","lyra","frost","nina","rex","sable"],
  squadIds: ["kairo","zael","rex","frost","nina"],
  // níveis individuais dos runners
  runnerLevels: {},
  // resonance: chave "a|b" -> xp
  resonance: {},
  // infinity circuit
  infinity: {},
  // tempo
  lastSeen: Date.now(),
  // estatísticas
  stats: { kills: 0, bursts: 0, syncs: 0, bosses: 0 },
  // velocidade
  speed: 1,            // 1, 2, 3, ou 6 (burst mode)
  burstMode: false,
  paused: false,
  // estado de combate (runtime)
  runners: [],
  enemies: [],
  waveActive: false,
  waveClearTimer: 0,
  syncCooldown: {},    // pairKey -> tempo restante
  banner: null,        // {text, sub, color, life}
  // ui
  view: "march",       // march | squad | codex | infinity | gear
  selectedRunner: null,
};

/* ---------- Init dos níveis de runner ---------- */
function initRunnerLevels() {
  for (const id of G.ownedRunners) {
    if (!G.runnerLevels[id]) G.runnerLevels[id] = { level: 1, xp: 0, gear: [] };
  }
}

/* ============================================================
   CONTA (Account Level) → fonte de Pontos de Ascensão
   A conta ganha XP automaticamente na marcha (sem reiniciar nada).
   Cada level up concede +1 Ponto de Ascensão, gastável na árvore de
   passivas (substitui o antigo sistema de Reboot).
   ============================================================ */
function accountXpNeeded(level) { return Math.round(120 * Math.pow(1.12, level - 1)); }

function addAccountXp(amount) {
  G.accountXp += amount;
  let leveled = false;
  while (G.accountXp >= accountXpNeeded(G.accountLevel)) {
    G.accountXp -= accountXpNeeded(G.accountLevel);
    G.accountLevel++;
    // a cada level up: +1 Ponto de Ascensão (gastável na árvore) + fragments
    G.ascensionPoints++;
    const frags = 1 + Math.floor(G.accountLevel / 5);
    G.infinityFragments += frags;
    leveled = true;
    notify('NÍVEL DE CONTA ' + G.accountLevel + ' · +1 Ponto de Ascensão · +' + frags + ' 💠', '#3afff0');
    sfxLevel();
  }
  return leveled;
}

/* ============================================================
   RIFT CODEX — preencher as entradas dá Pontos de Ascensão.
   Cada runner ganha progresso ao abater entidades; ao atingir o
   requisito de abates, a entrada é completada (uma vez) e premia +1
   ponto de ascensão.
   ============================================================ */
const CODEX_KILL_REQ = 60;   // abates para completar a entrada de um runner
function gainCodexProgress(runnerId) {
  if (G.codexDone[runnerId]) return;
  G.codex[runnerId] = (G.codex[runnerId] || 0) + 1;
  if (G.codex[runnerId] >= CODEX_KILL_REQ) {
    G.codexDone[runnerId] = true;
    G.ascensionPoints++;
    notify('📖 Codex completo: ' + RUNNER_BY_ID[runnerId].name + ' · +1 Ponto de Ascensão', '#ffd23f');
  }
}
function codexProgress(runnerId) { return G.codex[runnerId] || 0; }
function codexCompleted(runnerId) { return !!G.codexDone[runnerId]; }

/* Bônus agregados da árvore de Ascensão: soma os efeitos de todos os nós
   desbloqueados. */
function ascensionBonuses() {
  const out = {};
  for (const id in G.ascension) {
    if (!G.ascension[id]) continue;
    const n = ASCENSION_NODES.find(node => node.id === id);
    if (!n || !n.effect) continue;
    for (const k in n.effect) out[k] = (out[k] || 0) + n.effect[k];
  }
  return out;
}

/* Combina Infinity Circuit + árvore de Ascensão em um único agregado. */
function allBonuses() {
  const out = {};
  for (const k in infinityBonuses()) out[k] = (out[k] || 0) + infinityBonuses()[k];
  for (const k in ascensionBonuses()) out[k] = (out[k] || 0) + ascensionBonuses()[k];
  return out;
}

/* ============================================================
   CÁLCULO DE STATS
   ============================================================ */
function computeStats(runnerUnit) {
  const data = RUNNER_BY_ID[runnerUnit.id];
  const cls = CLASSES[data.cls];
  const rar = RARITIES[data.rarity];
  const lvl = runnerUnit.level;
  const inf = allBonuses();
  const b = cls.base;
  const lvHp  = 1 + (lvl - 1) * 0.085;
  const lvAtq = 1 + (lvl - 1) * 0.082;

  let hp  = b.hp  * rar.mult * lvHp;
  let atq = b.atq * rar.mult * lvAtq;
  let def = b.def * rar.mult * (1 + (lvl - 1) * 0.05);
  let spd = b.spd;
  let crt = b.crt;
  let cdg = b.cdg / 100;          // multiplicador
  let eva = b.eva / 100;
  let pen = b.pen / 100;
  let ach = b.ach;

  // bônus do infinity circuit
  if (inf.atq) atq *= (1 + inf.atq);
  if (inf.def) def *= (1 + inf.def);
  if (inf.hp)  hp  *= (1 + inf.hp);
  if (inf.crt) crt += inf.crt;
  if (inf.cdg) cdg += inf.cdg;
  if (inf.eva) eva += inf.eva / 100;
  if (inf.ach) ach *= (1 + inf.ach);

  // gear (simplificado)
  for (const g of (runnerUnit.gear || [])) {
    const eq = g;
    if (!eq || !eq.stats) continue;
    const s = eq.stats;
    if (s.hp)  hp  *= (1 + s.hp);
    if (s.atq) atq *= (1 + s.atq);
    if (s.def) def *= (1 + s.def);
    if (s.spd) spd *= (1 + s.spd);
    if (s.crt) crt += s.crt * 100;
    if (s.cdg) cdg += s.cdg;
    if (s.eva) eva += s.eva;
    if (s.ach) ach *= (1 + s.ach);
    if (s.pen) pen += s.pen / 100;
  }

  runnerUnit.maxHp = Math.round(hp);
  runnerUnit.atq = atq;
  runnerUnit.def = def;
  runnerUnit.spd = spd;
  runnerUnit.crt = Math.min(0.85, crt / 100);
  runnerUnit.cdg = cdg;
  runnerUnit.eva = Math.min(0.6, eva);
  runnerUnit.pen = pen;
  runnerUnit.ach = ach;
  runnerUnit.attackInterval = Math.max(0.35, 1.25 / (spd / 100));
  runnerUnit.range = cls.range;
  if (runnerUnit.hp === undefined || runnerUnit.hp > runnerUnit.maxHp) runnerUnit.hp = runnerUnit.maxHp;
}

/* Bônus agregados do Infinity Circuit */
function infinityBonuses() {
  const out = {};
  for (const id in G.infinity) {
    if (!G.infinity[id]) continue;
    const node = INFINITY_NODES.find(n => n.id === id);
    if (!node || !node.effect) continue;
    const e = node.effect;
    for (const k in e) {
      if (k === "slot6") continue;
      out[k] = (out[k] || 0) + e[k];
    }
  }
  return out;
}

/* ============================================================
   CONSTRUÇÃO DE UNIDADES
   ============================================================ */
function makeRunner(id, slotIndex) {
  const data = RUNNER_BY_ID[id];
  const lvlInfo = G.runnerLevels[id] || { level: 1, xp: 0, gear: [] };
  const u = {
    kind: "runner",
    id, data,
    level: lvlInfo.level,
    gear: lvlInfo.gear || [],
    element: data.element,
    color: data.color,
    accent: data.accent,
    cls: data.cls,
    rarity: data.rarity,
    slotIndex,
    x: 0, y: 0, homeX: 0, homeY: 0,
    facing: 1,
    hp: undefined, maxHp: 0,
    burstEnergy: 0,
    burstReady: false,
    burstCd: 0,
    skillCd: 0,
    attackTimer: Math.random() * 0.4,
    alive: true,
    reviveTimer: 0,
    // anim
    bob: Math.random() * Math.PI * 2,
    swing: 0,
    hitFlash: 0,
    castGlow: 0,
    burstScale: 1,
    // passivas estado
    chargeStacks: 0,
    beastStacks: 0,
    phantomCrit: false,
    shieldHp: 0,
    shieldTimer: 0,
    markTargets: [],
    // misc
    banner: 0,
  };
  computeStats(u);
  positionRunner(u, slotIndex);
  u.hp = u.maxHp;
  return u;
}

function positionRunner(u, slotIndex) {
  // formação: slots 0-2 = vanguard, 3-4 = rear — cada slot numa posição própria
  const p = slotIndex < 3 ? VANGUARD_POS[slotIndex] : REAR_POS[slotIndex - 3];
  u.line = slotIndex < 3 ? "Vanguard" : "Rear";
  u.homeX = p.x; u.homeY = p.y; u.x = p.x; u.y = p.y;
}

/* formação atual: quais ids estão em cada slot (5) */
function runnerFormation() { return G.squadIds.slice(0, 5); }

function makeEnemy(typeKey, level, isBossScale) {
  const t = ENEMY_TYPES[typeKey];
  const z = ZONES[G.zone - 1];
  const lvl = level;
  const hpGrowth = Math.pow(1.055, lvl - 1);
  const atqGrowth = Math.pow(1.05, lvl - 1);
  const bossMult = isBossScale ? 1 : 1;
  let hp = t.hp * ENEMY_HP_BASE * hpGrowth * bossMult;
  let atq = t.atq * 26 * atqGrowth;
  if (typeKey === "riftlord") { hp = ENEMY_HP_BASE * Math.pow(1.05, lvl - 1) * 9; atq = 30 * Math.pow(1.05, lvl - 1) * 3.2; }
  if (typeKey === "miniboss") { hp = ENEMY_HP_BASE * Math.pow(1.055, lvl - 1) * 5; atq = 26 * Math.pow(1.05, lvl - 1) * 2.2; }
  const lane = Math.floor(Math.random() * 3);
  const e = {
    kind: "enemy",
    typeKey,
    name: t.name,
    element: typeKey === "phantom" ? "dark"
             : (typeKey === "riftlord" ? ["wind","fire","ice","lightning","dark","light","aether"][G.zone-1] || "wind"
             : (["wind","fire","ice","lightning","dark","light","aether"][G.zone-1] || "wind")),
    color: t.color,
    size: t.size,
    isBoss: typeKey === "riftlord" || typeKey === "miniboss",
    isRiftLord: typeKey === "riftlord",
    behavior: t.behavior,
    x: SPAWN_X + Math.random() * 200,
    // inimigos usam faixa ampla de profundidade (não só a linha dos vanguard)
    y: (GROUND_Y - 40) + (Math.random() * 40),
    targetX: ENGAGE_X + 20 + (Math.random() - 0.5) * 80,
    facing: -1,
    hp, maxHp: hp,
    atq, def: atq * 0.25,
    spd: t.spd,
    crt: typeKey === "phantom" ? 0.25 : 0.08,
    cdg: 1.7, eva: 0, pen: 0.1,
    attackInterval: Math.max(0.6, 1.5 / (t.spd / 100)),
    range: typeKey === "brute" || typeKey === "hollow" ? 80 : (t.behavior === "boss" ? 110 : 90),
    attackTimer: Math.random() * 0.6,
    alive: true,
    bob: Math.random() * Math.PI * 2,
    swing: 0,
    hitFlash: 0,
    slowPct: 0,           // redução de spd (passiva do Frost)
    frozen: 0,            // tempo congelado
    gravityMark: 0,       // tempo marcado (Seraph)
    dyingTimer: 0,
    surged: false,
  };
  return e;
}

/* ============================================================
   SPAWN DE WAVES / PROGRESSÃO
   ============================================================ */
function spawnWave() {
  G.enemies = [];
  const lvl = G.level;
  let composition;
  if (lvl % 10 === 0 && lvl < 100) {
    composition = [{ k: "miniboss", n: 1, boss: true }, { k: "brute", n: 1 }];
  } else if (lvl === 100) {
    composition = [{ k: "riftlord", n: 1, boss: true }, { k: "phantom", n: 2 }];
  } else {
    // composição aleatória escalando com nível
    const pool = ["hollow","hollow","brute","phantom","surge"];
    if (lvl >= 6) pool.push("elite");
    composition = [];
    const groups = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < groups; i++) {
      const k = pool[Math.floor(Math.random() * pool.length)];
      const def = ENEMY_TYPES[k];
      const n = def.count[0] + Math.floor(Math.random() * (def.count[1] - def.count[0] + 1));
      composition.push({ k, n });
    }
  }
  let delay = 0;
  for (const grp of composition) {
    for (let i = 0; i < grp.n; i++) {
      const e = makeEnemy(grp.k, lvl, !!grp.boss);
      e.spawnDelay = delay;
      delay += 0.35 + Math.random() * 0.4;
      G.enemies.push(e);
    }
  }
  // progressão de zona se passou da 100
  G.waveActive = true;
  if (lvl === 1 || lvl % 10 === 0) {
    banner(ZONES[G.zone-1].name, "Nível " + lvl, ZONES[G.zone-1].accent);
  }
}

function nextLevel() {
  G.level++;
  if (G.level > G.maxLevel) G.maxLevel = G.level;
  if (G.level > 100) {
    // limpa a zona -> próxima
    G.zone = Math.min(ZONES.length, G.zone + 1);
    G.level = 1;
    if (G.zone > G.maxZone) G.maxZone = G.zone;
    banner(ZONES[G.zone-1].name + " DESBLOQUEADA", "Nova zona", ZONES[G.zone-1].accent);
    G.shards += 5000;
    G.infinityFragments += 5;
  }
  save();
}

/* ============================================================
   COMBATE
   ============================================================ */
function aliveEnemies() { return G.enemies.filter(e => e.alive); }
function aliveRunners() { return G.runners.filter(r => r.alive); }

/* Inimigos alvo de skills/bursts de área: só os que já estão em campo
   (spawn concluído) e dentro da zona ativa de combate. Sem isso, as
   skills nukavam a wave inteira ainda no spawn (fora da tela) e os
   melee nunca tinham o que atacar. */
const AOE_REACH = 900;
function aoeTargets() { return G.enemies.filter(e => e.alive && e.spawnDelay <= 0 && e.x < AOE_REACH); }

/* seleciona alvo para um runner */
function runnerTarget(r) {
  const enemies = aliveEnemies();
  if (!enemies.length) return null;
  // melee: inimigo mais à frente (menor x); ranged: mais próximo
  let best = null, bestScore = Infinity;
  for (const e of enemies) {
    if (r.line === "Vanguard") {
      if (e.x < bestScore) { bestScore = e.x; best = e; }
    } else {
      const d = Math.abs(e.x - r.x) + Math.abs(e.y - r.y) * 0.4;
      if (d < bestScore) { bestScore = d; best = e; }
    }
  }
  return best;
}

/* seleciona alvo para um inimigo */
function enemyTarget(e) {
  const runners = aliveRunners();
  if (!runners.length) return null;
  if (e.behavior === "flank") {
    // phantom: mira na retaguarda
    const rear = runners.filter(r => r.line === "Rear");
    const pool = rear.length ? rear : runners;
    return pool.reduce((a, b) => (dist2(e, a) < dist2(e, b) ? a : b));
  }
  // prioriza vanguard
  const vg = runners.filter(r => r.line === "Vanguard");
  const pool = vg.length ? vg : runners;
  return pool.reduce((a, b) => (dist2(e, a) < dist2(e, b) ? a : b));
}
function dist2(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }

/* núcleo de dano: aplica mitigação, crit, esquiva, elemento */
function dealDamage(source, target, raw, opts) {
  opts = opts || {};
  if (!target || !target.alive) return 0;
  // esquiva
  if (!opts.noMiss && Math.random() < (target.eva || 0)) {
    FX.floatText(target.x, target.y - target.size - 12, "MISS", { color: "#9aa3ad", size: 16 });
    return 0;
  }
  // mitigação por def (com penetração)
  const effDef = Math.max(0, (target.def || 0) * (1 - (source.pen || 0)));
  let dmg = raw * (120 / (120 + effDef));
  // elemento
  if (source.element && target.element) {
    dmg *= elementMultiplier(source.element, target.element);
  }
  // gravity mark (Seraph)
  if (target.gravityMark > 0) dmg *= 1.2;
  // crit
  let crit = false;
  if (opts.forceCrit || Math.random() < (source.crt || 0)) {
    crit = true; dmg *= (source.cdg || 1.6);
    if (source.phantomCrit) { dmg *= 1.5; source.phantomCrit = false; }
  }
  dmg = Math.max(1, dmg * (opts.mult || 1) * (0.9 + Math.random() * 0.2));

  target.hp -= dmg;
  target.hitFlash = 0.18;

  const el = ELEMENTS[source.element] || ELEMENTS.aether;
  FX.damage(target.x, target.y - (target.size || 30) - 6, dmg, {
    crit, color: crit ? "#ffd23f" : (opts.color || el.glow), element: source.element
  });
  // SFX (throttled)
  if (crit) sfxCrit(); else if (Math.random() < 0.10) sfxHit();
  // partículas de impacto
  FX.burst(target.x, target.y - (target.size||30)*0.4, {
    count: crit ? 12 : 6, color: el.color, speed: crit ? 220 : 140,
    life: 0.35, size: crit ? 4 : 2.6, spread: Math.PI * 1.4, dir: Math.PI, glow: true
  });

  // charge de burst
  if (source.kind === "runner") gainBurst(source, 5 + dmg / (target.maxHp) * 40);
  if (target.kind === "runner") gainBurst(target, 3 + dmg / (target.maxHp) * 30);

  // passiva Beast Stance (Rex): ganha ATQ ao apanhar
  if (target.kind === "runner" && target.id === "rex") {
    target.beastStacks = Math.min(20, target.beastStacks + 1);
    target.atq = recomputeRexAtq(target);
  }
  // passiva Fang Instinct (Zael): handled em stats dinâmicas

  // morte
  if (target.hp <= 0) killUnit(target, source);
  return dmg;
}

function recomputeRexAtx(r) { return r.atq; }
function recomputeRexAtq(r) {
  // recalcula atq base + stacks
  const base = computeBaseAtq(r);
  return base * (1 + r.beastStacks * 0.05);
}
function computeBaseAtq(r) {
  // atq sem stacks beast (guardamos atqBase)
  if (!r._atqBase) {
    computeStats(r);
    r._atqBase = r.atq;
  }
  return r._atqBase;
}

function gainBurst(runner, amount) {
  if (!runner.alive) return;
  runner.burstEnergy = Math.min(100, runner.burstEnergy + amount * runner.ach);
  if (runner.burstEnergy >= 100) runner.burstReady = true;
}

function killUnit(unit, killer) {
  if (!unit.alive) return;
  unit.alive = false;
  if (unit.kind === "enemy") {
    G.stats.kills++;
    unit.dyingTimer = 0.5;
    // codex: o runner que abateu preenche a entrada — completar dá +1 Ponto de Ascensão
    if (killer && killer.kind === "runner") gainCodexProgress(killer.id);
    // surge: onda ao morrer
    if (unit.typeKey === "surge" && !unit.surged) {
      unit.surged = true;
      FX.ring(unit.x, unit.y - unit.size*0.4, { color: "#3afff0", rMax: 130, life: 0.5, width: 5 });
      for (const r of aliveRunners()) {
        if (Math.abs(r.x - unit.x) < 130) dealDamage({ element: "aether", atq: unit.atq*0.5, cdg:1.4, crt:0, pen:0 }, r, unit.atq*0.5, { noMiss:false, color:"#3afff0" });
      }
    }
    // recompensas (bônus de Conta + Infinity)
    const bon = allBonuses();
    const shards = Math.round((unit.isBoss ? 1200 : 14) * Math.pow(1.04, G.level) * (1 + (bon.shards || 0)));
    G.shards += shards;
    const xp = (unit.isBoss ? 60 : 4) * Math.pow(1.03, G.level) * (1 + (bon.xp || 0));
    distributeXp(xp);
    addAccountXp(xp);
    // drop de equipamento
    const dropChance = (unit.isBoss ? 1 : 0.06) * (1 + (bon.drop || 0));
    if (Math.random() < dropChance) rollDrop();
    if (unit.isRiftLord) { G.stats.bosses++; bossDeathCinematic(unit); sfxBoss(); }
    // explosão de morte
    FX.burst(unit.x, unit.y - unit.size*0.4, { count: unit.isBoss?60:22, color: unit.color, speed: unit.isBoss?320:200, life: 0.7, size: unit.isBoss?6:3.4, spread: Math.PI*2 });
    FX.ring(unit.x, unit.y - unit.size*0.4, { color: unit.color, rMax: unit.isBoss?360:140, life: 0.55, width: unit.isBoss?9:4 });
    if (unit.isBoss) { FX.flashScreen("255,255,255", 0.7); FX.shake(18, 0.5); FX.slowmoFor(0.5); }
  } else {
    // runner morto -> revive em alguns segundos
    unit.reviveTimer = 3.5;
    FX.burst(unit.x, runEdgeY(unit), { count: 18, color: "#ff5a3c", speed: 160, life: 0.6, size: 3 });
    FX.floatText(unit.x, unit.y - 50, "DOWN", { color: "#ff5a5a", size: 18 });
  }
}
function runEdgeY(u){ return u.y; }

function distributeXp(xp) {
  for (const r of G.runners) {
    if (!r.alive) continue;
    const li = G.runnerLevels[r.id];
    li.xp += xp;
    const need = xpNeeded(li.level);
    while (li.xp >= need) { li.xp -= need; li.level++; levelUp(r); }
  }
}
function xpNeeded(level) { return Math.round(40 * Math.pow(1.18, level - 1)); }
function levelUp(r) {
  r.level = G.runnerLevels[r.id].level;
  const wasFull = r.hp >= r.maxHp;
  computeStats(r);
  r._atqBase = null;
  if (r.id === "rex") r.atq = recomputeRexAtq(r);
  if (wasFull) r.hp = r.maxHp;
  applyOvercharge();
  sfxLevel();
  FX.floatText(r.x, r.y - 60, "LV " + r.level, { color: "#3afff0", size: 18 });
}

/* ============================================================
   SKILLS & PASSIVAS (executadas no update)
   ============================================================ */
function basicAttack(attacker, target) {
  if (!target) return;
  attacker.swing = 1;
  let mult = 1;
  // passiva Charged Rush (Kairo)
  if (attacker.id === "kairo") {
    attacker.chargeStacks++;
    if (attacker.chargeStacks >= 5) {
      attacker.chargeStacks = 0;
      // descarga em todos próximos
      FX.ring(target.x, target.y - 20, { color: ELEMENTS.lightning.color, rMax: 150, life: 0.4, width: 4 });
      for (const e of aliveEnemies()) {
        if (Math.abs(e.x - target.x) < 160) dealDamage(attacker, e, attacker.atq * 0.7, { color: ELEMENTS.lightning.glow });
      }
      return;
    }
  }
  dealDamage(attacker, target, attacker.atq * mult);
}

function useSkill(r) {
  const t = runnerTarget(r);
  r.castGlow = 1; r.swing = 1;
  const el = ELEMENTS[r.element];
  switch (r.id) {
    case "kairo": { // Volt Fang — avança batendo em todos
      FX.beam(r.x, r.y - 24, ENGAGE_X + 120, r.y - 24, { color: el.color, width: 7, life: 0.3 });
      for (const e of aoeTargets()) dealDamage(r, e, r.atq * 1.4, { color: el.glow });
      break;
    }
    case "zael": { // Crimson Slash Barrage — 5 cortes no alvo de maior HP
      const enemies = aliveEnemies();
      if (!enemies.length) break;
      const tgt = enemies.reduce((a,b)=> a.hp>b.hp?a:b);
      for (let i=0;i<5;i++){
        setTimeout(()=>{ if(tgt.alive){ dealDamage(r, tgt, r.atq*0.55, {color:el.glow}); FX.beam(r.x,r.y-24,tgt.x,tgt.y-20,{color:el.color,width:4,life:0.18}); } }, i*70);
      }
      break;
    }
    case "seraph": { // Event Horizon — puxa e explode
      const cx = ENGAGE_X + 40, cy = GROUND_Y - 60;
      FX.ring(cx, cy, { color: el.color, rMax: 200, life: 0.6, width: 6, fill: true, fillAlpha: 0.3 });
      for (const e of aoeTargets()) {
        e.x += (cx - e.x) * 0.4; e.targetX = cx;
        dealDamage(r, e, r.atq * 1.5, { color: el.glow });
        e.gravityMark = 4;
      }
      break;
    }
    case "lyra": { // Radiant Strike — feixe que atravessa todos
      FX.beam(r.x, r.y - 24, PLAY_W, r.y - 24, { color: el.color, width: 10, life: 0.4 });
      for (const e of aoeTargets()) dealDamage(r, e, r.atq * 1.3, { color: el.glow });
      break;
    }
    case "frost": { // Glacial Lance Burst — leque em 3 inimigos
      const enemies = aoeTargets().slice(0, 3);
      for (const e of enemies) {
        FX.beam(r.x, r.y - 24, e.x, e.y - 20, { color: el.color, width: 5, life: 0.3 });
        dealDamage(r, e, r.atq * 1.2, { color: el.glow });
        applyFrost(e);
      }
      break;
    }
    case "nina": { // Surge Cannon — raio que atravessa a linha
      FX.beam(r.x, r.y - 24, PLAY_W, r.y - 24, { color: el.color, width: 8, life: 0.35 });
      for (const e of aoeTargets()) dealDamage(r, e, r.atq * 1.25, { color: el.glow });
      break;
    }
    case "rex": { // Savage Charge — empurra inimigos para trás
      FX.ring(ENGAGE_X + 40, GROUND_Y - 50, { color: el.color, rMax: 180, life: 0.4, width: 5 });
      for (const e of aoeTargets()) {
        if (e.x < ENGAGE_X + 200) { e.targetX += 60; e.x += 50; dealDamage(r, e, r.atq * 1.1, { color: el.glow }); }
      }
      break;
    }
    case "sable": { // Shadow Execution — teleporta atrás do de maior ATQ, dano massivo
      const enemies = aliveEnemies();
      if (!enemies.length) break;
      const tgt = enemies.reduce((a,b)=> a.atq>b.atq?a:b);
      FX.burst(r.x, r.y-24, {count:14,color:el.color,speed:140,life:0.4,size:3});
      r.x = tgt.x + 30; r._returnX = r.homeX;
      dealDamage(r, tgt, r.atq * 3.2, { color: el.glow, forceCrit: r.phantomCrit });
      FX.beam(tgt.x, tgt.y-20, tgt.x+40, tgt.y-20, {color:el.color,width:6,life:0.25});
      break;
    }
  }
  // banter ocasional
  if (Math.random() < 0.25) {
    const lines = COMBAT_BANTER[r.id];
    if (lines) FX.floatText(r.x, r.y - 64, lines[Math.floor(Math.random()*lines.length)], { color: r.accent, size: 14, life: 1.2 });
  }
}

function applyFrost(e) {
  e.slowPct = Math.min(0.6, (e.slowPct||0) + 0.15);
  e.frostHits = (e.frostHits||0) + 1;
  if (e.frostHits >= 3) { e.frozen = 1; e.frostHits = 0; FX.floatText(e.x, e.y - e.size - 14, "FROZEN", { color: "#9be3ff", size: 15 }); }
}

/* ============================================================
   AETHER BURST
   ============================================================ */
function fireBurst(r) {
  if (!r.burstReady || !r.alive) return;
  r.burstReady = false; r.burstEnergy = 0; r.burstCd = 2.5; r.burstHold = 0;
  G.stats.bursts++;
  sfxBurst();
  const el = ELEMENTS[r.element];
  // banner
  banner(r.data.burst.name, r.data.name + " — AETHER BURST", r.color);
  // cinematografia
  FX.setVignette(0.78);
  FX.flashScreen("255,255,255", 0.5);
  FX.shake(14, 0.45);
  FX.slowmoFor(0.6);
  FX.freezeFor(120);
  r.burstScale = 2.2;

  // dano massivo em todos os inimigos + tema visual
  const enemies = aoeTargets();
  burstVisual(r, el);
  const dmgPer = r.atq * (6 + (r.level) * 0.05);
  setTimeout(()=>{}, 0);
  // aplica dano escalonado para dar "chuva de números"
  enemies.forEach((e, i) => {
    const delay = i * 60 + 120;
    setTimeout(() => {
      if (e.alive) dealDamage(r, e, dmgPer * (0.85 + Math.random()*0.3), { color: el.glow, noMiss: true });
    }, delay);
  });

  // efeitos especiais por burst
  switch (r.id) {
    case "nina": // pulsos contínuos
      for (let p=0;p<5;p++) setTimeout(()=>{ if(G) FX.ring(ENGAGE_X+60, GROUND_Y-70, {color:el.color,rMax:260,life:0.6,width:6}); for(const e of aoeTargets()) if(e.alive&&Math.random()<0.7) dealDamage(r,e,r.atq*0.8,{color:el.glow}); }, 300+p*350);
      break;
    case "frost":
      for (const e of enemies) e.frozen = Math.max(e.frozen, 1.2);
      break;
    case "rex":
      for (const e of enemies) e.stunned = 1.5;
      break;
    case "seraph":
      for (const e of enemies) e.gravityMark = 5;
      break;
    case "lyra":
      for (const al of G.runners) if(al.alive){ al.shieldHp = Math.max(al.shieldHp, al.maxHp*0.15); al.shieldTimer = 5; }
      break;
  }
}

function burstVisual(r, el) {
  const cx = ENGAGE_X + 60, cy = GROUND_Y - 70;
  switch (r.element) {
    case "lightning":
      for (let i=0;i<14;i++) {
        const x = 380 + Math.random()*560;
        setTimeout(()=>{ FX.beam(x, 0, x + (Math.random()-0.5)*60, GROUND_Y, {color: el.color, width: 5+Math.random()*5, life: 0.28}); FX.burst(x, GROUND_Y-40, {count:8,color:el.color,speed:200,life:0.4,size:3}); }, i*40);
      }
      FX.ring(cx, cy, {color:el.color,rMax:420,life:0.7,width:9,fill:true,fillAlpha:0.3});
      break;
    case "fire":
      for (let i=0;i<22;i++) setTimeout(()=>{ const x=380+Math.random()*560; FX.burst(x, GROUND_Y-30, {count:10,color:i%2?"#ff3b46":"#ffd07a",speed:260,life:0.6,size:4,dir:-Math.PI/2,spread:1.2,gravity:300}); }, i*35);
      FX.ring(cx,cy,{color:el.color,rMax:380,life:0.6,width:8});
      break;
    case "dark":
      FX.ring(cx,cy,{color:el.color,rMax:460,life:0.9,width:10,fill:true,fillAlpha:0.5});
      FX.setVignette(0.9);
      for(let i=0;i<30;i++) FX.burst(380+Math.random()*560, GROUND_Y-60, {count:1,color:el.color,speed:120,life:0.8,size:5});
      break;
    case "light":
      FX.beam(cx, 0, cx, PLAY_H, {color:el.color,width:26,life:0.5});
      setTimeout(()=>FX.beam(380, GROUND_Y-30, PLAY_W, GROUND_Y-30, {color:el.color,width:14,life:0.4}), 150);
      FX.ring(cx,cy,{color:el.color,rMax:400,life:0.6,width:8,fill:true,fillAlpha:0.35});
      break;
    case "ice":
      for(const e of aoeTargets()){ setTimeout(()=>{ FX.burst(e.x, e.y, {count:18,color:el.color,speed:240,life:0.6,size:5,dir:-Math.PI/2,spread:1.6,gravity:200,shape:"shard"}); FX.ring(e.x,e.y-20,{color:el.color,rMax:90,life:0.4,width:4}); }, 100); }
      break;
    case "wind":
      FX.ring(VANGUARD_X+20, GROUND_Y-50, {color:el.color,rMax:380,life:0.7,width:9,fill:true,fillAlpha:0.3});
      for(let i=0;i<40;i++) FX.burst(VANGUARD_X+Math.random()*400, GROUND_Y-80+Math.random()*60, {count:1,color:i%2?el.color:el.glow,speed:180,life:0.9,size:4,shape:"spark",gravity:60});
      break;
    default:
      FX.ring(cx,cy,{color:el.color,rMax:400,life:0.6,width:8});
  }
}

/* ============================================================
   BURST SYNC
   ============================================================ */
function tryBurstSync() {
  for (const pair of SYNC_PAIRS) {
    const key = pairKey(pair.a, pair.b);
    if ((G.syncCooldown[key]||0) > 0) continue;
    const ra = G.runners.find(r => r.id === pair.a);
    const rb = G.runners.find(r => r.id === pair.b);
    if (!ra || !rb || !ra.alive || !rb.alive) continue;
    const lvl = resonanceLevel(pair.a, pair.b);
    if (!RESONANCE_LEVELS[lvl-1] || !RESONANCE_LEVELS[lvl-1].sync) continue;
    // ambos prontos?
    if (ra.burstReady && rb.burstReady) {
      // chance base + nível de resonance
      const chance = 0.02 + lvl * 0.03;
      if (Math.random() < chance) {
        fireBurstSync(pair, ra, rb);
        return;
      }
    }
  }
}
function pairKey(a, b) { return [a, b].sort().join("|"); }

/* Tenta disparar um Burst Sync envolvendo o runner r (antes do burst individual) */
function trySyncFor(r) {
  for (const pair of SYNC_PAIRS) {
    let partnerId = null;
    if (pair.a === r.id) partnerId = pair.b;
    else if (pair.b === r.id) partnerId = pair.a;
    else continue;
    const key = pairKey(pair.a, pair.b);
    if ((G.syncCooldown[key] || 0) > 0) continue;
    const lvl = resonanceLevel(pair.a, pair.b);
    if (!RESONANCE_LEVELS[lvl-1] || !RESONANCE_LEVELS[lvl-1].sync) continue;
    const partner = G.runners.find(x => x.id === partnerId);
    if (!partner || !partner.alive || !partner.burstReady) continue;
    if (!aliveEnemies().length) continue;
    fireBurstSync(pair, r, partner);
    return true;
  }
  return false;
}

function fireBurstSync(pair, ra, rb) {
  const key = pairKey(pair.a, pair.b);
  G.syncCooldown[key] = 18;
  ra.burstReady = false; rb.burstReady = false;
  ra.burstEnergy = 0; rb.burstEnergy = 0;
  ra.burstHold = 0; rb.burstHold = 0;
  G.stats.syncs++;
  banner(pair.name + " 💥", "BURST SYNC — " + pair.type, pair.colorA);
  FX.freezeFor(320);
  FX.setVignette(0.85);
  FX.flashScreen("255,255,255", 0.6);
  FX.shake(16, 0.6);
  FX.slowmoFor(0.9);
  ra.burstScale = 2.4; rb.burstScale = 2.4;

  const enemies = aoeTargets();
  const dmg = (ra.atq + rb.atq) * 8;
  // feixe combinado entre os dois runners
  FX.beam(ra.x, ra.y-24, rb.x, rb.y-24, {color:pair.colorA,width:10,life:0.5});
  // explosão dupla de cor
  FX.ring(ENGAGE_X+60, GROUND_Y-70, {color:pair.colorA,rMax:460,life:0.8,width:10,fill:true,fillAlpha:0.4});
  FX.ring(ENGAGE_X+60, GROUND_Y-70, {color:pair.colorB,rMax:380,life:0.7,width:8,fill:true,fillAlpha:0.35});
  for(let i=0;i<60;i++) FX.burst(380+Math.random()*560, GROUND_Y-70, {count:1,color:i%2?pair.colorA:pair.colorB,speed:280,life:0.8,size:5});

  enemies.forEach((e,i)=>{
    setTimeout(()=>{ if(e.alive){ dealDamage(ra, e, dmg*(0.85+Math.random()*0.3), {color:pair.colorB, noMiss:true}); } }, i*70 + 250);
  });
  // efeito especial do sync
  if (pair.name === "Circuit Freeze") for(const e of enemies){ e.frozen=1.5; applyFrost(e); }
  if (pair.name === "Duality Break")  for(const e of enemies) e.gravityMark = 5;
  if (pair.name === "Tempest Break")  for(const e of enemies) e.stunned = 2;
}

/* ============================================================
   RESONANCE
   ============================================================ */
function resonanceLevel(a, b) {
  const xp = G.resonance[pairKey(a,b)] || 0;
  // limiares
  const th = [0, 50, 150, 300, 650, 1400];
  let lvl = 1;
  for (let i = 0; i < th.length; i++) if (xp >= th[i]) lvl = i + 1;
  return Math.min(RESONANCE_LEVELS.length, lvl);
}
function resonanceXpForNext(a,b){
  const xp = G.resonance[pairKey(a,b)] || 0;
  const th = [0, 50, 150, 300, 650, 1400];
  const lvl = resonanceLevel(a,b);
  if (lvl >= RESONANCE_LEVELS.length) return {cur:xp-th[lvl-1], need:0, max:true};
  return {cur: xp - th[lvl-1], need: th[lvl]-th[lvl-1]};
}
function addResonanceXp(a, b, amount) {
  const k = pairKey(a,b);
  G.resonance[k] = (G.resonance[k]||0) + amount;
}

/* ============================================================
   CINEMÁTICA DE BOSS
   ============================================================ */
function bossDeathCinematic(unit) {
  FX.freezeFor(500);
  FX.flashScreen("255,255,255", 0.9);
  FX.shake(22, 0.8);
  FX.slowmoFor(1.2);
  FX.setVignette(0.6);
  banner("RIFT LORD DERROTADO", "+5000 Shards · +5 Infinity Fragments", "#ffd23f");
}

/* ============================================================
   UPDATE PRINCIPAL
   ============================================================ */
let syncTicker = 0;
function update(dt) {
  if (G.paused) { FX.update(dt); return; }
  dt *= G.speed;
  FX.update(dt);

  // montar runners se vazio
  if (G.runners.length === 0) buildSquad();

  // timers de sync cooldown
  for (const k in G.syncCooldown) G.syncCooldown[k] = Math.max(0, G.syncCooldown[k] - dt);

  // ---- spawn de wave ----
  if (!G.waveActive && G.waveClearTimer <= 0) spawnWave();
  if (G.waveClearTimer > 0) G.waveClearTimer -= dt;

  // ---- inimigos ----
  for (const e of G.enemies) {
    if (!e.alive) { e.dyingTimer -= dt; continue; }
    if (e.spawnDelay > 0) { e.spawnDelay -= dt; continue; }
    e.bob += dt * 6;
    if (e.hitFlash > 0) e.hitFlash -= dt;
    // slow/freeze
    let spd = e.spd;
    if (e.slowPct > 0) { spd *= (1 - e.slowPct); e.slowPct = Math.max(0, e.slowPct - dt*0.08); }
    if (e.frozen > 0) { e.frozen -= dt; spd = 0; }
    if (e.stunned > 0) { e.stunned -= dt; spd = 0; }
    // movimento até linha de engajamento (velocidade de marcha)
    const marchSpd = (spd/100) * 105;
    if (e.x > e.targetX) e.x -= marchSpd * dt;
    // ataque
    if (spd > 0) {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = e.attackInterval;
        const tgt = enemyTarget(e);
        if (tgt && Math.abs(e.x - tgt.x) < e.range + 40) {
          e.swing = 1;
          dealDamage(e, tgt, e.atq);
        }
      }
    }
    // gravity mark timer
    if (e.gravityMark > 0) e.gravityMark -= dt;
    e.swing *= 0.85;
  }
  // limpar mortos
  G.enemies = G.enemies.filter(e => e.alive || e.dyingTimer > 0);

  // ---- runners ----
  for (const r of G.runners) {
    r.bob += dt * 5;
    if (r.hitFlash > 0) r.hitFlash -= dt;
    if (r.castGlow > 0) r.castGlow -= dt * 2;
    if (r.burstScale > 1) r.burstScale = Math.max(1, r.burstScale - dt * 2.5);
    if (r.swing > 0) r.swing -= dt * 4;
    if (r.burstCd > 0) r.burstCd -= dt;
    if (r.shieldTimer > 0) { r.shieldTimer -= dt; if (r.shieldTimer <= 0) r.shieldHp = 0; }
    // passiva Fang Instinct (Zael) — atq dinâmico
    if (r.id === "zael") {
      const base = computeBaseAtq(r);
      const hpRatio = r.hp / r.maxHp;
      let mult = 1;
      if (hpRatio < 0.3) mult = 1.8;
      else if (hpRatio < 0.6) mult = 1.3;
      r.atq = base * mult;
      if (hpRatio < 0.3) r.attackInterval = Math.max(0.3, 1.25/(r.spd*1.6/100));
      else r.attackInterval = Math.max(0.35, 1.25/(r.spd/100));
    }
    // passiva Solar Guard (Lyra)
    if (r.id === "lyra") {
      for (const al of G.runners) {
        if (al !== r && al.alive && al.hp/al.maxHp < 0.2) {
          r.shieldHp = Math.max(r.shieldHp, r.maxHp*0.2); r.shieldTimer = 4;
          r.attackInterval = Math.max(0.3, 1.25/(r.spd*1.3/100));
        }
      }
    }
    // passiva Overcharge (Nina) já aplicada como aura em stats? aplicamos como buff aos adjacentes
    if (!r.alive) {
      r.reviveTimer -= dt;
      if (r.reviveTimer <= 0) {
        r.alive = true; r.hp = Math.round(r.maxHp * 0.6); r.burstEnergy = 0; r.burstReady = false;
        r.x = r.homeX; r.y = r.homeY;
        FX.burst(r.x, r.y-20, {count:16,color:r.color,speed:160,life:0.5,size:3});
        FX.floatText(r.x, r.y-60, "REVIVE", {color:r.accent,size:16});
      }
      continue;
    }

    // regenera levemente (idle) — sem anular o dano que os inimigos causam
    r.hp = Math.min(r.maxHp, r.hp + r.maxHp * 0.004 * dt);

    // ataque básico (com alcance — melee avança até o alvo)
    r.attackTimer -= dt;
    if (r.attackTimer <= 0 && r.burstCd <= 0.1) {
      const tgt = runnerTarget(r);
      if (tgt) {
        const dist = tgt.x - r.x;
        const inRange = dist <= (r.range + 30) && dist > -20;
        if (inRange) {
          r.attackTimer = r.attackInterval;
          basicAttack(r, tgt);
          // passiva Phantom Step (Sable): garante crit após esquiva — aproximamos com chance ao evadir (skip)
        } else if (r.range <= 120) {
          // melee fora de alcance: avança em direção ao alvo
          r.x += Math.sign(dist || 1) * 110 * dt;
          r.attackTimer = 0.05;
        } else {
          // ranged fora de alcance: mantém a linha e espera o alvo se aproximar
          r.attackTimer = 0.3;
        }
      } else {
        r.attackTimer = 0.3;
      }
    }
    // skill
    r.skillCd -= dt;
    if (r.skillCd <= 0 && aliveEnemies().length) {
      r.skillCd = (RUNNER_BY_ID[r.id].skill.cd || 9);
      useSkill(r);
    }
    // burst: fica READY e segura um instante (permite Burst Sync com o parceiro)
    if (r.burstReady && r.burstCd <= 0 && aliveEnemies().length) {
      if (trySyncFor(r)) { r.burstHold = 0; }
      else {
        r.burstHold = (r.burstHold || 0) + dt;
        if (r.burstHold >= 0.45) { fireBurst(r); r.burstHold = 0; }
      }
    } else if (!r.burstReady) {
      r.burstHold = 0;
    }
    // marcha: mantém posição em combate (melee já avançou) e volta ao posto quando a wave acaba
    const hasEnemies = aliveEnemies().length > 0;
    if (!hasEnemies) r.x += (r.homeX - r.x) * Math.min(1, dt*6);
    else r.x = Math.min(ENGAGE_X - 20, Math.max(r.homeX, r.x));
    r.y += (r.homeY - r.y) * Math.min(1, dt*8);
  }

  // ---- Nina overcharge aura ----
  const nina = G.runners.find(r=>r.id==="nina"&&r.alive);
  if (nina) {
    // turret: ataca passivamente
    nina._turretTimer = (nina._turretTimer||0) - dt;
    if (nina._turretTimer <= 0 && aliveEnemies().length) {
      nina._turretTimer = 1.1;
      const tgt = aliveEnemies()[0];
      FX.beam(nina.x+20, nina.y-10, tgt.x, tgt.y-20, {color:ELEMENTS.lightning.color,width:3,life:0.15});
      dealDamage({element:"lightning",atq:nina.atq*0.3,cdg:1.5,crt:0.1,pen:0.1,kind:"runner"}, tgt, nina.atq*0.3, {color:ELEMENTS.lightning.glow});
    }
  }

  // ---- resonance ganha por lutar junto ----
  syncTicker += dt;
  if (syncTicker > 1) {
    syncTicker = 0;
    const ids = G.runners.filter(r=>r.alive).map(r=>r.id);
    for (const pair of SYNC_PAIRS) {
      if (ids.includes(pair.a) && ids.includes(pair.b)) {
        addResonanceXp(pair.a, pair.b, 4);
      }
    }
    tryBurstSync();
  }

  // ---- wave clear ----
  if (G.waveActive && aliveEnemies().length === 0 && G.enemies.every(e=>!e.alive)) {
    G.waveActive = false;
    G.waveClearTimer = 1.0;
    nextLevel();
  }

  // banner timer
  if (G.banner) { G.banner.life -= dt; if (G.banner.life <= 0) G.banner = null; }

  // autosave leve
  G._saveAcc = (G._saveAcc||0) + dt;
  if (G._saveAcc > 5) { G._saveAcc = 0; save(); }
}

/* ============================================================
   CONSTRUÇÃO DO ESQUADRÃO
   ============================================================ */
function buildSquad() {
  G.runners = [];
  const ids = runnerFormation();
  ids.forEach((id, i) => {
    if (!id) return;
    const r = makeRunner(id, i);
    G.runners.push(r);
  });
  // Nina overcharge: +spd aos adjacentes (linha)
  applyOvercharge();
}
function applyOvercharge() {
  // reseta atq base
  for (const r of G.runners) { computeStats(r); r._atqBase = null; if (r.id==="rex") r.atq=recomputeRexAtq(r); }
  const nina = G.runners.find(r=>r.id==="nina"&&r.alive);
  if (nina) {
    for (const r of G.runners) {
      if (r!==nina && Math.abs(r.slotIndex - nina.slotIndex) <= 1) {
        r.spd *= 1.15; r.attackInterval = Math.max(0.3, 1.25/(r.spd/100));
      }
    }
  }
}

/* ============================================================
   BANNER
   ============================================================ */
function banner(text, sub, color) {
  G.banner = { text, sub: sub||"", color: color||"#fff", life: 2.4, maxLife: 2.4 };
}

/* ============================================================
   DROP DE EQUIPAMENTO
   ============================================================ */
function rollDrop() {
  // raridade ponderada
  const roll = Math.random();
  let rarity = "common";
  if (roll > 0.985) rarity = "legendary";
  else if (roll > 0.92) rarity = "epic";
  else if (roll > 0.75) rarity = "rare";
  else if (roll > 0.5) rarity = "uncommon";
  const pool = EQUIPMENT_POOL.filter(e => e.rarity === rarity);
  const eq = (pool.length ? pool : EQUIPMENT_POOL)[Math.floor(Math.random()*(pool.length||EQUIPMENT_POOL.length))];
  const copy = JSON.parse(JSON.stringify(eq));
  G._loot = G._loot || [];
  G._loot.push(copy);
  if (G._loot.length > 40) G._loot.shift();
  FX.floatText(ENGAGE_X+60, GROUND_Y-90, "LOOT: " + copy.name, { color: RARITIES[rarity].color, size: 16, life: 1.6 });
  notify("Loot: " + copy.name, RARITIES[rarity].color);
}

/* ============================================================
   SAVE / LOAD / OFFLINE
   ============================================================ */
const SAVE_KEY = "aetherBurstInfinite_save_v1";
function save() {
  G.lastSeen = Date.now();
  const data = {
    shards: G.shards, riftTickets: G.riftTickets, infinityFragments: G.infinityFragments,
    zone: G.zone, level: G.level, maxZone: G.maxZone, maxLevel: G.maxLevel, accountLevel: G.accountLevel, accountXp: G.accountXp,
    ownedRunners: G.ownedRunners, squadIds: G.squadIds, runnerLevels: G.runnerLevels,
    resonance: G.resonance, infinity: G.infinity, lastSeen: G.lastSeen, stats: G.stats,
    ascension: G.ascension, ascensionPoints: G.ascensionPoints,
    codex: G.codex, codexDone: G.codexDone,
    loot: G._loot || [],
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch(e){}
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    Object.assign(G, d);
    G._loot = d.loot || [];
    // normaliza saves antigos que não têm os campos novos
    if (!G.ascension) G.ascension = {};
    if (!G.ascensionPoints) G.ascensionPoints = 0;
    if (!G.codex) G.codex = {};
    if (!G.codexDone) G.codexDone = {};
    return true;
  } catch(e){ return false; }
}

function offlineReport() {
  const now = Date.now();
  const elapsed = Math.min(12*3600, Math.max(0, (now - G.lastSeen)/1000)); // seg, cap 12h
  if (elapsed < 30) return null;
  // DPS estimado: soma de atq dos runners * fator
  buildSquad();
  let dps = 0;
  for (const r of G.runners) dps += r.atq * (r.spd/100) * 2;
  const eff = 0.6 + (allBonuses().offline || 0);
  const shards = Math.round(dps * elapsed * 0.5 * eff);
  const xp = Math.round(dps * elapsed * 0.2 * eff);
  const kills = Math.round(dps * elapsed * 0.02);
  const bursts = Math.round(kills * 0.02);
  // aplica
  G.shards += shards;
  distributeXp(xp);
  addAccountXp(xp);
  G.stats.kills += kills; G.stats.bursts += bursts;
  // drop simulado
  const drops = [];
  for (let i=0;i<Math.min(6, Math.floor(elapsed/600)); i++){ rollDrop(); if(G._loot&&G._loot.length) drops.push(G._loot[G._loot.length-1]); }
  return { elapsed, shards, xp, kills, bursts, drops };
}
