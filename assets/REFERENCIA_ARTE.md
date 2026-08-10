# 🖼️ REFERÊNCIA DE ARTE — Descrições dos Personagens

> **Este arquivo guarda a DESCRIÇÃO EXATA de cada sprite gerado**, para que qualquer
> futuro asset siga o mesmo padrão sem "fugir" do estilo. Sempre consultar antes de
> gerar. Ver também `ARTE_STILO.md` (regras gerais de fundo/rosto/processamento).

## 🎨 ESTILO GERAL (vale para TODOS os Runners)

- **Estilo:** chibi anime idle-game, corpo inteiro (não retrato).
- **Rosto:** warm peach skin, olhos GRANDES com íris/pupila ESCURA bem visível,
  contorno escuro forte, sobrancelhas e boca visíveis, linha de contorno grossa.
- **Uma única figura** por sprite (nunca múltiplas poses/personagens).
- **Cores saturadas e vívidas** (sem branco/pálido).
- **Fundo:** verde puro `#00FF00` (REX usa magenta `#FF00FF`).
- **Sem glow/aura**, sem sombra, sem chão, sem texto.

---

## 👤 DESCRIÇÕES INDIVIDUAIS

### KAIRO — "The Skybreaker" (Raio)
- **Cabelo:** azul-elétrico espetado, saturado.
- **Arma:** espadão grande de raio brilhante, azul e ciano.
- **Cores:** azul elétrico `#3aa0ff` / ciano.
- **Postura:** guerreiro jovem e arrogante, em pé, espada na mão.

### ZAEL — "The Crimson Fang" (Fogo)
- **Cabelo:** vermelho vivo.
- **Arma:** duas lâminas com borda de fogo.
- **Cores:** carmesim `#ff3b46` / laranja.
- **Postura:** ninja-guerreiro frio, em posição de combate.

### SERAPH — "The Void Empress" (Trevas)
- **Cabelo:** roxo-prata longo e saturado.
- **Arma/objeto:** orbe escuro flutuante.
- **Cores:** roxo `#a06bff` / magenta.
- **Postura:** feiticeira aristocrática elegante, em pé.

### LYRA — "The Solar Blade" (Luz)
- **Cabelo:** loiro dourado.
- **Arma:** espada de luz radiante, dourada.
- **Cores:** dourado `#ffce4a` / amarelo pálido.
- **Postura:** espadachim determinada, em pé.

### FROST — "The Glacial Phantom" (Gelo)
- **Cabelo:** AZUL VIVO saturado (não pálido/branco).
- **Arma:** cajado de gelo com cristal ciano no topo.
- **Cores:** azul gelo `#54c8ff` / ciano.
- **Postura:** maga de gelo calma, em pé.

### NINA — "The Thunder Engineer" (Raio)
- **Cabelo:** twintails laranja.
- **Arma/objeto:** canhão/gadget tecnológico.
- **Cores:** laranja `#ffb52e` / amarelo.
- **Postura:** engenheira animada, em pé.

### REX — "The Wild Breaker" (Vento)
- **Cabelo:** verde-escuro selvagem.
- **Arma:** escudo torre grande.
- **Cores:** verde `#54c46a` / marrom (terroso) — fundo MAGENTA.
- **Postura:** guerreiro feral selvagem, em pé com escudo.

### SABLE — "The Phantom Executor" (Trevas)
- **Cabelo:** violeta escuro, metade coberto por capuz.
- **Arma:** duas foices escuras.
- **Cores:** violeta `#7a5cff` / preto.
- **Postura:** assassino misterioso, em pé.

---

## 🔁 COMO USAR ESTE ARQUIVO

Antes de gerar QUALQUER sprite, copiar a descrição do personagem acima para o prompt
da imagem, junto com o **estilo geral** e o **prompt padrão** do `ARTE_STILO.md`.
Isso garante consistência total entre todos os assets gerados.

---

## 🌄 CENÁRIOS (fundos das 7 zonas) — padrão ANTI-FLUTUAÇÃO

> Personagens ficam ancorados pelos pés na grade 2×3 (y = 395 / 480 / 565).
> Para que ninguém pareça "flutuar", TODO fundo de zona segue esta composição:

- **Horizonte reto** atravessando a imagem a ~60% da altura (zona 1280×640).
- **Plano de chão em perspectiva** ocupando os ~40% inferiores: textura pequena
  perto do horizonte crescendo até a borda inferior, **contínuo da esquerda à
  direita — sem buracos, precipícios, obstáculos ou plataformas flutuantes** na
  área do chão (é onde a grade 2×3 e os inimigos caminham).
- **Portal/rift dimensional** no terço direito, nascendo do chão (de onde vêm
  os inimigos).
- Cenário distante SÓ acima do horizonte. Sem personagens, sem texto.
- Arquivo final: JPEG 1280×640 (`-resize x640 -gravity center -crop 1280x640+0+0`).

| Zona | Arquivo | Chão / tema |
|------|---------|-------------|
| 1 Verdant Rift | `z1_verdant.jpg` | solo musgoso de terra e pedras planas; floresta retorcida teal |
| 2 Inferno Gate | `z2_inferno.jpg` | planalto de obsidiana rachada com veios de lava; vulcões ao fundo |
| 3 Frozen Abyss | `z3_frozen.jpg` | placa de gelo lisa com trincas; aurora e mar congelado ao fundo |
| 4 Storm Circuit | `z4_storm.jpg` | esplanada de placas escuras com circuitos amarelos; torres em ruínas + raios |
| 5 Void Cathedral | `z5_void.jpg` | mármore negro polido com filetes violeta; catedrais flutuando no fundo |
| 6 Celestial Spire | `z6_celestial.jpg` | terraço de mármore marfim-dourado com runas; torre sagrada nas nuvens |
| 7 Core Infinite | `z7_core.jpg` | piso vítreo escuro com veios de aether turquesa; vórtice caótico no céu |

---

## 👹 INIMIGOS (Rift Entities) — descrições

Mesmo estilo dos Runners (chibi anime, corpo inteiro, fundo verde, uma figura, olhos
com íris escura). Sprites em `assets/enemies/*.png`.

| typeKey | Nome | Descrição | Cor |
|---------|------|-----------|-----|
| hollow | Hollow | criatura fantasmagórica cinza com capuz, rosto cinza | `#8a93a6` |
| brute | Brute | ogre blindado cinza-escuro, ombros grossos, olhos zangados | `#6b7280` |
| phantom | Phantom | espectro roxo com cauda espectral, rosto oco | `#9b6bff` |
| surge | Surge | lodo ciano carregado de raio | `#3afff0` |
| elite | Elite | demônio guerreiro laranja-vermelho com maça | `#ff5a3c` |
| miniboss | Rift Warden | guardião âmbar blindado, núcleo brilhante | `#ff8a3c` |
| riftlord | VERDANT RIFT LORD | titã florestal verde com chifres de folha, enorme | `#54c46a` |

> Para gerar um novo inimigo, usar a descrição + o prompt padrão do `ARTE_STILO.md`
> (fundo verde `#00FF00`, estilo REX, olhos escuros, uma figura única).

---

## 🗺️ FUNDOS DE ZONA — descrições

Fundos de batalha (cenário wide 2:1, sem personagens) em `assets/bg/*.jpg`
(1280x640, JPEG q80). Gerados em anime game art style.

| Zona | Arquivo | Tema |
|------|---------|------|
| 1 Verdant Rift | z1_verdant.jpg | floresta dimensional corrompida, partículas aether verdes |
| 2 Inferno Gate | z2_inferno.jpg | vulcão dimensional, lava, brasas |
| 3 Frozen Abyss | z3_frozen.jpg | oceano congelado, aurora boreal |
| 4 Storm Circuit | z4_storm.jpg | cidades flutuantes destruídas, tempestade de raios |
| 5 Void Cathedral | z5_void.jpg | templo corrompido pelo vazio, névoa roxa |
| 6 Celestial Spire | z6_celestial.jpg | torre sagrada dourada, nuvens, brilho celestial |
| 7 Core Infinite | z7_core.jpg | centro do Rift, caos aether, ilhas flutuantes |

> Prompt padrão de fundo: cenário 2D side-scroller wide 2:1, sem personagens/UI/texto,
> portal de rift no lado direito, paleta da zona (ver `ZONES` no `data.js`).
