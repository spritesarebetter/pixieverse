# Pixieverse

A browser-based MSX2 / MSX2+ Sprite Mode 2 editor.

## Launch

Open: https://spritesarebetter.github.io/pixieverse/

## Current editor model

Pixieverse separates the composite preview from the editable hardware sprites.

- one non-editable composite preview grid at the left of the Sprite editor
- the composite preview expands automatically to include sprite offsets outside Sprite 0
- individual editable hardware sprites are arranged to the right of the preview
- 8×8 or 16×16 sprite size
- one sprite-cell-width gap between the preview and each sprite block
- every individual sprite has its own per-scanline color swatches
- Sprites 1+ also expose the Sprite Mode 2 OR/combine-color flag
- Sprite 0 has no OR controls because it has no lower-numbered sprite to combine with
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

The old full-screen VDP scene preview is not part of the current editor layout.

## Composite preview

The first grid in the Sprite editor is preview-only and cannot be drawn into. It composites the visible hardware sprites using their priority, per-line colors and OR flags.

Its grid bounds are calculated from Sprite 0 plus the offsets of the other sprites. Moving a sprite beside, above, below or to the left of Sprite 0 therefore enlarges the preview automatically.

Sprite 0 is outlined as the origin. When another sprite is selected, its bounds are also shown in the preview for orientation.

## Sprite colors

Each editable sprite has a color rail directly beside it. Every row corresponds to the same scanline of that sprite.

Click a color swatch to make that sprite/scanline active, then choose a color from the Palette panel on the left.

The OR checkbox maps to the Sprite Mode 2 combine-color/CC bit. It is only shown for Sprites 1 and higher. Sprite 0's OR bits are always kept off.

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
