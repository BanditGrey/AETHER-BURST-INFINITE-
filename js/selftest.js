/* ============================================================
   SELF TEST — suíte de diagnóstico in-game com "olho humano"

   Olho humano = pega o que teste de código NÃO vê:
   · sprite que carrega mas está vazio/placeholder (análise de pixels)
   · painel estourando a viewport (geometria real de render)
   · inimigo atravessando runner ou flutuando fora da faixa do chão
   · clique real que não chega no tile (pointer capture, overlay…)
   · raio que não é serrilhado (análise da polilinha gerada)

   ⚠️ REGRA DO REPO: toda feature/sprite/função nova GANHA UMA
   ENTRADA AQUI (stest("Categoria", "nome", async () => {...})).
   O botão 🧪 Testes cobre o jogo INTEIRO sempre que rodar.

   Headless: abrir a página com ?selftest=1 roda a suíte sozinho e
   expõe o resultado em window.__selftestResults.
   ============================================================ */

const SELFTEST_VER = "st1-0810";
const SELFTESTS = [];
function stest(cat, name, run) { SELFTESTS.push({ cat, name, run }); }

/* ---------- helpers ---------- */
function stAssert(cond, msg) { if (!cond) throw new Error(msg); }
const stSleep = (ms) => new Promise(r => setTimeout(r, ms));

/* carrega UMA imagem e mede alpha/cores — detecta vazia, placeholder e 404 */
function stImg(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const to = setTimeout(() => reject(new Error("timeout ao carregar " + url)), 6000);
    img.onload = () => {
      clearTimeout(to);
      try {
        const w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) return reject(new Error(url + " sem dimensão (arquivo corrompido?)"));
        const S = 64;
        const cv = document.createElement("canvas");
        cv.width = S; cv.height = S;
        const c2 = cv.getContext("2d", { willReadFrequently: true });
        c2.drawImage(img, 0, 0, S, S);
        const d = c2.getImageData(0, 0, S, S).data;
        let opaque = 0; const buckets = new Set();
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] > 8) {
            opaque++;
            // bucket 4-bit por canal (dedup de cores ~idênticas)
            buckets.add(((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4));
          }
        }
        resolve({ w, h, opaquePct: Math.round(opaque / (S * S) * 100), colors: buckets.size });
      } catch (e) { reject(e); }
    };
    img.onerror = () => { clearTimeout(to); reject(new Error(url + " não carrega (404?)")); };
    img.src = url;
  });
}

/* roda stImg num lote e agrega as falhas numa mensagem só */
async function stImgBatch(label, list, opts) {
  opts = opts || {};
  const minOpaque = opts.minOpaque !== undefined ? opts.minOpaque : 4;   // % pixels opacos
  const minColors = opts.minColors !== undefined ? opts.minColors : 24;  // buckets de cor → pega retângulo chapado
  const minAspect = opts.minAspect || 0;                                  // ex.: fundo tem que ser paisagem
  const fails = [];
  await Promise.all(list.map(async ([name, url]) => {
    try {
      const r = await stImg(url);
      if (r.opaquePct < minOpaque) fails.push(name + " quase vazio (" + r.opaquePct + "% opaco)");
      else if (r.colors < minColors) fails.push(name + " com cara de placeholder (" + r.colors + " cores)");
      else if (minAspect && r.w / r.h < minAspect) fails.push(name + " com proporção errada (" + r.w + "×" + r.h + ")");
    } catch (e) { fails.push(name + ": " + e.message); }
  }));
  stAssert(!fails.length, fails.join(" · "));
  return list.length + "/" + list.length + " ok — nítidos, opacos, coloridos";
}

/* ============================================================
   1) ASSETS — o "olho" que vê arte quebrada/vazia/placeholder
   (sprite novo no jogo ⇒ nova linha aqui — REGRA do repo)
   ============================================================ */

stest("Assets", "Sprites dos runners (arte nítida)", async () => {
  const list = RUNNERS.map(r => [r.id, "assets/runners/" + r.id + ".png"]);
  return stImgBatch("runners", list);
});

stest("Assets", "Sprites de inimigos (arte nítida)", async () => {
  const list = Object.keys(ENEMY_TYPES).map(k => [k, "assets/enemies/" + k + ".png"]);
  return stImgBatch("enemies", list);
});

stest("Assets", "Fundos de zona (7 artes pintadas)", async () => {
  const list = Object.keys(ZONE_BG_FILES).map(id => ["z" + id, "assets/bg/" + ZONE_BG_FILES[id] + ".jpg"]);
  // JPEG pintado suaviza as cores no downsample 64px — 48 buckets já separam
  // arte real (~80-150) de placeholder chapado (~2-8); paisagem obrigatória
  return stImgBatch("bg", list, { minColors: 48, minAspect: 1.15, minOpaque: 97 });
});

stest("Assets", "Ícones de gear (8 slots, cutout limpo)", async () => {
  const list = GEAR_SLOTS.map(gs => [gs.id, "assets/icons/slot_" + gs.id + ".png"]);
  return stImgBatch("icons", list);
});

stest("Assets", "Sprites de skill (runners + mobs)", async () => {
  // ⚠️ skill sprite nova ⇒ adicionar a key aqui (REGRA do repo)
  const keys = [
    ...Object.values(RUNNER_SKILL_SPRITE),
    "mob_hollow_swipe", "mob_brute_slam", "mob_phantom_lunge", "mob_surge_pulse",
    "mob_elite_strike", "mob_warden_slam", "mob_riftlord_wrath",
  ];
  const list = [...new Set(keys)].map(k => [k, "assets/skills/" + k + ".png"]);
  return stImgBatch("skills", list, { minOpaque: 2 });
});

/* ============================================================
   2) CENA — comportamento VISUAL do combate
   ============================================================ */

stest("Cena", "Fundo da zona está pintado (não é tela preta)", async () => {
  if (USE_PIXI) return "renderer Pixi — checagem de pixels coberta pelo batch de fundos";
  const c2 = ctx;   // canvas 2D do jogo — faixas pequenas (readback é caro em software GL)
  // 3 pontos amostrais (a cena varia com flash/zonewipe; basta UM rico p/ provar bg pintado)
  let best = 0;
  try {
    for (const [sx, sy] of [[0.05, 0.08], [0.6, 0.3], [0.35, 0.55]]) {
      const d = c2.getImageData(Math.floor(canvas.width * sx), Math.floor(canvas.height * sy), Math.min(160, canvas.width), Math.min(96, canvas.height)).data;
      const buckets = new Set();
      for (let i = 0; i < d.length; i += 32) buckets.add(((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4));
      best = Math.max(best, buckets.size);
    }
  } catch (e) { return "canvas não legível neste browser (" + e.name + ")"; }
  stAssert(best > 20, "fundo quase monocromático (" + best + " cores na melhor faixa) — bg quebrou?");
  return best + " buckets de cor na melhor faixa da cena";
});

stest("Cena", "Inimigos não flutuam (pés na faixa do chão)", async () => {
  if (!G.enemies.some(e => e.alive)) spawnWave();
  await stSleep(1400);   // deixa a marcha acontecer
  const bad = G.enemies.filter(e => e.alive && (e.y < GROUND_Y - 90 || e.y > GROUND_Y + 16));
  stAssert(!bad.length, bad.map(e => e.typeKey + " em y=" + Math.round(e.y)).join(" · "));
  const n = G.enemies.filter(e => e.alive).length;
  return n ? n + " inimigos na faixa y [" + (GROUND_Y - 90) + "…" + (GROUND_Y + 16) + "]" : "sem inimigos vivos no frame (wave morta — ok)";
});

stest("Cena", "Inimigos não atravessam os runners", async () => {
  const pairs = [];
  for (const e of G.enemies) if (e.alive)
    for (const r of G.runners) if (r.alive)
      if (Math.abs(e.x - r.x) < 26 && Math.abs(e.y - r.y) < 20) pairs.push(e.typeKey + "↔" + r.id);
  stAssert(!pairs.length, "interpenetração: " + pairs.join(" · "));
  return "nenhum par sobreposto no frame (tolerância 26×20px)";
});

stest("Cena", "Raio do burst é serrilhado e morre sozinho", async () => {
  const n0 = FX.bolts.length;
  FX.lightning(100, -16, 140, GROUND_Y, { color: "#ffd23f", width: 4 });
  const b = FX.bolts[FX.bolts.length - 1];
  stAssert(FX.bolts.length > n0 && b, "FX.lightning não registrou o bolt");
  stAssert(b.pts.length >= 10, "polilinha com só " + b.pts.length + " pts — raio reto/placeholder");
  let maxDev = 0;
  for (const [x] of b.pts) maxDev = Math.max(maxDev, Math.abs(x - 100));   // desvio lateral do eixo
  stAssert(maxDev > 4, "desvio lateral " + maxDev.toFixed(1) + "px — raio reto, não serrilhado");
  stAssert(b.branches.length >= 1, "sem ramos secundários");
  await stSleep(650);
  stAssert(!FX.bolts.includes(b), "bolt não decaiu — update loop parado?");
  return b.pts.length + " pts, desvio≤" + Math.round(maxDev) + "px, " + b.branches.length + " ramos, decaiu ok";
});

stest("Cena", "Burst lightning dispara a tempestade de raios", async () => {
  const n0 = FX.bolts.length;
  burstVisual({ element: "lightning" }, ELEMENTS.lightning);
  await stSleep(420);   // janela dos 14 raios escalonados (i*40ms)
  const spawned = FX.bolts.length - n0;
  stAssert(spawned >= 3, "só " + spawned + " raios — tempestade não disparou");
  return spawned + " raios ativos na janela do burst";
});

/* ============================================================
   3) PAINÉIS — render + geometria real na viewport
   ============================================================ */

stest("Painéis", "Todos os painéis renderizam dentro da tela", async () => {
  const views = ["squad", "gear", "dungeons", "codex", "infinity", "ascension"];
  for (const v of views) {
    openPanel(v);
    await stSleep(30);
    const pc = document.getElementById("panelContent");
    stAssert(pc.children.length > 0, v + " renderizou vazio");
    const r = document.getElementById("panel").getBoundingClientRect();
    stAssert(r.top >= -8 && r.left >= -8 && r.bottom <= innerHeight + 8 && r.right <= innerWidth + 8,
      v + " estourou a viewport " + JSON.stringify({ t: Math.round(r.top), b: Math.round(r.bottom), h: innerHeight }));
  }
  return views.length + " painéis renderizados e contidos";
});

stest("Painéis", "Gear: stats visíveis e bag realmente rolável", async () => {
  // enche a bag temporariamente (restaurado no fim da suíte)
  for (let i = 0; i < 40; i++) rollDrop();
  GEAR_UI.runner = GEAR_UI.runner || (RUNNERS[0] && RUNNERS[0].id);
  openPanel("gear");
  await stSleep(50);
  const panel = document.getElementById("panel").getBoundingClientRect();
  const stats = document.querySelector(".gw-stats");
  stAssert(stats, "grid de stats não renderizou");
  const sr = stats.getBoundingClientRect();
  stAssert(sr.bottom <= panel.bottom + 4 && sr.top >= panel.top,
    "stats fora do painel (top " + Math.round(sr.top) + ", bottom " + Math.round(sr.bottom) + ", painel acaba em " + Math.round(panel.bottom) + ")");
  const grid = document.querySelector(".gw-grid.gi-grid");
  stAssert(grid.scrollHeight > grid.clientHeight + 10,
    "bag sem área de rolagem (client " + grid.clientHeight + " == scroll " + grid.scrollHeight + ")");
  return "stats dentro do painel · bag rola " + (grid.scrollHeight - grid.clientHeight) + "px";
});

stest("Painéis", "Equipar funciona com eventos REais de ponteiro", async () => {
  // regressão do bug do pointer-capture: simula a sequência física
  // pointerdown → pointerup → click direto no tile da bag
  GEAR_UI.runner = GEAR_UI.runner || RUNNERS[0].id;
  openPanel("gear");
  await stSleep(60);
  const tile = document.querySelector(".gw-grid.gi-grid .gi[data-qequip]");
  stAssert(tile, "bag vazia — nada p/ equipar no teste");
  const uid = +tile.dataset.qequip;
  const before = JSON.stringify(Object.keys(runnerGear(GEAR_UI.runner)));
  for (const type of ["pointerdown", "pointerup", "click"])
    tile.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
  await stSleep(60);
  const gear = runnerGear(GEAR_UI.runner);
  stAssert(Object.values(gear).some(it => it && it.uid === uid),
    "sequência de clique real NÃO equipou (antes " + before + ")");
  return "clique físico na bag equipou a peça uid " + uid;
});

stest("Painéis", "Tooltip flutuante abre, cabe na tela e é click-through", async () => {
  openPanel("gear");
  await stSleep(60);
  const tile = document.querySelector(".gw-grid.gi-grid .gi[data-qequip]") ||
               document.querySelector(".gws.filled") || document.querySelector(".gws");
  stAssert(tile, "nenhum tile/slot p/ hover");
  tile.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false, view: window }));
  await stSleep(60);
  const tip = document.getElementById("gtipFloat");
  stAssert(tip && tip.style.display !== "none", "tooltip flutuante não abriu");
  const r = tip.getBoundingClientRect();
  stAssert(r.width > 100 && r.height > 60, "tooltip pequeno demais (" + Math.round(r.width) + "×" + Math.round(r.height) + ")");
  stAssert(r.left >= 0 && r.right <= innerWidth + 4, "tooltip vazando pelas laterais");
  const peTip = getComputedStyle(document.getElementById("gtipFloat")).pointerEvents;
  stAssert(peTip === "none", "tooltip deveria ser click-through (pointer-events=" + peTip + ")");
  tile.dispatchEvent(new MouseEvent("mouseleave", { bubbles: false, view: window }));
  await stSleep(420);
  stAssert(tip.style.display === "none", "tooltip não escondeu após o mouseleave");
  return Math.round(r.width) + "×" + Math.round(r.height) + " dentro da viewport, click-through ok";
});

/* ============================================================
   4) MOTOR — funções de jogo (gear, dano, save, stats)
   ============================================================ */

stest("Motor", "Gear muda os stats de verdade (equipar/desequipar)", async () => {
  const rid = RUNNERS[0].id;
  const u0 = makeRunner(rid, 0); computeStats(u0);
  const b4 = { atq: u0.atq, hp: u0.maxHp };
  const uid = nextUid();
  G._loot.push({ uid, slot: "weapon", rarity: "rare", name: "ST Teste", stats: { atq: 0.25 }, proc: null, desc: "selftest" });
  stAssert(equipItem(rid, uid), "equipItem recusou peça válida");
  const u1 = makeRunner(rid, 0); computeStats(u1);
  stAssert(u1.atq > b4.atq, "ATQ não subiu (" + b4.atq + " → " + u1.atq + ")");
  stAssert(unequipItem(rid, "weapon"), "unequipItem falhou");
  const u2 = makeRunner(rid, 0); computeStats(u2);
  stAssert(Math.abs(u2.atq - b4.atq) < 1, "ATQ não voltou ao base (" + u2.atq + " vs " + b4.atq + ")");
  return "ATQ " + Math.round(b4.atq) + " → " + Math.round(u1.atq) + " → " + Math.round(u2.atq);
});

stest("Motor", "Reciclar converte peça em shards", async () => {
  const s0 = G.shards;
  const uid = nextUid();
  G._loot.push({ uid, slot: "ring", rarity: "common", name: "ST Recicla", stats: { crt: 0.01 }, proc: null, desc: "selftest" });
  const got = salvageItem(uid);
  stAssert(got === SALVAGE_VALUE.common && G.shards === s0 + got, "salvage retornou " + got);
  G.shards = s0;
  return "+" + got + " 💎 por peça comum";
});

stest("Motor", "rollDrop gera raridades e slots válidos", async () => {
  // salva/limpa a bag p/ não depender do conteúdo atual
  const snap = G._loot; G._loot = [];
  try {
    const seen = new Set(), slots = new Set();
    for (let i = 0; i < 140; i++) stAssert(rollDrop(), "rollDrop retornou null com bag vazia");
    for (const it of G._loot) {
      seen.add(it.rarity); slots.add(it.slot);
      stAssert(RARITIES[it.rarity], "raridade inválida " + it.rarity);
      stAssert(GEAR_SLOTS.some(gs => gs.id === it.slot), "slot inválido " + it.slot);
    }
    stAssert(seen.size >= 4, "só " + seen.size + " raridades em 140 drops");
    stAssert(slots.size >= 7, "só " + slots.size + " slots em 140 drops — algum slot não dropa");
    return seen.size + " raridades, " + slots.size + " slots cobertos";
  } finally { G._loot = snap; }
});

stest("Motor", "computeStats sã em todos os runners (sem NaN/negativo)", async () => {
  const bad = [];
  for (const r of RUNNERS) {
    const u = makeRunner(r.id, 0); computeStats(u);
    for (const k of ["maxHp", "atq", "def", "spd"])
      if (!isFinite(u[k]) || u[k] <= 0) bad.push(r.id + "." + k + "=" + u[k]);
    if (!(u.crt >= 0 && u.crt <= 0.86)) bad.push(r.id + ".crt=" + u.crt);
  }
  stAssert(!bad.length, bad.join(" · "));
  return RUNNERS.length + " runners com stats válidos";
});

stest("Motor", "dealDamage aplica dano e produz número flutuante", async () => {
  const atk = G.runners.find(r => r.alive) || makeRunner(RUNNERS[0].id, 0);
  computeStats(atk); atk.alive = true;
  const dummy = makeEnemy("hollow", Math.max(1, G.level));   // descartável: nunca entra em G.enemies
  const n0 = FX.damageNumbers.length;
  const hp0 = dummy.hp;
  dealDamage(atk, dummy, 50, { kind: "skill", noMiss: true });
  stAssert(dummy.hp < hp0, "HP não caiu (" + hp0 + " → " + dummy.hp + ")");
  stAssert(FX.damageNumbers.length > n0, "nenhum número de dano emitido");
  return "-" + Math.round(hp0 - dummy.hp) + " HP e número flutuante emitido";
});

stest("Motor", "Save serializa gear/loot (roundtrip localStorage)", async () => {
  save();
  const raw = localStorage.getItem(SAVE_KEY);
  stAssert(raw && raw.length > 200, "save vazio/ausente");
  const d = JSON.parse(raw);
  stAssert(Array.isArray(d.loot), "loot não serializado");
  stAssert(typeof d.uidSeq === "number", "uidSeq ausente");
  stAssert(d.runnerLevels && typeof d.runnerLevels === "object", "runnerLevels ausente");
  return "save ok — " + d.loot.length + " peças em " + Math.round(raw.length / 1024) + " KB";
});

/* ============================================================
   RUNNER da suíte (UI no painel 🧪 Testes)
   ============================================================ */

function panelSelftest() {
  return `<h2>🧪 AUTO-TESTE</h2>
  <div class="panel-sub">Suíte com "olho humano" — pixels dos sprites, geometria real dos painéis,
  clique físico, profundidade na cena. Cobre <b>${SELFTESTS.length} frentes</b> e cresce a cada feature nova
  (regra do repo: feature nova ⇒ entrada nova no registro). <span style="color:var(--muted)">build ${SELFTEST_VER}</span></div>
  <div class="st-wrap">
    <div class="st-head">
      <div class="st-badge" id="stBadge">▶ EXECUTANDO…</div>
      <div class="st-actions">
        <button class="st-btn" id="stRerun" disabled>↻ Rodar de novo</button>
        <button class="st-btn" id="stCopy" disabled>📋 Copiar relatório</button>
      </div>
    </div>
    <div class="st-barwrap"><div class="st-bar" id="stBar" style="width:0%"></div></div>
    <pre class="st-log" id="stLog"></pre>
  </div>`;
}

async function runSelftestUI() {
  const log = document.getElementById("stLog");
  const bar = document.getElementById("stBar");
  const badge = document.getElementById("stBadge");
  if (!log) return;
  const btnRerun = document.getElementById("stRerun");
  const btnCopy = document.getElementById("stCopy");
  btnRerun.disabled = true; btnCopy.disabled = true;
  log.textContent = "";
  badge.textContent = "▶ EXECUTANDO…"; badge.className = "st-badge run";
  window.__ST_QUIET = true;   // silencia toasts (a suíte gera loot de mentira p/ testar)

  /* snapshot p/ não sujar a conta do jogador (loot, shards e TODO o gear) */
  const snap = {
    loot: (G._loot || []).slice(), shards: G.shards, view: G.view, runner: GEAR_UI.runner,
    levels: JSON.parse(JSON.stringify(G.runnerLevels)),
  };
  const results = [];
  const lines = [];
  let cat = "";
  const t0 = performance.now();

  // testes de Painéis abrem outros painéis e DESTROEM o #stLog do DOM no
  // meio da corrida — por isso acumulamos em `lines` e só despejamos se o
  // log ainda estiver conectado
  const line = (html) => {
    lines.push(html);
    if (log.isConnected) { log.innerHTML = lines.join("\n"); log.scrollTop = log.scrollHeight; }
  };
  for (let i = 0; i < SELFTESTS.length; i++) {
    const t = SELFTESTS[i];
    if (t.cat !== cat) { cat = t.cat; line(`\n▸ <b>${cat.toUpperCase()}</b>`); }
    const s = performance.now();
    try {
      const detail = await t.run();
      results.push({ ok: true, cat: t.cat, name: t.name, detail });
      line(`  ✅ ${t.name} <span class="st-detail">— ${detail || "ok"}</span> <span class="st-ms">${Math.round(performance.now() - s)}ms</span>`);
    } catch (e) {
      results.push({ ok: false, cat: t.cat, name: t.name, error: String(e && e.message || e) });
      line(`  ❌ ${t.name} <span class="st-err">— ${e.message}</span>`);
    }
    bar.style.width = Math.round((i + 1) / SELFTESTS.length * 100) + "%";
    await stSleep(1);   // deixa a UI respirar entre testes
  }

  /* restaura o mundo como estava */
  G._loot = snap.loot; G.shards = snap.shards; GEAR_UI.runner = snap.runner;
  G.runnerLevels = snap.levels;
  window.__ST_QUIET = false;
  save();

  /* se os testes de painel deixaram outro painel aberto, volta p/ o de
     resultados — SEM reagendar a suíte (openPanel com noAuto=true) */
  if (!document.getElementById("stLog")) openPanel("selftest", true);
  const logEl = document.getElementById("stLog"), badgeEl = document.getElementById("stBadge");
  const barEl = document.getElementById("stBar");
  const btnRerun2 = document.getElementById("stRerun"), btnCopy2 = document.getElementById("stCopy");
  if (logEl) { logEl.innerHTML = lines.join("\n"); logEl.scrollTop = logEl.scrollHeight; }
  if (barEl) barEl.style.width = "100%";

  const okN = results.filter(r => r.ok).length;
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  const allOk = okN === results.length;
  if (badgeEl) {
    badgeEl.textContent = allOk ? `✅ ${okN}/${results.length} OK — ${secs}s` : `⚠ ${okN}/${results.length} OK — ${results.length - okN} FALHA(S)`;
    badgeEl.className = "st-badge " + (allOk ? "pass" : "fail");
  }
  window.__selftestResults = { ver: SELFTEST_VER, ok: okN, total: results.length, secs: +secs, items: results, ua: navigator.userAgent };

  btnRerun2.disabled = false; btnCopy2.disabled = false;
  btnRerun2.onclick = runSelftestUI;
  btnCopy2.onclick = () => {
    const txt = [
      `🧪 AETHER BURST — AUTO-TESTE ${SELFTEST_VER}`,
      `${new Date().toLocaleString("pt-BR")} · ${okN}/${results.length} OK em ${secs}s`,
      ``,
      ...results.map(r => `${r.ok ? "✅" : "❌"} [${r.cat}] ${r.name}${r.ok ? (r.detail ? " — " + r.detail : "") : " — ERRO: " + r.error}`),
    ].join("\n");
    const done = () => notify("📋 Relatório copiado — cola aqui no chat!");
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => fallbackCopy(txt, done));
    else fallbackCopy(txt, done);
  };
  function fallbackCopy(txt, done) {
    const ta = document.createElement("textarea");
    ta.value = txt; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (_) {}
    ta.remove(); done();
  }
}
