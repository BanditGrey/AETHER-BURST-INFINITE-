/* ============================================================
 * test_ui.js — marcação da UI (painel Rift Gear, tooltips,
 * auto-teste). Repetindo a receita antiga com counts exatos:
 * bag semeada com 8 peças + 1 arma equipada no kairo →
 * 8 .gws (1 filled / 7 socket) · 9 data-gslot · 16 .gtip.
 * ============================================================ */
const fs = require('fs');
const path = require('path');
const { boot, makeSuite, REPO } = require('./_vm');
const S = makeSuite('ui');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const { R, run, window } = boot();
const count = (re) => (html.match(re) || []).length;
let html = '';

(async () => {

/* ---------- cenário controlado: 8 na bag + 1 equipada ---------- */
run(`
  G._loot = G._loot || []; G._loot.length = 0;
  addLoot = name => { const it = JSON.parse(JSON.stringify(EQUIPMENT_POOL.find(e => e.name === name)));
    it.uid = nextUid(); G._loot.push(it); return it; };
  ["Crimson Ouroboros","Void Needle","Aether Heart","Zephyr Cuff",
   "Oblivion Carapace","Volt Edge","Tempest Loop","Starfall Earring"].forEach(addLoot);
  __glacial = addLoot("Glacial Staff");
  __equipOk = equipItem("kairo", __glacial.uid);
  GEAR_UI.runner = "kairo"; GEAR_UI.slot = "all"; GEAR_UI.sort = "rarity";
  openPanel("gear");
`);
await sleep(60);   // bindGear é setTimeout(0)
html = window.document.getElementById('panelContent').innerHTML;

S.chk('equipItem() equipa a arma no kairo', R('__equipOk') === true && R('runnerGear("kairo").weapon.name') === 'Glacial Staff');

/* ---------- estrutura ---------- */
const must = [
  'gw-runners','gw-detail','gw-portrait','PODER','data-gsel="kairo"','gear-tab','SQUAD',
  '♻','gi-grid','gtip','gt-stat','gt-salv','gws-socket','sktip','skt-banner','gw-sk-art',
  'ELEMENTO','PASSIVA','SKILL','AETHER BURST','Forte','Carga de Burst','assets/runners/kairo.png',
  'assets/skills/','assets/icons/slot_weapon.png','Anéis','Brincos','Colares','Pulseiras','Armaduras',
  'ÉPICO','LENDÁRIO','gt-head','gt-icobox','gt-ico','gt-rarchip','gt-proc-badge','✦ PROC',
  'CARGA AETHER','PENETRAÇÃO','gi-proc','data-unequip="kairo:weapon"',
];
const faltando = must.filter(m => !html.includes(m));
S.chk('42 marcadores estruturais presentes (' + must.length + ')', faltando.length === 0, faltando.join(' | '));

/* ---------- peças e stats exibidos ---------- */
const nomes = ['Crimson Ouroboros','Void Needle','Aether Heart','Zephyr Cuff','Oblivion Carapace'];
S.chk('5 peças-chave aparecem na bag', nomes.every(n => html.includes(n)), nomes.filter(n => !html.includes(n)).join(','));
const stats = ['<b>+12%</b> CRIT', '<b>+10%</b> PENETRAÇÃO', '<b>+13%</b> HP', '<b>+9%</b> SPD'];
S.chk('tooltips trazem os stats formatados', stats.every(s => html.includes(s)), stats.filter(s => !html.includes(s)).join(','));

/* ---------- contagens exatas do cenário ---------- */
S.chk('8 sockets no retrato (.gws)', count(/class="gws /g) === 8, count(/class="gws /g));
S.chk('1 preenchido + 7 vazios', count(/class="gws filled"/g) === 1 && count(/gws-socket/g) === 7);
S.chk('9 abas de filtro (data-gslot)', count(/data-gslot="/g) === 9, count(/data-gslot="/g));
S.chk('8 tiles equipáveis (data-qequip)', count(/data-qequip="/g) === 8, count(/data-qequip="/g));
S.chk('16 tooltips inline (8 bag + 7 slots vazios + 1 equipado)', count(/class="gtip"/g) === 16, count(/class="gtip"/g));

/* ---------- slots vazios filtram o inventário ---------- */
const gshow = ['armor','ring','earring','necklace','bracelet'];
S.chk('slots vazios têm data-gshow (filtro por tipo)', gshow.every(s => html.includes(`data-gshow="${s}"`)));

/* ---------- nada de tooltip nativo title= nos blocos de skill ---------- */
S.chk('nenhum tooltip nativo (title=) nos blocos gw-sk', !/class="gw-sk"\s+title=/.test(html));

/* ---------- troca de runner via clique real ---------- */
run(`__segundo = document.querySelectorAll("[data-gsel]")[1].dataset.gsel;`);
window.document.querySelectorAll('[data-gsel]')[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
html = window.document.getElementById('panelContent').innerHTML;
const id2 = R('__segundo'), art2 = R('RUNNER_SKILL_SPRITE[__segundo]');
S.chk('troca de runner re-renderiza com a arte de skill dele', html.includes(`assets/skills/${art2}.png`), id2 + ' → ' + art2);

/* ---------- suíte de auto-teste (botão 🧪) ---------- */
run(`openPanel("selftest", true);`);
await sleep(20);
html = window.document.getElementById('panelContent').innerHTML;
S.chk('painel do auto-teste renderiza (AUTO-TESTE / st-log / stBadge)',
  html.includes('AUTO-TESTE') && html.includes('st-log') && html.includes('stBadge'));
S.chk('botão 🧪 Testes existe na navbar', !!window.document.querySelector('.nav-btn.nav-test'));

const nTests = R('SELFTESTS.length');
S.chk('SELFTESTS registra ≥ 20 frentes (' + nTests + ')', nTests >= 20, nTests);
const cats = R('[...new Set(SELFTESTS.map(t => t.cat))]');
S.chk('frentes cobrem 4 categorias (Assets·Cena·Painéis·Motor)', cats.length === 4, cats.join(','));
const dups = R('SELFTESTS.map(t=>t.cat+"|"+t.name).filter((k,i,a)=>a.indexOf(k)!==i)');
S.chk('sem nomes duplicados no registro', dups.length === 0, (dups || []).join(','));

const mainSrc = fs.readFileSync(path.join(REPO, 'js/main.js'), 'utf8');
S.chk('main.js trata o boot ?selftest=1', mainSrc.includes('selftest=1'));
const indexSrc = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
S.chk('index.html carrega js/selftest.js (com cache-bust)', /js\/selftest\.js\?v=/.test(indexSrc));

S.done();
})().catch(e => { console.error('EXCEÇÃO na suíte ui:', e); process.exitCode = 1; });
