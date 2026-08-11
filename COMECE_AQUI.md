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

## ⚖️ 5 decisões pendentes (responda antes de codar)

| # | Tema | Pergunta |
|---|---|---|
| **B4** | Luz vs Trevas | rivalidade mútua (ambos ×1,5, e o `weak` sai como código morto) **ou** triângulo real? |
| **B5** | Aether | neutro absoluto + penetração **ou** "elemento de vidro" (×1,5 dando e recebendo)? |
| **X-1** | Recrutamento | começar com **4** runners e conquistar 16 **ou** manter todos liberados? |
| **X-4** | Tamanho da zona | zonas 8–20 com 100 níveis (**2.000** no total) **ou** mais curtas? |
| **X-5** | Ordem | zonas primeiro (**sugerido** — dão contexto e local de recrutamento) **ou** runners primeiro? |

**B4 e B5 travam a Fase 0.** As outras três travam a expansão (X0+).

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

## 💡 Se amanhã só der para fazer uma coisa

Responda as **decisões B4 e B5** e mande fazer a **Fase 0**. É a única que
desbloqueia todas as outras, e cabe numa sessão.
