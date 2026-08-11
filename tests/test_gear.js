/* TEST_GEAR — drops, 8 slots, equip/desequipar, cap, reciclar, save/load */
const { boot, makeSuite } = require('./_vm');
const { R, run, window } = boot();
const S = makeSuite('gear');
const { chk } = S;

// limpa terreno
run(`G._loot = []; G.shards = 0; G._uidSeq = 0; for (const id in G.runnerLevels) G.runnerLevels[id].gear = {}; save();`);

chk('rollDrop gera peça com uid/slot/raridade válidos', R(`(()=>{const it=rollDrop();return !!(it && it.uid>0 && GEAR_SLOTS.some(g=>g.id===it.slot) && RARITIES[it.rarity]);})()`));
chk('140 drops cobrem os 8 slots', R(`(()=>{G._loot=[];for(let i=0;i<140;i++)rollDrop();return new Set(G._loot.map(i=>i.slot)).size===8;})()`));
chk('rolls cobrem as 5 raridades dropáveis (aether é 6★ p/ futuro craft)', R(`(()=>{
  G._loot=[];const seen=new Set();let i=0;
  while(seen.size<5 && i++<2000){rollDrop();seen.add(G._loot[G._loot.length-1].rarity);}
  return seen.size===5 && i<2000;
})()`));
chk('uid único em 500 peças', R(`(()=>{const s=new Set(G._loot.map(i=>i.uid));return s.size===G._loot.length;})()`));
chk('stats em formato fração (0.10 = +10%)', R(`(()=>{const it=G._loot.find(i=>i.stats.atq||i.stats.hp);const v=Object.values(it.stats)[0];return v<1;})()`));

run(`G._loot=[];`);
const atq0 = R(`(()=>{const u=makeRunner('kairo',0);computeStats(u);return u.atq;})()`);
run(`G._loot.push({uid:nextUid(),slot:'weapon',rarity:'rare',name:'T1',stats:{atq:0.25},proc:null,desc:''})`);
const uid1 = R('G._loot[0].uid');
chk('equipItem move bag→slot', R(`equipItem('kairo',${uid1})`));
chk('slot weapon preenchido', R(`!!runnerGear('kairo').weapon`));
chk('bag esvaziou', R(`G._loot.length===0`));
chk('ATQ subiu após equipar', R(`(()=>{const u=makeRunner('kairo',0);computeStats(u);return u.atq;})()`) > atq0, `base ${atq0}`);

run(`G._loot.push({uid:nextUid(),slot:'weapon',rarity:'epic',name:'T2',stats:{atq:0.30},proc:null,desc:''})`);
const uid2 = R('G._loot[0].uid');
chk('troca devolve a peça antiga p/ bag', R(`(()=>{equipItem('kairo',${uid2});return G._loot.length===1 && G._loot[0].uid===${uid1} && runnerGear('kairo').weapon.uid===${uid2};})()`));
chk('desequipar devolve slot→bag', R(`(()=>{unequipItem('kairo','weapon');return !runnerGear('kairo').weapon && G._loot.length===2;})()`));
chk('stats voltam ao base após desequipar', R(`(()=>{const u=makeRunner('kairo',0);computeStats(u);return u.atq;})()`) === atq0, `base ${atq0}`);

chk('os 8 slots equipam ao mesmo tempo', R(`(()=>{
  for(const gs of GEAR_SLOTS) G._loot.push({uid:nextUid(),slot:gs.id,rarity:'common',name:'X'+gs.id,stats:{hp:0.01},proc:null,desc:''});
  for(const it of G._loot.slice()) equipItem('nina', it.uid);
  return Object.keys(runnerGear('nina')).length===8;
})()`));
chk('equippedList entrega 8 itens p/ computeStats', R(`equippedList('nina').length===8`));
chk('slot vazio = chave ausente (não placeholder)', R(`(()=>{unequipItem('nina','ring');return !('ring' in runnerGear('nina')) && Object.keys(runnerGear('nina')).length===7;})()`));

run(`G.shards=0;`);
const salvUid = R(`(G._loot.push({uid:nextUid(),slot:'armor',rarity:'common',name:'S',stats:{hp:0.01},proc:null,desc:''}), G._loot[G._loot.length-1].uid)`);
chk('salvageItem paga SALVAGE_VALUE.common (+10 💎)', R(`(()=>{const s0=G.shards;const got=salvageItem(${salvUid});return got===SALVAGE_VALUE.common && G.shards===s0+got;})()`));
chk('salvageWhere limpa comuns/incomuns sem tocar raros', R(`(()=>{
  G._loot=[];
  const mk=(r)=>G._loot.push({uid:nextUid(),slot:'ring',rarity:r,name:'M'+r,stats:{crt:0.01},proc:null,desc:''});
  mk('common');mk('uncommon');mk('rare');
  const r=salvageWhere(it=>it.rarity==='common'||it.rarity==='uncommon');
  return r.n===2 && G._loot.length===1 && G._loot[0].rarity==='rare';
})()`));
chk('reciclar nunca toca em peça equipada', R(`(()=>{
  const before=runnerGear('nina');const n=Object.keys(before).length;
  salvageWhere(()=>true);            // limpa TODA a bag
  return Object.keys(runnerGear('nina')).length===n;
})()`));

chk('LOOT_CAP=500: drop além do cap é recusado (nada some à força)', R(`(()=>{
  G._loot=[];for(let i=0;i<500;i++)G._loot.push({uid:nextUid(),slot:'ring',rarity:'common',name:'C',stats:{crt:0.01},proc:null,desc:''});
  const extra=rollDrop();
  const ok=(extra===null) && G._loot.length===500;
  G._loot=[];return ok;
})()`));

chk('pen em pontos-percentuais (8 = +0.08)', R(`(()=>{
  G._loot=[];G._loot.push({uid:nextUid(),slot:'weapon',rarity:'epic',name:'P',stats:{pen:8},proc:null,desc:''});
  const uid=G._loot[0].uid;
  const b=makeRunner('rex',0);computeStats(b);const p0=b.pen;
  equipItem('rex',uid);
  const a=makeRunner('rex',0);computeStats(a);
  return Math.abs((a.pen-p0)-0.08)<1e-9;
})()`));
chk('crt fracionária com teto 0.85', R(`(()=>{
  const u=makeRunner('rex',0);u.level=99;u.gear=[{stats:{crt:2.0}}];computeStats(u);
  return u.crt<=0.85;
})()`));
chk('hp +10% ≈ 1.10× no maxHp', R(`(()=>{
  const b=makeRunner('rex',0);computeStats(b);
  const a=makeRunner('rex',0);a.gear=[{stats:{hp:0.10}}];computeStats(a);
  return Math.abs(a.maxHp/b.maxHp-1.10)<0.001;
})()`));
chk('nextUid estritamente crescente', R(`(()=>{const a=nextUid(),b=nextUid();return b===a+1;})()`));

chk('save/load preserva loot e uidSeq', R(`(()=>{
  G._loot=[];G._loot.push({uid:nextUid(),slot:'core',rarity:'epic',name:'K',stats:{ach:0.05},proc:null,desc:''});
  save();
  const d=JSON.parse(localStorage.getItem(SAVE_KEY));
  return d.loot.length===1 && d.loot[0].name==='K' && typeof d.uidSeq==='number' && d.uidSeq>0;
})()`));
chk('load() restaura equip de runnerLevels', R(`(()=>{
  G._loot=[];G._loot.push({uid:nextUid(),slot:'armor',rarity:'rare',name:'L',stats:{def:0.12},proc:null,desc:''});
  const uid=G._loot[0].uid;equipItem('lyra',uid);save();
  const g=runnerGear('lyra');for(const k in g)delete g[k];     // corrompe em memória
  load();                                                       // restaura do save
  return !!(runnerGear('lyra').armor && runnerGear('lyra').armor.uid===uid);
})()`));
chk('gear legado (array) migra preservando as peças', R(`(()=>{
  const li=G.runnerLevels['sable'];
  li.gear=[{uid:9991,slot:'ring',rarity:'common',name:'L1',stats:{crt:0.01},proc:null,desc:''},
           {uid:9992,slot:'core',rarity:'rare',name:'L2',stats:{ach:0.03},proc:null,desc:''}];
  const g=runnerGear('sable');
  return !Array.isArray(g) && g.ring && g.ring.name==='L1' && g.core && g.core.name==='L2';
})()`));
chk('syncLiveGear reaplica stats nas unidades vivas', R(`(()=>{
  const r=G.runners[0];if(!r)return false;
  const a0=r.atq;
  G._loot.push({uid:nextUid(),slot:'weapon',rarity:'epic',name:'SYNC',stats:{atq:0.5},proc:null,desc:''});
  equipItem(r.id, G._loot[G._loot.length-1].uid);
  return r.atq>a0;
})()`));

S.done();
