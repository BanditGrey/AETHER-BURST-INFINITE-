/* ============================================================
   AETHER BURST: INFINITE — MAIN
   Canvas rendering, DOM UI, input e game loop.
   ============================================================ */

/* ---------- Canvas setup ---------- */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let DPR = Math.min(2, window.devicePixelRatio || 1);
let viewScale = 1, viewOffX = 0, viewOffY = 0;

function resize() {
  const stage = document.getElementById('stage');
  const w = stage.clientWidth, h = stage.clientHeight;
  canvas.width = w * DPR; canvas.height = h * DPR;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  const s = Math.min(w / PLAY_W, h / PLAY_H);
  viewScale = s; viewOffX = (w - PLAY_W * s) / 2; viewOffY = (h - PLAY_H * s) / 2;
}
window.addEventListener('resize', resize);

/* ---------- SFX mínimo (WebAudio) ---------- */
const SFX = { ctx:null, on:true, master:0.18 };
function audioInit(){ try{ SFX.ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
function blip(freq, dur, type, vol){
  if(!SFX.on || !SFX.ctx) return;
  try{
    const o = SFX.ctx.createOscillator(), g = SFX.ctx.createGain();
    o.type = type||'square'; o.frequency.value = freq;
    g.gain.value = (vol||0.3)*SFX.master;
    o.connect(g); g.connect(SFX.ctx.destination);
    const t = SFX.ctx.currentTime;
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur||0.12));
    o.start(t); o.stop(t + (dur||0.12));
  }catch(e){}
}
function sfxHit(){ blip(180+Math.random()*60,0.06,'square',0.12); }
function sfxCrit(){ blip(520,0.12,'sawtooth',0.18); }
function sfxBurst(){ blip(110,0.5,'sawtooth',0.3); setTimeout(()=>blip(330,0.4,'square',0.2),60); }
function sfxBoss(){ blip(70,0.8,'sawtooth',0.35); }
function sfxLevel(){ blip(660,0.1,'sine',0.2); setTimeout(()=>blip(990,0.12,'sine',0.2),90); }

/* ---------- Estado de scroll de fundo ---------- */
const BG = { scroll: 0, motes: [] };
for (let i=0;i<60;i++) BG.motes.push({x:Math.random()*PLAY_W,y:Math.random()*PLAY_H,s:Math.random()*2+0.5,v:Math.random()*30+10,c:Math.random()});

/* ============================================================
   RENDER
   ============================================================ */
function render() {
  // fundo preto letterbox
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle = '#02030a';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // transforma para coordenadas lógicas + shake
  const sh = FX.screenShake;
  ctx.setTransform(viewScale*DPR,0,0,viewScale*DPR,(viewOffX+sh.x)*DPR,(viewOffY+sh.y)*DPR);
  ctx.imageSmoothingEnabled = true;

  drawBackground();

  // unidades ordenadas por y (profundidade)
  const units = [...G.runners, ...G.enemies];
  units.sort((a,b)=> (a.y) - (b.y));
  for (const u of units) {
    if (u.kind === 'runner') drawRunner(u);
    else drawEnemy(u);
  }

  // FX (partículas, números, etc.)
  FX.render(ctx);

  // barra de progresso da zona + boss HP
  drawHUD();
  // banner
  drawBanner();
  // overlay (flash/vignette) — sem shake
  ctx.setTransform(viewScale*DPR,0,0,viewScale*DPR,viewOffX*DPR,viewOffY*DPR);
  FX.renderOverlay(ctx, PLAY_W, PLAY_H);
}

/* ---------- Fundo ---------- */
function drawBackground() {
  const z = ZONES[G.zone-1] || ZONES[0];
  // céu
  const g = ctx.createLinearGradient(0,0,0,PLAY_H);
  g.addColorStop(0,z.sky[0]); g.addColorStop(0.5,z.sky[1]); g.addColorStop(1,z.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0,0,PLAY_W,PLAY_H);

  // glow do rift (direita, de onde vêm inimigos)
  const rg = ctx.createRadialGradient(PLAY_W+80,GROUND_Y-80,40,PLAY_W+80,GROUND_Y-80,520);
  rg.addColorStop(0, hexA(z.accent,0.35)); rg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle = rg; ctx.fillRect(0,0,PLAY_W,PLAY_H);

  // partículas de aether flutuando
  for (const m of BG.motes) {
    m.x -= m.v * 0.016 * G.speed;
    if (m.x < -10) { m.x = PLAY_W+10; m.y = Math.random()*PLAY_H; }
    ctx.globalAlpha = 0.5; ctx.fillStyle = z.accent;
    ctx.beginPath(); ctx.arc(m.x, m.y, m.s, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // silhuetas distantes (parallax lento)
  BG.scroll += 0.4 * G.speed;
  ctx.fillStyle = hexA(z.sky[2], 0.7);
  for (let i=-1;i<8;i++){
    const x = ((i*220 - (BG.scroll*0.3)%220) + PLAY_W) % (PLAY_W+220) - 110;
    drawCrystal(x, GROUND_Y-150, 90, z.accent, 0.12);
  }
  // silhuetas médias
  ctx.fillStyle = hexA('#000000', 0.35);
  for (let i=-1;i<5;i++){
    const x = ((i*340 - (BG.scroll*0.6)%340) + PLAY_W) % (PLAY_W+340) - 170;
    drawCrystal(x, GROUND_Y-90, 60, z.accent, 0.18);
  }

  // chão
  const fg = ctx.createLinearGradient(0,GROUND_Y,0,PLAY_H);
  fg.addColorStop(0, z.ground); fg.addColorStop(1, '#02030a');
  ctx.fillStyle = fg; ctx.fillRect(0,GROUND_Y,PLAY_W,PLAY_H-GROUND_Y);
  // linha de aether no chão
  ctx.strokeStyle = hexA(z.accent,0.5); ctx.lineWidth = 2;
  ctx.shadowColor = z.accent; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.moveTo(0,GROUND_Y+2); ctx.lineTo(PLAY_W,GROUND_Y+2); ctx.stroke();
  ctx.shadowBlur = 0;
}
function drawCrystal(x, y, h, color, alpha){
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x-h*0.4,y+h); ctx.lineTo(x+h*0.4,y+h); ctx.closePath();
  ctx.fill(); ctx.restore();
}

/* ---------- Runner (chibi) ---------- */
function drawRunner(r) {
  ctx.save();
  ctx.translate(r.x, r.y);
  const dying = !r.alive;
  if (dying) ctx.globalAlpha = 0.25;
  const s = r.burstScale || 1;
  const bob = Math.sin(r.bob) * 2;
  const el = ELEMENTS[r.element];

  // sombra
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(0, 2, 22*s, 7, 0, 0, Math.PI*2); ctx.fill();

  // aura
  const auraR = (28 + (r.castGlow>0?14:0) + (r.burstReady?10:0)) * s;
  const ag = ctx.createRadialGradient(0,-22*s,2,0,-22*s,auraR);
  ag.addColorStop(0, hexA(el.color, r.burstReady?0.5:0.28));
  ag.addColorStop(1, hexA(el.color,0));
  ctx.fillStyle = ag;
  ctx.beginPath(); ctx.arc(0,-22*s,auraR,0,Math.PI*2); ctx.fill();

  // burst ready ring
  if (r.burstReady) {
    ctx.strokeStyle = hexA('#ffd23f', 0.7+0.3*Math.sin(performance.now()/120));
    ctx.lineWidth = 2.5; ctx.shadowColor='#ffd23f'; ctx.shadowBlur=14;
    ctx.beginPath(); ctx.arc(0,-22*s, 26*s, 0, Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0;
  }

  ctx.translate(0, bob);
  // lean on swing
  const lean = r.swing * 0.3;
  ctx.rotate(lean);

  // corpo
  const bw = 18*s, bh = 26*s;
  const bg = ctx.createLinearGradient(0,-bh,0,0);
  bg.addColorStop(0, lighten(r.color,0.2)); bg.addColorStop(1, darken(r.color,0.15));
  ctx.fillStyle = bg;
  roundRect(-bw/2, -bh-2, bw, bh, 7); ctx.fill();
  // contorno
  ctx.strokeStyle = darken(r.color,0.4); ctx.lineWidth=1.5; ctx.stroke();

  // pernas
  ctx.fillStyle = darken(r.color,0.35);
  roundRect(-7*s, -2, 5*s, 8*s, 2); ctx.fill();
  roundRect(2*s, -2, 5*s, 8*s, 2); ctx.fill();

  // cabeça
  const hg = ctx.createRadialGradient(-3*s,-bh-10*s,2,0,-bh-8*s,12*s);
  hg.addColorStop(0, lighten(r.accent,0.25)); hg.addColorStop(1, r.accent);
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(0,-bh-9*s,10*s,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = darken(r.accent,0.3); ctx.lineWidth=1.2; ctx.stroke();

  // olhos (anime glow)
  ctx.fillStyle = el.glow; ctx.shadowColor = el.color; ctx.shadowBlur=6;
  ctx.beginPath(); ctx.arc(-3.2*s,-bh-9*s,1.7*s,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(3.2*s,-bh-9*s,1.7*s,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;

  // arma por classe
  drawWeapon(r, s, bh, el);

  // hit flash
  if (r.hitFlash > 0) {
    ctx.globalAlpha = (r.hitFlash/0.18)*0.7;
    ctx.fillStyle = '#fff';
    roundRect(-bw/2,-bh-2,bw,bh,7); ctx.fill();
    ctx.globalAlpha = dying?0.25:1;
  }

  ctx.rotate(-lean); ctx.translate(0,-bob);

  // escudo
  if (r.shieldHp > 0) {
    ctx.strokeStyle = hexA('#4cc9ff',0.8); ctx.lineWidth=2; ctx.shadowColor='#4cc9ff'; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.arc(0,-22*s, 24*s, 0, Math.PI*2); ctx.stroke(); ctx.shadowBlur=0;
  }

  ctx.restore();

  // nome + barra de HP (acima)
  if (!dying) drawUnitLabel(r, true);
}

function drawWeapon(r, s, bh, el) {
  ctx.save();
  ctx.fillStyle = el.glow; ctx.strokeStyle = el.color; ctx.lineWidth = 1.5;
  ctx.shadowColor = el.color; ctx.shadowBlur = 6;
  switch (r.cls) {
    case 'Breaker': // espada grande
      ctx.fillStyle = '#dfe7ff';
      ctx.beginPath();
      ctx.moveTo(14*s,-bh+4*s); ctx.lineTo(34*s,-bh-22*s); ctx.lineTo(30*s,-bh-26*s); ctx.lineTo(10*s,-bh);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 'Vanguard': // escudo
      ctx.fillStyle = '#9aa6c8';
      roundRect(8*s,-bh+2*s,12*s,18*s,3); ctx.fill(); ctx.stroke();
      break;
    case 'Striker': // lâminas duplas
      ctx.strokeStyle = el.glow;
      ctx.beginPath(); ctx.moveTo(10*s,-bh); ctx.lineTo(26*s,-bh-18*s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-10*s,-bh); ctx.lineTo(-26*s,-bh-18*s); ctx.stroke();
      break;
    case 'Blaster': // cano
      ctx.fillStyle = '#5a6585'; roundRect(12*s,-bh+8*s,18*s,5*s,2); ctx.fill();
      break;
    case 'BurstMage': // orbe flutuante
      const oy = -bh-26*s + Math.sin(r.bob*1.5)*3;
      const og = ctx.createRadialGradient(0,oy,1,0,oy,7*s);
      og.addColorStop(0,'#fff'); og.addColorStop(1,el.color);
      ctx.fillStyle = og; ctx.beginPath(); ctx.arc(0,oy,6*s,0,Math.PI*2); ctx.fill();
      break;
    case 'Resonator': // sparks orbitando
      for (let i=0;i<3;i++){
        const a = r.bob*2 + i*2.1;
        ctx.beginPath(); ctx.arc(Math.cos(a)*16*s, -bh-4*s+Math.sin(a)*10*s, 2*s,0,Math.PI*2); ctx.fill();
      }
      break;
  }
  ctx.restore();
}

/* ---------- Enemy ---------- */
function drawEnemy(e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const dyingScale = e.alive ? 1 : Math.max(0, e.dyingTimer/0.5);
  ctx.globalAlpha = e.alive ? 1 : dyingScale;
  ctx.scale(e.alive?1:dyingScale, e.alive?1:dyingScale);
  const sz = e.size;
  const bob = Math.sin(e.bob)*2;

  // sombra
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(0,4,sz*0.9,sz*0.28,0,0,Math.PI*2); ctx.fill();

  // congelado overlay antes
  ctx.translate(0, bob);

  // corpo
  const bg = ctx.createRadialGradient(-sz*0.2,-sz*0.3,2,0,0,sz);
  bg.addColorStop(0, lighten(e.color,0.25)); bg.addColorStop(1, darken(e.color,0.3));
  ctx.fillStyle = bg;
  ctx.strokeStyle = darken(e.color,0.5); ctx.lineWidth = e.isBoss?3:1.6;

  if (e.typeKey === 'brute') {
    roundRect(-sz*0.8,-sz*1.1,sz*1.6,sz*1.3,6); ctx.fill(); ctx.stroke();
    // ombros
    ctx.fillStyle = darken(e.color,0.2);
    roundRect(-sz,-sz*1.1,sz*0.5,sz*0.5,4); ctx.fill();
    roundRect(sz*0.5,-sz*1.1,sz*0.5,sz*0.5,4); ctx.fill();
  } else if (e.typeKey === 'phantom') {
    // corpo fantasma (ondulado)
    ctx.beginPath();
    ctx.moveTo(-sz*0.7,0);
    ctx.quadraticCurveTo(-sz*0.9,-sz*1.2, 0,-sz*1.3);
    ctx.quadraticCurveTo(sz*0.9,-sz*1.2, sz*0.7,0);
    ctx.quadraticCurveTo(sz*0.3,sz*0.3, 0,0);
    ctx.quadraticCurveTo(-sz*0.3,sz*0.3,-sz*0.7,0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (e.isBoss) {
    // boss: grande com "chifres"
    ctx.beginPath();
    ctx.moveTo(-sz, sz*0.2);
    ctx.lineTo(-sz*1.1,-sz*0.8);
    ctx.lineTo(-sz*0.5,-sz*1.1);
    ctx.lineTo(0,-sz*1.4);
    ctx.lineTo(sz*0.5,-sz*1.1);
    ctx.lineTo(sz*1.1,-sz*0.8);
    ctx.lineTo(sz, sz*0.2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // núcleo de aether
    ctx.fillStyle = hexA('#fff',0.85); ctx.shadowColor=e.color; ctx.shadowBlur=20;
    ctx.beginPath(); ctx.arc(0,-sz*0.5,sz*0.28,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  } else {
    // hollow / surge / elite: blob
    ctx.beginPath(); ctx.arc(0,-sz*0.6,sz*0.85,0,Math.PI*2); ctx.fill(); ctx.stroke();
  }

  // olhos
  const eye = e.isBoss ? '#3afff0' : (e.typeKey==='phantom'?'#ff5a3c':'#ff3b46');
  ctx.fillStyle = eye; ctx.shadowColor=eye; ctx.shadowBlur = e.isBoss?16:8;
  ctx.beginPath(); ctx.arc(-sz*0.28,-sz*0.7,sz*0.14,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(sz*0.28,-sz*0.7,sz*0.14,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;

  // hit flash
  if (e.hitFlash > 0) {
    ctx.globalAlpha = (e.hitFlash/0.18)*0.8;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0,-sz*0.6,sz,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha = e.alive?1:dyingScale;
  }

  // frozen
  if (e.frozen > 0) {
    ctx.fillStyle = hexA('#9be3ff',0.45);
    ctx.beginPath(); ctx.arc(0,-sz*0.6,sz,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#cdf3ff'; ctx.lineWidth=2;
    for(let i=0;i<3;i++){ ctx.beginPath(); ctx.moveTo(-sz+i*sz,-sz*1.4); ctx.lineTo(-sz*0.6+i*sz,sz*0.2); ctx.stroke(); }
  }
  ctx.restore();

  // gravity mark ring
  if (e.gravityMark > 0) {
    ctx.save(); ctx.translate(e.x,e.y);
    ctx.strokeStyle = hexA('#c9a8ff',0.8); ctx.lineWidth=2;
    ctx.setLineDash([4,4]); ctx.lineDashOffset = -performance.now()/60;
    ctx.beginPath(); ctx.arc(0,-e.size*0.6,e.size*1.1,0,Math.PI*2); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
  }
  // stunned stars
  if (e.stunned > 0) {
    for(let i=0;i<3;i++){ const a=performance.now()/200+i*2; FX; ctx.save(); ctx.translate(e.x,e.y-e.size*1.4);
      ctx.fillStyle='#ffd23f'; ctx.font='14px sans-serif'; ctx.fillText('✦',Math.cos(a)*12,Math.sin(a)*4); ctx.restore(); }
  }

  // mini HP bar (não-boss)
  if (e.alive && !e.isBoss) drawUnitLabel(e, false);
}

function drawUnitLabel(u, isRunner) {
  if (!u.alive) return;
  const top = u.y - (u.size||30) - (isRunner? 56 : 30);
  // nome pequeno (runner)
  if (isRunner) {
    ctx.font = '700 10px Orbitron, sans-serif'; ctx.textAlign='center';
    ctx.fillStyle = u.data.color; ctx.shadowColor='#000'; ctx.shadowBlur=3;
    ctx.fillText(u.data.name, u.x, top - 12);
  }
  // hp bar
  const w = isRunner ? 36 : (u.isBoss? 0 : Math.max(24, (u.size||24)*1.1));
  if (!w) return;
  const ratio = Math.max(0, u.hp/u.maxHp);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRectPath(u.x - w/2, top, w, 4, 2); ctx.fill();
  ctx.fillStyle = isRunner ? (ratio>0.4?'#5cd66c':'#ff5a3c') : '#ff6b3c';
  if (isRunner && u.shieldHp>0) ctx.fillStyle = '#4cc9ff';
  roundRectPath(u.x - w/2, top, w*ratio, 4, 2); ctx.fill();
  ctx.restore();
  ctx.shadowBlur=0;
}

/* ---------- HUD no canvas ---------- */
function drawHUD() {
  // barra de progresso da zona (topo)
  const z = ZONES[G.zone-1];
  const pct = Math.min(1, G.level/100);
  const bx = 20, by = 16, bw = 280, bh = 14;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(bx,by,bw,bh,7); ctx.fill();
  ctx.strokeStyle = hexA(z.accent,0.6); ctx.lineWidth=1; ctx.stroke();
  const fg = ctx.createLinearGradient(bx,0,bx+bw,0);
  fg.addColorStop(0,z.accent); fg.addColorStop(1, lighten(z.accent,0.3));
  ctx.fillStyle = fg; roundRect(bx,by,bw*pct,bh,7); ctx.fill();
  ctx.font='700 11px Orbitron'; ctx.textAlign='left'; ctx.fillStyle='#fff';
  ctx.shadowColor='#000'; ctx.shadowBlur=3;
  ctx.fillText('NÍVEL ' + G.level + '/100', bx+8, by+11);
  ctx.textAlign='right';
  ctx.fillText(Math.floor(pct*100)+'%', bx+bw-8, by+11);
  ctx.shadowBlur=0;

  // boss HP bar (se houver)
  const boss = G.enemies.find(e=>e.alive && e.isBoss);
  if (boss) {
    const r = Math.max(0, boss.hp/boss.maxHp);
    const BW = PLAY_W-160, BX = 80, BY = 48;
    ctx.fillStyle='rgba(0,0,0,0.6)'; roundRect(BX,BY,BW,16,8); ctx.fill();
    const bbg = ctx.createLinearGradient(BX,0,BX+BW,0);
    bbg.addColorStop(0,'#ff3b46'); bbg.addColorStop(1,'#ff8a3c');
    ctx.fillStyle=bbg; roundRect(BX,BY,BW*r,16,8); ctx.fill();
    ctx.strokeStyle='#ff5a3c'; ctx.lineWidth=1.5; roundRect(BX,BY,BW,16,8); ctx.stroke();
    ctx.font='900 12px Orbitron'; ctx.textAlign='center'; ctx.fillStyle='#fff';
    ctx.shadowColor='#000'; ctx.shadowBlur=4;
    ctx.fillText((boss.isRiftLord?'☠ ':'👹 ')+boss.name+'  '+Math.ceil(r*100)+'%', PLAY_W/2, BY+12);
    ctx.shadowBlur=0;
  }
}

/* ---------- Banner ---------- */
function drawBanner() {
  if (!G.banner) { document.getElementById('banner').classList.remove('show'); return; }
  const el = document.getElementById('banner');
  el.innerHTML = `<div class="b-text" style="color:${G.banner.color}">${G.banner.text}</div>` +
                 (G.banner.sub?`<div class="b-sub">${G.banner.sub}</div>`:'');
  if (!el.classList.contains('show')) el.classList.add('show');
}

/* ---------- helpers de cor ---------- */
function hexA(hex, a){ const c=hexToRgb(hex); return `rgba(${c.r},${c.g},${c.b},${a})`; }
function hexToRgb(h){ h=h.replace('#',''); if(h.length===3) h=h.split('').map(x=>x+x).join('');
  const n=parseInt(h,16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; }
function lighten(hex,amt){ const c=hexToRgb(hex); return `rgb(${Math.min(255,c.r+255*amt)},${Math.min(255,c.g+255*amt)},${Math.min(255,c.b+255*amt)})`; }
function darken(hex,amt){ const c=hexToRgb(hex); return `rgb(${Math.max(0,c.r-255*amt)},${Math.max(0,c.g-255*amt)},${Math.max(0,c.b-255*amt)})`; }
function roundRect(x,y,w,h,r){ roundRectPath(x,y,w,h,r); ctx.fill(); }
function roundRectPath(x,y,w,h,r){ ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

/* ============================================================
   GAME LOOP
   ============================================================ */
let lastT = performance.now();
let acc = 0;
function loop(t) {
  let dt = (t - lastT)/1000; lastT = t;
  if (dt > 0.1) dt = 0.1;
  if (SFX.ctx && SFX.ctx.state==='suspended') { /* esperará gesto */ }
  update(dt);
  render();
  updateUI();
  requestAnimationFrame(loop);
}

/* ============================================================
   DOM UI
   ============================================================ */
const $ = id => document.getElementById(id);
let bbRefs = [];

function buildBurstBars() {
  const wrap = $('burstbars');
  wrap.innerHTML = '';
  bbRefs = [];
  for (const r of G.runners) {
    const el = document.createElement('div');
    el.className = 'bbar';
    el.innerHTML = `
      <div class="bbar-head">
        <span class="bbar-dot" style="background:${r.color};color:${r.color}"></span>
        <span class="bbar-name">${r.data.name}</span>
        <span class="bbar-elem">${ELEMENTS[r.element].icon}</span>
      </div>
      <div class="bbar-track"><div class="bbar-fill"></div></div>
      <div class="bbar-ready-tag hidden">READY ⚡</div>`;
    el.addEventListener('click', ()=>{ if(r.burstReady && r.alive){ fireBurst(r); sfxBurst(); } });
    wrap.appendChild(el);
    bbRefs.push({ el, fill: el.querySelector('.bbar-fill'), tag: el.querySelector('.bbar-ready-tag'), r });
  }
}

function updateUI() {
  // recursos
  $('rShards').textContent = formatNumber(G.shards);
  $('rTickets').textContent = G.riftTickets;
  $('rFragments').textContent = G.infinityFragments;
  // zona
  const z = ZONES[G.zone-1];
  $('zoneName').textContent = z.name;
  $('zoneSub').textContent = 'Zona ' + G.zone + ' · Nível ' + G.level;
  $('zoneEnergy').textContent = ELEMENTS[z.energy?.split(' ')[0].toLowerCase()]?.icon || '💠';

  // burst bars
  for (const b of bbRefs) {
    const r = b.r;
    const pct = r.alive ? r.burstEnergy : 0;
    b.fill.style.width = Math.min(100, pct) + '%';
    const el = ELEMENTS[r.element];
    b.fill.style.background = `linear-gradient(90deg, ${el.color}, ${el.glow})`;
    b.tag.classList.toggle('hidden', !(r.burstReady && r.alive));
    b.el.classList.toggle('ready', r.burstReady && r.alive);
    b.el.classList.toggle('down', !r.alive);
  }
  // resonance strip (a cada ~0.5s)
  G._resAcc = (G._resAcc||0) + 0.016;
  if (G._resAcc > 0.4) { G._resAcc = 0; buildResonanceStrip(); }
}

function buildResonanceStrip() {
  let wrap = $('resstrip');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'resstrip'; wrap.className = 'resonance-strip';
    document.getElementById('burstbars').after(wrap);
  }
  const ids = G.runners.map(r=>r.id);
  const active = SYNC_PAIRS.filter(p => ids.includes(p.a) && ids.includes(p.b));
  if (!active.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = active.map(p => {
    const lvl = resonanceLevel(p.a, p.b);
    const info = resonanceXpForNext(p.a, p.b);
    const rl = RESONANCE_LEVELS[lvl-1];
    const pct = info.max ? 100 : (info.cur/info.need*100);
    return `<div class="res-chip ${rl.sync?'sync':''}">
      <span class="pair">${RUNNER_BY_ID[p.a].name}+${RUNNER_BY_ID[p.b].name}</span>
      <span class="sync-name">${rl.sync?'💥 '+p.name:''}</span>
      <span class="res-mini"><span class="res-mini-fill" style="width:${pct}%"></span></span>
      <span class="rlvl">${rl.name}</span></div>`;
  }).join('');
}

/* ---------- Painéis ---------- */
function openPanel(view) {
  G.view = view;
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view===view));
  if (view === 'march') { $('panel-overlay').classList.add('hidden'); return; }
  $('panel-overlay').classList.remove('hidden');
  const c = $('panelContent');
  if (view === 'squad') c.innerHTML = panelSquad();
  else if (view === 'codex') c.innerHTML = panelCodex();
  else if (view === 'infinity') { c.innerHTML = panelInfinity(); setTimeout(bindCircuit,0); }
  else if (view === 'gear') c.innerHTML = panelGear();
  else if (view === 'dungeons') c.innerHTML = panelDungeons();
  else if (view === 'reboot') c.innerHTML = panelReboot();
  bindPanel();
}

function panelSquad() {
  const slots = ['V1','V2','V3','R1','R2'];
  let h = `<h2>MONTAR ESQUADRÃO</h2><div class="panel-sub">5 Runners · Vanguard (frente) e Rear Guard (trás). Clique num slot para posicionar.</div>`;
  h += `<div class="squad-grid">`;
  for (const id of RUNNERS.map(r=>r.id)) {
    const r = RUNNER_BY_ID[id];
    const owned = G.ownedRunners.includes(id);
    const li = G.runnerLevels[id];
    const lvl = li? li.level : 1;
    const inSquadIdx = G.squadIds.indexOf(id);
    const inSquad = inSquadIdx >= 0 && inSquadIdx < 5;
    // stats aproximados
    const u = makeRunner(id, 0); u.level = lvl; computeStats(u);
    const rar = RARITIES[r.rarity];
    h += `<div class="runner-card ${inSquad?'in-squad':''}" data-id="${id}">
      <div class="avatar" style="background:linear-gradient(180deg,${lighten(r.color,.2)},${r.color})">
        ${r.name.slice(0,2)}<div class="stars">${'★'.repeat(rar.stars)}</div>
      </div>
      <div class="rc-info">
        <div class="rc-name">${ELEMENTS[r.element].icon} ${r.name}</div>
        <div class="rc-title">${r.title} · ${r.cls} · <span style="color:${rar.color}">${rar.name}</span></div>
        <div class="rc-stats">
          <span class="rc-stat">HP ${formatNumber(u.maxHp)}</span>
          <span class="rc-stat">ATQ ${formatNumber(u.atq)}</span>
          <span class="rc-stat">DEF ${formatNumber(u.def)}</span>
          <span class="rc-stat">SPD ${Math.round(u.spd)}</span>
          <span class="rc-stat">LV ${lvl}</span>
        </div>
        <div class="formation-row"><span class="formation-tag">${r.posPref}</span></div>
      </div>
      <div class="rc-actions">
        ${inSquad ? `<button class="btn-slot set" data-slot="remove">✓ ${slots[inSquadIdx]}</button>`
                   : `<button class="btn-slot" data-slot="add">+ ESCALAR</button>`}
        <button class="btn-up" data-up="${id}">SUBIR LV<br>${formatNumber(levelUpCost(lvl))}💎</button>
      </div>
    </div>`;
  }
  h += `</div>`;
  // formação visual
  h += `<div style="padding:0 24px 24px"><div style="font-family:Orbitron;font-weight:700;font-size:13px;color:var(--muted);margin-bottom:8px">FORMAÇÃO ATUAL</div>`;
  h += `<div style="display:flex;gap:20px;background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:16px;justify-content:center">`;
  h += `<div style="text-align:center"><div style="font-size:11px;color:var(--muted);margin-bottom:6px">VANGUARD</div><div style="display:flex;gap:8px">`;
  for (let i=0;i<3;i++){ const id=G.squadIds[i]; h+=formationSlot(id,slots[i]); }
  h += `</div></div><div style="text-align:center"><div style="font-size:11px;color:var(--muted);margin-bottom:6px">REAR GUARD</div><div style="display:flex;gap:8px">`;
  for (let i=3;i<5;i++){ const id=G.squadIds[i]; h+=formationSlot(id,slots[i]); }
  h += `</div></div></div></div>`;
  return h;
}
function formationSlot(id, label){
  if(!id) return `<div style="width:64px;height:64px;border:2px dashed var(--line);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:11px">${label}</div>`;
  const r=RUNNER_BY_ID[id];
  return `<div title="${r.name}" style="width:64px;height:64px;border-radius:10px;background:linear-gradient(180deg,${lighten(r.color,.2)},${r.color});display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Orbitron;font-weight:900;font-size:11px;color:#04211f;box-shadow:0 0 12px ${r.color}66">${r.name.slice(0,3)}<span style="font-size:9px">${label}</span></div>`;
}
function levelUpCost(lvl){ return Math.round(40 * Math.pow(1.22, lvl-1)); }

function bindPanel() {
  // squad
  document.querySelectorAll('.runner-card').forEach(card=>{
    const id = card.dataset.id;
    card.querySelector('[data-slot]')?.addEventListener('click', e=>{
      const act = e.currentTarget.dataset.slot;
      if (act==='add') {
        const empty = G.squadIds.findIndex((s,i)=>!s || i>=5);
        // se cheio, substitui o último
        if (G.squadIds.filter(Boolean).length>=5) G.squadIds[4]=id;
        else { const idx = G.squadIds.findIndex(s=>!s); G.squadIds[idx>=0?idx:4]=id; }
        // garante 5 slots
        while(G.squadIds.length<5) G.squadIds.push(null);
      } else {
        const idx = G.squadIds.indexOf(id); if(idx>=0) G.squadIds[idx]=null;
      }
      G.squadIds = G.squadIds.slice(0,5);
      while(G.squadIds.length<5) G.squadIds.push(null);
      buildSquad(); buildBurstBars(); save();
      $('panelContent').innerHTML = panelSquad(); bindPanel();
    });
    card.querySelector('[data-up]')?.addEventListener('click', e=>{
      const id = e.currentTarget.dataset.up;
      const li = G.runnerLevels[id];
      const cost = levelUpCost(li.level);
      if (G.shards >= cost) { G.shards -= cost; li.level++; save();
        $('panelContent').innerHTML = panelSquad(); bindPanel(); }
      else notify('Aether Shards insuficientes', '#ff5a3c');
    });
  });
}

function panelCodex() {
  let h = `<h2>RIFT CODEX</h2><div class="panel-sub">Os 8 Aether Runners do MVP — lore, habilidades e vínculos.</div>`;
  h += `<div class="codex-list">`;
  for (const r of RUNNERS) {
    const rar = RARITIES[r.rarity];
    h += `<div class="codex-item">
      <div class="codex-avatar" style="background:linear-gradient(180deg,${lighten(r.color,.2)},${r.color});color:#04211f">${r.name.slice(0,2)}</div>
      <div class="codex-body">
        <div class="codex-name">${ELEMENTS[r.element].icon} ${r.name} <span style="color:${rar.color}">${'★'.repeat(rar.stars)}</span></div>
        <div class="codex-meta">${r.title} · ${r.cls} · ${ELEMENTS[r.element].name} · ${r.posPref}</div>
        <div class="ability-row"><b>Passiva:</b> <span>${r.passive.name} — ${r.passive.desc}</span></div>
        <div class="ability-row"><b>Skill:</b> <span>${r.skill.name} — ${r.skill.desc}</span></div>
        <div class="ability-row"><b>Aether Burst:</b> <span style="color:${r.color}">${r.burst.name}</span> — ${r.burst.desc}</div>
        <div class="ability-row"><b>Sync:</b> <span>${r.sync.map(s=>RUNNER_BY_ID[s].name).join(', ')}</span></div>
        <div class="codex-quote">"${r.quote}"</div>
      </div></div>`;
  }
  h += `</div>`;
  return h;
}

function panelInfinity() {
  const inf = infinityBonuses();
  let h = `<h2>INFINITY CIRCUIT</h2><div class="panel-sub">Bônus permanentes comprados com Infinity Fragments. Sobrevivem ao Reboot.</div>`;
  h += `<div class="circuit"><div class="circuit-frag">💠 ${G.infinityFragments} Fragmentos</div>`;
  // linhas
  h += `<svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">`;
  h += `<line x1="50%" y1="10%" x2="18%" y2="30%" stroke="#2a3358"/>`;
  h += `<line x1="50%" y1="10%" x2="82%" y2="30%" stroke="#2a3358"/>`;
  h += `<line x1="18%" y1="30%" x2="18%" y2="56%" stroke="#2a3358"/>`;
  h += `<line x1="82%" y1="30%" x2="82%" y2="56%" stroke="#2a3358"/>`;
  h += `<line x1="18%" y1="30%" x2="34%" y2="22%" stroke="#2a3358"/>`;
  h += `<line x1="18%" y1="56%" x2="34%" y2="48%" stroke="#2a3358"/>`;
  h += `<line x1="82%" y1="30%" x2="66%" y2="22%" stroke="#2a3358"/>`;
  h += `<line x1="82%" y1="56%" x2="66%" y2="48%" stroke="#2a3358"/>`;
  h += `<line x1="34%" y1="22%" x2="50%" y2="30%" stroke="#2a3358"/>`;
  h += `<line x1="34%" y1="48%" x2="50%" y2="56%" stroke="#2a3358"/>`;
  h += `<line x1="34%" y1="48%" x2="34%" y2="74%" stroke="#2a3358"/>`;
  h += `<line x1="66%" y1="48%" x2="66%" y2="74%" stroke="#2a3358"/>`;
  h += `<circle cx="50%" cy="10%" r="16" fill="${ELEMENTS.aether.color}" stroke="#fff" stroke-width="2"/><text x="50%" y="13%" text-anchor="middle" fill="#04211f" font-family="Orbitron" font-size="9" font-weight="900">∞</text>`;
  h += `</svg>`;
  for (const n of INFINITY_NODES) {
    const owned = !!G.infinity[n.id];
    const afford = !owned && G.infinityFragments >= n.cost;
    h += `<div class="node ${owned?'owned':''} ${afford?'affordable':''}" style="left:${n.x*100}%;top:${n.y*100}%" data-node="${n.id}" title="${n.name}: ${n.desc} (${n.cost}💠)">${n.name}</div>`;
  }
  h += `</div>`;
  h += `<div style="padding:0 24px 24px;color:var(--muted);font-size:13px">Bônus ativos: ATK +${Math.round((inf.atq||0)*100)}% · DEF +${Math.round((inf.def||0)*100)}% · HP +${Math.round((inf.hp||0)*100)}% · CRT +${(inf.crt||0)}% · CDG +${Math.round((inf.cdg||0)*100)}% · EVA +${(inf.eva||0)}% · Burst +${Math.round((inf.ach||0)*100)}% · Shards +${Math.round((inf.shards||0)*100)}% · XP +${Math.round((inf.xp||0)*100)}% · Offline +${Math.round((inf.offline||0)*100)}%</div>`;
  return h;
}
function bindCircuit() {
  document.querySelectorAll('.node[data-node]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const id = el.dataset.node;
      const node = INFINITY_NODES.find(n=>n.id===id);
      if (G.infinity[id]) return;
      if (G.infinityFragments >= node.cost) {
        G.infinityFragments -= node.cost; G.infinity[id]=true; save();
        for (const r of G.runners) computeStats(r);
        openPanel('infinity'); notify(node.name+' desbloqueado!', '#3afff0');
      } else notify('Fragmentos insuficientes', '#ff5a3c');
    });
  });
}

function panelGear() {
  const loot = G._loot || [];
  let h = `<h2>RIFT GEAR</h2><div class="panel-sub">Equipamentos coletados na marcha e dungeons. ${loot.length} itens no inventário.</div>`;
  if (!loot.length) { h += `<div style="padding:0 24px 24px;color:var(--muted)">Nenhum equipamento ainda — derrote Elite e Bosses para dropar.</div>`; return h; }
  h += `<div class="loot-grid">`;
  for (const it of loot.slice().reverse()) {
    const rar = RARITIES[it.rarity];
    h += `<div class="loot-item" style="border-color:${rar.color}">
      <div class="li-name" style="color:${rar.color}">${it.name} <span style="font-size:10px">${'★'.repeat(rar.stars)}</span></div>
      <div class="li-desc">${it.desc}</div>
      <div class="li-desc" style="color:var(--aether);margin-top:4px">${slotName(it.slot)}</div>
    </div>`;
  }
  h += `</div>`;
  return h;
}
function slotName(s){ return {weapon:'Burst Weapon',armor:'Rift Armor',core:'Aether Core',relic:'Infinity Relic'}[s]||s; }

function panelDungeons() {
  const dungs = [
    { name:'Shard Vault', icon:'💎', desc:'Muitos Aether Shards.', freq:'3×/dia', run:()=>{ const g=Math.round(2000*Math.pow(1.05,G.level)); G.shards+=g; return g+' 💎'; } },
    { name:'XP Surge', icon:'⭐', desc:'Materiais de XP.', freq:'3×/dia', run:()=>{ const x=Math.round(300*Math.pow(1.05,G.level)); distributeXp(x); return formatNumber(x)+' XP'; } },
    { name:'Burst Core Mine', icon:'⚡', desc:'Burst Cores (Burst Enhancement).', freq:'2×/dia', run:()=>{ G._burstCores=(G._burstCores||0)+3; return '3 ⚡ Burst Cores'; } },
    { name:'Resonance Trial', icon:'💞', desc:'Materiais de Resonance.', freq:'2×/dia', run:()=>{ const ids=G.runners.map(r=>r.id); for(const p of SYNC_PAIRS) if(ids.includes(p.a)&&ids.includes(p.b)) addResonanceXp(p.a,p.b,80); return '+80 XP Resonance'; } },
  ];
  let h = `<h2>RIFT DUNGEONS</h2><div class="panel-sub">Modos especiais com recompensas únicas.</div><div style="padding:0 24px 24px;display:grid;grid-template-columns:1fr 1fr;gap:12px">`;
  for (const d of dungs) {
    h += `<div style="background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:14px">
      <div style="font-family:Orbitron;font-weight:700;font-size:14px">${d.icon} ${d.name}</div>
      <div style="color:var(--muted);font-size:12px;margin:4px 0 10px">${d.desc}<br>Frequência: ${d.freq}</div>
      <button class="btn-slot set" data-dungeon="${dungs.indexOf(d)}" style="width:100%">EXECUTAR</button>
    </div>`;
  }
  h += `</div>`;
  setTimeout(()=>{
    document.querySelectorAll('[data-dungeon]').forEach(b=>b.addEventListener('click',()=>{
      const res = dungs[+b.dataset.dungeon].run();
      save(); notify('Dungeon: '+res, '#3afff0');
    }));
  },0);
  return h;
}

function panelReboot() {
  const gain = Math.floor(G.maxLevel/10) + (G.maxZone-1)*5 + 2;
  const rank = astralRank(G.rebootCount);
  let h = `<h2>INFINITE REBOOT</h2><div class="panel-sub">Reinicie a marcha do zero e ganhe Infinity Fragments permanentes. Você NÃO perde Runners, Resonance, Infinity Circuit nem equipamentos Lendários.</div>`;
  h += `<div style="padding:0 24px 12px"><div style="background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:16px;text-align:center">
    <div style="color:var(--muted);font-size:12px">SEU RANK ASTRAL</div>
    <div style="font-family:Orbitron;font-weight:900;font-size:28px;color:${rank.color}">${rank.name}</div>
    <div style="color:var(--muted);font-size:12px;margin-top:4px">${G.rebootCount} reboots · ${rank.bonus}</div>
  </div></div>`;
  h += `<div style="padding:0 24px 24px;text-align:center">
    <div style="color:var(--muted);font-size:13px;margin-bottom:10px">Recompensa estimada deste Reboot:</div>
    <div style="font-family:Orbitron;font-weight:900;font-size:24px;color:var(--aether);margin-bottom:16px">+${gain} 💠 Infinity Fragments</div>
    <button class="big-btn" id="doReboot">EXECUTAR INFINITE REBOOT</button>
  </div>`;
  setTimeout(()=>{
    const b = document.getElementById('doReboot');
    if (b) b.addEventListener('click', ()=>{
      G.rebootCount++; G.infinityFragments += gain;
      G.zone=1; G.level=1; G.maxLevel=1;
      for (const id of G.ownedRunners) G.runnerLevels[id]={level:1,xp:0,gear:[]};
      G.runners=[]; buildSquad(); buildBurstBars(); save();
      banner('INFINITE REBOOT', 'Recomece mais forte', '#3afff0');
      openPanel('march'); notify('+'+gain+' Infinity Fragments!', '#3afff0');
    });
  },0);
  return h;
}
function astralRank(n){ const r=[
  {name:'ROOKIE',color:'#8a93b8',bonus:'—'},{name:'SPARK',color:'#4cc9ff',bonus:'+Dungeon especial'},
  {name:'VOLT',color:'#ffd23f',bonus:'+Modo Companion'},{name:'BLAZE',color:'#ff5a3c',bonus:'+6º slot de Runner'},
  {name:'STORM',color:'#3aa0ff',bonus:'+Burst Mode (3x)'},{name:'AETHER',color:'#3afff0',bonus:'+Zona secreta'},
  {name:'INFINITE',color:'#fff',bonus:'Scaling infinito + título'}];
  return r[Math.min(r.length-1, n<=0?0: 1+Math.floor(Math.log2(n+1)))];
}

/* ---------- Toasts ---------- */
function notify(msg, color) {
  const t = document.createElement('div');
  t.className = 'toast'; if(color) t.style.borderLeftColor = color;
  t.textContent = msg;
  $('toast').appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transition='opacity .4s'; setTimeout(()=>t.remove(),400); }, 2600);
}

/* ============================================================
   INPUT
   ============================================================ */
function bindGlobal() {
  // speed toggle
  document.querySelectorAll('.speed-toggle button').forEach(b=>{
    b.addEventListener('click', ()=>{
      const sp = +b.dataset.speed;
      G.speed = sp; G.burstMode = sp===6;
      document.querySelectorAll('.speed-toggle button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      if (sp===6) notify('BURST MODE ativado — velocidade máxima', '#ff5a3c');
      audioInit();
    });
  });
  // mute
  $('muteBtn').addEventListener('click', ()=>{ SFX.on=!SFX.on; $('muteBtn').textContent=SFX.on?'🔊':'🔇'; audioInit(); });
  // nav
  document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click', ()=>openPanel(b.dataset.view)));
  // panel close
  $('panelClose').addEventListener('click', ()=>{ openPanel('march'); });
  $('panel-overlay').addEventListener('click', e=>{ if(e.target===$('panel-overlay')) openPanel('march'); });
  // companion
  $('compactToggle').addEventListener('click', ()=>{
    const app = document.getElementById('app');
    app.classList.toggle('compact');
    $('compactToggle').textContent = app.classList.contains('compact')?'⤢ EXPANDIR':'{{--}}';
    setTimeout(resize, 50);
  });
  // teclado: espaço = pausa, 1/2/3 = velocidade
  window.addEventListener('keydown', e=>{
    if (e.key===' '){ e.preventDefault(); G.paused=!G.paused; notify(G.paused?'Pausado':'Retomado'); }
    if (['1','2','3'].includes(e.key)) document.querySelector(`.speed-toggle button[data-speed="${e.key}"]`)?.click();
  });
  // gesto para ativar audio
  window.addEventListener('pointerdown', ()=>audioInit(), {once:true});
}

/* ---------- Hook de SFX em eventos ---------- */
const _dealDamageOrig = dealDamage;
// não interceptamos dealDamage para evitar custo; sons disparam por probabilidade leve no loop.

/* ============================================================
   BOOT
   ============================================================ */
function boot() {
  const had = load();
  initRunnerLevels();
  if (!had) {
    // primeiro jogo: dá uns shards iniciais
    G.shards = 200;
  }
  resize();
  buildSquad();
  buildBurstBars();
  bindGlobal();
  openPanel('march');

  // offline report
  const rep = offlineReport();
  if (rep) showReport(rep);

  // banner de boas-vindas
  banner('AETHER BURST: INFINITE', 'Burst Beyond Limits', '#3afff0');

  requestAnimationFrame(loop);
}

function showReport(rep) {
  const mins = Math.floor(rep.elapsed/60);
  const hrs = Math.floor(mins/60);
  const away = hrs>0 ? `${hrs}h ${mins%60}min` : `${mins}min`;
  $('reportAway').textContent = `"Você ficou ausente por ${away} — os Runners continuaram marchando."`;
  $('reportStats').innerHTML = `
    <div class="report-stat"><div class="rs-num">${formatNumber(rep.shards)}</div><div class="rs-lbl">💎 Aether Shards</div></div>
    <div class="report-stat"><div class="rs-num">${formatNumber(rep.xp)}</div><div class="rs-lbl">⭐ XP distribuído</div></div>
    <div class="report-stat"><div class="rs-num">${formatNumber(rep.kills)}</div><div class="rs-lbl">💀 Entities</div></div>
    <div class="report-stat"><div class="rs-num">${formatNumber(rep.bursts)}</div><div class="rs-lbl">⚡ Bursts</div></div>`;
  let rew = `<div>💎 ${formatNumber(rep.shards)} Aether Shards</div><div>⭐ ${formatNumber(rep.xp)} XP</div>`;
  if (rep.drops.length) rew += rep.drops.map(d=>`<div>📦 ${d.name}</div>`).join('');
  $('reportRewards').innerHTML = rew;
  $('modal-report').classList.remove('hidden');
  $('reportCollect').onclick = ()=>{ $('modal-report').classList.add('hidden'); save(); sfxLevel(); };
}

boot();
