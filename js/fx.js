/* ============================================================
   FX LAYER — partículas, números de dano, screen shake, flashes
   Tudo que dá o "soco" visual ao combate (pilar #1 do jogo).
   ============================================================ */

const FX = {
  particles: [],
  damageNumbers: [],
  floatingTexts: [],
  screenShake: { x: 0, y: 0, mag: 0, time: 0 },
  flash: { color: "255,255,255", alpha: 0 },
  vignette: 0,         // escurecimento da tela no burst
  slowmo: 0,           // tempo em slow-mo (segundos restantes)
  freezeFrame: 0,      // congela a simulação por X ms (burst sync)
};

/* ---------- Screen shake ---------- */
FX.shake = function (magnitude, time) {
  if (magnitude > FX.screenShake.mag) {
    FX.screenShake.mag = magnitude;
    FX.screenShake.time = time;
  }
};

/* ---------- Flashes ---------- */
FX.flashScreen = function (color, alpha) {
  FX.flash.color = color;
  FX.flash.alpha = Math.max(FX.flash.alpha, alpha);
};

/* ---------- Vignette (escurecimento no burst) ---------- */
FX.setVignette = function (v) { FX.vignette = Math.max(FX.vignette, v); };
FX.fadeVignette = function (rate) { FX.vignette = Math.max(0, FX.vignette - rate); };

/* ---------- Slow motion ---------- */
FX.slowmoFor = function (sec) { FX.slowmo = Math.max(FX.slowmo, sec); };

/* ---------- Freeze frame (stop sim for sync/boss death) ---------- */
FX.freezeFor = function (ms) { FX.freezeFrame = Math.max(FX.freezeFrame, ms); };

/* ---------- Partículas ---------- */
FX.burst = function (x, y, opts) {
  opts = opts || {};
  const n = opts.count || 14;
  const color = opts.color || "#ffffff";
  const speed = opts.speed || 180;
  const life = opts.life || 0.5;
  const size = opts.size || 3;
  const gravity = opts.gravity || 0;
  const spread = opts.spread !== undefined ? opts.spread : Math.PI * 2;
  const dir = opts.dir !== undefined ? opts.dir : 0;
  for (let i = 0; i < n; i++) {
    const a = dir + (Math.random() - 0.5) * spread;
    const s = speed * (0.4 + Math.random() * 0.8);
    FX.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: life * (0.7 + Math.random() * 0.6),
      maxLife: life,
      color,
      size: size * (0.6 + Math.random() * 0.9),
      gravity,
      shape: opts.shape || "circle",
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 10,
      glow: opts.glow !== false,
    });
  }
  // limite de segurança: evita acúmulo de partículas fora de controle (uso de memória/CPU)
  const MAX_PARTICLES = 600;
  if (FX.particles.length > MAX_PARTICLES) FX.particles.splice(0, FX.particles.length - MAX_PARTICLES);
};

/* anel expansivo (para bursts / ondas) */
FX.rings = [];
FX.ring = function (x, y, opts) {
  opts = opts || {};
  FX.rings.push({
    x, y,
    r: opts.r0 || 8,
    rMax: opts.rMax || 240,
    life: opts.life || 0.5,
    maxLife: opts.life || 0.5,
    color: opts.color || "#ffffff",
    width: opts.width || 6,
    fill: opts.fill || false,
    fillAlpha: opts.fillAlpha || 0.25,
  });
};

/* feixe/laser temporário */
FX.beams = [];
FX.beam = function (x1, y1, x2, y2, opts) {
  opts = opts || {};
  FX.beams.push({
    x1, y1, x2, y2,
    life: opts.life || 0.25,
    maxLife: opts.life || 0.25,
    color: opts.color || "#ffffff",
    width: opts.width || 6,
  });
};

/* ---------- Sprites de skill (VFX em imagem com física própria) ----------
   Padrão de asset: assets/skills/{key}.png com alpha (chroma removido),
   trimado, projéteis horizontais apontando para a DIREITA. */
FX.sprites = [];
const SKILL_SPRITE_V = "skv2-0810";   // cache-bust dos sprites de skill
const SKILL_IMGS = {};                // key -> HTMLImageElement (browser) | null
function skillSpriteUrl(key) { return "assets/skills/" + key + ".png?v=" + SKILL_SPRITE_V; }
function ensureSkillImg(key) {
  if (SKILL_IMGS[key] !== undefined) return SKILL_IMGS[key];
  SKILL_IMGS[key] = null;
  if (typeof Image === "undefined") return null;   // ambiente sem DOM
  const img = new Image();
  img.onload = () => { SKILL_IMGS[key] = img; };
  img.onerror = () => { SKILL_IMGS[key] = false; };
  img.src = skillSpriteUrl(key);
  return SKILL_IMGS[key];
}
/* envelope de alpha do sprite de skill: fade-in no começo, fade-out no fim */
function fxSpriteAlpha(s) {
  const t = s.life / s.maxLife;                       // 1 → 0
  const ain  = s.fadeIn  > 0 ? Math.min(1, (1 - t) / s.fadeIn)  : 1;
  const aout = s.fadeOut > 0 ? Math.min(1, t / s.fadeOut) : 1;
  return Math.max(0, Math.min(ain, aout));
}
/* Spawn de sprite de skill (projétil/corte/onda).
   opts: vx,vy velocidade · life · size (altura alvo em unidades de jogo;
   largura segue a proporção da imagem) · grow (%/s) · rot,spin (rad) ·
   fadeIn,fadeOut (fração da vida) · flipX */
FX.sprite = function (key, x, y, opts) {
  opts = opts || {};
  ensureSkillImg(key);
  FX.sprites.push({
    key, x, y,
    vx: opts.vx || 0, vy: opts.vy || 0,
    life: opts.life || 0.6, maxLife: opts.life || 0.6,
    size: opts.size || 64,
    grow: opts.grow !== undefined ? opts.grow : 0,
    rot: opts.rot || 0, spin: opts.spin || 0,
    fadeIn:  opts.fadeIn  !== undefined ? opts.fadeIn  : 0.12,
    fadeOut: opts.fadeOut !== undefined ? opts.fadeOut : 0.30,
    flipX: !!opts.flipX,
  });
  if (FX.sprites.length > 40) FX.sprites.splice(0, FX.sprites.length - 40);
};

/* texto flutuante genérico (não-dano) */
FX.floatText = function (x, y, text, opts) {
  opts = opts || {};
  FX.floatingTexts.push({
    x, y, text,
    color: opts.color || "#ffffff",
    size: opts.size || 18,
    life: opts.life || 1.0,
    maxLife: opts.life || 1.0,
    vy: opts.vy || -40,
    bold: opts.bold !== false,
    shadow: opts.shadow !== false,
  });
};

/* número de dano */
FX.damage = function (x, y, amount, opts) {
  opts = opts || {};
  const crit = !!opts.crit;
  const kind = opts.kind || "basic";           // basic | skill | burst | heal | miss | shield
  const eff  = opts.eff  || "";                // "super" | "weak"
  let size  = 18, color = opts.color || "#ffffff";
  if      (kind === "skill")  size = 21;
  else if (kind === "burst")  size = 26;
  else if (kind === "miss")   { size = 15; if (!opts.color) color = "#9aa3ad"; }
  else if (kind === "heal")   { size = 16; if (!opts.color) color = "#5cd66c"; }
  else if (kind === "shield") { size = 14; if (!opts.color) color = "#4cc9ff"; }
  if (eff === "weak" && !opts.color) color = "#7d8899";
  if (crit) size = 30;
  if (opts.size) size = opts.size;
  const life = crit ? 0.95 : (kind === "burst" ? 0.85 : 0.7);
  FX.damageNumbers.push({
    x: x + (Math.random() - 0.5) * 18,
    y: y + (Math.random() - 0.5) * 10,
    amount, text: opts.text || null,
    life, maxLife: life,
    color, size, crit, kind, eff,
    vy: -55 - Math.random() * 30,
    vx: (Math.random() - 0.5) * 40,
    element: opts.element,
  });
  if (crit) FX.shake(7, 0.18);
};
/* rótulo final do número de dano (usado no Canvas e no Pixi) */
function fxDamageLabel(d) {
  if (d.text) return d.text;
  let s = (d.kind === "heal" ? "+" : "") + formatNumber(d.amount);
  if (d.eff === "super") s += " ▲";
  else if (d.eff === "weak") s += " ▼";
  return s;
}
/* etiqueta de tipo exibida acima do número (Canvas e Pixi) */
function fxDamageTag(d) {
  if (d.crit)   return { text: "CRIT!",            color: "#ffd23f" };
  if (d.kind === "burst") return { text: "BURST",  color: d.color };
  return null;
}

/* ---------- Update ---------- */
FX.update = function (dt) {
  // freeze frame pausa a simulação visual (mas deixa a render rolar)
  if (FX.freezeFrame > 0) { FX.freezeFrame -= dt * 1000; dt = 0; }
  if (FX.slowmo > 0) { FX.slowmo -= dt; dt *= 0.35; }

  // shake
  if (FX.screenShake.time > 0) {
    FX.screenShake.time -= dt;
    const m = FX.screenShake.mag * (FX.screenShake.time > 0 ? 1 : 0);
    FX.screenShake.x = (Math.random() - 0.5) * m * 2;
    FX.screenShake.y = (Math.random() - 0.5) * m * 2;
    if (FX.screenShake.time <= 0) { FX.screenShake.mag = 0; FX.screenShake.x = 0; FX.screenShake.y = 0; }
  }

  // flash
  if (FX.flash.alpha > 0) FX.flash.alpha = Math.max(0, FX.flash.alpha - dt * 2.6);
  // vignette decai sozinho (senão a tela ficava permanentemente escura após o primeiro burst)
  if (FX.vignette > 0) FX.vignette = Math.max(0, FX.vignette - dt * 0.55);

  // particles
  for (let i = FX.particles.length - 1; i >= 0; i--) {
    const p = FX.particles[i];
    p.life -= dt;
    if (p.life <= 0) { FX.particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
    p.vx *= 0.96;
    p.rot += p.vrot * dt;
  }
  // rings
  for (let i = FX.rings.length - 1; i >= 0; i--) {
    const r = FX.rings[i];
    r.life -= dt;
    if (r.life <= 0) { FX.rings.splice(i, 1); continue; }
    const t = 1 - r.life / r.maxLife;
    r.r = 8 + (r.rMax - 8) * t;
  }
  // beams
  for (let i = FX.beams.length - 1; i >= 0; i--) {
    const b = FX.beams[i];
    b.life -= dt;
    if (b.life <= 0) FX.beams.splice(i, 1);
  }
  // sprites de skill (projéteis/cortes/ondas)
  for (let i = FX.sprites.length - 1; i >= 0; i--) {
    const s = FX.sprites[i];
    s.life -= dt;
    if (s.life <= 0) { FX.sprites.splice(i, 1); continue; }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.rot += s.spin * dt;
    s.size *= (1 + s.grow * dt);
  }
  // damage numbers
  for (let i = FX.damageNumbers.length - 1; i >= 0; i--) {
    const d = FX.damageNumbers[i];
    d.life -= dt;
    if (d.life <= 0) { FX.damageNumbers.splice(i, 1); continue; }
    d.y += d.vy * dt;
    d.x += d.vx * dt;
    d.vy *= 0.92;
  }
  // floating text
  for (let i = FX.floatingTexts.length - 1; i >= 0; i--) {
    const t = FX.floatingTexts[i];
    t.life -= dt;
    if (t.life <= 0) { FX.floatingTexts.splice(i, 1); continue; }
    t.y += t.vy * dt;
    t.vy *= 0.94;
  }
};

/* ---------- Render (camada que fica por cima das unidades) ---------- */
FX.render = function (ctx) {
  // rings (atrás)
  for (const r of FX.rings) {
    const a = r.life / r.maxLife;
    ctx.save();
    ctx.globalAlpha = a;
    if (r.fill) {
      const g = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.r);
      g.addColorStop(0, r.color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = a * r.fillAlpha;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = a;
    }
    ctx.strokeStyle = r.color;
    ctx.lineWidth = r.width * a + 0.5;
    ctx.shadowColor = r.color; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // beams
  for (const b of FX.beams) {
    const a = Math.max(0, b.life / b.maxLife);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#ffffff";
    ctx.shadowColor = b.color; ctx.shadowBlur = 24;
    ctx.lineWidth = b.width;
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.strokeStyle = b.color; ctx.lineWidth = b.width * 0.5;
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.restore();
  }

  // particles
  for (const p of FX.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = a;
    if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = 12; }
    ctx.fillStyle = p.color;
    if (p.shape === "shard") {
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillRect(-p.size, -p.size * 0.35, p.size * 2, p.size * 0.7);
    } else if (p.shape === "spark") {
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillRect(-p.size * 1.6, -p.size * 0.3, p.size * 3.2, p.size * 0.6);
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // sprites de skill (projéteis/cortes/ondas) — acima das partículas
  for (const s of FX.sprites) {
    const img = ensureSkillImg(s.key);
    if (!img) continue;                              // ainda carregando / ausente
    const a = fxSpriteAlpha(s);
    if (a <= 0.01) continue;
    const h = s.size;
    const w = h * (img.width / img.height || 2);     // largura pela proporção real
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(s.x, s.y);
    if (s.rot) ctx.rotate(s.rot);
    if (s.flipX) ctx.scale(-1, 1);
    ctx.shadowColor = "#bfe9ff"; ctx.shadowBlur = 18; // brilho de energia
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // damage numbers
  for (const d of FX.damageNumbers) {
    const a = Math.min(1, d.life / d.maxLife * 1.6);
    const grow = d.crit ? (1.25 - 0.25 * a) : (d.kind === "burst" ? (1.18 - 0.18 * a) : 1);
    const tag = fxDamageTag(d);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `900 ${d.size * grow}px Orbitron, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText(fxDamageLabel(d), d.x, d.y);
    ctx.fillStyle = d.crit ? "#ffd23f" : d.color;
    if (d.crit || d.kind === "burst" || d.kind === "skill" || d.kind === "heal") { ctx.shadowColor = d.color; ctx.shadowBlur = d.crit ? 14 : 9; }
    ctx.fillText(fxDamageLabel(d), d.x, d.y);
    if (tag) {
      ctx.shadowBlur = 8;
      ctx.font = `900 ${12 * grow}px Orbitron, sans-serif`;
      ctx.fillStyle = tag.color;
      ctx.fillText(tag.text, d.x, d.y - d.size * grow - 4);
    }
    ctx.restore();
  }

  // floating text
  for (const t of FX.floatingTexts) {
    const a = Math.min(1, t.life / t.maxLife * 1.5);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `${t.bold ? "900" : "700"} ${t.size}px Orbitron, sans-serif`;
    ctx.textAlign = "center";
    if (t.shadow) { ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.strokeText(t.text, t.x, t.y); }
    ctx.fillStyle = t.color;
    if (t.shadow) { ctx.shadowColor = t.color; ctx.shadowBlur = 10; }
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  }
};

/* overlay de flash + vignette no topo de tudo */
FX.renderOverlay = function (ctx, W, H) {
  if (FX.flash.alpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = FX.flash.alpha;
    ctx.fillStyle = `rgba(${FX.flash.color},1)`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (FX.vignette > 0.01) {
    ctx.save();
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.8);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${FX.vignette})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
};

/* Helpers de número (expostos globalmente) */
function formatNumber(n) {
  n = Math.floor(n);
  if (n < 1000) return "" + n;
  if (n < 1e6)  return (n / 1e3).toFixed(n < 1e4 ? 1 : 0).replace(/\.0$/, "") + "K";
  if (n < 1e9)  return (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (n < 1e12) return (n / 1e9).toFixed(2).replace(/\.?0+$/, "") + "B";
  return (n / 1e12).toFixed(2).replace(/\.?0+$/, "") + "T";
}
