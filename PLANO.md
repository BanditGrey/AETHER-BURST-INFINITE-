# 📋 PLANO MESTRE — AETHER BURST: INFINITE

> Este é o plano central do projeto. O acompanhamento visual (gráficos, checklists)
> está no **`PROGRESSO.html`** (dashboard). Este documento detalha o **porquê** e o
> **como** de cada frente de trabalho.

## 📊 REGRA OBRIGATÓRIA: MANTER O DASHBOARD ATUALIZADO
- **Sempre** que concluir, iniciar ou mudar qualquer sistema/asset/ideia, atualizar o
  `PROGRESSO.html` (marcar itens, ajustar status, adicionar ideias).
- O dashboard é o controle central do projeto — **não trabalhar sem atualizá-lo**.
- **Toda sessão de trabalho termina com entrada nova na seção "🧠 Memória do projeto"**
  do `PROGRESSO.html` (array `MEMORY`) — é a memória viva do que já foi feito.
- **Toda feature/sprite/função nova ganha entrada no auto-teste** (`js/selftest.js`,
  array `SELFTESTS`) — o botão 🧪 Testes do jogo sempre cobre o jogo inteiro.
- Ao criar um novo asset de personagem, registrar a descrição no `assets/REFERENCIA_ARTE.md`.
- Acesso rápido: botão **"Progresso"** no menu do jogo, ou abrir `PROGRESSO.html`.

---

## 🎯 Visão
Idle RPG web com **Burst/Resonance**, que evolui de um jogo jogável local para um
jogo **online** com conta, leaderboard e social — mantendo a cara de jogo de verdade.

---

## 🗂️ Frentes de trabalho (roadmap)

### FASE 1 — Fundação ✅ (concluída)
Jogo web jogável de ponta a ponta.
- [x] Núcleo de combate (alcance, crit, esquiva, elementos)
- [x] Formação de esquadrão (grade fixa 2×3 — 6 slots no setor esquerdo, âncora nos pés)
- [x] Aether Burst + Burst Sync/Resonance
- [x] Progressão de marcha e zonas
- [x] Economia (Shards, Tickets, Fragments)
- [x] Save/offline (localStorage)

### FASE 2 — Sistemas de progressão ✅ (concluída)
- [x] Infinity Circuit
- [x] Árvore de Ascensão
- [x] Codex
- [x] Dungeons
- [x] Inventário de Gear (coleta/drop)

### FASE 3 — Polimento visual ✅ (concluída)
Base gráfica em 2 motores (Canvas + WebGL/Pixi), sprites dos Runners no padrão.
- [x] Render WebGL via PixiJS (opt-in)
- [x] Sprites dos Runners (padrão de arte definido e salvo)
- [x] Sons (WebAudio) + mute
- [x] **Sprites de inimigos e bosses**
- [x] **Arte de fundo por zona (7 zonas)** — v2 regenerada com plano de chão em perspectiva (anti-flutuação da grade 2×3)
- [x] **Idle dos Runners com pés plantados** (squash & stretch + inclinação de ataque)
- [x] **Sprites de skills (8 Runners + 7 mobs)** — 15 artes geradas/derivadas (chroma+despill), integradas via camada `FX.sprite()` no Canvas e no Pixi; ataques de mobs e pulso de morte do Surge também usam sprite
- [x] **Números de dano por tipo + efeitos de impacto** — tipos basic/skill/burst/crit/miss/shield/heal, efetividade elemental (▲ super ×1.5 com anel de impacto / ▼ fraco ×0.66 em cinza), dano em runner vermelho; escudos passaram a absorver dano de verdade (bug: shieldHp era só decorativo)
- [x] **UI com cara de jogo** — tela de título/splash (libera o áudio no clique), wipe cinematográfico ao trocar de zona, overlay de pausa, cards de painel com entrada escalonada, botão ✕ estilizado, chanfros e brilho varrendo

### FASE 4 — Conteúdo & profundidade (pendente)
- [x] **Gear PROCS reais** — os 11 efeitos de sabor viraram mecânicas: descarga em cadeia, pós-esquiva ×3, congelar em skill, +2% dano/ataque, Gravity Mark no básico, +10% Burst Sync, cura 15% no Burst, +10% ATQ aliado no Burst, +20% vs debuff, sobreviver c/ 1 HP (1×/combate), Burst +dano por HP; chip ✦PROC no card
- [x] **Painel Equipar estilo tela de jogo** (referência do usuário) — coluna de runners com estrelas/poder, retrato central c/ sprite + aura, 8 slots brilhando (4 de cada lado; vazio = socket losango entalhado), PODER em destaque, grid de stats que preenche o centro, ícones de elemento/passiva/skill/burst **com tooltip rico próprio** (arte da skill em banner, tag de tipo colorida, forte/fraco do elemento, carga do burst — fora `title` nativo), inventário em grade de ícones **com arte recortada** c/ tooltip no hover, equip em 1 clique, painel sempre contido na tela (sem rolagem geral) e **bag que rola com roda ou arraste**
- [x] **Equipar gear de verdade + inventário organizado** — loadout por runner (⚔🛡💠🔮 + 💍✨📿⛓️ com glow de raridade), stats reais via computeStats, uid por peça, cap 500 (sem apagar nada), reciclar opcional em massa p/ 💎, tudo persistido no save
- [x] **Acessórios (4 slots novos)** — Anel 💍 CRT/CDG · Brinco ✨ PEN/ACH · Colar 📿 HP/DEF · Pulseira ⛓️ SPD/EVA — 20 peças (5 raridades cada), inventário virou grade de **ícones quadrados com arte própria gerada** (`assets/icons/slot_*.png`) + tooltip rico (stats, PROC, descrição, reciclar) **flutuante em position:fixed — nunca é cortado pela caixa do inventário** ao passar o mouse; painel sem rolagem geral — **só a grade do inventário rola**, stats sobem p/ preencher o centro
- [x] **Blindagem do painel Gear** (bugs reais vistos em jogo) — corrente de altura do painel consertada (`#panelContent` flex + linha do grid `minmax(0,1fr)`: antes a linha crescia com o conteúdo da bag → stats ficavam fora da área visível e a bag não rolava); **clique-equip sequestrado** pelo arraste da bag resolvido (pointer capture só depois do threshold de 6px — capturar no pointerdown retargava o click p/ a grade); tooltip flutuante virou **click-through** (só o botão ♻ recebe ponteiro; hover do tooltip via bubbling)
- [x] **Cena de combate polida** — inimigos com **pés plantados** (squash & stretch na base, sem translação vertical; haviam ficado de fora do anti-flutuação dos runners); profundidade runners×inimigos **entrelacada por y** nos dois renderers, com **zIndex reatribuído a cada frame no Pixi** (a ordem de `addChild` travada deixava os sprites inimigos eternamente por cima dos runners); "árvores" placeholder (triângulos do parallax de fallback) **não são mais desenhadas sobre a arte pintada** da zona (só aparecem no fallback de gradiente, agora como aglomerados de lascas de rift); **raio de burst procedural** (`FX.lightning`: polilinha serrilhada por midpoint-displacement + ramos + núcleo branco + clarão na origem — a fenda no céu — e no impacto; nada mais de traço reto caindo "do nada") — renderizado no Canvas e no Pixi
- [x] **Auto-teste in-game com "olho humano" (botão 🧪 Testes)** — suíte declarativa em `js/selftest.js` (`SELFTESTS`) cobrindo 4 frentes: **Assets** (análise de pixels: sprite que carrega mas tá vazio/placeholder é flagrado — % opaco + buckets de cor + proporção), **Cena** (pés na faixa do chão, ninguém atravessa runner, raio provadamente serrilhado, tempestade do burst dispara), **Painéis** (geometria real na viewport, stats visíveis, bag rolável, equip por sequência física de ponteiro, tooltip click-through), **Motor** (gear muda stats, reciclar, drops, stats sãs, dano+número, save roundtrip). Snapshot/restore de loot/shards/gear — roda sem sujar a conta. `?selftest=1` roda headless e expõe `window.__selftestResults`. **📏 REGRA PERMANENTE: toda feature/sprite/função nova GANHA uma entrada em `SELFTESTS` — sem exceção.**
- [x] **Dashboard vivo + suítes à prova de wipe** — `PROGRESSO.html` reformulado: % sempre recalculado dos dados (`isDone` por status), marcações manuais persistidas (`aether_progress_v2`, chave sanitizada única — antes o toggle escrevia numa chave e lia noutra), fases re-alinhadas com os sistemas reais (F1–F3 100% · F4 88% · F5 online 0%), seção **🧠 Memória do projeto** (`MEMORY`, entrada nova por sessão — regra no topo deste arquivo). Suítes Node reconstruídas e agora **trackeadas no git** (`tests/` saiu do `.gitignore` — um sandbox wipe já tinha apagado tudo): 145 checks (gear 27 · dmg 26 · procs 23 · skills/assets 19 · ui 19 · smoke 31), com regressão nova que garante **todo asset referenciado existe em disco**; a suíte refeita ainda pegou um bug real: `runnerGear()` migrava save legado descartando as peças — corrigido preservando tudo
- [ ] Achievements / conquistas
- [ ] Balanceamento fino (progressão, drop, dificuldade)
- [ ] Mais zonas/conteúdo (além das 7 do MVP)
- [ ] Modo Companion refinado

### FASE 5 — Online (futuro)
- [ ] Contas + login
- [ ] Save na nuvem (Node/Postgres)
- [ ] Leaderboard global
- [ ] Chat / clãs / amigos
- [ ] Boss mundial colaborativo
- [ ] Arena / PvP assíncrono

---

## 💡 Backlog de IDEIAS (não bloqueiam a versão atual)

### Gameplay
- **Mestre de Elementos:** bônus por ter 2+ runners do mesmo elemento em formação.
- **Set de Gear:** bônus ao equipar 2/3/4 peças do mesmo conjunto.
- **Caminho de Ascensão dupla:** 2ª árvore (ex.: "Ressonância") a desbloquear mais tarde.
- **Missões diárias/semanais** com recompensas (estrutura pronta p/ Dungeons).
- **Eventos rotativos por zona** (ex.: zona do mês com drop +X%).

### Social / Online
- **Perfil público** com esquadrão + conquistas.
- **Desafios entre amigos** (comparar power, tempo de marcha).
- **Guilda** com cofre e raid conjunto.
- **Marketplace** de itens entre jogadores (quando gear tiver valor).

### Técnico
- **Importar/exportar save** (código) para backup manual.
- **PWA** (instalável no celular, offline).
- **Compressão/otimização dos sprites** (atlas/atlaspack) para reduzir downloads.
- **Modo sombrio / tema por zona** no UI.

### Visual
- ~~**Animações de entrada** dos Runners~~ ✅ idle refeito: respiração squash & stretch com pés plantados (fim da flutuação) + inclinação de ataque.
- **Efeito de burst por personagem** mais elaborado (partículas por elemento).
- **Retratos/emoções** dos Runners em diálogo/codex.

---

## 🧭 Ordem sugerida para os PRÓXIMOS trabalhos reais
1. ~~**Sprites dos inimigos**~~ ✅ feito.
2. ~~**Integrar sprites de inimigos**~~ ✅ feito.
3. ~~**Arte de fundo das 7 zonas**~~ ✅ feito (v2 com plano de chão anti-flutuação).
4. **UI estilizada.** ← próximo

> Cada frente é acompanhada no `PROGRESSO.html`. Ao marcar itens lá, o gráfico
> geral atualiza automaticamente.
