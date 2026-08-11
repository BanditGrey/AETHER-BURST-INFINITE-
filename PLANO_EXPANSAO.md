# 🌌 PLANO DE EXPANSÃO — 20 MAPAS · 20 RUNNERS · BESTIÁRIO REGIONAL · CODEX VIVO

> **Escopo desta expansão:** sair de 7 zonas / 8 runners / 7 inimigos para
> **20 zonas · 20 runners · ~40 inimigos regionais**, mais **Codex com recompensas**
> e o **sistema de Coleções** (bônus por conjuntos catalogados).
>
> Documentos irmãos: `PLANO.md` (roadmap original) · `PLANO_SKILLS.md` (skills +
> fases 0–E) · `PLAN_ONLINE.md` (fase 5) · `ARTE_STILO.md` + `assets/REFERENCIA_ARTE.md`.
>
> ⚠️ **Este plano é de PLANEJAMENTO.** Nada aqui foi implementado. A execução
> respeita as fases — a Fase 0 do `PLANO_SKILLS.md` (economia furada) continua
> bloqueando tudo.

---

## 🚨 PARTE 1 — O que QUEBRA ao escalar (auditado no código)

Não são hipóteses. Foram medidos no repo atual.

### Q1 · 🔴 O elemento do inimigo morre na zona 8
```js
// engine.js:342 — o elemento é indexado pelo número da zona
["wind","fire","ice","lightning","dark","light","aether"][G.zone-1] || "wind"
```
São **7 posições para 20 zonas**. Da zona 8 em diante, **todo inimigo do jogo vira
`wind`** (o fallback). A carta elemental — pilar do combate — simplesmente para de
funcionar em 65% do jogo novo.
**Correção:** `element` vira campo da própria zona (`ZONES[i].element`), não um
índice posicional.

### Q2 · 🔴 O bestiário ignora a zona por completo
```js
// spawnWave() — o pool é uma constante global
const pool = ["hollow","hollow","brute","phantom","surge"];
if (lvl >= 6) pool.push("elite");
```
**A zona não entra na conta.** Os mesmos 5 inimigos aparecem da zona 1 à 20 — que é
exatamente o problema que você levantou. Além disso, o boss é **literalmente
chamado `VERDANT RIFT LORD`** em todas as 20 zonas.
**Correção:** elenco por zona (Q6 abaixo).

### Q3 · 🟠 190 pares de Sync
Com 8 runners existem 28 pares possíveis e o jogo define 5. Com **20 runners são
190 pares possíveis** — inviável escrever à mão, e a *strip* de Resonance na UI
renderiza **todos os pares ativos** (viraria uma parede de chips).
**Correção:** pares curados (~24) + regra genérica para o resto.

### Q4 · 🟠 A UI foi desenhada para 8
- `.squad-grid` é 2 colunas → **20 runners = 10 linhas** de rolagem sem filtro.
- `.gw-runners` (coluna do Gear) vira lista de 20 sem busca.
- **Barras de Burst**: `min-width:150px` × 6 já ocupa a largura inteira.
**Correção:** filtros/busca/ordenação + agrupamento por elemento (Q8).

### Q5 · 🟡 Todos os 20 nasceriam desbloqueados
`ownedRunners` já lista os 8 fixos. Com 20, o jogo entregaria o elenco inteiro no
primeiro segundo — **zero senso de conquista** e o Codex "completando" gente que
você nunca buscou.
**Correção:** sistema de recrutamento (Q7).

### Q6 · 🟡 Peso dos assets
Média medida: runner **83 KB**, fundo **137 KB**. Projeção da expansão:

| Asset | Hoje | Meta | Δ estimado |
|---|---|---|---|
| Runners | 8 (680 KB) | 20 | +1,0 MB |
| Fundos | 7 (980 KB) | 20 | +1,8 MB |
| Inimigos | 7 (608 KB) | ~40 | +2,6 MB |
| Skills FX | 15 (612 KB) | ~35 | +0,8 MB |
| **Total** | **~3,3 MB** | | **~9,5 MB** |

Ainda aceitável para web, mas exige **carregamento sob demanda por zona** (hoje
tudo é `new Image()` no primeiro uso — o que já ajuda) e atlas para os ícones.

---

## 🗺️ PARTE 2 — As 20 Zonas

### Estrutura nova de zona (campos adicionados)
```js
{ id, name, theme, energy, sky[], ground, accent, status,   // já existem
  element,        // 🆕 NÃO mais derivado do índice (corrige Q1)
  act,            // 🆕 ato narrativo 1..4
  bestiary: [],   // 🆕 tipos de inimigo desta zona (corrige Q2)
  boss,           // 🆕 chave do boss próprio da zona
  miniboss,       // 🆕 chave do miniboss
  hazard,         // 🆕 modificador ambiental permanente
  unlock,         // 🆕 condição de entrada
  recruit }       // 🆕 runner recrutável aqui (Q7)
```

### Os 4 Atos

| Ato | Zonas | Tema narrativo | Elementos dominantes |
|---|---|---|---|
| **I — A Fenda Desperta** | 1–5 | O Rift abre; primeiros ecos | wind, fire, ice, lightning, dark |
| **II — As Terras Partidas** | 6–10 | O mundo se fragmenta | light, aether, wind, fire, ice |
| **III — O Coração do Vazio** | 11–15 | Rumo à origem | dark, light, lightning, aether, fire |
| **IV — Além do Infinito** | 16–20 | O que existe depois do fim | todos + aether puro |

### Tabela das 20 zonas

| # | Nome | Elemento | Hazard ambiental | Boss |
|---|---|---|---|---|
| 1 | Verdant Rift ✅ | wind | — (tutorial) | Verdant Rift Lord |
| 2 | Inferno Gate ✅ | fire | Brasas: dano em área periódico | Molten Tyrant |
| 3 | Frozen Abyss ✅ | ice | Solo escorregadio: −10% EVA | Glacial Sovereign |
| 4 | Storm Circuit ✅ | lightning | Descargas: stun aleatório breve | Thunder架 Colossus |
| 5 | Void Cathedral ✅ | dark | Névoa: −15% de alcance | Void Cardinal |
| 6 | Celestial Spire ✅ | light | Ofuscamento: −10% ACC | Seraphic Warden |
| 7 | Core Infinite ✅ | aether | Instabilidade: stats oscilam ±10% | Core Aberration |
| 8 | Ashen Wastes | fire | Tempestade de cinzas: −20% de visão | Cinder Behemoth |
| 9 | Tidal Ruins | ice | Maré: empurra a formação | Abyssal Leviathan |
| 10 | Thornwood Deep | wind | Espinhos: dano ao avançar | Thornmother |
| 11 | Obsidian Foundry | fire | Calor: −HP regen | Forge Titan |
| 12 | Mirror Expanse | light | Reflexo: inimigos copiam skill | Mirrorbound Echo |
| 13 | Gravewind Hollow | dark | Miasma: cura reduzida | Hollow King |
| 14 | Fulgor Peaks | lightning | Altitude: +crit p/ ambos os lados | Storm Herald |
| 15 | Nullstone Vault | aether | Silêncio: cooldowns +25% | Nullstone Guardian |
| 16 | Chrono Shatter | aether | Distorção: velocidade oscila | Chronophage |
| 17 | Bloodmoon Sanctum | dark | Lua de sangue: +dano geral (ambos) | Bloodmoon Empress |
| 18 | Prism Nexus | light | Prisma: elemento do inimigo rotaciona | Prismatic Arbiter |
| 19 | Endless Maw | wind | Sucção: puxa a formação | The Devourer |
| 20 | Aether Zenith | aether | Zenith: tudo ×2 (dano dado e recebido) | **AETHER ZENITH** (boss final) |

> **Hazards** são o que impede 20 mapas de virarem "o mesmo mapa com outra cor".
> Cada um muda uma regra de combate, não só a paleta.

---

## 👥 PARTE 3 — Os 20 Runners

### Os 8 atuais (mantidos)
KAIRO ⚡ · ZAEL 🔥 · SERAPH 🌑 · LYRA ☀️ · FROST ❄️ · NINA ⚡ · REX 🌿 · SABLE 🌑

### Os 12 novos — identidades distintas

| # | Nome | Título | Elemento | Classe | Gancho de identidade |
|---|---|---|---|---|---|
| 9 | **VEXA** | The Venom Dancer | wind | Striker | Empilha **veneno** que ignora DEF; quanto mais stacks, mais rápida |
| 10 | **GRIMM** | The Iron Warden | ice | Vanguard | **Provoca** e converte dano recebido em escudo para o time |
| 11 | **AURELIO** | The Gilded Maestro | light | Resonator | **Buffa por "compassos"** — a cada 4 ataques do time, pulso de cura+ATQ |
| 12 | **NYX** | The Silent Eclipse | dark | Striker | Fica **invisível** fora de combate direto; primeiro golpe sempre crítico |
| 13 | **BOROS** | The Molten Anvil | fire | Breaker | Ataques **aquecem**; ao superaquecer, explode em área e se resfria |
| 14 | **SELENE** | The Moonwell Oracle | light | Resonator | **Prevê** o próximo golpe inimigo e concede esquiva garantida a um aliado |
| 15 | **DRAKE** | The Skyfang Rider | lightning | Blaster | Ataca **do ar**: imune a melee, mas recarrega periodicamente no solo |
| 16 | **THALIA** | The Bloomwarden | wind | Resonator | Planta **totens** que curam e crescem com o tempo de combate |
| 17 | **ORION** | The Starforged | aether | Breaker | **Muda de elemento** conforme a zona — sempre neutro-forte |
| 18 | **RAVEN** | The Debt Collector | dark | Blaster | **Marca** alvos; se o marcado morre, ganha o dano como buff |
| 19 | **IGNIS-9** | The Salvaged Core | fire | BurstMage | Autômato: **superaquece e desliga**, mas seu Burst é o maior do jogo |
| 20 | **ASTRAEA** | The Rift Empress | aether | BurstMage | **Boss recrutável** da zona 20 — o teto do endgame |

> **Diretriz de design:** nenhum runner novo é "mais forte do mesmo" — cada um traz
> uma **mecânica que ainda não existe** (veneno, taunt, compasso, invisibilidade,
> superaquecimento, previsão, voo, totens, camaleão, marcação, autodesligamento).

### Distribuição
- **Elementos:** fire 4 · ice 3 · lightning 4 · wind 4 · light 3 · dark 4 · aether 3 (equilibrado, sem elemento órfão)
- **Classes:** Breaker 4 · Vanguard 3 · Striker 4 · Blaster 3 · BurstMage 3 · Resonator 3

---

## 🎯 PARTE 4 — Sistema de Recrutamento (resolve Q5)

Com 20 personagens, **entregar tudo de cara mata a progressão**. Proposta:

| Via | Runners | Como |
|---|---|---|
| **Inicial** | 4 (Kairo, Rex, Frost, Lyra) | Começa com eles |
| **Marcha** | 8 | Recrutados ao derrotar o boss da zona indicada em `recruit` |
| **Codex** | 4 | Desbloqueados ao completar entradas do Codex |
| **Coleções** | 3 | Recompensa de conjuntos completos (Parte 7) |
| **Endgame** | 1 (Astraea) | Derrotar o boss final da zona 20 |

**Fragmentos de Runner:** bosses derrotados de novo dropam fragmentos do runner
daquela zona → 50 fragmentos = **Duplicata**, que sobe a **raridade** (★ extra:
+stats e +1 nível de Burst). Dá destino ao farming repetido de boss.

---

## 👹 PARTE 5 — Bestiário Regional (resolve Q2)

### Arquitetura
`ENEMY_TYPES` deixa de ser lista global e vira **catálogo com afinidade de zona**.
Cada zona declara seu `bestiary: []`, e o `spawnWave()` sorteia **desse** elenco.

### Os 5 arquétipos (esqueleto de comportamento, reaproveitável)
`rusher` (rápido/frágil) · `tank` (lento/duro) · `flanker` (mira a retaguarda) ·
`caster` (dano à distância) · `swarm` (muitos, fracos)

### Estrutura de elenco por zona
Cada zona tem **4 mobs + 1 miniboss + 1 boss**, sendo:
- **2 exclusivos** da zona (identidade visual própria)
- **2 compartilhados** dentro do mesmo Ato (economiza arte sem repetir entre atos)

**Total estimado:** ~40 tipos de inimigo (contra 7 hoje).
Isso garante literalmente o que você pediu: **o que aparece no mapa X não aparece
no mapa Y** — e, entre atos, o elenco troca por completo.

### Exemplos de elencos
| Zona | Exclusivos | Compartilhados do Ato | Boss |
|---|---|---|---|
| 8 Ashen Wastes | Cinder Wraith, Ashmaw | Brute-variant, Hollow-variant | Cinder Behemoth |
| 12 Mirror Expanse | Mirror Shade, Glass Sentinel | Caster do Ato III, Flanker do Ato III | Mirrorbound Echo |
| 17 Bloodmoon Sanctum | Blood Acolyte, Lunar Fiend | Tank do Ato IV, Swarm do Ato IV | Bloodmoon Empress |

### Variantes (profundidade sem arte nova)
Prefixos aplicáveis a qualquer mob, com aura de cor e drop melhor:
**Élite** (+80% stats) · **Corrompido** (elemento trocado) · **Antigo** (+HP, dropa
fragmento) · **Espectral** (só toma dano mágico).

---

## 📖 PARTE 6 — Codex Vivo (com recompensas)

### O problema atual
O Codex hoje é **uma barra de 60 abates por runner** que paga +1 Ponto de Ascensão.
Não registra inimigos, zonas, itens nem lore. Não convida a explorar.

### O Codex novo — 5 abas

| Aba | Registra | Como completa | Recompensa |
|---|---|---|---|
| **📕 Runners** | os 20 | usar em combate + subir de nível | Fragmentos, Pontos de Ascensão, **3 runners exclusivos** |
| **👹 Bestiário** | ~40 inimigos | abater N de cada (escala por raridade) | **+% de dano permanente contra aquela espécie**, shards |
| **🗺️ Zonas** | as 20 | completar nível 100 de cada | Fragmentos, desbloqueia o Rift Infinito daquela zona |
| **⚔️ Itens** | todo gear visto | dropar ao menos 1 vez | **Coleções** (Parte 7) |
| **📜 Lore** | ~40 entradas | encontradas em drops raros e bosses | Pontos de Ascensão + história do mundo |

### Mecânicas-chave
- **Registro automático:** ver um inimigo pela primeira vez já cria a entrada (com
  silhueta), e abater preenche os dados.
- **Níveis de conhecimento:** cada entrada tem 1★→3★ (ex.: bestiário 10/50/200
  abates). Cada estrela dá um bônus incremental **permanente**.
- **Marcos globais:** completar 25%/50%/75%/100% de uma aba paga prêmios grandes
  (fragmentos, tickets, um runner, um título).
- **Títulos:** cosméticos exibidos no perfil — preparação natural para o
  leaderboard da Fase 5 (`PLAN_ONLINE.md`).

---

## 🏆 PARTE 7 — Coleções (a aba de conjuntos com buffs)

> Exatamente o que você descreveu: *"uma aba que registra item para ganhar certos
> buff — ex.: dá um conjunto de um personagem e sobe x% de dano de x elemento"*.

### Como funciona
Diferente de **Sets de Gear** (bônus só enquanto **equipado**), **Coleções** são
**permanentes**: uma vez catalogada, a peça conta para sempre — mesmo reciclada.
É o incentivo para **coletar, não só otimizar**.

### As 4 famílias de Coleção

**1. 🎭 Coleções de Personagem** — reunir o conjunto temático de um runner
> *Ex.:* **Arsenal do Kairo** (Volt Edge + Storm Core + Skybreaker Relic + Thunder Band)
> → **+15% de dano de Kairo** e **+10% de dano lightning para todo o time**

**2. 🔥 Coleções Elementais** — N peças de um mesmo elemento
> *Ex.:* **Chama Eterna** — 8 itens de fogo catalogados
> → **+12% de dano fire** · 16 itens → **+25% e ignora resistência a fogo**

**3. 🌍 Coleções Regionais** — todo o gear que dropa em uma zona
> *Ex.:* **Relicário de Inferno Gate** → **+20% de drop** e **+10% de dano** naquela zona

**4. 👹 Coleções de Bestiário** — troféus de espécies
> *Ex.:* **Caçador de Colossos** — todos os bosses do Ato I
> → **+15% de dano contra bosses**

### Regras de design
- Bônus são **aditivos e permanentes** — nunca se perdem.
- Reciclar **não apaga** o registro (recicla à vontade após catalogar).
- A aba mostra **silhuetas** do que falta → direciona o farm.
- **Sinergia com Sets:** Sets = poder *agora* (equipado); Coleções = poder
  *acumulado* (catalogado). Os dois convivem sem se anular.

---

## 🧩 PARTE 8 — Sistemas de apoio que a escala exige

| # | Sistema | Por quê |
|---|---|---|
| **E1** | **Filtros e busca** no Squad/Gear/Codex | 20 runners e ~40 inimigos são ingerenciáveis em lista plana (Q4) |
| **E2** | **Formações salvas** (3 presets) | Trocar 6 de 20 personagens à mão a cada zona é fricção pura |
| **E3** | **Sync genérico + pares curados** | 190 pares possíveis (Q3): ~24 curados com nome/arte + regra base para o resto |
| **E4** | **Mapa-múndi** (tela de seleção) | Navegar 20 zonas exige tela própria com atos, progresso e hazard visível |
| **E5** | **Loadout por zona** | Sugere/salva o time ideal por elemento da zona |
| **E6** | **Lazy-load de assets por zona** | ~9,5 MB não pode carregar tudo de uma vez |
| **E7** | **Escalonamento de dificuldade por ato** | A curva atual foi feita para 7 zonas; 20 precisam de novos degraus |

---

## 🗺️ PARTE 9 — Fases de execução

> **Regra de ouro mantida:** fases sequenciais, cada uma fecha com `npm test` verde
> \+ entrada na Memória. **Nada começa antes da Fase 0** do `PLANO_SKILLS.md`
> (economia furada) — somar 20 mapas sobre uma economia quebrada multiplica o erro.

### 🔧 FASE X0 — Refatorar para escalar *(bloqueia toda a expansão)*
Sem isto, cada zona nova é copiar-e-colar e o bug do elemento se espalha.
1. **X0.1** `element` como campo da zona (corrige **Q1** — o bug da zona 8)
2. **X0.2** `bestiary`/`boss`/`miniboss` por zona; `spawnWave()` lê da zona (**Q2**)
3. **X0.3** Boss deixa de se chamar "VERDANT RIFT LORD" em toda zona
4. **X0.4** Arquétipos de inimigo (`rusher`/`tank`/`flanker`/`caster`/`swarm`)
5. **X0.5** Sync genérico + curados (**Q3**)
6. **X0.6** Filtros/busca na UI (**Q4**, **E1**)

### 🌍 FASE X1 — Zonas 8–13 (Atos II–III, parte 1)
7. Dados das 6 zonas + hazards · 8. Fundos · 9. Elencos regionais · 10. Bosses

### 👥 FASE X2 — Runners 9–14
11. Dados + skills/bursts · 12. Sprites + FX · 13. Recrutamento (**Q5**) · 14. Fragmentos/Duplicatas

### 📖 FASE X3 — Codex Vivo
15. 5 abas + registro automático · 16. Níveis de conhecimento · 17. Marcos e títulos

### 🏆 FASE X4 — Coleções
18. As 4 famílias · 19. Aba com silhuetas · 20. Integração com Sets

### 🌌 FASE X5 — Zonas 14–20 + Runners 15–20
21. Ato IV completo · 22. Boss final (Aether Zenith) · 23. Astraea recrutável

### ⚙️ FASE X6 — Escala e polimento
24. Mapa-múndi (**E4**) · 25. Formações salvas (**E2**) · 26. Lazy-load (**E6**)
27. Balanceamento dos 4 atos com o `simulate.mjs` (**E7**)

---

## ⚖️ PARTE 10 — Decisões que preciso de você

1. **Recrutamento:** começar com **4** runners e conquistar 16 (proposta), ou manter
   todos liberados? *Impacta diretamente a sensação de progressão.*
2. **Squad continua com 6 slots** com 20 personagens disponíveis? (Proposta: sim —
   escolher 6 entre 20 **é** a decisão estratégica. Alternativa: 8 slots no endgame.)
3. **Arte dos ~40 inimigos** é o maior custo do plano. Aceita a estratégia
   "2 exclusivos + 2 compartilhados por ato" para reduzir volume?
4. **Zonas 8–20 reciclam a estrutura 1–100 níveis** ou ficam mais curtas
   (ex.: 50 níveis) para o jogo não virar maratona de 2.000 níveis?
5. **Ordem:** zonas primeiro (mundo maior) ou runners primeiro (time maior)?
   *Sugiro zonas — dão contexto e local de recrutamento para os runners novos.*

---

## 📌 Regras do repo preservadas

- ✅ Cada sistema novo ⇒ entrada em `SELFTESTS` (`js/selftest.js`)
- ✅ Cada sessão ⇒ entrada no `MEMORY` (`PROGRESSO.html`)
- ✅ Cada asset ⇒ descrição em `assets/REFERENCIA_ARTE.md`
- ✅ `PROGRESSO.html` atualizado a cada mudança de status
- ✅ Save sempre com migração de versão antiga (nunca descartar progresso)
