# 📡 Plano: levar o AETHER BURST: INFINITE para o online

> Escolha: **backend próprio em Node.js** (rota A). Este documento é o mapa.
> O código que você já tem continua sendo o **cliente** — não é jogado fora.

---

## 1. Visão da arquitetura

```
        Navegador (cliente HTML/Canvas/JS)
        └── é o que você já tem hoje (index.html, css/, js/)
                │  HTTP (login, salvar, leaderboard)
                │  WebSocket (tempo real: chat, presença, eventos)
                ▼
        ── SERVIDOR (Node.js) ─────────────────────────────
        │  Express (API REST)
        │  Socket.IO (tempo real)
        │  Regras de negócio / validação
        │  ─────────────────────────────
        │  Banco de dados  (Postgres)
        │  Cache/real-time  (Redis, opcional)
        └──────────────────────────────────────────────────
```

**Princípio central:** o navegador é *cliente*, o servidor é a *fonte da verdade*.
O `localStorage` vira um **cache offline**; o save oficial fica no banco.

---

## 2. O que muda no jogo atual (e o que não muda)

### NÃO muda
- Todo o `js/engine.js`, `js/main.js`, `js/fx.js`, `js/data.js`, CSS e Canvas.
- A lógica de combate, formação, Ascensão, Codex, Infinity, dungeon.

### MUDA (só a camada de save)
1. `save()` deixa de escrever só em `localStorage` → também envia ao servidor.
2. `load()` passa a buscar do servidor na entrada (e usa localStorage como fallback offline).
3. Adiciona **login/registro** (antes do boot do jogo).
4. `G` (o estado global) ganha um `accountId` e um `playerId`.

---

## 3. Escopo de "online" para um Idle RPG (incremental)

Para um idle não é preciso simulação em tempo real contra outros jogadores.
O valor vem do **estado compartilhado**. Fases:

### Fase 0 — Conta e persistência na nuvem (fundação)
- Registro/login (email+senha, ou "nome + senha" simples).
- `POST /save` salva progresso; `GET /save` recupera.
- Sincronização com conflito mínimo (o maior `lastSeen`/`revision` vence).
- Server-side: salvar `G` serializado (JSON) por jogador.

### Fase 1 — Leaderboard global
- Tabela de "power score" (calculado de `G`: level, zona, runners, ascensão).
- `GET /leaderboard?page=` → top 100 com nome + score + nível.
- Cliente: painel "Ranking" com os tops.

### Fase 2 — Social
- Chat global (WebSocket).
- Amigos / seguir jogadores.
- Ver perfil e esquadrão de outro jogador.

### Fase 3 — Modos compartilhados
- **Boss mundial**: todos contribuem dano a um boss com HP global (evento por período).
- Clãs/guildas com bônus.

### Fase 4 — PvP / coop (mais avançado)
- Exibição em tempo real de outros esquadrões.
- Arena assíncrona (desafio contra snapshot do time de outro jogador).

---

## 4. Esquema de banco (Postgres) — esboço

```sql
CREATE TABLE players (
  id            UUID PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,          -- nunca guardar senha em texto
  created_at    TIMESTAMPTZ DEFAULT now(),
  last_seen     TIMESTAMPTZ
);

CREATE TABLE saves (
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  revision  BIGINT NOT NULL DEFAULT 0,   -- para resolver conflito
  game_json JSONB NOT NULL,              -- o estado G serializado
  power     BIGINT NOT NULL DEFAULT 0,   -- score para leaderboard
  updated_at TIMESTAMPTZ
);

CREATE TABLE leaderboard (
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  power     BIGINT,
  zone      INT, level INT
);
-- índice para ranking:
-- CREATE INDEX idx_leaderboard_power ON leaderboard (power DESC);
```

> **Revisão/conflito:** cada save tem `revision`. Servidor aceita se `revision` do
> cliente >= a atual (idle não costuma gerar conflitos; o cap de 12h offline ajuda).

---

## 5. API REST (esboço de endpoints)

| Método | Rota | Ação |
|--------|------|------|
| POST | `/api/auth/register` | cria conta (`{username,password}`) |
| POST | `/api/auth/login` | retorna token de sessão |
| POST | `/api/save` | salva `G` (com `revision`) |
| GET  | `/api/save` | carrega o `G` do jogador |
| GET  | `/api/leaderboard` | `?page=1` → ranking |
| GET  | `/api/player/:id` | perfil público (esquadrão, level) |

**Autenticação:** token JWT ou sessão. `bcrypt` para hash de senha.

---

## 6. Tecnologias Node

- **Runtime:** Node.js (v20+).
- **Framework:** Express.
- **Tempo real:** Socket.IO.
- **Banco:** Postgres (`pg`). Opcional Redis (`ioredis`) para leaderboard/cache.
- **Autenticação:** `jsonwebtoken` + `bcrypt`.
- **Validação:** simples manual ou `zod`.
- **Deploy:** Docker + Render/Railway/Fly.io (bem simples) ou VPS (DigitalOcean).

---

## 7. Estrutura de pastas (proposta)

```
/server
  /src
    /routes        # auth, save, leaderboard, player
    /db            # pool, migrations
    /middleware     # auth (JWT)
    /realtime      # socket.io handlers (chat, presença)
    /services      # power-score, validação
    index.js
  /migrations       # SQL
  package.json
  .env              # DATABASE_URL, JWT_SECRET, PORT
/client            # o que você já tem hoje (index.html, css, js)
```

---

## 8. Migração passo a passo (quando formos construir)

1. **Criar `/server`** com Express + rotas de auth e save (sem multiplayer ainda).
2. **Adaptar `save()`/`load()`** no cliente: localStorage = cache; servidor = oficial.
   - `save()` → `POST /api/save` (com `revision`).
   - `load()` → `GET /api/save`; se offline, usa localStorage.
3. **Login**: tela simples antes do boot; token guardado em memória/localStorage.
4. **Power score + leaderboard** (Fase 1).
5. **Chat/WebSocket** (Fase 2).
6. **Eventos** (Fase 3+).

---

## 9. Riscos e decisões abertas

- **Onde hospedar?** Para MVP: Render/Railway (gratuito/barato). Depois: VPS.
- **Login social** (Google) mais tarde? Dá pra adicionar depois.
- **Anti-cheat:** num idle, o servidor deve validar valores recebidos (não confiar 100% no cliente). Podemos rodar a simulação autoritária no servidor, ou validar faixas plausíveis.
- **Custo:** Postgres em nuvem tem tier grátis (Supabase/Render/Neon) suficiente pra começar.

---

## 10. Próximo passo (quando você quiser)

Montar a **Fase 0**: estrutura `/server` + registro/login + `POST/GET /save`,
e adaptar o `save()/load()` do cliente para sincronizar com a nuvem
(mantendo o offline). Depois disso, leaderboard.
