# 🚀 COMECE AQUI

> Deixado pronto em **10/08/2026**, ao fim da sessão de planejamento.
> Amanhã, não precisa reler nada. **Um comando:**

```bash
npm start
```

Isso imprime: onde o projeto está, **qual é a próxima fase**, exatamente quais
itens fazer, as decisões pendentes e todos os comandos. A tela é gerada a partir
do `ROADMAP` do `PROGRESSO.html` — **fonte única de verdade**, nunca desatualiza.

---

## Os 5 comandos

| Comando | O que faz |
|---|---|
| `npm start` | 🎯 **o painel de comando** — comece por aqui |
| `npm test` | 6 suítes em paralelo — 1 comando em vez de 6 (~42 s, limitado pela suíte smoke) |
| `npm run dev` | servidor em `:8000` |
| `npm run test:browser` | auto-teste no Chromium real (instala o harness sozinho se faltar) |
| `npm run plano` | lista os documentos de planejamento |

---

## 📍 Onde paramos

**Sessão de planejamento concluída.** Nenhum código de jogo foi alterado —
só planejamento, dashboard e ferramentas.

- ✅ `PLANO_SKILLS.md` — auditoria + skills de IA + sistemas de profundidade (fases 0–E)
- ✅ `PLANO_EXPANSAO.md` — 20 mapas · 20 runners · bestiário regional · Codex vivo · Coleções (fases X0–X6)
- ✅ `PROGRESSO.html` — **13 fases / 54 itens**, com checkbox persistente e **travamento sequencial**
- ✅ `package.json` + `tools/` — o "um comando" (item **A1** do plano, já entregue)

---

## ⛔ A regra que não pode ser quebrada

**As fases são sequenciais.** No dashboard, uma fase só destrava quando a anterior
está 100%. Não é decoração — é o que impede o cenário que você descreveu:
*fazer tudo e sair quebrado no final.*

Cada fase fecha com:
1. `npm test` **verde**
2. entrada nova no array `MEMORY` do `PROGRESSO.html`
3. checkboxes marcados no dashboard

---

## 🔴 Por que a Fase 0 vem antes de tudo

A auditoria achou a **economia furada**:

- **Dungeons são infinitas** — o painel promete `3×/dia`, mas não há limite no
  código. *Shard Vault* paga **22.935 shards/clique** no nível 50; subir um runner
  do 1 ao 50 custa 3,1 M → **~135 cliques zeram a progressão de um personagem**.
- **Rift Tickets** e **Burst Cores** são moedas fantasma (existem, nunca são usadas).
- **Luz e Trevas** têm fraqueza morta; **Aether** não é forte nem fraco contra nada.

Somar Sets, missões e 20 mapas sobre isso significa **recalibrar tudo duas vezes**.

E a **Fase X0** (expansão) é bloqueadora pelo mesmo motivo: o elemento do inimigo é
indexado por posição (`[...][G.zone-1]`), então **da zona 8 em diante todo inimigo
vira `wind`**. Criar 13 mapas antes de corrigir isso espalha o bug por todos eles.

---

## ✅ Decisões TOMADAS (a Fase 0 está destravada)

| # | Tema | Decisão |
|---|---|---|
| **B4** | Luz vs Trevas | **Rivalidade mútua** — ×1,5 nos dois sentidos, sem defesa entre eles. O `weak` (código morto) sai; entra o campo `rival` para o tooltip parar de mentir *"▼ Fraco: Trevas"*. |
| **B5** | Aether | **Neutro absoluto + 15% de penetração.** Nunca ganha nem perde na carta; em troca, fura armadura. Cap de `penTotal` em **0,90** para não zerar a mitigação. |

> As duas **confirmam** a suíte atual (`test_dmg.js:32-33` já afirma
> `luz↔trevas ×1,5` e `aether neutro`). A penetração do aether é
> comportamento novo ⇒ **precisa de check novo** (regra do repo).

## ⏳ 3 decisões ainda pendentes (travam a expansão, não a Fase 0)

| # | Tema | Pergunta |
|---|---|---|
| **X-1** | Recrutamento | começar com **4** runners e conquistar 16 **ou** manter todos liberados? |
| **X-4** | Tamanho da zona | zonas 8–20 com 100 níveis (**2.000** no total) **ou** mais curtas? |
| **X-5** | Ordem | zonas primeiro (**sugerido** — dão contexto e local de recrutamento) **ou** runners primeiro? |

---

## 🗺️ As 13 fases, na ordem

| Fase | Foco |
|---|---|
| **0** ⛔ | Tapar o ralo — economia, moedas fantasma, carta elemental |
| **A** | Fundação de velocidade — `npm test` ✅, bump de versão, memória, simulador |
| **B** | ⭐ Tooltips ricos globais · ⭐ Sets de Gear 2/4 · Conselho Elemental |
| **C** | Retenção — missões diárias, eventos por zona, escolha de rota |
| **D** | Endgame — Burst Enhancement, Rift Infinito, 2ª árvore, vínculos |
| **E** | Loop de itens — forja, conquistas, export de save, offline real, áudio |
| **X0** ⛔ | Refatorar para escalar — elemento por zona, bestiário regional, sync genérico |
| **X1** | Zonas 8–13 (Atos II–III) |
| **X2** | Runners 9–14 + recrutamento |
| **X3** | Codex Vivo (5 abas, recompensas) |
| **X4** | Coleções (buff permanente por conjunto catalogado) |
| **X5** | Zonas 14–20 + Runners 15–20 + boss final |
| **X6** | Escala — mapa-múndi, formações salvas, lazy-load, balanceamento |

---

## 🎯 A FASE 0, item a item (pronta para executar)

Com B4/B5 decididos, a Fase 0 está **totalmente especificada**. Ordem sugerida:

### B4 · Rivalidade mútua *(o mais rápido)*
- `data.js`: `light`/`dark` → `weak: []` + `rival: "dark"` / `rival: "light"`
- `main.js` (linha ~1067): a linha `▼ Fraco:` passa a exibir `⚔ Rival: … (×1,5 nos dois sentidos)`
- ✅ check novo: *"luz/trevas não têm weak declarado (rivalidade é via `rival`)"*

### B5 · Aether neutro + penetração
- `data.js`: `aether` → `neutral: true, penBonus: 0.15`
- `engine.js` (~493): somar `penBonus` ao `pen` da fonte, com `Math.min(0.90, …)`
- ✅ checks novos: *"aether perfura 15% a mais"* · *"penTotal nunca passa de 0,90"*

### B2 · Rift Tickets viram moeda de verdade
- Ganho: **+3/dia** no login + **1 por boss** derrotado
- Gasto: **1 por run de dungeon**
- Persistir o carimbo do dia no save (com migração de save antigo)
- ✅ check novo: *"ticket é debitado ao rodar dungeon e bloqueia em 0"*

### B1 · Limite diário nas Dungeons *(o buraco de 22.935 shards/clique)*
- `G.dungeonUses = { <id>: n }` + reset por `new Date().toDateString()`
- Respeitar o `freq` que **já está escrito na UI** (3×/dia e 2×/dia)
- Botão desabilitado com contador *"2/3 restantes hoje"*
- ✅ check novo: *"4º clique no Shard Vault é recusado no mesmo dia"*

### D1 · Limpeza
- `engine.js:597` `recomputeRexAtx()` (typo, nunca chamado)
- `engine.js:865` `setTimeout(()=>{}, 0)` vazio
- `main.js:1501` `_dealDamageOrig` nunca usado

### Fechamento da fase
```bash
npm test            # tem que estar verde
```
\+ entrada nova no `MEMORY` do `PROGRESSO.html` + checkboxes marcados.
