# ⚡ AETHER BURST: INFINITE

> **Idle Action RPG 2D · Anime explosivo estilizado · "Burst Beyond Limits."**

Protótipo jogável do núcleo do jogo — o pilar **"combate automático bonito"**:
você monta e potencializa o esquadrão; os Aether Runners avançam, combatem,
liberam **Aether Bursts** devastadores e executam **Burst Syncs** entre aliados.

Implementação das **Fases 1 e 2** do Documento de Conceito v2.0, com os principais
diferenciais já funcionais.

---

## ▶️ Como rodar

É um jogo **HTML5 Canvas + JavaScript puro**, sem build step.

```bash
# na raiz do repositório
python3 -m http.server 8000
# abra http://localhost:8000
```

Ou simplesmente abra `index.html` num navegador moderno (Chrome/Edge/Firefox).

---

## 🎮 O que já está jogável

| Sistema | Status |
|---|---|
| Combate automático (básico + skill + passiva) | ✅ |
| Formação Vanguard / Rear Guard (5 slots) | ✅ |
| **Aether Burst System** (8 ultimates com visuais temáticos) | ✅ |
| **Burst Sync** (os 5 pares do MVP, com freeze-frame + cores combinadas) | ✅ |
| Sistema de **Resonance** (vínculos, níveis 1–6) | ✅ |
| 8 Runners completos (Kairo, Zael, Seraph, Lyra, Frost, Nina, Rex, Sable) | ✅ |
| Vantagens elementais (Fogo/Gelo/Raio/Vento/Luz/Trevas/Aether) | ✅ |
| Progressão de Zona (Verdant Rift, 100 níveis) + mini-bosses a cada 10 + Rift Lord | ✅ |
| Recursos: Aether Shards, Rift Tickets, Infinity Fragments | ✅ |
| Nível/XP dos Runners + level-up com Shards | ✅ |
| **Infinite Reboot** + Rank Astral | ✅ |
| **Infinity Circuit** (árvore de bônus permanentes) | ✅ |
| **Progresso offline** + Burst Report ao retornar | ✅ |
| Velocidades 1× / 2× / 3× / **BURST MODE** | ✅ |
| **Modo Companion** (janela compacta) | ✅ |
| Rift Dungeons (Shard Vault, XP Surge, Burst Core Mine, Resonance Trial) | ✅ |
| Rift Codex (lore/abilities dos 8 Runners) | ✅ |
| Drops de equipamento (inventário) | ✅ |
| SFX procedural (WebAudio) | ✅ |

---

## 🕹️ Controles

- **Clique numa Burst Bar READY** → dispara o Aether Burst na hora
- **1 / 2 / 3** → troca velocidade · **BURST** → velocidade máxima
- **Espaço** → pausa
- Botões inferiores → Esquadrão, Equipar, Dungeons, Codex, Infinity, Reboot
- Canto inferior direito → **Modo Companion** (compacta a UI)

---

## 🗂️ Estrutura do código

```
index.html           shell da UI (HTML)
css/style.css        estética "anime explosivo" (neon, Orbitron)
js/data.js           dados: elementos, classes, raridades, 8 runners,
                     sync pairs, inimigos, zonas, equipamentos, infinity nodes
js/fx.js             camada de FX: partículas, números de dano,
                     screen shake, flashes, vignette, slow-mo, freeze-frame
js/engine.js         motor: stats, formação, simulação de combate,
                     Aether Burst, Burst Sync, Resonance, progressão,
                     drops, save/load, progressão offline
js/main.js           bootstrap: render canvas (parallax, chibis, inimigos),
                     HUD, UI em DOM, input, game loop, SFX
```

O `engine.js` é **independente de DOM** (simulação pura) — as funções de UI/SFX
em `main.js` sobrescrevem shims no-op do engine, permitindo testar a simulação
isoladamente (ex.: em Node).

---

## 🔭 Roadmap (pós-protótipo)

Conforme o Documento de Conceito: Burst Enhancement, Árvore de Talentos,
sets de equipamento, base completa, Infinity Abyss (modo infinito com ranking),
eventos, novas zonas (Inferno Gate, Frozen Abyss, ...) e PvP assíncrono.

---

*Burst Beyond Limits.* 💥
