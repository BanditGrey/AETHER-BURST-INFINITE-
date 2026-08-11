/* ============================================================
   AETHER BURST: INFINITE — ENGINE
   Estado, simulação de combate, formação, Aether Burst,
   Burst Sync, progressão, save/offline e renderização.
   ============================================================ */

/* ---------- Constantes de layout ---------- */
const PLAY_W = 1280, PLAY_H = 640;
const GROUND_Y = 478;                 // linha do chão (topo da área de chão)

/* Formação aliada — grade FIXA de 2 colunas × 3 linhas (2×3), ancorada no
   setor esquerdo da arena:
     · slots 1 e 2 → primeira linha · slots 3 e 4 → segunda · 5 e 6 → terceira
     · espaçamento horizontal entre as colunas constante (FORM_DX)
     · espaçamento vertical entre as linhas constante (FORM_DY)
   Tudo à direita da grade fica livre: a grande área central é reservada a
   movimentação, ataques, projéteis, efeitos visuais e números de dano.
   A posição de cada slot é o PONTO DOS PÉS do personagem — a base do sprite
   fica ancorada nesse ponto, independentemente do tamanho do sprite. */
const SQUAD_SLOTS = 6;
const FORM_X0    = 170;                          // coluna 1 (retaguarda, mais à esquerda)
const FORM_DX    = 175;                          // espaçamento horizontal constante entre colunas
const FORM_COL_X = [FORM_X0, FORM_X0 + FORM_DX];
const FORM_Y0    = GROUND_Y - 83;                // primeira linha (mais ao fundo)
const FORM_DY    = 85;                           // espaçamento vertical constante entre linhas
const FORM_ROW_Y = [FORM_Y0, FORM_Y0 + FORM_DY, FORM_Y0 + FORM_DY * 2];
const FORM_FRONT_X = FORM_COL_X[FORM_COL_X.length - 1]; // coluna da frente (direita)
/* posição do slot (1-based no HUD): leitura por linha — (1,2 / 3,4 / 5,6).
   slotIndex 0→slot 1 … slotIndex 5→slot 6. Retorna o ponto dos pés. */
function slotPos(slotIndex) {
  const i = Math.max(0, Math.min(SQUAD_SLOTS - 1, slotIndex));
  return { x: FORM_COL_X[i % 2], y: FORM_ROW_Y[Math.floor(i / 2)] };
}
/* adjacência na grade 2×3: parceiro da mesma linha ou vizinho de coluna
   na linha imediatamente acima/abaixo (distância Manhattan = 1 na grade) */
function slotAdjacent(a, b) {
  const ra = Math.floor(a / 2), rb = Math.floor(b / 2);
  const ca = a % 2, cb = b % 2;
  return (ra === rb && ca !== cb) || (ca === cb && Math.abs(ra - rb) === 1);
}
/* escala de perspectiva por profundidade: quanto mais abaixo (perto da
   câmera), maior o sprite. Abrange da 1ª à 3ª linha da grade; usada por
   aliados e inimigos nos dois renderizadores (Canvas e Pixi). */
const DEPTH_Y_MIN = FORM_ROW_Y[0];
const DEPTH_Y_MAX = FORM_ROW_Y[FORM_ROW_Y.length - 1];
const DEPTH_S_MIN = 0.90, DEPTH_S_MAX = 1.20;
function depthScale(y) {
  const t = Math.max(0, Math.min(1, (y - DEPTH_Y_MIN) / (DEPTH_Y_MAX - DEPTH_Y_MIN)));
  return DEPTH_S_MIN + t * (DEPTH_S_MAX - DEPTH_S_MIN);
}

const ENGAGE_X   = 452;          // inimigos param um pouco à direita da formação
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
  // esquadrão — grade 2×3: índices pares (0,2,4) = coluna 1 (retaguarda),
  // ímpares (1,3,5) = coluna 2 (frente). Ordem padrão equilibra as colunas:
  // ranged atrás (frost/nina/seraph), melee/tanque na frente (rex/kairo/zael).
  ownedRunners: ["kairo","zael","seraph","lyra","frost","nina","rex","sable"],
  squadIds: ["frost","rex","nina","kairo","seraph","zael"],
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
  const lvlInfo = G.runnerLevels[id] || { level: 1, xp: 0, gear: {} };
  const u = {
    kind: "runner",
    id, data,
    level: lvlInfo.level,
    gear: equippedList(id),
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
  // grade fixa 2×3: cada slot tem posição própria e inamovível (ponto dos pés).
  // coluna da direita (slots 2/4/6) = linha de frente ("Vanguard");
  // coluna da esquerda (slots 1/3/5) = retaguarda ("Rear").
  const p = slotPos(slotIndex);
  u.line = (slotIndex % 2 === 1) ? "Vanguard" : "Rear";
  u.homeX = p.x; u.homeY = p.y; u.x = p.x; u.y = p.y;
}

/* formação atual: quais ids estão em cada slot (grade 2×3 = 6 slots) */
function runnerFormation() { return G.squadIds.slice(0, SQUAD_SLOTS); }

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
    // inimigos usam faixa ampla de profundidade (cobre as 3 linhas da grade)
    y: (GROUND_Y - 48) + (Math.random() * 62),
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
  for (const r of (G.runners || [])) r._coreUsed = false;   // novo combate: recarrega procs 1×/combate
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
    FX.damage(target.x, target.y - (target.size||30) - 12, 0, { kind: "miss", text: "MISS" });
    // Phantom Fang: próxima investida do runner que esquivou sai ×3
    if (target.kind === "runner" && hasProc(target, "phantom_fang")) {
      target._evadeProc = true;
      FX.floatText(target.x, target.y - (target.size||30) - 30, "PHANTOM FANG!", { color: "#c9a8ff", size: 13, life: 0.9 });
    }
    return 0;
  }
  // mitigação por def (com penetração)
  const effDef = Math.max(0, (target.def || 0) * (1 - (source.pen || 0)));
  let dmg = raw * (120 / (120 + effDef));
  // elemento (super-efetivo ×1.5 / fraco ×0.66)
  let eff = "", elMult = 1;
  if (source.element && target.element) {
    elMult = elementMultiplier(source.element, target.element);
    dmg *= elMult;
    if (elMult > 1.01) eff = "super";
    else if (elMult < 0.99) eff = "weak";
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

  // ---- GEAR PROCS (multiplicadores de saída, só runners) ----
  const kind0 = opts.kind || "basic";
  if (source.kind === "runner") {
    // Phantom Fang: consumido aqui (armado na esquiva)
    if (source._evadeProc) { dmg *= 3; source._evadeProc = false; }
    // Overcharge Cannon: +2% por ataque básico acumulado (cap 50 stacks = +100%)
    if (kind0 === "basic" && hasProc(source, "overcharge_cannon")) {
      dmg *= 1 + (source._oc || 0) * 0.02;                 // bônus dos stacks já ganhos…
      source._oc = Math.min(50, (source._oc || 0) + 1);    // …e este ataque carrega o PRÓXIMO
    }
    // Rift Crystal: +20% contra alvos com debuff ativo
    if (hasProc(source, "rift_crystal") &&
        (target.gravityMark > 0 || target.frozen > 0 || target.slowPct > 0 || target.stunned > 0)) {
      dmg *= 1.2;
    }
    // Echo Fragment: buff de 10% ATQ ganho quando um aliado usa Burst
    if (source.echoBuff > 0) dmg *= 1.1;
  }

  // escudo absorve primeiro (Solar Guard / Burst da Lyra etc.)
  let absorbed = 0;
  if (target.shieldHp > 0) {
    absorbed = Math.min(target.shieldHp, dmg);
    target.shieldHp -= absorbed; dmg -= absorbed;
  }
  target.hp -= dmg;
  target.hitFlash = 0.18;

  const el = ELEMENTS[source.element] || ELEMENTS.aether;
  const kind = opts.kind || "basic";
  // cor do número: fraco = cinza; dano EM runner = vermelho; senão glow do elemento
  let color = opts.color;
  if (!color) color = eff === "weak" ? "#7d8899" : (target.kind === "runner" ? "#ff6b66" : el.glow);
  FX.damage(target.x, target.y - (target.size || 30) - 6, dmg, {
    crit, color, element: source.element, kind, eff
  });
  // quanto o escudo absorveu (número ciano secundário 🛡)
  if (absorbed > 0) {
    FX.damage(target.x, target.y - (target.size || 30) + 14, absorbed,
      { kind: "shield", text: "🛡 " + formatNumber(absorbed) });
  }
  // SFX (throttled)
  if (crit) sfxCrit(); else if (Math.random() < 0.10) sfxHit();
  // partículas de impacto por tipo/efetividade
  FX.burst(target.x, target.y - (target.size||30)*0.4, {
    count: crit ? 12 : (eff === "weak" ? 3 : (kind === "burst" ? 10 : (kind === "skill" ? 8 : 6))),
    color: el.color, speed: crit ? 220 : 140,
    life: 0.35, size: crit ? 4 : 2.6, spread: Math.PI * 1.4, dir: Math.PI, glow: true
  });
  // super-efetivo: anel de impacto colorido
  if (eff === "super") {
    FX.ring(target.x, target.y - (target.size||30)*0.5, { color: el.color, rMax: 46, life: 0.3, width: 3 });
  }

  // ---- GEAR PROCS (pós-dano, aplicados pela skill/básico dos runners) ----
  if (source.kind === "runner" && target.kind === "enemy" && target.alive) {
    // Glacial Staff: skills têm 30% de chance de congelar
    if (kind0 === "skill" && hasProc(source, "glacial_staff") && Math.random() < 0.3) {
      target.frozen = Math.max(target.frozen || 0, 1);
      FX.ring(target.x, target.y - 20, { color: "#9be3ff", rMax: 60, life: 0.35, width: 3 });
      FX.floatText(target.x, target.y - (target.size||30) - 28, "FROZEN ❄", { color: "#9be3ff", size: 13, life: 0.9 });
    }
    // Void Blade: o básico já aplica Gravity Mark
    if (kind0 === "basic" && hasProc(source, "void_blade")) {
      target.gravityMark = Math.max(target.gravityMark || 0, 4);
    }
  }

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
  // Singularity Core (gear proc): uma vez por combate, sobrevive com 1 HP
  if (unit.kind === "runner" && hasProc(unit, "singularity_core") && !unit._coreUsed) {
    unit._coreUsed = true;
    unit.hp = 1;
    unit.hitFlash = 0.3;
    FX.flashScreen("58,255,240", 0.35);
    FX.ring(unit.x, unit.y - 24, { color: "#3afff0", rMax: 120, life: 0.5, width: 5 });
    FX.floatText(unit.x, unit.y - 62, "SINGULARITY CORE!", { color: "#3afff0", size: 16, life: 1.2 });
    return;
  }
  unit.alive = false;
  if (unit.kind === "enemy") {
    G.stats.kills++;
    unit.dyingTimer = 0.5;
    // codex: o runner que abateu preenche a entrada — completar dá +1 Ponto de Ascensão
    if (killer && killer.kind === "runner") gainCodexProgress(killer.id);
    // surge: onda ao morrer
    if (unit.typeKey === "surge" && !unit.surged) {
      unit.surged = true;
      FX.sprite("mob_surge_pulse", unit.x, unit.y - unit.size*0.4, { life: 0.5, size: 38, grow: 2.2, spin: 2.2, fadeIn: 0.04, fadeOut: 0.4 });
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
        if (Math.abs(e.x - target.x) < 160) dealDamage(attacker, e, attacker.atq * 0.7, { color: ELEMENTS.lightning.glow, kind: "skill" });
      }
      return;
    }
  }
  dealDamage(attacker, target, attacker.atq * mult);
  // Volt Edge (proc): 20% de descarga em cadeia após o básico
  if (attacker.kind === "runner" && hasProc(attacker, "volt_edge") && Math.random() < 0.2) {
    FX.ring(target.x, target.y - 20, { color: ELEMENTS.lightning.color, rMax: 90, life: 0.3, width: 3 });
    FX.floatText(target.x, target.y - (target.size||30) - 28, "⚡ CADEIA!", { color: "#fff07a", size: 13, life: 0.8 });
    for (const e of aliveEnemies()) {
      if (e !== target && Math.abs(e.x - target.x) < 200)
        dealDamage(attacker, e, attacker.atq * 0.45, { color: ELEMENTS.lightning.glow });
    }
  }
}

function useSkill(r) {
  const t = runnerTarget(r);
  r.castGlow = 1; r.swing = 1;
  const el = ELEMENTS[r.element];
  switch (r.id) {
    case "kairo": { // Volt Fang — projétil de raio que cruza a linha inimiga
      FX.sprite("kairo_volt_fang", r.x + 36, r.y - 28, { vx: 1400, life: 0.6, size: 66 });
      FX.burst(r.x + 30, r.y - 26, { count: 10, color: el.color, speed: 200, life: 0.35, size: 3, spread: Math.PI * 0.8, dir: 0, glow: true });
      for (const e of aoeTargets()) dealDamage(r, e, r.atq * 1.4, { color: el.glow, kind: "skill" });
      break;
    }
    case "zael": { // Crimson Slash Barrage — 5 cortes no alvo de maior HP
      const enemies = aliveEnemies();
      if (!enemies.length) break;
      const tgt = enemies.reduce((a,b)=> a.hp>b.hp?a:b);
      for (let i=0;i<5;i++){
        setTimeout(()=>{
          if(tgt.alive){
            dealDamage(r, tgt, r.atq*0.55, {color:el.glow, kind:"skill"});
            const a = -0.45 + Math.random()*0.9;              // ângulo do corte
            FX.sprite("zael_crimson_slash", tgt.x + 34, tgt.y - 22 + (Math.random()*24-12),
              { vx: -620 + Math.random()*140, vy: Math.sin(a)*260, rot: a, life: 0.24, size: 56 + Math.random()*16, flipX: true, fadeIn: 0.05, fadeOut: 0.4 });
          }
        }, i*70);
      }
      break;
    }
    case "seraph": { // Event Horizon — puxa e explode
      const cx = ENGAGE_X + 40, cy = GROUND_Y - 60;
      FX.sprite("seraph_event_horizon", cx, cy, { life: 0.6, size: 16, grow: 4.0, spin: 3.5, fadeIn: 0.06, fadeOut: 0.25 });
      FX.ring(cx, cy, { color: el.color, rMax: 200, life: 0.6, width: 6, fill: true, fillAlpha: 0.3 });
      for (const e of aoeTargets()) {
        e.x += (cx - e.x) * 0.4; e.targetX = cx;
        dealDamage(r, e, r.atq * 1.5, { color: el.glow, kind: "skill" });
        e.gravityMark = 4;
      }
      break;
    }
    case "lyra": { // Radiant Strike — lâmina de luz que atravessa todos
      FX.sprite("lyra_radiant_strike", r.x + 30, r.y - 24, { vx: 2300, life: 0.45, size: 42, fadeIn: 0.04, fadeOut: 0.35 });
      FX.beam(r.x, r.y - 24, r.x + 120, r.y - 24, { color: el.color, width: 6, life: 0.25 });
      for (const e of aoeTargets()) dealDamage(r, e, r.atq * 1.3, { color: el.glow, kind: "skill" });
      break;
    }
    case "frost": { // Glacial Lance Burst — leque em 3 inimigos
      const enemies = aoeTargets().slice(0, 3);
      for (const e of enemies) {
        const sx = r.x + 26, sy = r.y - 24;
        const dx = e.x - sx, dy = (e.y - 20) - sy;
        const dist = Math.hypot(dx, dy) || 1;
        const sp = 1250;
        FX.sprite("frost_glacial_lance", sx, sy, { vx: dx/dist*sp, vy: dy/dist*sp, rot: Math.atan2(dy, dx), life: Math.min(0.5, dist/sp + 0.12), size: 44, fadeIn: 0.05, fadeOut: 0.3 });
        dealDamage(r, e, r.atq * 1.2, { color: el.glow, kind: "skill" });
        applyFrost(e);
      }
      break;
    }
    case "nina": { // Surge Cannon — raio que atravessa a linha
      FX.sprite("nina_surge_cannon", r.x + 32, r.y - 26, { vx: 1800, life: 0.55, size: 54, fadeIn: 0.05, fadeOut: 0.35 });
      FX.beam(r.x, r.y - 24, r.x + 110, r.y - 24, { color: el.color, width: 5, life: 0.22 });
      for (const e of aoeTargets()) dealDamage(r, e, r.atq * 1.25, { color: el.glow, kind: "skill" });
      break;
    }
    case "rex": { // Savage Charge — empurra inimigos para trás
      FX.sprite("rex_savage_charge", r.x + 40, r.y - 16, { vx: 950, life: 0.6, size: 82, grow: 0.35, fadeIn: 0.05 });
      FX.ring(ENGAGE_X + 40, GROUND_Y - 50, { color: el.color, rMax: 180, life: 0.4, width: 5 });
      for (const e of aoeTargets()) {
        if (e.x < ENGAGE_X + 200) { e.targetX += 60; e.x += 50; dealDamage(r, e, r.atq * 1.1, { color: el.glow, kind: "skill" }); }
      }
      break;
    }
    case "sable": { // Shadow Execution — teleporta atrás do de maior ATQ, dano massivo
      const enemies = aliveEnemies();
      if (!enemies.length) break;
      const tgt = enemies.reduce((a,b)=> a.atq>b.atq?a:b);
      FX.burst(r.x, r.y-24, {count:14,color:el.color,speed:140,life:0.4,size:3});
      r.x = tgt.x + 30; r._returnX = r.homeX;
      dealDamage(r, tgt, r.atq * 3.2, { color: el.glow, kind: "skill", forceCrit: r.phantomCrit });
      FX.sprite("sable_shadow_execution", tgt.x + 40, tgt.y - 24, { vx: -540, life: 0.28, size: 66, flipX: true, rot: -0.3, fadeIn: 0.03, fadeOut: 0.35 });
      break;
    }
  }
  // banter ocasional
  if (Math.random() < 0.25) {
    const lines = COMBAT_BANTER[r.id];
    if (lines) FX.floatText(r.x, r.y - 64, lines[Math.floor(Math.random()*lines.length)], { color: r.accent, size: 14, life: 1.2 });
  }
}

/* sprite de ataque por tipo de inimigo — mobs atacam para a esquerda (flipX) */
function enemyAttackFX(e, tgt) {
  const key = {
    hollow:  "mob_hollow_swipe",
    brute:   "mob_brute_slam",
    phantom: "mob_phantom_lunge",
    surge:   "mob_surge_pulse",
    elite:   "mob_elite_strike",
    miniboss:"mob_warden_slam",
    riftlord:"mob_riftlord_wrath",
  }[e.typeKey];
  if (!key) return;
  const d = Math.abs(e.x - tgt.x);
  const big = e.typeKey === "miniboss" || e.typeKey === "riftlord";
  const spd = 640;
  FX.sprite(key, e.x - 14, e.y - e.size * 0.55, {
    vx: -spd,
    life: Math.min(0.4, d / spd + 0.1),
    size: e.size * (big ? 1.35 : 0.95),
    flipX: true, fadeIn: 0.05, fadeOut: 0.35,
  });
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
  let dmgPer = r.atq * (6 + (r.level) * 0.05);
  if (hasProc(r, "solar_greatsword")) dmgPer += r.hp * 0.15;   // Solar Greatsword (proc)
  setTimeout(()=>{}, 0);
  // Infinity Loop: o portador recupera 15% do HP ao estourar
  if (hasProc(r, "infinity_loop") && r.alive) {
    const heal = Math.round(r.maxHp * 0.15);
    r.hp = Math.min(r.maxHp, r.hp + heal);
    FX.damage(r.x, r.y - 56, heal, { kind: "heal" });
    FX.floatText(r.x, r.y - 78, "INFINITY LOOP", { color: "#5cd66c", size: 13, life: 1.0 });
  }
  // Echo Fragment: aliados que têm a relíquia ganham +10% ATQ por 5s
  for (const al of G.runners) if (al !== r && al.alive && hasProc(al, "echo_fragment")) al.echoBuff = 5;

  // aplica dano escalonado para dar "chuva de números"
  enemies.forEach((e, i) => {
    const delay = i * 60 + 120;
    setTimeout(() => {
      if (e.alive) dealDamage(r, e, dmgPer * (0.85 + Math.random()*0.3), { color: el.glow, kind: "burst", noMiss: true });
    }, delay);
  });

  // efeitos especiais por burst
  switch (r.id) {
    case "nina": // pulsos contínuos
      for (let p=0;p<5;p++) setTimeout(()=>{ if(G) FX.ring(ENGAGE_X+60, GROUND_Y-70, {color:el.color,rMax:260,life:0.6,width:6}); for(const e of aoeTargets()) if(e.alive&&Math.random()<0.7) dealDamage(r,e,r.atq*0.8,{color:el.glow,kind:"burst"}); }, 300+p*350);
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
      // tempestade de raios serrilhados caindo sobre a linha inimiga —
      // cada raio nasce de uma fenda luminosa no alto e explode no chão
      for (let i=0;i<14;i++) {
        const x = 380 + Math.random()*560;
        const ox = x + (Math.random()-0.5)*70;
        setTimeout(()=>{
          FX.lightning(ox, -16, x, GROUND_Y - 6, {color: el.color, width: 3.5+Math.random()*2.5, life: 0.26});
          FX.burst(x, GROUND_Y-40, {count:8,color:el.color,speed:200,life:0.4,size:3});
          FX.ring(x, GROUND_Y-4, {color:el.color,rMax:54,life:0.3,width:3});
        }, i*40);
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
      FX.ring(FORM_FRONT_X+20, GROUND_Y-50, {color:el.color,rMax:380,life:0.7,width:9,fill:true,fillAlpha:0.3});
      for(let i=0;i<40;i++) FX.burst(FORM_FRONT_X+Math.random()*400, GROUND_Y-80+Math.random()*60, {count:1,color:i%2?el.color:el.glow,speed:180,life:0.9,size:4,shape:"spark",gravity:60});
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
      let chance = 0.02 + lvl * 0.03;
      if (hasProc(ra, "resonance_amp") || hasProc(rb, "resonance_amp")) chance += 0.10;   // Resonance Amp (gear proc)
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
    setTimeout(()=>{ if(e.alive){ dealDamage(ra, e, dmg*(0.85+Math.random()*0.3), {color:pair.colorB, kind:"burst", noMiss:true}); } }, i*70 + 250);
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
    // movimento até a linha de engajamento (velocidade de marcha).
    // se o alvo está além do alcance (ex.: retaguarda da grade 2×3, que fica
    // mais à esquerda), avança pelo centro livre até conseguir atingi-lo.
    const marchSpd = (spd/100) * 105;
    let goalX = e.targetX;
    const chaseTgt = enemyTarget(e);
    if (chaseTgt) goalX = Math.min(e.targetX, chaseTgt.x + e.range * 0.6);
    if (e.x > goalX) e.x -= marchSpd * dt;
    // ataque
    if (spd > 0) {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = e.attackInterval;
        const tgt = enemyTarget(e);
        if (tgt && Math.abs(e.x - tgt.x) < e.range + 40) {
          e.swing = 1;
          enemyAttackFX(e, tgt);
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
    if (r.echoBuff > 0) r.echoBuff -= dt;    // Echo Fragment (gear proc)
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
    // marcha: em combate o melee avança pelo centro livre (limitado à linha de
    // engajamento); sem inimigos, todos retornam ao slot da grade 2×3
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
      // "adjacentes" = vizinhos na grade 2×3 (mesma linha ou mesma coluna)
      if (r!==nina && slotAdjacent(r.slotIndex, nina.slotIndex)) {
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
  // inventário alto: 500 slots — reciclar é escolha, nunca obrigação
  if ((G._loot || []).length >= LOOT_CAP) { notify("Inventário cheio (" + LOOT_CAP + ") — nada descartado; recicle quando quiser ♻", "#ff5a5c"); return null; }
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
  copy.uid = nextUid();
  G._loot = G._loot || [];
  G._loot.push(copy);
  FX.floatText(ENGAGE_X+60, GROUND_Y-90, "LOOT: " + copy.name, { color: RARITIES[rarity].color, size: 16, life: 1.6 });
  notify("Loot: " + copy.name, RARITIES[rarity].color);
  return copy;
}

/* ============================================================
   GEAR — equipar de verdade (FASE 4)
   Inventário: G._loot (cap alto). Equipado: runnerLevels[id].gear
   = mapa { weapon|armor|core|relic|ring|earring|necklace|bracelet -> item }.
   computeStats aplica os stats (loop já existente sobre unit.gear).
   ============================================================ */
const LOOT_CAP = 500;   // espaço de sobra — sem exclusão silenciosa
const SALVAGE_VALUE = { common: 10, uncommon: 25, rare: 60, epic: 150, legendary: 400, aether: 1000 };

function nextUid() { G._uidSeq = (G._uidSeq || 0) + 1; return G._uidSeq; }

/* mapa de gear equipado do runner (converte o [] legado para {}) */
function runnerGear(id) {
  const li = G.runnerLevels[id];
  if (!li) return {};
  // save legado (pré-acessórios) guardava gear como ARRAY de itens — migrar
  // PRESERVANDO as peças: entram chaveadas pelo slot, nunca descartadas
  if (Array.isArray(li.gear)) {
    const map = {};
    for (const it of li.gear) if (it && it.slot) map[it.slot] = it;
    li.gear = map;
  }
  if (!li.gear) li.gear = {};
  return li.gear;
}
/* lista de itens equipados, na forma que computeStats consome (array) */
function equippedList(id) { return Object.values(runnerGear(id)).filter(Boolean); }

function equipItem(runnerId, uid) {
  G._loot = G._loot || [];
  const idx = G._loot.findIndex(it => it.uid === uid);
  if (idx < 0) return false;
  const r = RUNNER_BY_ID[runnerId]; if (!r) return false;
  const item = G._loot[idx];
  const gear = runnerGear(runnerId);
  const cur = gear[item.slot];
  G._loot.splice(idx, 1);
  if (cur) G._loot.push(cur);            // troca: a peça antiga volta pro inventário
  gear[item.slot] = item;
  syncLiveGear(); save();
  notify("⚔ " + item.name + " → " + r.name, RARITIES[item.rarity].color);
  return true;
}
function unequipItem(runnerId, slot) {
  const gear = runnerGear(runnerId);
  const cur = gear[slot];
  if (!cur) return false;
  G._loot = G._loot || [];
  if (G._loot.length >= LOOT_CAP) { notify("Inventário cheio — recicle algo antes de desequipar", "#ff5a5c"); return false; }
  delete gear[slot];
  G._loot.push(cur);
  syncLiveGear(); save();
  notify("↓ " + cur.name + " voltou ao inventário");
  return true;
}
function salvageItem(uid) {
  G._loot = G._loot || [];
  const idx = G._loot.findIndex(it => it.uid === uid);
  if (idx < 0) return 0;
  const it = G._loot[idx];
  G._loot.splice(idx, 1);
  const val = SALVAGE_VALUE[it.rarity] || 10;
  G.shards += val; save();
  notify("♻ " + it.name + " → +" + val + " 💎", (RARITIES[it.rarity] || {}).color);
  return val;
}
/* recicla em massa por predicado (ex.: todos os comuns) */
function salvageWhere(pred) {
  let total = 0, n = 0;
  G._loot = (G._loot || []).filter(it => { if (pred(it)) { total += SALVAGE_VALUE[it.rarity] || 10; n++; return false; } return true; });
  if (total) { G.shards += total; save(); }
  return { total, n };
}
/* re-aplica gear nas unidades vivas (mantendo proporção de HP/estado) */
function syncLiveGear() {
  for (const r of (G.runners || [])) {
    r.gear = equippedList(r.id);
    const hpRatio = (r.maxHp > 0) ? r.hp / r.maxHp : 1;
    r._atqBase = null;                 // cache do Zael invalidado
    computeStats(r);
    if (r.alive) r.hp = Math.min(r.maxHp, Math.max(1, Math.round(r.maxHp * hpRatio)));
  }
}
/* a unidade tem o proc de gear equipado? (unit.gear = array de itens) */
function hasProc(u, procId) {
  if (!u || !u.gear) return false;
  for (const g of u.gear) if (g && g.proc === procId) return true;
  return false;
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
    loot: G._loot || [], uidSeq: G._uidSeq || 0,
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
    G._uidSeq = d.uidSeq || (G._loot.length ? G._loot.length * 1000 : 0);
    for (const it of G._loot) if (it.uid == null) it.uid = nextUid();
    // normaliza saves antigos que não têm os campos novos
    if (!G.ascension) G.ascension = {};
    if (!G.ascensionPoints) G.ascensionPoints = 0;
    if (!G.codex) G.codex = {};
    if (!G.codexDone) G.codexDone = {};
    // normaliza o esquadrão para a grade fixa 2×3 (6 slots)
    if (!Array.isArray(G.squadIds)) G.squadIds = [];
    G.squadIds = G.squadIds.slice(0, SQUAD_SLOTS);
    while (G.squadIds.length < SQUAD_SLOTS) G.squadIds.push(null);
    // saves antigos (5 runners): o novo 6º slot recebe um runner reserva
    if (!G.squadIds[SQUAD_SLOTS - 1]) {
      const spare = G.ownedRunners.find(id => !G.squadIds.includes(id));
      if (spare) G.squadIds[SQUAD_SLOTS - 1] = spare;
    }
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
  for (let i=0;i<Math.min(6, Math.floor(elapsed/600)); i++){ const d2 = rollDrop(); if (d2) drops.push(d2); }
  return { elapsed, shards, xp, kills, bursts, drops };
}
