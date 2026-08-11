#!/usr/bin/env node
/* ============================================================
 * start.mjs — O COMANDO ÚNICO.  `npm start`
 *
 * Mostra, em uma tela: onde o projeto está, qual é a PRÓXIMA
 * fase desbloqueada, exatamente quais itens fazer, e o estado
 * das suítes. Zero necessidade de reler 4 documentos.
 * ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const C = { r:'\x1b[31m', g:'\x1b[32m', y:'\x1b[33m', c:'\x1b[36m', m:'\x1b[35m',
            d:'\x1b[2m', b:'\x1b[1m', x:'\x1b[0m' };

/* ---- lê o ROADMAP direto do PROGRESSO.html (fonte única de verdade) ---- */
const html = fs.readFileSync(path.join(REPO, 'PROGRESSO.html'), 'utf8');
const bloco = html.match(/const ROADMAP = (\[[\s\S]*?\n\]);/);
if (!bloco) { console.error('❌ ROADMAP não encontrado no PROGRESSO.html'); process.exit(2); }
const ROADMAP = eval(bloco[1]);

const TIPO = { bug:[C.r,'BUG'], sys:[C.y,'SISTEMA'], tool:[C.c,'FERRAMENTA'] };
const L = 78;
const line = (ch='─') => C.d + ch.repeat(L) + C.x;

console.log('');
console.log(`${C.b}${C.c}⚡ AETHER BURST: INFINITE${C.x} ${C.d}— painel de comando${C.x}`);
console.log(line('═'));

/* ---- estado geral ---- */
const totItens = ROADMAP.reduce((s,f) => s + f.items.length, 0);
console.log(`${C.b}📊 ESTADO${C.x}`);
console.log(`   ${ROADMAP.length} fases · ${totItens} itens planejados · ${C.d}0 executados (planejamento concluído)${C.x}`);
console.log(`   ${C.d}Jogo: 7 zonas · 8 runners · 7 inimigos → meta: 20 · 20 · ~40${C.x}`);
console.log('');

/* ---- a próxima fase (a primeira não concluída) ---- */
const proxima = ROADMAP[0];
console.log(`${C.b}${C.g}▶ COMECE POR AQUI${C.x}`);
console.log(line());
console.log(`${C.b}${proxima.fase}${C.x}${proxima.bloqueia ? `  ${C.r}⛔ bloqueia todas as seguintes${C.x}` : ''}`);
console.log(`${C.d}${proxima.obj}${C.x}`);
console.log('');
proxima.items.forEach((it, i) => {
  const [cor, lbl] = TIPO[it.t];
  const txt = it.n.length > 108 ? it.n.slice(0, 108) + '…' : it.n;
  console.log(`   ${C.b}${i + 1}.${C.x} ${cor}[${it.id}]${C.x} ${C.d}${lbl}${C.x}`);
  console.log(`      ${txt}`);
});
console.log('');

/* ---- as decisões que travam o começo ---- */
console.log(`${C.b}${C.y}⚖  DECISÕES${C.x}`);
console.log(line());
const decididas = [
  ['B4', 'Luz vs Trevas', 'rivalidade mútua — ×1,5 nos dois sentidos, sem defesa'],
  ['B5', 'Aether',        'neutro absoluto + 15% de penetração (cap total 0,90)'],
];
for (const [id, tema, r] of decididas)
  console.log(`   ${C.g}✅ ${id.padEnd(4)}${C.x} ${C.b}${tema}${C.x} ${C.d}— ${r}${C.x}`);

const decisoes = [
  ['X-1','Recrutamento',  'começar com 4 runners e conquistar 16 OU manter todos liberados?'],
  ['X-4','Tamanho da zona','zonas 8–20 com 100 níveis (=2.000 no total) OU mais curtas?'],
  ['X-5','Ordem da expansão','zonas primeiro (sugerido) OU runners primeiro?'],
];
for (const [id, tema, q] of decisoes)
  console.log(`   ${C.m}⏳ ${id.padEnd(4)}${C.x} ${C.b}${tema}${C.x} ${C.d}— ${q}${C.x}`);
console.log(`   ${C.d}(as 3 restantes travam a expansão X0+, não a Fase 0)${C.x}`);
console.log('');
console.log(`${C.g}${C.b}   ➜ A FASE 0 ESTÁ DESTRAVADA — pode executar inteira.${C.x}`);
console.log('');

/* ---- roadmap completo, resumido ---- */
console.log(`${C.b}🗺  ROADMAP COMPLETO${C.x} ${C.d}(sequencial — não pular fase)${C.x}`);
console.log(line());
ROADMAP.forEach((f, i) => {
  const trava = f.bloqueia ? ` ${C.r}⛔${C.x}` : '';
  const marca = i === 0 ? `${C.g}▶${C.x}` : `${C.d}🔒${C.x}`;
  console.log(`   ${marca} ${f.fase}${trava} ${C.d}(${f.items.length} itens)${C.x}`);
});
console.log('');

/* ---- comandos ---- */
console.log(`${C.b}>> COMANDOS${C.x}`);
console.log(line());
console.log(`   ${C.c}npm start${C.x}          esta tela`);
console.log(`   ${C.c}npm test${C.x}           6 suítes em paralelo (~42s, limitado pelo smoke)`);
console.log(`   ${C.c}npm run dev${C.x}        servidor em :8000`);
console.log(`   ${C.c}npm run dash${C.x}       abre o dashboard de progresso`);
console.log(`   ${C.c}npm run plano${C.x}      lista os documentos de planejamento`);
console.log('');
console.log(`${C.d}📋 Detalhes: PLANO_SKILLS.md (fases 0–E) · PLANO_EXPANSAO.md (20×20)`);
console.log(`   Dashboard vivo com checkboxes: PROGRESSO.html${C.x}`);
console.log('');
