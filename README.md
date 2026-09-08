# Pixieverse

A browser-based MSX2 / MSX2+ Sprite Mode 2 editor.

## Launch

Open: https://spritesarebetter.github.io/pixieverse/

NicheTracker: https://spritesarebetter.github.io/pixieverse/nichetracker.html

## Current editor model

Pixieverse separates the non-editable composite preview from the editable hardware sprites.

- Preview is at the top left with independent 10% zoom controls
- Preview expands automatically to include sprite offsets outside Sprite 0
- Preview sprite borders can be shown or hidden
- individual editable hardware sprites are arranged horizontally in the center
- every sprite has a title taken from its editable sprite name
- click a sprite name in the Sprites panel to rename it
- 8×8 or 16×16 sprite size
- one sprite-cell-width gap between sprite blocks
- every sprite has per-scanline color swatches
- Sprites 1+ also expose the Sprite Mode 2 OR/combine-color flag
- Sprite 0 has no OR controls and its OR bits are kept off
- Sprite 0 is the coordinate origin and highest-priority sprite
- all other sprite offsets are relative to Sprite 0
- Clear Sprite clears the complete selected sprite bitmap
- up to 32 sprites per frame with visibility and priority ordering
- Pencil, Eraser and rectangular selection tools
- copy/paste, selection drag, arrow movement, flip, invert and clear
- Undo / Redo
- editor zoom in 10% steps
- editable 16-entry MSX RGB3 palette (512 legal colors)
- built-in palettes plus browser-saved palettes and `.gpl` load/save
- pattern, color, SAT, palette and Z80 assembly export
- responsive desktop/tablet layouts

## Preview

The Preview is read-only. It composites visible hardware sprites using their offsets, priority, per-line colors and OR flags.

Its grid bounds are calculated from Sprite 0 plus the offsets of visible sprites. Moving a sprite beside, above, below or to the left of Sprite 0 enlarges the Preview automatically.

The **Borders** button toggles sprite outlines in the Preview. Preview zoom is independent from Sprite editor zoom.

## Sprites

Each editable sprite has its name above the bitmap. The same name appears in the Sprites panel on the right; click that name to edit it.

The old `x / y / pat` status line has been removed from the sprite list. Offset and pattern controls remain in the Selected sprite panel.

Each sprite has a color rail directly beside it. Every row corresponds to the same scanline. Click a color swatch, then choose a color from the Palette panel on the left.

The OR checkbox maps to the Sprite Mode 2 combine-color/CC bit. It is only shown for Sprites 1 and higher.

## Frames / animation

Frames are shown as square cards in a horizontal timeline below the sprite editors.

- click a card to select its frame
- drag a card with the mouse to reorder frames
- each card keeps its per-frame `wait` value, measured in 60 Hz frames
- Play animates the Preview on a 60 Hz timing base while leaving the editing frame alone
- Stop returns the Preview to the currently selected editing frame

## Palette

The Palette panel contains built-in palettes, browser-saved palettes, `.gpl` loading/saving, MSX RGB values from 0–7 per channel, and conventional RGB values from 0–255.

RGB edits are quantized to legal MSX 3-bit RGB colors. Undo can restore palette edits.

## Project format

Pixieverse uses the current `.msxsprite` format only. No legacy-format migration code is maintained unless explicitly requested.

## Run locally

There is no build step. Open `index.html`, or run:

```sh
python3 -m http.server 8000
```
