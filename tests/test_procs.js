/* ============================================================
 * test_procs.js — os 11 GEAR_PROCS, todos com efeito REAL
 * (cada proc sem implementação vira bug silencioso: o item
 * dropa, o tooltip promete e nada acontece — esta suíte
 * garante que todos disparam).
 * ============================================================ */
const { boot, makeSuite } = require('./_vm');
const S = makeSuite('procs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const { R, run } = boot();
const near = (a, b, eps) => Math.abs(a - b) <= (eps === undefined ? 0.6 : eps);

run(`
  mkT = over => Object.assign({kind:'enemy', alive:true, hp:1000000, maxHp:1000000, def:0, eva:0,
    element:'aether', x:600, y:GROUND_Y-40, size:40, spawnDelay:0}, over||{});
  mkS = over => Object.assign({kind:'runner', alive:true, id:'testunit', hp:2000, maxHp:2000,
    atq:100, def:0, eva:0, element:'lightning', pen:0, crt:0, cdg:1.6, ach:1,
    x:170, y:GROUND_Y-40, size:40, gear:[], burstEnergy:0}, over||{});
  __dmg = [];
  (function(){ const f = FX.damage;
    FX.damage = function(x,y,d,o){ __dmg.push({d:d, o:(o||{})}); return f(x,y,d,o); };
  })();
  rand = v => { Math.random = () => v; };
  lastD = () => __dmg[__dmg.length-1].d;
  rand(0.5);
`);

(async () => {

/* ---------- catálogo ---------- */
const ids = R('Object.keys(GEAR_PROCS)');
S.chk('GEAR_PROCS tem os 11 efeitos nomeados', ids.length === 11 && ids.every(i => R(`GEAR_PROCS["${i}"].length`) > 3), ids.join(','));
S.chk('todo proc do EQUIPMENT_POOL existe em GEAR_PROCS',
  R('EQUIPMENT_POOL.filter(e => e.proc).every(e => !!GEAR_PROCS[e.proc])'));

/* ---------- hasProc ---------- */
S.chk('hasProc acha a peça equipada', R('hasProc(mkS({gear:[{proc:"volt_edge"}]}), "volt_edge")') === true);
S.chk('hasProc ignora peça ausente',   R('hasProc(mkS({gear:[{proc:"volt_edge"}]}), "void_blade")') === false);

/* ---------- volt_edge (cadeia 20% após o básico) ---------- */
run(`ve = mkS({gear:[{proc:"volt_edge"}]});
     G.enemies = [mkT({x:500}), mkT({x:660})];
     rand(0.1); hpB = G.enemies[1].hp; basicAttack(ve, G.enemies[0]); rand(0.5);
     chainHit = hpB - G.enemies[1].hp;`);
S.chk('volt_edge: cadeia acerta vizinho (45% ATQ × variância)', near(R('chainHit'), 100*0.45*0.92, 1.2), R('chainHit'));
run(`ve2 = mkS({gear:[{proc:"volt_edge"}]});
     G.enemies = [mkT({x:500}), mkT({x:660})];
     rand(0.9); hpB2 = G.enemies[1].hp; basicAttack(ve2, G.enemies[0]); rand(0.5);`);
S.chk('volt_edge: rand alto = sem cadeia', R('hpB2 - G.enemies[1].hp') === 0);

/* ---------- phantom_fang (esquiva arma ×3) ---------- */
run(`pf = mkS({eva:1, gear:[{proc:"phantom_fang"}]});
     rand(0.01); dealDamage(mkT({element:"fire"}), pf, 100); rand(0.5);`);
S.chk('phantom_fang: esquiva arma o ×3', R('pf._evadeProc') === true);
run(`pfAlvo = mkT(); __dmg.length = 0; dealDamage(pf, pfAlvo, 100);`);
S.chk('phantom_fang: golpe seguinte sai ×3 e desarma', near(R('lastD()'), 300) && R('pf._evadeProc') === false, R('lastD()'));

/* ---------- glacial_staff (skill 30% congela) ---------- */
run(`gs = mkS({gear:[{proc:"glacial_staff"}]}); glAlvo = mkT();
     rand(0.1); dealDamage(gs, glAlvo, 100, {kind:"skill"}); rand(0.5);`);
S.chk('glacial_staff: skill congela (rand 0.1 < 0.3)', R('glAlvo.frozen') >= 1);
run(`glAlvo2 = mkT(); rand(0.1); dealDamage(gs, glAlvo2, 100); rand(0.5);`);
S.chk('glacial_staff: básico NÃO congela', !R('glAlvo2.frozen'));

/* ---------- overcharge_cannon (+2%/ataque, cap 50) ---------- */
run(`oc = mkS({gear:[{proc:"overcharge_cannon"}]});
     __dmg.length = 0; dealDamage(oc, mkT(), 100); d_oc1 = lastD();
     dealDamage(oc, mkT(), 100); d_oc2 = lastD();`);
S.chk('overcharge: stacks somam +2% cada básico', near(R('d_oc1'), 100) && near(R('d_oc2'), 102), R('d_oc1+"/"+d_oc2'));
run(`oc._oc = 49; dealDamage(oc, mkT(), 100); d_oc3 = lastD(); dealDamage(oc, mkT(), 100); d_oc4 = lastD();`);
S.chk('overcharge: teto de 50 stacks (×2.0 máx)', near(R('d_oc3'), 198) && near(R('d_oc4'), 200) && R('oc._oc') === 50);

/* ---------- void_blade / rift_crystal ---------- */
run(`vb = mkS({gear:[{proc:"void_blade"}]}); vbAlvo = mkT(); dealDamage(vb, vbAlvo, 100);`);
S.chk('void_blade: básico aplica Gravity Mark', R('vbAlvo.gravityMark') >= 4);
run(`rc = mkS({gear:[{proc:"rift_crystal"}]}); rcAlvo = mkT(); rcAlvo.frozen = 1;
     __dmg.length = 0; dealDamage(rc, rcAlvo, 100); d_rc1 = lastD();
     dealDamage(rc, mkT(), 100); d_rc2 = lastD();`);
S.chk('rift_crystal: ×1.2 contra alvo com debuff', near(R('d_rc1'), 120), R('d_rc1'));
S.chk('rift_crystal: sem debuff = dano normal',  near(R('d_rc2'), 100), R('d_rc2'));

/* ---------- burst: solar_greatsword / infinity_loop / echo_fragment ---------- */
run(`
  mkBurster = over => Object.assign({kind:'runner', alive:true, id:'kairo', element:'lightning',
    color:'#3aa0ff', data:{name:'KAIRO', burst:{name:'SKYBREAKER NOVA'}},
    x:170, y:GROUND_Y-40, size:40, atq:100, level:1, ach:1, crt:0, pen:0, cdg:1.6,
    gear:[], burstEnergy:100, burstReady:true, hp:1000, maxHp:1000}, over||{});
  G.enemies = [mkT({x:500})];
  br = mkBurster(); __dmg.length = 0; fireBurst(br);
`);
await sleep(420);   // dano do burst é escalonado via setTimeout real
const dBase = R('__dmg.filter(c=>c.o.kind==="burst")[0].d');

run(`br2 = mkBurster({gear:[{proc:"solar_greatsword"}], hp:800}); __dmg.length = 0; fireBurst(br2);`);
await sleep(420);
const dSolar = R('__dmg.filter(c=>c.o.kind==="burst")[0].d');
S.chk('solar_greatsword: burst soma 15% do HP atual', near(dSolar - dBase, 120, 1.5), `${dSolar}-${dBase}`);

run(`br3 = mkBurster({gear:[{proc:"infinity_loop"}], hp:500}); fireBurst(br3);`);
S.chk('infinity_loop: estourar cura 15% do maxHp', R('br3.hp') === 650, R('br3.hp'));

run(`ecoAliado = mkS({id:'eco', gear:[{proc:"echo_fragment"}]});
     G.runners = [br3, ecoAliado];
     br3.burstReady = true; fireBurst(br3);`);
S.chk('echo_fragment: burst de aliado liga o buff (+10% ATQ)', R('ecoAliado.echoBuff') === 5);
run(`__dmg.length = 0; dealDamage(ecoAliado, mkT(), 100); d_eco = lastD(); ecoAliado.echoBuff = 0;
     dealDamage(ecoAliado, mkT(), 100); d_eco0 = lastD();`);
S.chk('echo_fragment: buff ativo = dano ×1.1', near(R('d_eco'), 110) && near(R('d_eco0'), 100), R('d_eco+"/"+d_eco0'));

/* ---------- resonance_amp (+0.10 na chance de sync) ---------- */
run(`__syncHits = 0; fireBurstSync = function(){ __syncHits++; };
     G.syncCooldown = {}; G.resonance["kairo|zael"] = 300;   // nível 4 = sync liberado
     G.runners = [mkS({id:'kairo', burstReady:true}), mkS({id:'zael', burstReady:true})];
     rand(0.14);   // base lvl4 = 0.02+4×0.03 = 0.14 → 0.14 < 0.14 = falso
     tryBurstSync(); semAmp = __syncHits;
     G.runners[0].gearamp = 1; G.runners[0].gear = [{proc:'resonance_amp'}];
     tryBurstSync(); comAmp = __syncHits; rand(0.5);`);
S.chk('resonance_amp: +0.10 empurra a chance por cima do roll', R('semAmp') === 0 && R('comAmp') === 1, R('semAmp+"/"+comAmp'));

/* ---------- singularity_core (1×/combate) ---------- */
run(`sc = mkS({gear:[{proc:"singularity_core"}], hp:50});
     dealDamage(mkT({element:"fire", x:170}), sc, 99999);`);
S.chk('singularity_core: sobrevive com 1 HP', R('sc.alive') === true && R('sc.hp') === 1 && R('sc._coreUsed') === true);
run(`dealDamage(mkT({element:"fire", x:170}), sc, 99999);`);
S.chk('singularity_core: segunda morte é real', R('sc.alive') === false);
run(`sc2 = mkS({gear:[{proc:"singularity_core"}]}); sc2._coreUsed = true;
     G.runners = [sc2]; spawnWave();`);
S.chk('singularity_core: spawnWave recarrega pro combate novo', R('sc2._coreUsed') === false);

S.done();
})().catch(e => { console.error('EXCEÇÃO na suíte procs:', e); process.exitCode = 1; });
