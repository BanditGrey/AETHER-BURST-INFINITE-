/* ============================================================
 * test_dmg.js — motor de dano (dealDamage & cia.)
 * Roda no harness _vm (jsdom + canvas stub) — determinístico:
 * Math.random é stubado dentro do contexto do jogo.
 * ============================================================ */
const { boot, makeSuite } = require('./_vm');
const S = makeSuite('dmg');

const { R, run } = boot();
const near = (a, b, eps) => Math.abs(a - b) <= (eps === undefined ? 0.51 : eps);

/* fabricantes de unidades fake dentro do jogo + espião de FX.damage */
run(`
  mkT = over => Object.assign({kind:'enemy', alive:true, hp:10000, maxHp:10000, def:0, eva:0,
    element:'aether', x:600, y:GROUND_Y-40, size:40, spawnDelay:0}, over||{});
  mkS = over => Object.assign({kind:'runner', alive:true, id:'testunit', hp:2000, maxHp:2000,
    atq:100, def:0, eva:0, element:'lightning', pen:0, crt:0, cdg:1.6, ach:1,
    x:170, y:GROUND_Y-40, size:40, gear:[], burstEnergy:0}, over||{});
  __dmg = [];
  (function(){ const f = FX.damage;
    FX.damage = function(x,y,d,o){ __dmg.push({d:d, o:(o||{})}); return f(x,y,d,o); };
  })();
  rand = v => { Math.random = () => v; };
  rand(0.5);   // variância exata ×1.0, sem crit/miss acidental
`);

/* ---------- tabela elemental ---------- */
S.chk('carta: fogo → vento = ×1.5',    R('elementMultiplier("fire","wind")') === 1.5);
S.chk('carta: fogo → gelo = ×0.66',    R('elementMultiplier("fire","ice")') === 0.66);
S.chk('carta: raio → gelo = ×1.5',     R('elementMultiplier("lightning","ice")') === 1.5);
S.chk('carta: raio → vento = ×0.66',   R('elementMultiplier("lightning","wind")') === 0.66);
S.chk('carta: luz ↔ trevas = ×1.5',    R('elementMultiplier("light","dark")') === 1.5 && R('elementMultiplier("dark","light")') === 1.5);
S.chk('carta: aether é neutro',        R('elementMultiplier("aether","fire")') === 1 && R('elementMultiplier("fire","aether")') === 1);

/* ---------- mitigação / penetração / crítico ---------- */
run('t1 = mkT(); s1 = mkS(); dealDamage(s1, t1, 100)');
S.chk('sem def: dano = raw × variância 1.0', near(__dmgLast(), 100), __dmgLast());

run('t2 = mkT({def:120}); dealDamage(mkS(), t2, 100)');
S.chk('def 120 mitiga exatos 50%', near(__dmgLast(), 50), __dmgLast());

run('t3 = mkT({def:120}); dealDamage(mkS({pen:0.5}), t3, 100)');
S.chk('pen 50%: def efetiva 60 → ×(2/3)', near(__dmgLast(), 100*120/180, 0.6), __dmgLast());

run('t4 = mkT(); dealDamage(mkS({cdg:2.0}), t4, 100, {forceCrit:true})');
S.chk('crit forçado com cdg 2.0 → ×2', near(__dmgLast(), 200), __dmgLast());

/* ---------- esquiva ---------- */
run('t5 = mkT({eva:1}); rand(0.01); hpAntes = t5.hp; r5 = dealDamage(mkS(), t5, 100); rand(0.5)');
S.chk('esquiva: retorna 0 e não tira HP', R('r5') === 0 && R('hpAntes - t5.hp') === 0);
S.chk('esquiva: FX recebe kind "miss"', __dmgLastKind('miss'));

/* ---------- escudo absorve primeiro ---------- */
run('t6 = mkT(); t6.shieldHp = 50; __dmg.length = 0; dealDamage(mkS(), t6, 100)');
S.chk('escudo 50 absorve: HP perde só o excedente', near(R('t6.hp'), 10000-50) && R('t6.shieldHp') === 0);
S.chk('escudo: FX registra número secundário "shield"', R('__dmg.some(c => c.o.kind === "shield")'));

/* ---------- modificadores de dano ---------- */
run('t7 = mkT({gravityMark:4}); dealDamage(mkS(), t7, 100)');
S.chk('gravity mark → ×1.2', near(__dmgLast(), 120), __dmgLast());

run('t8 = mkT(); dealDamage(mkS(), t8, 100, {mult:2})');
S.chk('opts.mult ×2 dobra o dano', near(__dmgLast(), 200), __dmgLast());

run('t9 = mkT(); dealDamage(mkS({element:"lightning"}), mkT({element:"ice"}), 100)');
run('sup = __dmg[__dmg.length-1]');
S.chk('super-efetivo: ×1.5 + flag "super"', __dmgLast() && near(R('sup.d'), 150) && R('sup.o.eff') === 'super');

run('dealDamage(mkS({element:"lightning"}), mkT({element:"wind"}), 100)');
run('wk = __dmg[__dmg.length-1]');
S.chk('fraco: ×0.66 + flag "weak" + cinza', near(R('wk.d'), 66) && R('wk.o.eff') === 'weak' && R('wk.o.color') === '#7d8899');

run('t10 = mkT(); dealDamage(mkS(), t10, 0.01)');
S.chk('dano mínimo nunca < 1', R('__dmg[__dmg.length-1].d') >= 1);

/* ---------- morte / kills ---------- */
run('k0 = G.stats.kills; t11 = mkT({hp:30}); dealDamage(mkS(), t11, 500)');
S.chk('alvo morre com HP ≤ 0', R('t11.alive') === false);
S.chk('kill conta em G.stats.kills', R('G.stats.kills - k0') === 1);

/* ---------- carga de burst ---------- */
run('s12 = mkS(); dealDamage(s12, mkT(), 100)');
S.chk('atacante runner ganha carga de burst', R('s12.burstEnergy') > 0);
run('s13 = mkS(); dealDamage(mkT({kind:"enemy", element:"fire"}), s13, 100)');
S.chk('runner ganha carga ao apanhar', R('s13.burstEnergy') > 0);

/* ---------- passiva do Rex (unidade real) ---------- */
run('rexu = makeRunner("rex", 0); rexAtq0 = rexu.atq; rexu.hp = rexu.maxHp; dealDamage(mkT({element:"fire"}), rexu, 50)');
S.chk('rex: apanhar empilha Beast Stance', R('rexu.beastStacks') === 1);
S.chk('rex: ATQ sobe com a stack', R('rexu.atq') > R('rexAtq0'), R('rexu.atq') + ' vs ' + R('rexAtq0'));

/* ---------- seleção de alvos em área ---------- */
run(`G.enemies = [mkT({x:500}), mkT({x:950}), mkT({x:600, spawnDelay:1}), mkT({x:400, alive:false})];
     aoeN = aoeTargets().length;`);
S.chk('aoeTargets: só vivos, sem delay e dentro do alcance', R('aoeN') === 1, R('aoeN'));

function __dmgLast() { return R('__dmg[__dmg.length-1].d'); }
function __dmgLastKind(k) { return R(`__dmg[__dmg.length-1].o.kind === "${k}"`); }

S.done();
