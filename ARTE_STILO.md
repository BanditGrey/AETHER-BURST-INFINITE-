# 🎨 ARTE / ESTILO — Padrão de Sprites dos Runners (MEMÓRIA DEFINITIVA)

> **Este é o padrão oficial.** Sempre que gerar um novo asset de personagem, seguir
> este arquivo para não perder a consistência. O sprite de referência atualmente bom é
> o **REX** (estilo de animação: corpo inteiro, rosto detalhado, cores vívidas).

## 🟢 FUNDO PADRÃO: GREEN SCREEN (verde `#00FF00`)

O fundo dos sprites é **verde puro uniforme** (padrão da indústria / chroma key).
- É o **padrão acordado** e universal — funciona com qualquer ferramenta, não limita
  a criação de assets futuros.
- Verde é **distinto de pele, branco e cores pálidas** → **olhos ficam visíveis**.
- **Cabelo/roupa NUNCA branco ou muito pálido.**

> ⚠️ **Exceção:** o **REX** é verde-temático — gerar o REX com fundo **magenta `#FF00FF`**
> para não se misturar, e remover separado.

> ✅ Referência de estilo de animação: **REX** — corpo inteiro, uma figura única,
> rosto grande e detalhado, olhos com íris/pupila visíveis, contorno escuro.

## 📋 Receituário do ROSTO (padrão a seguir nos 8)

1. **Pele:** tom **warm peach** (ex.: `#ffd9b3`), uniforme, sem realces brancos.
2. **Olhos:** grandes, expressivos, com brilho, **íris/pupila colorida ou escura — NUNCA só branco** (senão some).
3. **Sobrancelhas + boca:** visíveis, com contorno.
4. **Contorno do rosto:** linha escura grossa (anime chibi), bem definida.
5. **Sem sombra no rosto:** luz frontal uniforme.

## 🚫 REGRA: EVITAR BRANCO / PÁLIDO / MÚLTIPLAS FIGURAS

- Cabelo, roupas, armas: **cor saturada e vívida** (contraste com o fundo branco).
- **Olhos sempre com íris/pupila escura ou colorida** + contorno.
- **UMA única figura por sprite** — nunca poses repetidas, nunca multiplas figuras
  (o gerador às vezes cria 2-3 do mesmo personagem; insistir em "ONE character, no
  duplicates, single figure centered").

## 🌈 Identidade visual por Runner (cor / elemento / cabelo)

| Runner | Elemento | Cor principal | Cabelo (saturado) |
|--------|----------|---------------|-------------------|
| KAIRO | Raio | `#3aa0ff` | azul-elétrico saturado |
| ZAEL | Fogo | `#ff3b46` | vermelho vivo |
| SERAPH | Trevas | `#a06bff` | roxo-prata (saturado) |
| LYRA | Luz | `#ffce4a` | loiro dourado |
| FROST | Gelo | `#54c8ff` | azul saturado (não branco) |
| NINA | Raio | `#ffb52e` | twintails laranja |
| REX | Vento | `#54c46a` | verde selvagem |
| SABLE | Trevas | `#7a5cff` | violeta (com capuz) |

## 🎨 Como gerar (prompt padrão — estilo REX + fundo branco)

> *A single lone chibi anime idle-game hero character, ONE character, no duplicates,
> no repeated poses, no second figure, in the same detailed animation style as the
> character "Rex". [DESCRIÇÃO]. One full-body figure centered, filling about 70% of
> the image height. Flat pure SOLID GREEN (#00FF00) background filling the entire image,
> empty everywhere except the single character. Warm peach face fully visible with a
> clear colored or dark iris and pupil (NOT white-only), dark outline. No colored glow,
> no aura, crisp clean edges, no tinted rim light. No gradient, no shadow, no ground,
> no text.*

> Para o **REX** (verde), usar **magenta `#FF00FF`** no lugar do verde.

## 🖼️ Processamento pós-geração (ImageMagick)

Fundo verde → remover com **fuzz baixo (14%)** + trim + centralizar quadrado
(REX: remover magenta no lugar do verde):

```bash
# verde (padrão); para REX usar rgb(240,0,250) em vez de '#00ff00'
convert "$IMG" -alpha on -fuzz 14% -transparent '#00ff00' -trim +repage tmp_t.png
w=$(identify -format "%w" tmp_t.png); h=$(identify -format "%h" tmp_t.png)
size=$(( w>h ? w : h ))
convert tmp_t.png -background none -gravity center -extent ${size}x${size} -resize 256x256 -strip "$IMG"
```

> ⚠️ Conferir após processar: (1) cantos transparentes, (2) **uma única figura**,
> (3) olhos visíveis.

## 🔁 Status (próxima regeneração)

Quando o limite de geração resetar, regenerar **os 7** (KAIRO, ZAEL, SERAPH, LYRA,
NINA, REX, SABLE) com o prompt padrão acima, usando `frost.png` como referência de rosto.

- [x] FROST — rosto OK (referência)
- [ ] KAIRO / ZAEL / SERAPH / LYRA / NINA / REX / SABLE — regerar no padrão Frost

> Regerar os 8 de uma vez, com o mesmo estilo de rosto, para **unificar** a arte.
