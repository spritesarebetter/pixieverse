# Pixieverse

A browser-based MSX2 / MSX2+ Sprite Mode 2 editor.

## Launch

Open: https://spritesarebetter.github.io/pixieverse/

## Current editor model

Pixieverse treats every hardware sprite as its own editable sprite block.

- 8×8 or 16×16 sprite size
- one sprite block per hardware sprite, arranged horizontally
- one sprite-cell-width gap between sprite blocks
- every sprite has its own per-scanline color swatches and OR flags
- Sprite 0 is the coordinate origin and highest-priority sprite
- all other sprite offsets are stored relative to Sprite 0
- reordering or deleting Sprite 0 automatically rebases the frame
- up to 32 sprites per frame
- sprite visibility and priority ordering
- frame wait values measured in 60 Hz frames
- frame reordering
- Pencil, Eraser and rectangular selection tools
- copy/paste, selection drag, arrow movement, flip, invert and clear
- Undo / Redo
- editor zoom in 10% steps
- editable 16-entry MSX RGB3 palette (512 legal colors)
- built-in palettes plus browser-saved palettes and `.gpl` load/save
- pattern, color, SAT, palette and Z80 assembly export
- responsive desktop/tablet layouts

The VDP scene preview is not part of the current editor layout.

## Sprite colors

Each sprite has a color/OR rail directly beside it. Every row corresponds to the same scanline of that sprite.

Click a color swatch to make that sprite/scanline active, then choose a color from the Palette panel on the left. The OR checkbox maps to the Sprite Mode 2 combine-color bit.

## Offsets

Sprite 0 always has offset `0,0`. The Offset X/Y fields for every other sprite are relative to Sprite 0. Sprite 0's offset controls are disabled because it defines the origin.

## Palette

The Palette panel contains:

- built-in palettes
- palettes saved inside Pixieverse
- `Load…` for `.gpl` files
- MSX RGB values from 0–7 per channel
- conventional RGB values from 0–255
- Save, Delete and Save `.gpl`

RGB edits are quantized to legal MSX 3-bit RGB colors. Undo can restore palette edits.

## Project format

Pixieverse uses the current `.msxsprite` format only. No legacy-format migration code is maintained unless explicitly requested.

## Run locally

There is no build step. Open `index.html`, or run:

```sh
python3 -m http.server 8000
```
