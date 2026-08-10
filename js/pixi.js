/* ============================================================
   AETHER BURST: INFINITE — PIXIJS (WebGL) RENDERER
   Camada de renderização por GPU via PixiJS. Opt-in: ative com
   `?pixi=1` na URL. Se o WebGL não estiver disponível, o jogo usa
   o renderizador Canvas 2D padrão (fallback automático).
   A lógica (engine/data/fx/main-UI) é idêntica — só muda o desenho.
   ============================================================ */

window.PIXIR = (function () {
  let app = null;
  let active = false;
  let stageEl = null;
  let enabling = false;

  // fontes possíveis para o PixiJS (em ordem de preferência). Se nenhuma
  // carregar, o jogo continua no Canvas 2D padrão (sem quebrar).
  const PIXI_SOURCES = [
    'https://cdn.jsdelivr.net/npm/pixi.js@7.4.2/dist/pixi.min.js',
    'vendor/pixi.min.js', // local, se existir
  ];

  function injectScript(src, onload) {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = onload;
    s.onerror = onload; // tenta a próxima fonte
    document.head.appendChild(s);
    return s;
  }

  // Carrega a biblioteca PixiJS dinamicamente e chama cb(ok) quando pronto.
  // Não bloqueia a página: o jogo roda em Canvas até (se) o Pixi carregar.
  function loadLib(cb) {
    if (typeof PIXI !== 'undefined') return cb(true);
    if (enabling) return; // já carregando
    enabling = true;
    let i = 0;
    function next() {
      if (typeof PIXI !== 'undefined') { enabling = false; return cb(true); }
      if (i >= PIXI_SOURCES.length) { enabling = false; return cb(false); }
      injectScript(PIXI_SOURCES[i++], next);
    }
    next();
  }

  // Ativa o renderer WebGL: carrega o Pixi (se necessário), inicializa e
  // chama cb(ok). O jogo segue em Canvas enquanto o Pixi não estiver pronto.
  function enable(cb) {
    cb = cb || function(){};
    loadLib(function (ok) {
      if (!ok) return cb(false);
      try { cb(init()); } catch (e) { cb(false); }
    });
  }

  // camadas persistentes
  let bgG = null;      // fundo (céu, chão, cristais)
  let moteG = null;    // partículas de aether do fundo
  let unitG = null;    // todas as unidades (runners + enemies)
  let spriteLayer = null; // sprites de imagem dos runners (GPU)
  let fxG = null;      // FX (partículas, anéis, feixes)
  let textLayer = null;// container de textos (números, flutuantes)
  let hudG = null;     // barras de HP / progresso / boss
  let overlayG = null; // flash + vignette

  /* ---------- init ---------- */
  function init() {
    if (typeof PIXI === 'undefined') return false;
    stageEl = document.getElementById('stage');
    if (!stageEl) return false;
    try {
      app = new PIXI.Application({
        width: PLAY_W,
        height: PLAY_H,
        antialias: true,
        backgroundColor: 0x02030a,
        resolution: Math.min(2, window.devicePixelRatio || 1),
        autoDensity: true,
        autoStart: false, // nós controlamos o loop pelo game loop existente
      });
      app.view.style.position = 'absolute';
      app.view.style.inset = '0';
      app.view.style.width = '100%';
      app.view.style.height = '100%';
      app.view.id = 'pixi';
      stageEl.insertBefore(app.view, stageEl.firstChild);

      bgG = new PIXI.Graphics();
      moteG = new PIXI.Graphics();
      unitG = new PIXI.Graphics();
      spriteLayer = new PIXI.Container();
      fxG = new PIXI.Graphics();
      textLayer = new PIXI.Container();
      hudG = new PIXI.Graphics();
      overlayG = new PIXI.Graphics();
      app.stage.addChild(bgG);
      app.stage.addChild(moteG);
      app.stage.addChild(spriteLayer);
      app.stage.addChild(unitG);
      app.stage.addChild(fxG);
      app.stage.addChild(textLayer);
      app.stage.addChild(hudG);
      app.stage.addChild(overlayG);
      active = true;
    } catch (e) {
      active = false;
      if (app) { try { app.destroy(true); } catch (_) {} app = null; }
    }
    return active;
  }

  function resize() {
    if (!active) return;
    const w = PLAY_W, h = PLAY_H;
    app.renderer.resize(w, h);
  }

  // aplica zoom/pan da câmera à stage Pixi (usando o CAM compartilhado)
  function applyCam() {
    const cam = (typeof window !== 'undefined' && window.CAM) || { zoom: 1, x: PLAY_W / 2, y: PLAY_H / 2 };
    app.stage.scale.set(cam.zoom, cam.zoom);
    app.stage.position.set(PLAY_W / 2 - cam.x * cam.zoom, PLAY_H / 2 - cam.y * cam.zoom);
  }

  /* ---------- cor ---------- */
  function col(hex, a) { return (parseInt(hex.replace('#',''), 16) & 0xffffff); }
  function numC(r, g, b) { return (r << 16) | (g << 8) | b; }

  /* ---------- fundo ---------- */
  const bgSpriteCache = {};   // zoneId -> PIXI.Sprite
  function drawBG(z) {
    // fundo de imagem da zona (se carregou)
    const ZONE_BG = {1:'z1_verdant',2:'z2_inferno',3:'z3_frozen',4:'z4_storm',5:'z5_void',6:'z6_celestial',7:'z7_core'};
    const url = 'assets/bg/' + (ZONE_BG[z.id] || ('z'+z.id)) + '.jpg?v=' + SPRITE_V;
    let spr = bgSpriteCache[z.id];
    if (!spr && PIXI.Texture) {
      try {
        const tex = PIXI.Texture.from(url);
        if (tex && tex.valid) { spr = new PIXI.Sprite(tex); bgSpriteCache[z.id] = spr; }
      } catch(e){}
      if (!spr && PIXI.Assets && PIXI.Assets.load) {
        PIXI.Assets.load(url).then(t => { if (t && t.valid) { bgSpriteCache[z.id] = new PIXI.Sprite(t); } }).catch(()=>{});
      }
    }
    if (spr) {
      bgG.clear();
      spr.width = PLAY_W; spr.height = PLAY_H; spr.x = 0; spr.y = 0;
      app.stage.addChild(spr); // coloca acima do bgG
      app.stage.setChildIndex(spr, 0); // mantém no fundo
      return;
    }
    bgG.clear();
    // céu em 3 faixas verticais (aproximação do gradiente)
    const sky = z.sky;
    bgG.beginFill(col(sky[0]), 1);
    bgG.drawRect(0, 0, PLAY_W, GROUND_Y * 0.4);
    bgG.beginFill(col(sky[1]), 1);
    bgG.drawRect(0, GROUND_Y * 0.4, PLAY_W, GROUND_Y * 0.4);
    bgG.beginFill(col(sky[2]), 1);
    bgG.drawRect(0, GROUND_Y * 0.8, PLAY_W, PLAY_H - GROUND_Y * 0.8);
    // chão
    bgG.beginFill(col(z.ground), 1);
    bgG.drawRect(0, GROUND_Y, PLAY_W, PLAY_H - GROUND_Y);
    // linha de aether
    bgG.lineStyle(2, col(z.accent), 0.5);
    bgG.moveTo(0, GROUND_Y + 2);
    bgG.lineTo(PLAY_W, GROUND_Y + 2);
    bgG.stroke();
    // cristais distantes (silhuetas)
    drawCrystals(z);
  }

  function drawCrystals(z) {
    // silhuetas simples: alguns triângulos
    const pts = [[80, GROUND_Y - 150, 90], [260, GROUND_Y - 120, 70], [520, GROUND_Y - 100, 60],
                 [760, GROUND_Y - 130, 80], [980, GROUND_Y - 110, 70], [1180, GROUND_Y - 140, 90]];
    bgG.lineStyle(0);
    for (const [x, y, hgt] of pts) {
      bgG.beginFill(col('#000000'), 0.25);
      bgG.moveTo(x, y);
      bgG.lineTo(x - hgt * 0.4, y + hgt);
      bgG.lineTo(x + hgt * 0.4, y + hgt);
      bgG.closePath();
      bgG.fill();
    }
    bgG.lineStyle(0);
  }

  function drawMotes(z) {
    moteG.clear();
    // motes se movem (mesma lógica do canvas)
    for (const m of BG.motes) {
      m.x -= m.v * 0.016 * G.speed;
      m.y += (m.drift||0) * 0.016 * G.speed;
      if (m.x < -10) { m.x = PLAY_W+10; m.y = Math.random()*PLAY_H; }
      if (m.y < -5) m.y = PLAY_H+5; if (m.y > PLAY_H+5) m.y = -5;
      const tw = 0.4 + 0.3 * Math.sin(performance.now()/400 + (m.tw||0));
      moteG.beginFill(col(z.accent), tw);
      moteG.drawCircle(m.x, m.y, m.s);
    }
    moteG.endFill();
    // brilho pulsante do rift
    const pulse = 0.2 + 0.1 * Math.sin(performance.now()/500);
    moteG.beginFill(col(z.accent), pulse);
    moteG.drawCircle(PLAY_W+60, GROUND_Y-80, 200);
    moteG.endFill();
  }

  /* ---------- runner chibi ---------- */
  function drawRunner(g, r) {
    g.clear();
    const s = r.burstScale || 1;
    const bob = Math.sin(r.bob) * 2;
    const el = ELEMENTS[r.element];
    const dx = r.x, dy = r.y + bob;
    const a = r.alive ? 1 : 0.25;
    const bw = 18 * s, bh = 26 * s;

    // sombra
    g.beginFill(0x000000, 0.45 * a);
    g.drawEllipse(dx, r.y + 2, 22 * s, 7 * s);

    // aura
    const auraR = (28 + (r.castGlow > 0 ? 14 : 0) + (r.burstReady ? 10 : 0)) * s;
    g.beginFill(col(el.color), (r.burstReady ? 0.3 : 0.15) * a);
    g.drawCircle(dx, dy - 22 * s, auraR);

    // corpo
    g.beginFill(col(lighten(r.color, 0.2)), a);
    g.drawRoundedRect(dx - bw / 2, dy - bh - 2, bw, bh, 7);
    g.lineStyle(1.5, col(darken(r.color, 0.4)), a);
    g.drawRoundedRect(dx - bw / 2, dy - bh - 2, bw, bh, 7);

    // pernas
    g.lineStyle(0);
    g.beginFill(col(darken(r.color, 0.35)), a);
    g.drawRoundedRect(dx - 7 * s, dy - 2, 5 * s, 8 * s, 2);
    g.drawRoundedRect(dx + 2 * s, dy - 2, 5 * s, 8 * s, 2);

    // cabeça
    g.beginFill(col(r.accent), a);
    g.drawCircle(dx, dy - bh - 9 * s, 10 * s);
    g.lineStyle(1.2, col(darken(r.accent, 0.3)), a);
    g.drawCircle(dx, dy - bh - 9 * s, 10 * s);

    // olhos
    g.lineStyle(0);
    g.beginFill(col(el.glow), a);
    g.drawCircle(dx - 3.2 * s, dy - bh - 9 * s, 1.7 * s);
    g.drawCircle(dx + 3.2 * s, dy - bh - 9 * s, 1.7 * s);

    // arma por classe
    drawWeapon(g, r, s, bh, el, a);

    // hit flash
    if (r.hitFlash > 0) {
      g.beginFill(0xffffff, (r.hitFlash / 0.18) * 0.6);
      g.drawRoundedRect(dx - bw / 2, dy - bh - 2, bw, bh, 7);
    }

    // escudo
    if (r.shieldHp > 0) {
      g.lineStyle(2, col('#4cc9ff'), 0.8);
      g.drawCircle(dx, dy - 22 * s, 24 * s);
    }
    g.lineStyle(0);
  }

  function drawWeapon(g, r, s, bh, el, a) {
    const dy = r.y + Math.sin(r.bob) * 2;
    const top = dy - bh;
    g.lineStyle(1.5, col(el.color), a);
    switch (r.cls) {
      case 'Breaker': {
        g.beginFill(col('#dfe7ff'), a);
        g.moveTo(14 * s, top + 4 * s); g.lineTo(34 * s, top - 22 * s);
        g.lineTo(30 * s, top - 26 * s); g.lineTo(10 * s, top);
        g.closePath(); g.fill(); g.stroke();
        break;
      }
      case 'Vanguard': {
        g.beginFill(col('#9aa6c8'), a);
        g.drawRoundedRect(8 * s, top + 2 * s, 12 * s, 18 * s, 3);
        g.lineStyle(1.5, el.color ? col(el.color, a) : col('#9aa6c8', a), a);
        g.drawRoundedRect(8 * s, top + 2 * s, 12 * s, 18 * s, 3);
        break;
      }
      case 'Striker': {
        g.lineStyle(1.5, col(el.glow), a);
        g.moveTo(10 * s, top); g.lineTo(26 * s, top - 18 * s);
        g.moveTo(-10 * s, top); g.lineTo(-26 * s, top - 18 * s);
        g.stroke();
        break;
      }
      case 'Blaster': {
        g.beginFill(col('#5a6585'), a);
        g.drawRoundedRect(12 * s, top + 8 * s, 18 * s, 5 * s, 2);
        break;
      }
      case 'BurstMage': {
        const oy = top - 26 * s + Math.sin(r.bob * 1.5) * 3;
        g.beginFill(col(el.color), a);
        g.drawCircle(dx0(), oy, 6 * s);
        break;
      }
      case 'Resonator': {
        g.beginFill(col(el.color), a);
        for (let i = 0; i < 3; i++) {
          const ang = r.bob * 2 + i * 2.1;
          g.drawCircle(Math.cos(ang) * 16 * s, top - 4 * s + Math.sin(ang) * 10 * s, 2 * s);
        }
        break;
      }
    }
    function dx0() { return r.x; }
    g.lineStyle(0);
  }

  /* ---------- sprites dos runners (arte PNG) ---------- */
  const runnerSprites = {};   // runnerId -> PIXI.Sprite
  const SPRITE_BASE = 'assets/runners/';
  const SPRITE_V = 'c70f01f'; // cache-busting dos sprites

  // Carrega o sprite de um runner via PIXI.Assets (ou Texture.from). Fica no
  // cache; se falhar/ausente, o renderer cai para o desenho vetorial (fallback).
  function ensureRunnerSprite(r) {
    const id = r.id;
    if (runnerSprites[id] !== undefined) return runnerSprites[id];
    runnerSprites[id] = null; // marcando "em progresso" para evitar loop
    try {
      const url = SPRITE_BASE + id + '.png?v=' + SPRITE_V;
      const tex = (PIXI.Assets && PIXI.Assets.load) ? null : (PIXI.Texture.from && PIXI.Texture.from(url));
      if (tex && tex.valid) { runnerSprites[id] = makeRunnerSprite(id, tex); return runnerSprites[id]; }
      if (PIXI.Assets && PIXI.Assets.load) {
        PIXI.Assets.load(url).then(t => {
          if (t && t.valid) runnerSprites[id] = makeRunnerSprite(id, t);
        }).catch(() => {});
      }
    } catch (e) { /* fallback vetorial */ }
    return null;
  }
  function makeRunnerSprite(id, tex) {
    const spr = new PIXI.Sprite(tex);
    // âncora na base central (pés): o ponto do slot é sempre a base do sprite,
    // independentemente do tamanho/proporção da textura carregada
    spr.anchor.set(0.5, 1);
    return spr;
  }

  // desenha um runner: se tem sprite de imagem, usa ele (com fallback de
  // sombra/aura); senão, usa a versão vetorial completa.
  function drawRunnerUnit(g, r) {
    const spr = ensureRunnerSprite(r);
    if (spr) {
      drawRunnerShadowAura(g, r);
      return spr;
    }
    drawRunner(g, r);
    return null;
  }

  // sombra + aura (compartilhadas pelo sprite de imagem)
  function drawRunnerShadowAura(g, r) {
    const s = r.burstScale || 1;
    const el = ELEMENTS[r.element];
    const a = r.alive ? 1 : 0.25;
    // sombra
    g.beginFill(0x000000, 0.45 * a);
    g.drawEllipse(r.x, r.y + 2, 22 * s, 7 * s);
    // aura
    const auraR = (28 + (r.castGlow > 0 ? 14 : 0) + (r.burstReady ? 10 : 0)) * s;
    g.beginFill(col(el.color), (r.burstReady ? 0.3 : 0.15) * a);
    g.drawCircle(r.x, r.y - 22 * s, auraR);
    g.endFill();
  }

  /* ---------- sprites dos inimigos (arte PNG) ---------- */
  const enemySprites = {};       // typeKey -> PIXI.Sprite
  const ENEMY_SPRITE_BASE = 'assets/enemies/';
  function ensureEnemySprite(e) {
    const k = e.typeKey;
    if (enemySprites[k] !== undefined) return enemySprites[k];
    enemySprites[k] = null; // marcando "em progresso"
    try {
      const url = ENEMY_SPRITE_BASE + k + '.png?v=' + SPRITE_V;
      const tex = (PIXI.Assets && PIXI.Assets.load) ? null : (PIXI.Texture.from && PIXI.Texture.from(url));
      if (tex && tex.valid) { enemySprites[k] = makeRunnerSprite(k, tex); return enemySprites[k]; }
      if (PIXI.Assets && PIXI.Assets.load) {
        PIXI.Assets.load(url).then(t => { if (t && t.valid) enemySprites[k] = makeRunnerSprite(k, t); }).catch(() => {});
      }
    } catch (e) { /* fallback vetorial */ }
    return null;
  }
  // desenha um inimigo: usa sprite se disponível; senão vetorial
  function drawEnemyUnit(g, e) {
    const spr = ensureEnemySprite(e);
    if (spr) return spr;
    drawEnemy(g, e);
    return null;
  }

  /* ---------- inimigo ---------- */
  function drawEnemy(g, e) {
    g.clear();
    const ds = e.alive ? 1 : Math.max(0, e.dyingTimer / 0.5);
    const a = e.alive ? 1 : ds;
    const sz = e.size;
    const bob = Math.sin(e.bob) * 2;
    const dy = e.y + bob;
    g.beginFill(0x000000, 0.45);
    g.drawEllipse(e.x, e.y + 4, sz * 0.9, sz * 0.28);

    const body = col(lighten(e.color, 0.25));
    g.beginFill(body, a);
    g.lineStyle(e.isBoss ? 3 : 1.6, col(darken(e.color, 0.5)), a);
    if (e.typeKey === 'brute') {
      g.drawRoundedRect(e.x - sz * 0.8, dy - sz * 1.1, sz * 1.6, sz * 1.3, 6);
      g.beginFill(col(darken(e.color, 0.2)), a);
      g.drawRoundedRect(e.x - sz, dy - sz * 1.1, sz * 0.5, sz * 0.5, 4);
      g.drawRoundedRect(e.x + sz * 0.5, dy - sz * 1.1, sz * 0.5, sz * 0.5, 4);
    } else if (e.typeKey === 'phantom') {
      // corpo fantasma (polígono aproximado)
      g.moveTo(e.x - sz * 0.7, dy);
      g.lineTo(e.x - sz * 0.9, dy - sz * 1.2);
      g.lineTo(e.x, dy - sz * 1.3);
      g.lineTo(e.x + sz * 0.9, dy - sz * 1.2);
      g.lineTo(e.x + sz * 0.7, dy);
      g.lineTo(e.x + sz * 0.3, dy + sz * 0.3);
      g.lineTo(e.x - sz * 0.3, dy + sz * 0.3);
      g.closePath(); g.fill(); g.stroke();
    } else if (e.isBoss) {
      g.moveTo(e.x - sz, dy + sz * 0.2);
      g.lineTo(e.x - sz * 1.1, dy - sz * 0.8);
      g.lineTo(e.x - sz * 0.5, dy - sz * 1.1);
      g.lineTo(e.x, dy - sz * 1.4);
      g.lineTo(e.x + sz * 0.5, dy - sz * 1.1);
      g.lineTo(e.x + sz * 1.1, dy - sz * 0.8);
      g.lineTo(e.x + sz, dy + sz * 0.2);
      g.closePath(); g.fill(); g.stroke();
      g.beginFill(0xffffff, 0.85);
      g.drawCircle(e.x, dy - sz * 0.5, sz * 0.28);
    } else {
      g.drawCircle(e.x, dy - sz * 0.6, sz * 0.85);
    }
    g.lineStyle(0);

    // olhos
    const eye = e.isBoss ? col('#3afff0') : (e.typeKey === 'phantom' ? col('#ff5a3c') : col('#ff3b46'));
    g.beginFill(eye, a);
    g.drawCircle(e.x - sz * 0.28, dy - sz * 0.7, sz * 0.14);
    g.drawCircle(e.x + sz * 0.28, dy - sz * 0.7, sz * 0.14);

    // hit flash
    if (e.hitFlash > 0) {
      g.beginFill(0xffffff, (e.hitFlash / 0.18) * 0.7);
      g.drawCircle(e.x, dy - sz * 0.6, sz);
    }

    // frozen
    if (e.frozen > 0) {
      g.beginFill(col('#9be3ff'), 0.4);
      g.drawCircle(e.x, dy - sz * 0.6, sz);
      g.lineStyle(2, col('#cdf3ff'), 1);
      for (let i = 0; i < 3; i++) {
        g.moveTo(e.x - sz + i * sz, dy - sz * 1.4);
        g.lineTo(e.x - sz * 0.6 + i * sz, dy + sz * 0.2);
      }
      g.stroke();
      g.lineStyle(0);
    }
  }

  /* ---------- HP bars ---------- */
  function drawHPBars() {
    hudG.clear();
    // barra de progresso da zona (topo)
    const z = ZONES[G.zone - 1];
    const pct = Math.min(1, G.level / 100);
    const bx = 20, by = 16, bw = 280, bh = 14;
    hudG.beginFill(0x000000, 0.5);
    hudG.drawRoundedRect(bx, by, bw, bh, 7);
    hudG.lineStyle(1, col(z.accent), 0.6);
    hudG.drawRoundedRect(bx, by, bw, bh, 7);
    hudG.lineStyle(0);
    hudG.beginFill(col(z.accent), 1);
    hudG.drawRoundedRect(bx, by, bw * pct, bh, 7);

    // boss HP
    const boss = G.enemies.find(e => e.alive && e.isBoss);
    if (boss) {
      const r = Math.max(0, boss.hp / boss.maxHp);
      const BW = PLAY_W - 160, BX = 80, BY = 48;
      hudG.beginFill(0x000000, 0.6);
      hudG.drawRoundedRect(BX, BY, BW, 16, 8);
      hudG.beginFill(col('#ff3b46'), 1);
      hudG.drawRoundedRect(BX, BY, BW * r, 16, 8);
      hudG.lineStyle(1.5, col('#ff5a3c'), 1);
      hudG.drawRoundedRect(BX, BY, BW, 16, 8);
      hudG.lineStyle(0);
    }
  }

  /* ---------- FX ---------- */
  function drawFX() {
    fxG.clear();
    // anéis
    for (const r of FX.rings) {
      const a = r.life / r.maxLife;
      fxG.lineStyle(r.width * a + 0.5, col(r.color), a);
      fxG.drawCircle(r.x, r.y, r.r);
      if (r.fill) {
        fxG.beginFill(col(r.color), a * r.fillAlpha);
        fxG.drawCircle(r.x, r.y, r.r);
      }
    }
    fxG.lineStyle(0);
    // feixes
    for (const b of FX.beams) {
      const a = Math.max(0, b.life / b.maxLife);
      fxG.lineStyle(b.width, col(b.color), a);
      fxG.moveTo(b.x1, b.y1); fxG.lineTo(b.x2, b.y2);
      fxG.stroke();
    }
    fxG.lineStyle(0);
    // partículas
    for (const p of FX.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      fxG.beginFill(col(p.color), a);
      if (p.shape === 'shard') {
        fxG.drawRect(p.x - p.size, p.y - p.size * 0.35, p.size * 2, p.size * 0.7);
      } else if (p.shape === 'spark') {
        fxG.drawRect(p.x - p.size * 1.6, p.y - p.size * 0.3, p.size * 3.2, p.size * 0.6);
      } else {
        fxG.drawCircle(p.x, p.y, p.size * a);
      }
    }
    fxG.endFill();
  }

  /* ---------- texto (números de dano / flutuantes) ---------- */
  function drawTexts() {
    // remove textos do frame anterior
    while (textLayer.children.length) textLayer.removeChildAt(0, true);
    for (const d of FX.damageNumbers) {
      const a = Math.min(1, (d.life / d.maxLife) * 1.6);
      const grow = d.crit ? (1.25 - 0.25 * a) : 1;
      const t = new PIXI.Text(formatNumber(d.amount), {
        fontFamily: 'Orbitron, sans-serif', fontSize: d.size * grow,
        fontWeight: '900', fill: d.color, stroke: '#000', strokeThickness: 4, align: 'center',
      });
      t.anchor.set(0.5, 0.5); t.alpha = a;
      t.position.set(d.x, d.y);
      textLayer.addChild(t);
      if (d.crit) {
        const c = new PIXI.Text('CRIT!', { fontFamily: 'Orbitron', fontSize: 12 * grow, fontWeight: '900', fill: '#ffd23f', stroke: '#000', strokeThickness: 3, align: 'center' });
        c.anchor.set(0.5, 0.5); c.alpha = a; c.position.set(d.x, d.y - d.size * grow - 4);
        textLayer.addChild(c);
      }
    }
    for (const ft of FX.floatingTexts) {
      const a = Math.min(1, (ft.life / ft.maxLife) * 1.5);
      const t = new PIXI.Text(ft.text, {
        fontFamily: 'Orbitron, sans-serif', fontSize: ft.size,
        fontWeight: ft.bold ? '900' : '700', fill: ft.color, stroke: '#000', strokeThickness: 4, align: 'center',
      });
      t.anchor.set(0.5, 0.5); t.alpha = a;
      t.position.set(ft.x, ft.y);
      textLayer.addChild(t);
    }
  }

  /* ---------- overlay (flash/vignette) ---------- */
  function drawOverlay() {
    overlayG.clear();
    if (FX.flash.alpha > 0.01) {
      overlayG.beginFill(col(FX.flash.color || '#ffffff'), FX.flash.alpha);
      overlayG.drawRect(0, 0, PLAY_W, PLAY_H);
    }
    if (FX.vignette > 0.01) {
      // vignette aproximado: faixa escura nas bordas
      const v = FX.vignette;
      overlayG.beginFill(0x000000, v * 0.6);
      overlayG.drawRect(0, 0, PLAY_W, 26);
      overlayG.drawRect(0, PLAY_H - 26, PLAY_W, 26);
      overlayG.drawRect(0, 0, 26, PLAY_H);
      overlayG.drawRect(PLAY_W - 26, 0, 26, PLAY_H);
    }
    overlayG.endFill();
  }

  /* ---------- render principal ---------- */
  function render() {
    if (!active) return;
    const z = ZONES[G.zone - 1] || ZONES[0];
    drawBG(z);
    drawMotes(z);

    // unidades ordenadas por profundidade (um único Graphics + sprites, redesenha a cada frame)
    // inimigos primeiro (atrás), runners por cima (nunca sobrepõem)
    const enemies = [...G.enemies].sort((a, b) => a.y - b.y);
    const runners = [...G.runners].sort((a, b) => a.y - b.y);
    const units = [...enemies, ...runners];
    unitG.clear();
    // esconde sprites do frame anterior
    for (let i = spriteLayer.children.length - 1; i >= 0; i--) spriteLayer.children[i].visible = false;
    for (const u of units) {
      if (u.kind === 'runner') {
        const spr = drawRunnerUnit(unitG, u);
        if (spr) {
          // posiciona o sprite ancorado pelos pés (anchor 0.5,1)
          const s = u.burstScale || 1;
          const bob = Math.sin(u.bob) * 2;
          // escala por profundidade: mais à frente (maior y) = maior sprite
          const depth = depthScale(u.y);
          const hgt = 96 * depth * s;            // altura alvo em unidades de jogo
          const tw = spr.texture.width || 1, th = spr.texture.height || 1;
          spr.height = hgt;
          spr.width = hgt * (tw / th);           // preserva a proporção do sprite
          spr.x = u.x;
          spr.y = u.y + bob;                     // base do sprite = ponto dos pés no slot
          spr.alpha = u.alive ? 1 : 0.35;
          spr.visible = true;
          if (!spriteLayer.children.includes(spr)) spriteLayer.addChild(spr);
        }
      } else {
        const spr = drawEnemyUnit(unitG, u);
        if (spr) {
          const bob = Math.sin(u.bob) * 2;
          const depth = depthScale(u.y);
          const hgt = u.size * 2.4 * depth;      // altura escala com tamanho × profundidade
          const tw = spr.texture.width || 1, th = spr.texture.height || 1;
          spr.height = hgt;
          spr.width = hgt * (tw / th);           // mesma âncora de pés dos aliados
          spr.x = u.x;
          spr.y = u.y + bob;
          spr.alpha = u.alive ? 1 : 0.35;
          spr.visible = true;
          if (!spriteLayer.children.includes(spr)) spriteLayer.addChild(spr);
        }
      }
    }

    drawHPBars();
    drawFX();
    drawTexts();
    drawOverlay();
    applyCam();

    app.renderer.render(app.stage);
  }

  return { init, resize, render, enable, get active() { return active; } };
})();
