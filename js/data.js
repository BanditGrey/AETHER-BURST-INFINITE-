/* ============================================================
   AETHER BURST: INFINITE — DATA LAYER
   Toda a lore, personagens, elementos, classes e inimigos
   definidos no Documento de Conceito v2.0.
   ============================================================ */

/* ---------- ELEMENTOS ---------- */
const ELEMENTS = {
  fire:     { name: "Fogo",     icon: "🔥", color: "#ff5a3c", glow: "#ff8a5c", strong: ["wind"],    weak: ["ice"] },
  ice:      { name: "Gelo",     icon: "❄️", color: "#4cc9ff", glow: "#9be3ff", strong: ["fire"],    weak: ["lightning"] },
  lightning:{ name: "Raio",     icon: "⚡", color: "#ffd23f", glow: "#fff07a", strong: ["ice"],     weak: ["wind"] },
  wind:     { name: "Vento",    icon: "🌿", color: "#5cd66c", glow: "#a6f0b0", strong: ["lightning"],weak: ["fire"] },
  light:    { name: "Luz",      icon: "☀️", color: "#ffd86b", glow: "#fff0b0", strong: ["dark"],    weak: ["dark"] },
  dark:     { name: "Trevas",   icon: "🌑", color: "#9b6bff", glow: "#c9a8ff", strong: ["light"],   weak: ["light"] },
  aether:   { name: "Aether",   icon: "💠", color: "#3afff0", glow: "#9bfff7", strong: [],          weak: [] },
};

/* Vantagem elemental: retorna multiplicador de dano */
function elementMultiplier(atkEl, defEl) {
  const a = ELEMENTS[atkEl];
  if (!a) return 1;
  if (a.strong.includes(defEl)) return 1.5;
  if (a.weak.includes(defEl))   return 0.66;
  return 1;
}

/* ---------- CLASSES ---------- */
const CLASSES = {
  Breaker:    { role: "Dano corpo a corpo explosivo", pos: "Vanguard",  icon: "⚔️", base: { hp: 950,  atq: 122, def: 42, spd: 92,  crt: 26, cdg: 182, eva: 9,  pen: 10, ach: 1.0 }, range: 70 },
  Vanguard:   { role: "Tanque protetor",              pos: "Vanguard",  icon: "🛡️", base: { hp: 1700, atq: 78,  def: 95, spd: 58,  crt: 12, cdg: 160, eva: 6,  pen: 5,  ach: 0.9 }, range: 70 },
  Striker:    { role: "Dano rápido, múltiplos hits",  pos: "Hybrid",    icon: "🗡️", base: { hp: 820,  atq: 100, def: 36, spd: 132, crt: 36, cdg: 192, eva: 19, pen: 16, ach: 1.1 }, range: 78 },
  Blaster:    { role: "Dano à distância constante",   pos: "Rear",      icon: "🔫", base: { hp: 720,  atq: 112, def: 34, spd: 102, crt: 21, cdg: 170, eva: 8,  pen: 12, ach: 1.0 }, range: 260 },
  BurstMage:  { role: "Dano em área elemental",       pos: "Rear",      icon: "🔮", base: { hp: 760,  atq: 132, def: 35, spd: 86,  crt: 23, cdg: 176, eva: 9,  pen: 15, ach: 1.16 }, range: 250 },
  Resonator:  { role: "Suporte, buff, cura",          pos: "Rear",      icon: "✨", base: { hp: 880,  atq: 74,  def: 44, spd: 96,  crt: 16, cdg: 166, eva: 11, pen: 8,  ach: 1.22 }, range: 240 },
};

/* ---------- RARIDADES ---------- */
const RARITIES = {
  common:   { name: "Comum",    stars: 1, mult: 0.80, color: "#9aa3ad" },
  uncommon: { name: "Incomum",  stars: 2, mult: 0.90, color: "#5cd66c" },
  rare:     { name: "Raro",     stars: 3, mult: 1.00, color: "#4c9bff" },
  epic:     { name: "Épico",    stars: 4, mult: 1.16, color: "#a06bff" },
  legendary:{ name: "Lendário", stars: 5, mult: 1.36, color: "#ffc83a" },
  aether:   { name: "Aether",   stars: 6, mult: 1.62, color: "#3afff0" },
};

/* ---------- RUNNERS (os 8 do MVP) ---------- */
const RUNNERS = [
  {
    id: "kairo", name: "KAIRO", title: "The Skybreaker",
    cls: "Breaker", element: "lightning", rarity: "legendary",
    color: "#3aa0ff", accent: "#bfe3ff",
    posPref: "Vanguard",
    passive: { name: "Charged Rush", desc: "Cada ataque básico acumula carga. No 5º, libera descarga em todos os inimigos próximos." },
    skill:   { name: "Volt Fang", cd: 9, desc: "Avança em velocidade absurda por toda a linha inimiga causando dano em todos." },
    burst:   { name: "SKYBREAKER NOVA", desc: "Sobe no ar, concentra raio nas mãos e desce com explosão elétrica que cobre metade da tela." },
    sync: ["zael", "rex"],
    personality: "Impulsivo, confiante, boca grande. Quer ser o mais forte do Rift.",
    quote: "Eu vou além — sempre além."
  },
  {
    id: "zael", name: "ZAEL", title: "The Crimson Fang",
    cls: "Striker", element: "fire", rarity: "legendary",
    color: "#ff3b46", accent: "#ffd07a",
    posPref: "Hybrid",
    passive: { name: "Fang Instinct", desc: "Quanto menor o HP, maior o ATQ. Abaixo de 30% HP ganha velocidade absurda." },
    skill:   { name: "Crimson Slash Barrage", cd: 8, desc: "5 cortes rápidos em sequência no alvo com maior HP." },
    burst:   { name: "CRIMSON ZERO BARRAGE", desc: "Desaparece. Flashes de cortes cobrem a tela. Reaparece atrás dos inimigos enquanto o dano explode." },
    sync: ["kairo", "sable"],
    personality: "Frio, calculista, poucas palavras. Rival natural de Kairo.",
    quote: "Sem pressa. Sem erro."
  },
  {
    id: "seraph", name: "SERAPH", title: "The Void Empress",
    cls: "BurstMage", element: "dark", rarity: "epic",
    color: "#a06bff", accent: "#ff7ad9",
    posPref: "Rear",
    passive: { name: "Void Pull", desc: "Ataques têm chance de aplicar Gravity Mark. Marcados recebem mais dano de todos." },
    skill:   { name: "Event Horizon", cd: 10, desc: "Cria uma singularidade que puxa todos os inimigos ao centro e explode." },
    burst:   { name: "VOID EMPRESS COLLAPSE", desc: "A tela escurece. Seraph abre os olhos. Uma explosão de vazio esférica expande destruindo tudo." },
    sync: ["lyra"],
    personality: "Aristocrática, irônica, elegante. Faz tudo parecer fácil.",
    quote: "Tão fácil que quase me entedia."
  },
  {
    id: "lyra", name: "LYRA", title: "The Solar Blade",
    cls: "Breaker", element: "light", rarity: "epic",
    color: "#ffce4a", accent: "#fff7c2",
    posPref: "Vanguard",
    passive: { name: "Solar Guard", desc: "Quando um aliado cai abaixo de 20% HP, Lyra ganha escudo e speed boost temporários." },
    skill:   { name: "Radiant Strike", cd: 8, desc: "Golpe de luz em linha reta que atravessa todos os inimigos." },
    burst:   { name: "SOLAR NOVA BLADE", desc: "Ergue a espada ao céu. Um raio de luz desce. Desfere um corte dourado que divide a tela ao meio." },
    sync: ["seraph"],
    personality: "Determinada, protetora, honrada. Sente o peso de cada batalha.",
    quote: "Fiquem atrás de mim."
  },
  {
    id: "frost", name: "FROST", title: "The Glacial Phantom",
    cls: "BurstMage", element: "ice", rarity: "epic",
    color: "#54c8ff", accent: "#cdf3ff",
    posPref: "Rear",
    passive: { name: "Absolute Zero Field", desc: "Inimigos atingidos perdem SPD. No 3º hit, congelam por 1 segundo." },
    skill:   { name: "Glacial Lance Burst", cd: 9, desc: "Dispara lanças de gelo em leque atingindo 3 inimigos." },
    burst:   { name: "PERMAFROST COLLAPSE", desc: "Levanta uma mão. Cristais de gelo massivos surgem debaixo de todos os inimigos e explodem para cima." },
    sync: ["nina"],
    personality: "Calmo, analítico, distante — mas protege o time silenciosamente.",
    quote: "Calma absoluta. Zero absoluto."
  },
  {
    id: "nina", name: "NINA", title: "The Thunder Engineer",
    cls: "Resonator", element: "lightning", rarity: "epic",
    color: "#ffb52e", accent: "#ffe08a",
    posPref: "Rear",
    passive: { name: "Overcharge Protocol", desc: "Aliados adjacentes ganham +15% SPD. Nina coloca torretas automáticas." },
    skill:   { name: "Surge Cannon", cd: 7, desc: "Dispara um raio concentrado que atravessa toda a linha inimiga." },
    burst:   { name: "INFINITE PULSE OVERDRIVE", desc: "Lança um dispositivo ao centro. Ele pulsa ondas de raio por 3s com dano crescente." },
    sync: ["frost"],
    personality: "Animada, inventiva, fala muito. Trata os gadgets como filhos.",
    quote: "Deixa comigo — meus bebês vão resolver!"
  },
  {
    id: "rex", name: "REX", title: "The Wild Breaker",
    cls: "Vanguard", element: "wind", rarity: "rare",
    color: "#54c46a", accent: "#cdeeb0",
    posPref: "Vanguard",
    passive: { name: "Beast Stance", desc: "Cada hit recebido aumenta o ATQ de Rex. Quanto mais apanha, mais forte fica." },
    skill:   { name: "Savage Charge", cd: 9, desc: "Avança em linha reta empurrando todos os inimigos para trás." },
    burst:   { name: "PRIMAL STORM FANG", desc: "Ruge. Uma aura selvagem explode ao redor causando dano massivo e atordoa todos." },
    sync: ["kairo"],
    personality: "Simples, direto, leal. Não fala muito mas está sempre na frente.",
    quote: "..."
  },
  {
    id: "sable", name: "SABLE", title: "The Phantom Executor",
    cls: "Striker", element: "dark", rarity: "epic",
    color: "#7a5cff", accent: "#c2b6ff",
    posPref: "Hybrid",
    passive: { name: "Phantom Step", desc: "Após cada esquiva, o próximo ataque é crítico garantido com +50% de dano." },
    skill:   { name: "Shadow Execution", cd: 8, desc: "Teleporta atrás do inimigo com maior ATQ e causa dano massivo em ponto único." },
    burst:   { name: "ECLIPSE MORTEM", desc: "A tela fica preta por 0.5s. Cortes aparecem em todos os inimigos enquanto Sable repousa a arma." },
    sync: ["zael"],
    personality: "Misteriosa. Não revela intenções. Está no esquadrão por razões próprias.",
    quote: "............"
  },
];

/* Mapa rápido por id */
const RUNNER_BY_ID = Object.fromEntries(RUNNERS.map(r => [r.id, r]));

/* ---------- BURST SYNC (os 5 pares do MVP) ---------- */
const SYNC_PAIRS = [
  { a: "kairo",  b: "zael",   name: "Storm Duel",      type: "Rival",      colorA:"#3aa0ff", colorB:"#ff3b46", desc:"Raio e fogo se fundem — explosão que cobre toda a tela." },
  { a: "lyra",   b: "seraph", name: "Duality Break",   type: "Contraste",  colorA:"#ffce4a", colorB:"#a06bff", desc:"Luz e trevas se chocam — dano em área + debuff." },
  { a: "frost",  b: "nina",   name: "Circuit Freeze",  type: "Técnico",    colorA:"#54c8ff", colorB:"#ffb52e", desc:"Gelo e raio — congela + descarga em cadeia." },
  { a: "kairo",  b: "rex",    name: "Tempest Break",   type: "Amizade",    colorA:"#3aa0ff", colorB:"#54c46a", desc:"Vento e raio — tornado elétrico." },
  { a: "zael",   b: "sable",  name: "Crimson Phantom", type: "Afinidade",  colorA:"#ff3b46", colorB:"#7a5cff", desc:"Fogo e sombra — explosão de execução." },
];

/* Resonance em % por nível (níveis 1-4 do MVP + 5/MAX para futuro) */
const RESONANCE_LEVELS = [
  { lvl: 1, name: "Signal",          statMult: 0.00, sync: false },
  { lvl: 2, name: "Sync",            statMult: 0.03, sync: false },
  { lvl: 3, name: "Resonance",       statMult: 0.07, sync: false },
  { lvl: 4, name: "Deep Sync",       statMult: 0.10, sync: true  },
  { lvl: 5, name: "Fusion",          statMult: 0.15, sync: true  },
  { lvl: 6, name: "Perfect Resonance",statMult:0.20, sync: true  },
];

/* ---------- RIFT ENTITIES (inimigos) ---------- */
const ENEMY_TYPES = {
  hollow:  { name: "Hollow",  hp: 0.55, atq: 0.45, spd: 130, size: 26, color:"#8a93a6", behavior:"rush",   count:[3,5] },
  brute:   { name: "Brute",   hp: 2.20, atq: 0.80, spd: 55,  size: 42, color:"#6b7280", behavior:"tank",   count:[1,2] },
  phantom: { name: "Phantom", hp: 0.90, atq: 1.30, spd: 105, size: 30, color:"#9b6bff", behavior:"flank",  count:[2,3] },
  surge:   { name: "Surge",   hp: 1.00, atq: 0.90, spd: 80,  size: 32, color:"#3afff0", behavior:"rush",   count:[2,3] },
  elite:   { name: "Elite",   hp: 3.20, atq: 1.50, spd: 85,  size: 40, color:"#ff5a3c", behavior:"elite",  count:[1,1] },
  miniboss:{ name: "Rift Warden", hp: 14, atq: 2.2, spd: 70, size: 64, color:"#ff8a3c", behavior:"boss",   count:[1,1] },
  riftlord:{ name: "VERDANT RIFT LORD", hp: 90, atq: 3.6, spd: 60, size: 92, color:"#54c46a", behavior:"boss", count:[1,1] },
};

/* ---------- ZONAS ---------- */
const ZONES = [
  { id:1, name:"Verdant Rift",     theme:"Floresta dimensional corrompida", energy:"Vento / Natureza", sky:["#0b2a1f","#13352a","#1d4a36"], ground:"#0e2419", accent:"#54c46a", status:"MVP" },
  { id:2, name:"Inferno Gate",     theme:"Vulcão dimensional",             energy:"Fogo",            sky:["#2a0b0b","#3a1410","#5a1f12"], ground:"#1f0d0a", accent:"#ff5a3c", status:"V1.1" },
  { id:3, name:"Frozen Abyss",     theme:"Oceano congelado entre dimensões",energy:"Gelo",           sky:["#0a1a2a","#102a3a","#1d4a6a"], ground:"#0e2233", accent:"#54c8ff", status:"V1.1" },
  { id:4, name:"Storm Circuit",    theme:"Cidades flutuantes destruídas",  energy:"Raio",            sky:["#16162a","#1f1f3a","#2a2a5a"], ground:"#15152a", accent:"#ffd23f", status:"V1.2" },
  { id:5, name:"Void Cathedral",   theme:"Templos corrompidos pelo vazio", energy:"Trevas",          sky:["#160a24","#241036","#36185a"], ground:"#1a0e2a", accent:"#a06bff", status:"V1.2" },
  { id:6, name:"Celestial Spire",  theme:"Torre dimensional sagrada",      energy:"Luz",             sky:["#2a230a","#3a3010","#5a4818"], ground:"#2a220e", accent:"#ffce4a", status:"V1.3" },
  { id:7, name:"Core Infinite",    theme:"Centro do Rift — caos puro",     energy:"Aether puro",     sky:["#0a2a28","#104038","#1a5a4a"], ground:"#0e2a26", accent:"#3afff0", status:"Endgame" },
];

/* ---------- EQUIPAMENTOS (exemplos com personalidade) ---------- */
const EQUIPMENT_POOL = [
  { name:"Volt Edge",         slot:"weapon",   rarity:"epic",      desc:"Ataques têm 20% de chance de causar descarga em cadeia.", stats:{ atq: 0.10, crt: 0.05 } },
  { name:"Phantom Fang",      slot:"weapon",   rarity:"epic",      desc:"Após esquiva, causa 300% de dano no próximo ataque.",     stats:{ atq: 0.09, eva: 0.10 } },
  { name:"Solar Greatsword",  slot:"weapon",   rarity:"legendary", desc:"Burst causa dano adicional proporcional ao HP atual.",    stats:{ atq: 0.14, cdg: 0.15 } },
  { name:"Glacial Staff",     slot:"weapon",   rarity:"epic",      desc:"Skills têm 30% de chance de congelar.",                   stats:{ atq: 0.10, pen: 8 } },
  { name:"Overcharge Cannon", slot:"weapon",   rarity:"epic",      desc:"Cada ataque aumenta 2% o dano do próximo.",               stats:{ atq: 0.11, spd: 0.06 } },
  { name:"Void Blade",        slot:"weapon",   rarity:"legendary", desc:"Aplica Gravity Mark automaticamente no básico.",          stats:{ atq: 0.13, crt: 0.08 } },
  { name:"Burst Accelerator", slot:"core",     rarity:"epic",      desc:"Barra de Aether enche 25% mais rápido.",                  stats:{ ach: 0.25 } },
  { name:"Resonance Amp",     slot:"core",     rarity:"rare",      desc:"+10% de chance de Burst Sync.",                           stats:{ crt: 0.04, spd: 0.04 } },
  { name:"Infinity Loop",     slot:"core",     rarity:"legendary", desc:"Ao usar Burst, recupera 15% do HP.",                      stats:{ hp: 0.12, ach: 0.10 } },
  { name:"Overload Chip",     slot:"core",     rarity:"epic",      desc:"Críticos aumentam o dano do próximo Burst.",              stats:{ crt: 0.10, cdg: 0.12 } },
  { name:"Echo Fragment",     slot:"relic",    rarity:"legendary", desc:"Quando um aliado usa Burst, ganha 10% ATQ por 5s.",       stats:{ atq: 0.08, hp: 0.06 } },
  { name:"Rift Crystal",      slot:"relic",    rarity:"epic",      desc:"Ataques em inimigos com debuff causam 20% mais dano.",    stats:{ atq: 0.09, pen: 6 } },
  { name:"Singularity Core",  slot:"relic",    rarity:"legendary", desc:"Uma vez por combate, sobrevive com 1 HP.",                stats:{ hp: 0.14, def: 0.10 } },
];

/* ---------- INFINITY CIRCUIT (árvore de bônus permanentes) ---------- */
const INFINITY_NODES = [
  { id:"atk1",   x:.18, y:.30, branch:"poder",     name:"ATQ +",       cost:1, desc:"+10% ATQ global",                  effect:{ atq:0.10 } },
  { id:"def1",   x:.18, y:.56, branch:"poder",     name:"DEF +",       cost:1, desc:"+10% DEF global",                  effect:{ def:0.10 } },
  { id:"crt1",   x:.34, y:.22, branch:"poder",     name:"CRT +",       cost:2, desc:"+8% Chance de Crítico",            effect:{ crt:8 } },
  { id:"hp1",    x:.34, y:.48, branch:"poder",     name:"HP +",        cost:2, desc:"+12% HP global",                   effect:{ hp:0.12 } },
  { id:"cdg1",   x:.50, y:.30, branch:"poder",     name:"CDG +",       cost:3, desc:"+25% Dano Crítico",                effect:{ cdg:0.25 } },
  { id:"eva1",   x:.50, y:.56, branch:"poder",     name:"EVA +",       cost:3, desc:"+8% Evasão",                       effect:{ eva:8 } },
  { id:"shards", x:.66, y:.22, branch:"recursos",  name:"Shards +",    cost:2, desc:"+20% Aether Shards",               effect:{ shards:0.20 } },
  { id:"xp1",    x:.66, y:.48, branch:"recursos",  name:"XP +",        cost:2, desc:"+20% XP",                          effect:{ xp:0.20 } },
  { id:"drop",   x:.82, y:.30, branch:"recursos",  name:"Drop Rate +", cost:3, desc:"+15% Drop de equipamentos",        effect:{ drop:0.15 } },
  { id:"offline",x:.82, y:.56, branch:"recursos",  name:"Offline +",   cost:3, desc:"+15% eficiência offline",          effect:{ offline:0.15 } },
  { id:"ach1",   x:.34, y:.74, branch:"poder",     name:"Aether Charge",cost:4, desc:"+20% velocidade de Burst",         effect:{ ach:0.20 } },
  { id:"slot6",  x:.66, y:.74, branch:"recursos",  name:"6º Slot",     cost:8, desc:"Desbloqueia 6º Runner na formação",effect:{ slot6:true } },
];

/* Frases de combate para dar personalidade */
const COMBAT_BANTER = {
  kairo:  ["Skybreak!","Mais rápido!","Tô só começando!"],
  zael:   ["...",
           "Fraco.","Acabou."],
  seraph: ["Patético.","Que tédio.","Supremo."],
  lyra:   ["Pela luz!","Aguentem!","Não cederemos!"],
  frost:  ["Congela.","Zero absoluto.","Silêncio."],
  nina:   ["Comam isso!","Surto total!","Vai, vai, vai!"],
  rex:    ["...","Grrr.","RAAHH!"],
  sable:  ["............","Suma.","Adeus."],
};
