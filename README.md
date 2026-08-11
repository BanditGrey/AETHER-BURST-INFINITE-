# ⚔️ AETHER BURST: INFINITE

**Idle RPG com sistema de Burst e Resonance** — versão web (HTML + Canvas + JS, sem frameworks).

> ## 🚀 Retomando o trabalho? **`npm start`**
> Um comando mostra onde o projeto está, qual é a próxima fase e o que fazer.
> Detalhes em **`COMECE_AQUI.md`**.
>
> | Comando | O que faz |
> |---|---|
> | `npm start` | painel de comando (estado + próxima fase + decisões pendentes) |
> | `npm test` | 6 suítes em paralelo, num comando |
> | `npm run dev` | servidor em `:8000` |
> | `npm run test:browser` | auto-teste no Chromium real (auto-instala o harness) |
> | `npm run plano` | lista os documentos de planejamento |

> 📊 **Dashboard de Progresso:** abra o **`PROGRESSO.html`** para ver gráficos de andamento,
> checklist de sistemas (prontos/em andamento/pendentes/ideias), inventário de assets
> (prontos/faltantes) e roadmap por fases. Os checkmarks salvam no navegador.
>
> 📋 **Plano Mestre:** o **`PLANO.md`** detalha o roadmap completo e o backlog de ideias.

## Estrutura do Projeto

```
PROGRESSO.html    # Dashboard de progresso/desenvolvimento (gráficos + checklists)
PLAN_ONLINE.md    # Plano para deixar o jogo online (Node/Postgres)
index.html        # Estrutura da UI (topo, batalha, navegação, painéis)
css/style.css     # Estilo anime neon (Orbitron/Rajdhani, dark + neon)
assets/           # Sprites e artes (assets/runners/...)
js/
├── data.js       # Dados: elementos, classes, runners, inimigos, zonas, equip, infinity circuit
├── fx.js         # Camada visual: partículas, números de dano, shake, flash, slow-mo
├── engine.js     # Simulação: combate, formação, Aether Burst, Burst Sync, progressão, save/offline
├── pixi.js       # Renderizador WebGL (PixiJS) — opt-in, com fallback automático p/ Canvas 2D
└── main.js       # Render do canvas/WebGL, DOM UI, input e game loop
```

## Como rodar

Serve a pasta com qualquer servidor estático e abre `index.html`:

```bash
# opção com Python
python3 -m http.server 8000
# depois abra http://localhost:8000
```

Ou apenas abra o `index.html` direto no navegador.

## Como jogar

- A marcha avança sozinha; derrote as ondas de Rift Entities para subir de nível.
- **Burst**: as barras enchem durante o combate — clique numa barra READY ⚡ para disparar o Aether Burst.
- **Burst Sync**: pares com Resonance suficiente disparam combos automáticos.
- Use **1× / 2× / 3× / BURST** para acelerar a marcha.
- **Esquadrão / Equipar / Dungeons / Codex / Infinity / Ascensão** para gerenciar progressão.
- A **Ascensão** é uma árvore de passivas: suba o nível da conta (XP da marcha) e complete entradas do **Codex** para ganhar **Pontos de Ascensão** e gastá-los em passivas globais permanentes (ATQ, DEF, HP, shards, drop, offline…) — sem nunca reiniciar progresso.
- Progresso é salvo automaticamente no navegador (`localStorage`), inclusive ganhos offline.

## Renderização (Canvas 2D vs WebGL/PixiJS)

O jogo roda por padrão no **Canvas 2D** e **sempre inicia imediatamente** — nenhum
script externo bloqueia o carregamento. Para ativar o **renderizador WebGL via PixiJS**
(GPU), abra com:

```
http://localhost:8000/?pixi=1
```

O PixiJS é carregado **dinamicamente** (async): enquanto ele baixa (ou se não estiver
disponível, ex.: sem internet), o jogo continua normalmente em Canvas 2D e **troca
para WebGL automaticamente** quando o Pixi fica pronto. Sem `?pixi=1` o jogo fica
sempre em Canvas 2D (rápido o suficiente para ~10 unidades na tela). O `pixi.js`
reimplementa a cena (fundo, unidades, sprites dos runners, FX, textos, HUD) usando
PIXI.Graphics/Text/Sprite; a lógica (`engine/data/fx/main-UI`) é idêntica nas duas rotas.

> Nota: a migração WebGL é uma primeira passada da camada de desenho. A validação
> visual final deve ser feita no navegador com `?pixi=1`.

---

**Feito com ❤️ para o AETHER BURST: INFINITE**

## 🧪 Testes headless

**No jogo:** botão **🧪 Testes** na navbar — auto-teste com "olho humano" (análise de pixels dos sprites, geometria real dos painéis, clique físico, profundidade da cena, raio serrilhado…), 20 frentes em `js/selftest.js`. Regra do repo: **feature nova ⇒ entrada nova no `SELFTESTS`**. Para CI/headless: `index.html?selftest=1` roda sozinho e expõe `window.__selftestResults`.

Suítes em `tests/` (**trackeadas no git** — já perdemos elas uma vez por sandbox wipe + gitignore, nunca mais), rodam com Node puro (vm) + jsdom:

```bash
node tests/test_gear.js     # gear: drops, equipar slots/acessórios, cap, save/load, migração legado (27)
node tests/test_dmg.js      # dano: carta elemental, mitigação/pen, crit, esquiva, escudo, kills (26)
node tests/test_procs.js    # os 11 gear procs com efeito real + caps + resets de combate (23)
node tests/test_skills2.js  # TODOS os assets referenciados existem em disco + skills executam (19)
node tests/test_ui.js       # markup do painel RIFT GEAR c/ contagens exatas + registro do auto-teste (19)
node tests/smoke_ui.js      # jsdom: fluxo real splash→marcha→painéis→clique→tooltip→save (31)
# total: 145 checagens — saída "== nome: X passaram, 0 falharam ==" e exit≠0 se quebrar
```

**Browser real (Chromium headless local — sem root, sem CDN):**

```bash
bash tests/setup_browser.sh   # 1× por sessão do sandbox (o /tmp é limpo entre elas)
python3 -m http.server 8000 --bind 0.0.0.0 &   # servidor local
node tests/st.js              # roda a suíte 🧪 in-game e imprime o relatório (exit 1 se falhar)
node tests/shot.js gear       # clique físico p/ equipar, rolagem da bag, stats na viewport + screenshots
node tests/shot.js game       # screenshot da cena + tempestade de raios
```
