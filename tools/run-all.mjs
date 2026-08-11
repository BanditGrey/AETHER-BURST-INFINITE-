#!/usr/bin/env node
/* ============================================================
 * run-all.mjs — roda as 6 suítes Node EM PARALELO e resume.
 * Antes: 6 comandos sequenciais (~55s). Agora: 1 comando (~42s — o smoke
 * domina o paralelo; os outros 5 terminam em ~7s).
 * Exit ≠ 0 se qualquer suíte falhar (bom p/ CI e p/ fechar fase).
 * ============================================================ */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SUITES = [
  ['gear',   'tests/test_gear.js',    'drops, equipar, cap, save/load, migração'],
  ['dmg',    'tests/test_dmg.js',     'carta elemental, mitigação, crit, escudo'],
  ['procs',  'tests/test_procs.js',   'os 11 gear procs com efeito real'],
  ['skills', 'tests/test_skills2.js', 'assets existem em disco + skills executam'],
  ['ui',     'tests/test_ui.js',      'markup do painel Gear + registro do auto-teste'],
  ['smoke',  'tests/smoke_ui.js',     'jsdom: splash→marcha→painéis→clique→save'],
];

const C = { r:'\x1b[31m', g:'\x1b[32m', y:'\x1b[33m', d:'\x1b[2m', b:'\x1b[1m', x:'\x1b[0m' };

function run([name, file, desc]) {
  return new Promise(resolve => {
    const t0 = Date.now();
    const p = spawn(process.execPath, [file], { cwd: REPO });
    let out = '';
    p.stdout.on('data', d => (out += d));
    p.stderr.on('data', d => (out += d));
    p.on('close', code => {
      const m = out.match(/==\s*\w+:\s*(\d+)\s*passaram,\s*(\d+)\s*falharam\s*==/);
      const pass = m ? +m[1] : 0, fail = m ? +m[2] : 0;
      const falhas = out.split('\n').filter(l => l.startsWith('FALHA')).map(l => l.trim());
      resolve({ name, desc, code, pass, fail, falhas, ms: Date.now() - t0,
                crashed: !m, raw: out.split('\n').slice(-6).join('\n') });
    });
  });
}

console.log(`\n${C.b}🧪 AETHER BURST — suíte completa${C.x} ${C.d}(6 suítes em paralelo)${C.x}\n`);
const t0 = Date.now();
const results = await Promise.all(SUITES.map(run));

let totP = 0, totF = 0, quebrou = false;
for (const r of results) {
  totP += r.pass; totF += r.fail;
  if (r.crashed) quebrou = true;
  const ok = !r.crashed && r.fail === 0;
  const ico = r.crashed ? `${C.r}💥${C.x}` : ok ? `${C.g}✅${C.x}` : `${C.r}❌${C.x}`;
  const cnt = r.crashed ? `${C.r}NÃO EXECUTOU${C.x}` : `${r.pass}/${r.pass + r.fail}`;
  console.log(`${ico} ${C.b}${r.name.padEnd(7)}${C.x} ${cnt.padEnd(18)} ${C.d}${r.ms}ms · ${r.desc}${C.x}`);
  for (const f of r.falhas) console.log(`     ${C.r}↳ ${f}${C.x}`);
  if (r.crashed) console.log(`${C.d}${r.raw}${C.x}`);
}

const secs = ((Date.now() - t0) / 1000).toFixed(1);
const tudoOk = totF === 0 && !quebrou;
console.log('');
if (tudoOk) {
  console.log(`${C.g}${C.b}══ ${totP}/${totP} OK em ${secs}s ══${C.x}`);
} else {
  console.log(`${C.r}${C.b}══ ${totP} OK · ${totF} FALHA(S) em ${secs}s ══${C.x}`);
  console.log(`${C.y}⚠  Fase NÃO pode ser fechada com suíte vermelha.${C.x}`);
  if (results.some(r => r.name === 'gear' && r.fail > 0 &&
                        r.falhas.some(f => /8 slots/.test(f)))) {
    console.log(`${C.d}   Nota: test_gear falha ~1 em 3 rodadas por bug de CONTEÚDO`);
    console.log(`   (só há relíquia em épico/lendário). É o item S1 da Fase B.${C.x}`);
  }
}
console.log('');
process.exit(tudoOk ? 0 : 1);
