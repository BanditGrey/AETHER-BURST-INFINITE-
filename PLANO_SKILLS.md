# ⚡ PLANO — SKILLS DE IA + SISTEMAS DE PROFUNDIDADE

> **Objetivo desta frente:** parar de gastar tempo com a *cerimônia do repo* e
> gastar tempo com o *jogo*. Duas metades que se apoiam:
>
> 1. **Skills + scripts** — encapsular os rituais repetitivos (asset, sistema novo,
>    QA, fechamento de sessão) para que cada um vire **1 comando / 1 instrução**.
> 2. **Sistemas de profundidade** — o conteúdo novo que dá o que fazer ao jogador,
>    já desenhado para ser construído *com* essas skills.
>
> Este documento é o **plano**. Nada aqui foi implementado ainda.
> Companheiros: `PLANO.md` (roadmap geral) · `PLAN_ONLINE.md` (fase 5) ·
> `ARTE_STILO.md` + `assets/REFERENCIA_ARTE.md` (padrão de arte).

---

## 📊 PARTE 0 — Auditoria: onde o tempo vai hoje

Medido no repo atual, não estimado.

| Ritual | Passos manuais hoje | Dor real |
|---|---|---|
| **Criar 1 asset** | ler `ARTE_STILO.md` → gerar → amostrar chroma → `-fuzz` → despill → `-trim` → resize → conferir cantos/olhos → linha em `REFERENCIA_ARTE.md` → linha em `PROGRESSO.html` → entrada em `SELFTESTS` | **10 passos.** Pipeline ImageMagick é copiado da doc toda vez; esquecer o despill deixa franja verde |
| **Fechar sessão** | entrada no `MEMORY` → checkbox no `PLANO.md` → status no `PROGRESSO.html` → entrada no `SELFTESTS` → bump de cache-bust | Cache-bust vive em **4 constantes diferentes** (`gear11-0810` em 7 refs do `index.html`, `bgv2-0810` em `main.js` **e** `pixi.js`, `skv2-0810` no `fx.js`, `st1-0810` no `selftest.js`) + 2 men­ções no `PROGRESSO.html`. Dessincronizar é fácil e silencioso |
| **Rodar a bateria** | 6 comandos `node` separados (~55 s) | Não existe `npm test`. Não existe `package.json` na raiz. `setup_browser.sh` precisa rodar de novo **toda sessão** (o `/tmp` é limpo) |
| **Sistema novo** | `data.js` (dados) + `engine.js` (regra) + `main.js` (painel + bind) + `style.css` + `selftest.js` + `PROGRESSO.html` + suíte Node | **7 arquivos**, tudo copiado à mão de um sistema parecido. Um painel novo = ~80 linhas de template repetido |
| **Bug de layout/interação** | subir servidor → `setup_browser.sh` → `node tests/st.js` → ler | Funciona bem, mas o setup é redescoberto toda vez |

**Diagnóstico:** o projeto tem QA excelente (145 checks Node + 20 in-game) e
documentação viva rara. O que falta é **automação da cola entre eles**.

### 🐛 Dívida encontrada na leitura (entra no plano como correção)

| Item | Onde | Gravidade |
|---|---|---|
| `test_gear` falha ~1 em cada 3 rodadas | `tests/test_gear.js:11` | 🔴 **Real** — não é teste chato: o `EQUIPMENT_POOL` só tem **relíquia em épico/lendário**. Em 2.000 simulações de 140 drops, a cobertura dos 8 slots deu **67,1%** (faltou `relic` 600×, `weapon` 67×, `core` 10×). Um jogador novo **nunca vê relíquia**. Corrigido de graça pela Parte 2 (Sets) |
| `recomputeRexAtx()` — código morto (typo de `Atq`) | `engine.js:597` | 🟡 Limpeza |
| `setTimeout(()=>{}, 0)` vazio | `engine.js:865` | 🟡 Limpeza |
| `const _dealDamageOrig = dealDamage` nunca usado | `main.js:1501` | 🟡 Limpeza |
| `drawWeapon` do Pixi desenha em coords absolutas (Striker/Blaster/Resonator) | `pixi.js:275` | 🟢 Só afeta fallback vetorial, que quase nunca roda |
| `ARTE_STILO.md` diz "regerar os 7 runners" | `ARTE_STILO.md` (fim) | 🟢 Doc desatualizado — os 8 já estão no padrão |

---

## 🧠 PARTE 1 — Arquitetura das Skills

### Conceito

Uma **skill** = uma pasta com um `SKILL.md` (o procedimento que o agente segue,
em linguagem natural + regras duras) e opcionalmente `tools/` (scripts que fazem
o trabalho pesado). O agente lê o `SKILL.md` e executa; o humano pode rodar o
script direto. **Os dois caminhos usam a mesma ferramenta** — nunca divergem.

```
skills/
├── README.md                    # índice: qual skill usar para quê
├── asset-pipeline/
│   ├── SKILL.md                 # padrão de arte, chroma, despill, checagem, registro
│   └── tools/
│       ├── process-sprite.sh    # chroma+despill+trim+resize (auto-detecta verde/magenta)
│       └── verify-asset.mjs     # cantos transparentes? opaco? nº de cores? proporção?
├── novo-sistema/
│   ├── SKILL.md                 # os 7 pontos de integração, em ordem, com checklist
│   └── tools/
│       └── scaffold-system.mjs  # gera esqueleto: dados + painel + bind + CSS + testes
├── qa-completo/
│   ├── SKILL.md                 # quando rodar o quê; como ler falha; regra do SELFTESTS
│   └── tools/
│       └── run-all.mjs          # 6 suítes Node em paralelo + resumo único
├── fechar-sessao/
│   ├── SKILL.md                 # o ritual de fim de sessão, na ordem certa
│   └── tools/
│       ├── bump-version.mjs     # bump atômico dos 4 cache-busts + PROGRESSO
│       └── add-memory.mjs       # injeta entrada no array MEMORY
└── balanceamento/
    ├── SKILL.md                 # como ler as curvas, o que é saudável
    └── tools/
        └── simulate.mjs         # roda o engine headless N níveis, cospe CSV/tabela
```

**Por que pasta no repo e não só instrução no chat:** versionado no git, sobrevive
a sandbox wipe (lição que o repo já aprendeu com o `tests/`), e qualquer sessão
futura — sua ou de um agente — começa sabendo as regras sem precisar reler 3 docs.

---

### As 5 skills

#### 1. `asset-pipeline` — de 10 passos para 1
**Resolve:** o ritual de arte inteiro.

- `process-sprite.sh entrada.png saida.png` — **amostra a cor do canto** para
  decidir o chroma (verde `#00FF00` padrão / magenta para arte verde), aplica
  `-fuzz 42%` + **despill** (o passo que o `REFERENCIA_ARTE.md` marca como "o que
  limpa de verdade" e que é fácil esquecer), `-trim +repage`, resize por tipo:
  runner/inimigo → 256×256 quadrado centrado; skill FX → máx 256 px **preservando
  proporção**; ícone → 192 px.
- `verify-asset.mjs` — a checagem que hoje é olhômetro: cantos com alpha 0, % de
  pixels opacos, nº de buckets de cor (pega placeholder chapado), proporção.
  **Mesma heurística do `stImgBatch()` do `selftest.js`**, reaproveitada fora do browser.
- O `SKILL.md` carrega o prompt padrão e a tabela de identidade dos 8 runners, e
  **obriga** o registro em `REFERENCIA_ARTE.md` + `PROGRESSO.html` + `SELFTESTS`.

**Ganho:** ~10 passos → `process-sprite.sh` + `verify-asset.mjs` + 3 registros guiados.

#### 2. `novo-sistema` — o scaffold que não existe
**Resolve:** os 7 arquivos tocados a cada sistema.

`scaffold-system.mjs --nome=sets --painel --save-fields=gearSets` gera:
- bloco de dados comentado em `data.js` no padrão das constantes existentes;
- `panelX()` + `bindX()` no `main.js` seguindo o formato dos 6 painéis atuais;
- botão na navbar do `index.html`;
- bloco CSS no padrão dos cards;
- **campos novos no `save()`/`load()`** com normalização de save antigo (o repo já
  foi mordido por isso: `runnerGear()` migrava jogando peças fora);
- `tests/test_<nome>.js` pré-populado com o harness `_vm.js`;
- entrada em `SELFTESTS` e linha em `PROGRESSO.html`.

**Ganho:** ~80 linhas de template repetido → comando + preencher a regra de negócio.
E o mais importante: **impossível esquecer o `load()`** — a causa de bug mais cara aqui.

#### 3. `qa-completo` — 1 comando
**Resolve:** 6 comandos + setup redescoberto.

- `package.json` na raiz (só scripts, **sem dependências** — o jogo continua
  framework-zero; o jsdom mora em `~/.uitest` como já mora).
- `npm test` → `run-all.mjs`: 6 suítes **em paralelo**, resumo único
  `✅ 145/145` e exit≠0 se qualquer uma cair. Os ~55 s sequenciais viram ~15 s.
- `npm run test:browser` → detecta se `~/.uitest` existe, roda `setup_browser.sh`
  sozinho se preciso, sobe o servidor, roda `st.js`, derruba o servidor.
- `SKILL.md` documenta **quando** rodar cada uma e a regra permanente:
  *feature nova ⇒ entrada nova no `SELFTESTS`*.

#### 4. `fechar-sessao` — o ritual atômico
**Resolve:** cache-bust espalhado + memória esquecida.

- `bump-version.mjs 0811` — atualiza **de uma vez** os 4 cache-busts
  (`index.html` ×7, `main.js`, `pixi.js`, `fx.js`, `selftest.js`) + as 2 menções
  no `PROGRESSO.html`. Hoje é o ponto mais fácil de dessincronizar em silêncio.
- `add-memory.mjs --titulo="..." --item="..." --item="..."` — injeta entrada nova
  no topo do array `MEMORY` com a data certa.
- `SKILL.md` = a ordem correta: rodar QA → bump → memória → status no
  `PROGRESSO.html` → checkbox no `PLANO.md` → commit.

#### 5. `balanceamento` — a que hoje não existe de jeito nenhum
**Resolve:** "balanceamento fino" está no plano como pendência **sem ferramenta**.

`simulate.mjs --niveis=1-100 --squad=frost,rex,nina,kairo,seraph,zael` roda o
engine **headless** (o `_vm.js` já prova que dá: sobe `data+fx+engine` sem browser)
e cospe uma tabela: tempo por nível, DPS efetivo, mortes, drops/hora, shards/hora,
XP/hora, quando cada zona vira parede.

**Isso destrava a Parte 2 inteira** — sem simulador, todo número novo de
progressão é chute, e chute em idle game é o que mata a curva.

---

## 🎮 PARTE 2 — Sistemas de profundidade (a prioridade escolhida)

Ordenados por **impacto ÷ esforço**, e cada um plugando em hook que **já existe**
no código — nenhum exige reescrever o motor.

### 🥇 S1 · Sets de Gear
> *Backlog: "Set de Gear: bônus ao equipar 2/3/4 peças do mesmo conjunto."*

**Desenho:** cada item ganha `set: "stormcaller"`. Tabela `GEAR_SETS` com bônus
em 2 e 4 peças. 4–5 sets temáticos alinhados aos elementos:

| Set | 2 peças | 4 peças |
|---|---|---|
| **Stormcaller** ⚡ | +8% SPD | Básico tem 25% de chance de raio em cadeia |
| **Emberfang** 🔥 | +10% CDG | Abaixo de 50% HP, +25% ATQ |
| **Glacier Ward** ❄️ | +12% DEF | Ao ser atingido, 20% de congelar o agressor |
| **Void Regalia** 🌑 | +10% PEN | Gravity Mark dura o dobro |
| **Solar Aegis** ☀️ | +10% HP | Burst concede escudo a todo o esquadrão |

**Onde pluga:** `computeStats()` já tem o loop sobre `runnerUnit.gear` — basta
contar sets antes de aplicar. Painel Gear já mostra chips.
**Bônus:** é a hora de **preencher o buraco do pool** — criar arma/núcleo/relíquia
em comum/incomum/raro. Corrige o `test_gear` flaky e o "novato nunca vê relíquia".
**Esforço:** baixo. **Impacto:** alto — transforma o inventário de "número maior
vence" em decisão.

#### 📌 S1 — decisões travadas nesta conversa

- **Bônus em 2 e 4 peças** (não 2/3/4). Motivo: com 8 slots por runner, degraus em
  2/4 deixam espaço para **misturar dois sets** (4+4) ou ir fundo em um (4) e
  completar com avulsas. Três degraus achatariam a escolha.
- **Tooltip rico obrigatório** — ver S7 abaixo. O tooltip do set mostra as peças
  equipadas em destaque, as que faltam em cinza, e o bônus do próximo degrau.

### 🆕 S7 · Tooltips ricos em TODOS os painéis
> *Pedido direto nesta conversa. Hoje o tooltip bonito existe **só** no painel Gear.*

**O problema, medido:** o `gtipShowFor()` + `.gtip/.sktip` (tooltip flutuante
`position:fixed`, com arte, chips de raridade, stats e PROC) é usado **apenas**
dentro de `.gearwrap`. Todo o resto do jogo usa `title=` **nativo do browser** —
o balãozinho cinza, atrasado, sem cor, sem ícone, que não dá para estilizar:

| Onde | Hoje | Impacto |
|---|---|---|
| Nós do Infinity Circuit | `title="ATQ +: +10% ATQ global (1💠)"` | 12 nós sem preview de efeito |
| Nós da Ascensão | `title="Força Bruta: +5% ATQ global (1⭐)"` | 19 nós — o jogador não vê **pré-requisito nem o que destrava** |
| Cards do Esquadrão | nada | não mostra passiva/skill/burst na hora de escalar |
| Slots da formação 2×3 | `title="KAIRO"` | só o nome |
| Chips de Resonance | nada | não explica o que o nível faz nem quanto falta |
| Recursos da topbar | `title="Aether Shards"` | não diz para que serve |
| Dungeons | nada | não diz recompensa esperada |

**Plano:** promover o tooltip do Gear a **componente global**.
1. Extrair `gtipShowFor()`/`gtipHide()` do escopo do Gear para um módulo de UI.
2. Criar `richTip(alvo, conteúdo)` genérico com variantes: `node` (efeito, custo,
   pré-requisitos, o que destrava), `runner` (retrato, elemento, passiva, skill,
   burst, sync), `resonance` (nível, XP até o próximo, o que o Sync faz),
   `recurso` (para que serve, como ganhar), `dungeon` (recompensa estimada).
3. **Trocar os 6 `title=` restantes** por tooltip rico.
4. Regra nova para o repo: **UI nova nasce com tooltip rico — `title=` só como
   fallback de acessibilidade.**

**Onde pluga:** o CSS (`.gtip`, `.sktip`, `#gtipFloat`) e o posicionamento
anti-corte **já estão prontos e testados** — inclusive o comportamento
click-through validado pelo `selftest.js`. É reuso, não construção.
**Esforço:** médio-baixo. **Impacto:** alto na *legibilidade* — o jogo tem
sistemas profundos (12 nós Infinity, 19 de Ascensão, 5 pares de Sync) que hoje
são **opacos**. Tooltip rico é o que faz o jogador entender o que está comprando.

---

### 🥈 S2 · Conselho Elemental (Mestre de Elementos)
> *Backlog: "bônus por ter 2+ runners do mesmo elemento em formação."*

**Desenho:** a formação 2×3 ganha leitura estratégica.
- **2 do mesmo elemento** → +8% de dano daquele elemento
- **3+** → desbloqueia a **aura da zona**: todos resistem 15% ao elemento oposto
- **6 elementos distintos** → *Prisma*: +10% em tudo (recompensa o time variado)

**Onde pluga:** `applyOvercharge()` já é o ponto que recalcula todos os stats do
esquadrão após qualquer mudança — é literalmente o gancho pronto.
**Esforço:** muito baixo. **Impacto:** alto — dá **motivo para trocar a formação**,
que hoje é montada uma vez e esquecida.

### 🥉 S3 · Missões diárias e semanais
> *Backlog: "Missões diárias/semanais com recompensas."*

**Desenho:** 3 diárias + 1 semanal, rotativas, com barra de progresso.
Exemplos: *abata 200 entidades* · *dispare 10 Aether Bursts* · *ative 2 Burst
Syncs* · *derrote 1 boss* · *equipe uma peça épica*.
Semanal: *avance 3 zonas* / *complete 12 diárias*.

**Onde pluga:** `G.stats` **já conta** `kills`, `bursts`, `syncs`, `bosses`. As
missões são deltas sobre esses contadores — quase nenhum código novo de combate.
Reset por data (`new Date().toDateString()`), **sem servidor**.
**Esforço:** médio (painel novo + campos no save). **Impacto:** muito alto — é o
que transforma "abri o jogo uma vez" em **motivo para voltar amanhã**, exatamente
o que falta num idle sem online.

### 4️⃣ S4 · Eventos rotativos por zona
> *Backlog: "zona do mês com drop +X%."*

**Desenho:** a cada dia, uma zona vira **Rift Instável** — +50% de drop, +30% de
shards, inimigos +15% de HP. Selo animado na topbar. Seed determinístico da data:
sem servidor, e ainda assim "o mundo mudou hoje".
**Onde pluga:** `killUnit()` já aplica multiplicadores de `allBonuses()` — entra um
fator a mais. **Esforço:** baixo. **Impacto:** médio-alto — sinergia direta com S3.

### 5️⃣ S5 · Segunda árvore: Ressonância
> *Backlog: "Caminho de Ascensão dupla."*

**Desenho:** `ASCENSION_NODES` ganha campo `tree: "poder" | "ressonancia"`.
Painel Ascensão vira duas abas. A árvore nova é focada no pilar identitário do
jogo: velocidade de carga de Burst, chance de Sync, dano de Sync, redução de
cooldown de Sync, ganho de XP de Resonance, **Sync triplo** no topo.
**Onde pluga:** a árvore atual já é 100% data-driven (`prereq`, `cost`, `effect`,
`x/y`) — é adicionar dados + abas. **Esforço:** médio-baixo.
**Impacto:** alto no endgame — dá **destino para os Pontos de Ascensão** depois
que a árvore atual (19 nós) fecha.

### 6️⃣ S6 · Conquistas
> *Único item marcado `[ ]` na Fase 4 além do balanceamento.*

**Desenho:** ~30 conquistas em faixas (abates, bursts, syncs, zonas, coleção de
gear, sets completos, níveis de runner), cada uma pagando Shards / Fragmentos /
Pontos de Ascensão. **Onde pluga:** `G.stats` de novo — a maioria é consulta pura.
**Esforço:** baixo-médio. **Impacto:** médio — dá superfície de "colecionar".

---

## 🔴 PARTE 2B — Buracos encontrados na auditoria (o que o jogo *deveria* ter e não tem)

> Isto **não é backlog de ideias** — é coisa quebrada, morta ou faltando que
> encontrei lendo o código. Ordenado por gravidade.

### B1 · 🔴 A economia está furada — Dungeons são infinitas
**O bug:** o painel Dungeons diz `3×/dia` e `2×/dia`, mas **não existe nenhum
limite no código**. O handler é literalmente `onclick → run() → save()`. Dá para
clicar para sempre.

Medido: *Shard Vault* no nível 50 paga **22.935 shards por clique**. Subir um
runner do nível 1 ao 50 custa **3.099.157** — ou seja, **~135 cliques zera a
progressão inteira de um personagem**. E o *XP Surge* dá XP direto, o *Resonance
Trial* dá +80 de Resonance por clique (o nível máximo exige 1.400).

**Consequência:** todo o resto — Sets, missões, balanceamento — é decorativo
enquanto existir um botão que imprime recurso infinito. **Qualquer trabalho de
balanceamento precisa vir depois disso.**

**Correção:** implementar de verdade o limite diário anunciado (`G.dungeonUses`
com reset por data) e **conectar os Rift Tickets** (ver B2) como custo de entrada.

### B2 · 🔴 Rift Tickets: moeda fantasma
Aparecem na topbar (`⭐ 3`), são salvos, têm ícone... e **nunca são gastos nem
ganhos**. As duas únicas referências no código inteiro são "exibir" e "salvar".
O jogador começa com 3 e morre com 3.

**Correção:** virar a **moeda de entrada das Dungeons** (1 ticket por run,
regenera N por dia / cai de boss). Resolve B1 e B2 de uma vez, com uma moeda que
já existe na UI.

### B3 · 🔴 Burst Cores: recurso órfão
A dungeon *Burst Core Mine* dá `G._burstCores += 3`. **Nada no jogo consome, exibe
ou salva isso** — nem aparece na topbar, nem entra no `save()`. O texto promete
"Burst Enhancement", sistema que não existe.

**Correção — duas rotas:** (a) criar o sistema **Burst Enhancement** (upar o
Aether Burst de cada runner: dano, carga, efeito extra no nível 5) — é conteúdo
de endgame legítimo e o recurso já tem fonte; ou (b) remover a dungeon até existir.
**Recomendo (a)** — encaixa perfeito com a 2ª árvore (S5).

### B4 · 🟠 Luz e Trevas têm fraqueza morta
`light` declara `strong:["dark"]` **e** `weak:["dark"]`; `dark` faz o espelho.
Como o `elementMultiplier()` testa `strong` primeiro, o `weak` **nunca é
alcançado** — luz sempre bate ×1,5 em trevas e trevas sempre ×1,5 em luz. A
intenção óbvia era "rivalidade mútua", mas na prática **não existe defesa**:
os dois se anulam e viram só dano dobrado dos dois lados.

**Correção:** decidir o design — ou rivalidade real (ambos ×1,5, e aí remover o
`weak` que é código morto e documentar), ou triângulo de verdade. Hoje o dado
mente sobre o próprio comportamento, e o tooltip de elemento (S7) vai **exibir
"▼ Fraco: Trevas" para uma fraqueza que não existe**.

### B5 · 🟠 Aether é elemento sem identidade
`aether` tem `strong:[]` e `weak:[]` — nunca é forte nem fraco contra nada. É o
elemento da zona 7 (endgame) e do inimigo *Surge*. Resultado: a zona final é a
**menos** interessante elementalmente.

**Correção:** dar identidade — ex.: Aether ignora a carta elemental (sempre ×1,0,
"neutro absoluto") **e** perfura 15% de DEF; ou é forte contra tudo e fraco contra
tudo (×1,5 dando e recebendo, o "elemento de vidro"). Qualquer uma é melhor que
"não faz nada".

### B6 · 🟡 Zona 7 é o fim do mundo
`nextLevel()` faz `G.zone = Math.min(ZONES.length, G.zone + 1)`. Ao terminar a
zona 7 nível 100, o jogador **volta para o nível 1 da zona 7, para sempre**. Não
há prestígio, não há New Game+, não há dificuldade escalável. O idle acaba.

**Correção:** *Rift Infinito* — depois da zona 7, ciclo infinito com multiplicador
crescente de HP/ATQ e de recompensa (`G.riftDepth`). É o **teto de progressão que
todo idle precisa** e hoje não existe.

### B7 · 🟡 Sem exportar/importar save
Todo o progresso vive em `localStorage`. Limpar o navegador = perder tudo. Já está
no backlog como ideia, mas com a Fase 5 (online) distante, isso é **risco real de
perder o jogador para sempre**. Custo: ~30 linhas (JSON → base64 → textarea).

### B8 · 🟡 Squad pode ficar vazio / sem gate de conteúdo
Em `bindPanel()`, remover runners não valida mínimo — dá para esvaziar a formação.
E `G.ownedRunners` já vem com **os 8 desbloqueados desde o primeiro segundo**: não
há progressão de coleção, nada a conquistar em termos de personagem. O Codex
"completa" runners que você já tinha.

**Correção:** ou desbloqueio progressivo (por zona/conquista), ou assumir o design
"todos desde o início" e **remover a promessa de coleção** da UI. Hoje é ambíguo.

---

### 🔗 Como os seis se amarram

```
        S2 Conselho Elemental ──┐
                                ├──► motivo para MEXER na formação
        S1 Sets de Gear ────────┘

        S3 Missões diárias ─────┐
                                ├──► motivo para VOLTAR amanhã
        S4 Eventos por zona ────┘

        S5 2ª árvore ───────────┐
                                ├──► destino para o PROGRESSO tardio
        S6 Conquistas ──────────┘
```

Três pares, três perguntas que o jogo hoje não responde: *o que eu otimizo?*,
*por que volto amanhã?*, *para onde vai meu progresso no fim?*

---

## 💡 PARTE 2C — Sistemas que eu sugiro (não estão em nenhum backlog)

> Estes não vieram do `PLANO.md` — são propostas minhas a partir do que o jogo
> **é** (idle de Burst/Resonance) e do que ele **ainda não pede ao jogador**.

### N1 · 🌟 Burst Enhancement *(o mais alinhado à identidade do jogo)*
O jogo se chama **Aether Burst** e o Burst é o único sistema que **não evolui**.
Runners sobem de nível, gear sobe, árvores sobem — o Burst faz o mesmo dano
relativo do começo ao fim.

**Desenho:** cada runner tem `burstLevel` 1→5, pago com **Burst Cores** (recurso
que **já tem fonte** e nenhum destino — resolve B3). Cada nível: +12% de dano de
Burst e −5% de carga necessária. No **nível 5**, desbloqueia o *Overburst* — um
efeito único por runner (ex.: Kairo acerta duas vezes; Lyra estende o escudo a
15s; Sable executa alvos abaixo de 15% de HP).

**Por que:** dá progressão ao pilar central, aproveita recurso órfão, e cria a
pergunta "em quem eu invisto meu Burst?" — decisão que hoje não existe.
**Esforço:** médio. **Impacto:** muito alto (identidade).

### N2 · 🌀 Rift Infinito (endgame procedural) — resolve B6
Depois da zona 7, o jogo entra em **Profundidade N**: as 7 zonas reciclam com
`hp × 1.35^N` e recompensa `× 1.25^N`, e cada profundidade sorteia 1–2
**Modificadores de Rift** (seed determinístico): *"inimigos com +40% de EVA"*,
*"Burst carrega 2× mais rápido"*, *"todo mob é do elemento da zona"*,
*"bosses ressuscitam uma vez"*.

**Por que:** todo idle precisa de um "para sempre" com curva. Hoje o jogo
literalmente **acaba** e trava reiniciando a zona 7. Os modificadores dão variação
sem precisar de arte nova.
**Esforço:** médio. **Impacto:** muito alto (retenção de longo prazo).

### N3 · 💞 Vínculos de Resonance (dar profundidade ao 2º pilar)
Resonance hoje é uma barra que sobe sozinha e destrava o Sync no nível 4. Só isso.

**Desenho:** cada par ganha uma **história em 3 capítulos**, destravada nos níveis
2, 4 e 6 — um diálogo curto entre os dois runners (o `COMBAT_BANTER` já prova que
eles têm voz) + um **bônus passivo permanente** para a dupla quando ambos estão em
formação (ex.: Kairo+Zael *"Rivalidade"*: +5% ATQ para os dois quando ambos estão
abaixo de 50% de HP).

**Por que:** transforma uma barra passiva em **motivo para manter duplas juntas**
e entrega lore sem precisar de cutscene. Alimenta direto o Codex.
**Esforço:** médio-baixo (é dado + texto). **Impacto:** alto (identidade + formação).

### N4 · 🎲 Escolha de Rota (decisão a cada 10 níveis)
A marcha é 100% automática — o jogador nunca **decide** nada durante ela.

**Desenho:** ao completar cada 10 níveis, o jogo pausa e oferece **3 cartas**:
*"Caminho do Sangue: +30% ATQ, −20% DEF por 10 níveis"* · *"Veia de Aether: +50%
de shards"* · *"Trilha do Caçador: +2 drops garantidos"*. Escolha ativa até o
próximo marco.

**Por que:** dá **agência** num gênero que é acusado de "jogar sozinho", em pequenas
doses que não quebram o idle. Sinergia total com o Rift Infinito (N2) e com os
eventos de zona (S4).
**Esforço:** baixo-médio. **Impacto:** alto (engajamento minuto a minuto).

### N5 · ⚗️ Forja / Fusão de Gear
Hoje o gear só tem dois destinos: equipar ou reciclar por shards. O inventário de
500 slots enche de peça média sem uso.

**Desenho:** **fundir 3 peças da mesma raridade → 1 da raridade acima** (slot
aleatório entre as três). E **transferir PROC**: sacrificar uma peça com PROC para
mover o efeito a outra do mesmo slot.

**Por que:** dá **destino ao lixo acumulado** e cria o caminho de "eu quero *este*
PROC nesta armadura" — o loop de crafting que segura jogador de idle. A raridade
`aether` (6★) **já existe no `RARITIES` e não dropa** — vira o topo da forja.
**Esforço:** médio. **Impacto:** alto (loop de itens).

### N6 · 📴 Combate offline de verdade
O `offlineReport()` estima por fórmula (`dps × tempo × 0,6`). Não simula: não
morre, não sobe zona, não pega boss.

**Desenho:** rodar o `update()` real acelerado em passos grandes (o `_vm.js` já
prova que o engine roda headless) com teto de tempo. O relatório passa a mostrar
**"você avançou 3 zonas e derrotou 2 bosses"** em vez de um número seco.

**Por que:** é a promessa central do gênero. E fica quase de graça — o simulador
da skill `balanceamento` é **o mesmo código**.
**Esforço:** médio. **Impacto:** médio-alto.

### N7 · 🔊 Áudio de verdade
Hoje são 5 `blip()` de oscilador. Sem música, sem tema de boss, sem camada.
**Desenho:** trilha em loop por zona (WebAudio, sintetizada ou arquivo leve),
stinger de boss, camada que intensifica no Burst. **Esforço:** médio.
**Impacto:** médio — mas é o que mais separa "protótipo" de "jogo" na primeira
impressão.

---

## 🗺️ PARTE 3 — Sequência de execução

> ⚠️ **Mudança de ordem em relação à v1 deste plano:** a auditoria (2B) mostrou
> que a economia está furada. Balancear ou somar sistemas antes de fechar o ralo
> é desperdício — todo número seria recalibrado depois.

### Fase 0 — 🔴 Tapar o ralo *(bloqueia todo o resto)*
1. **B1** limite diário real nas Dungeons + **B2** Rift Tickets como custo de entrada
2. **B4/B5** decidir a carta elemental (luz/trevas mortos, aether sem identidade)
3. Limpeza da dívida 🟡 (3 trechos mortos)

### Fase A — Fundação de velocidade
4. `package.json` + `npm test` (`qa-completo`)
5. `bump-version.mjs` + `add-memory.mjs` (`fechar-sessao`)
6. `simulate.mjs` (`balanceamento`) — **agora mede uma economia que faz sentido**

### Fase B — Legibilidade e primeiro conteúdo
7. **S7 Tooltips ricos globais** ⭐ *(pedido)* — barato, reusa o que existe, e faz
   todo sistema seguinte **nascer legível**
8. **S1 Sets de Gear (2/4)** ⭐ *(pedido)* + preencher o pool → conserta o `test_gear`
9. **S2 Conselho Elemental** — depende de B4/B5 estarem decididos

### Fase C — Retenção diária
10. **S3 Missões** · 11. **S4 Eventos por zona** · 12. **N4 Escolha de Rota**

### Fase D — Endgame e identidade
13. **N1 Burst Enhancement** (resolve B3) · 14. **N2 Rift Infinito** (resolve B6)
15. **S5 2ª árvore** · 16. **N3 Vínculos de Resonance**

### Fase E — Loop de itens e polimento
17. **N5 Forja** · 18. **S6 Conquistas** · 19. **B7 Exportar save**
20. **N6 Offline real** · 21. **N7 Áudio**
22. **Balanceamento final** com o simulador sobre o conjunto inteiro

### 🏆 Se fosse escolher só 3 para fazer agora
1. **B1+B2** (economia) — sem isso nada mais tem peso
2. **S7 Tooltips** — barato e multiplica o valor de tudo que já existe
3. **N1 Burst Enhancement** — o jogo se chama Aether Burst e o Burst não evolui

> A `asset-pipeline` e a `novo-sistema` são construídas **quando o primeiro caso
> real aparecer** (S1 precisa de ícones de set; S3 precisa de painel) — skill
> escrita sem caso de uso vira ficção.

---

## ⚖️ PARTE 4 — Decisões em aberto

1. **`package.json` na raiz** — quebra a pureza "zero dependências"? Proposta: só
   `scripts`, campo `"dependencies"` vazio. O jogo continua abrindo por
   `file://`. Confirmar se aceita.
2. **Pasta `skills/`** versionada — ou fica em `docs/skills/`? Voto: raiz, porque
   é infraestrutura de trabalho, não documentação de leitura.
3. **Missões precisam de anti-trapaça?** Enquanto for local, não. Mas se a Fase 5
   (online) vier depois, missões viram vetor óbvio de fraude — vale já desenhar os
   contadores server-friendly (deltas assinados, não valores absolutos).
4. **Sets afetam o balanceamento** de forma multiplicativa — só entrar **depois**
   do `simulate.mjs`, senão a curva quebra sem ninguém ver.
5. **Reset diário sem servidor** usa o relógio do cliente (dá para adiantar).
   Aceitável em jogo solo; anotar como dívida para a Fase 5.

---

## 📌 Regras do repo que TODA skill precisa preservar

Estas não são negociáveis — estão no `PLANO.md` e no `selftest.js`:

- ✅ **Feature nova ⇒ entrada nova em `SELFTESTS`** (`js/selftest.js`)
- ✅ **Toda sessão termina com entrada no array `MEMORY`** (`PROGRESSO.html`)
- ✅ **Asset novo ⇒ descrição em `assets/REFERENCIA_ARTE.md`**
- ✅ **`PROGRESSO.html` atualizado a cada mudança de status**
- ✅ **`tests/` é trackeado no git** — já se perdeu uma vez por wipe + gitignore

Cada `SKILL.md` termina com esse checklist. É o ponto: a skill não é só o atalho,
é a **garantia de que o atalho não pula a regra**.
