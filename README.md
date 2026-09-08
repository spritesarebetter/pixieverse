# Pixieverse

A browser-based MSX2 / MSX2+ Sprite Mode 2 editor.

## Launch

Open: https://spritesarebetter.github.io/pixieverse/

NicheTracker: https://spritesarebetter.github.io/pixieverse/nichetracker.html

## Current editor model

Pixieverse separates the non-editable composite preview from the editable hardware sprites.

- all control windows are stacked in the left sidebar
- Preview, Palette, Sprites, Selected sprite, Export, and Frames/animation can be collapsed with arrow buttons
- Preview fits the complete sprite object at its default 100% view
- Preview has independent zoom controls and optional sprite borders
- individual editable hardware sprites are arranged horizontally in the center
- Sprite editor starts at 50% zoom and changes in 10% steps
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
- editable 16-entry MSX RGB3 palette (512 legal colors)
- built-in palettes plus browser-saved palettes and `.gpl` load/save
- pattern, color, SAT, palette and Z80 assembly export
- responsive desktop/tablet layouts

## Preview

The Preview is read-only. At 100% it automatically fits the full sprite object, including sprites positioned outside Sprite 0. The `+` and `−` controls scale relative to that fitted view.

The **Borders** button toggles sprite outlines in the Preview. Preview zoom is independent from Sprite editor zoom.

## Sprites

The Sprites, Selected sprite, Palette, Preview, and Export controls all live in the left sidebar. Each section can be hidden or shown with its arrow button.

Each editable sprite has its name above the bitmap. Click the same name in the Sprites panel to edit it.

Each sprite has a color rail directly beside it. Every row corresponds to the same scanline. Click a color swatch, then choose a color from the Palette panel on the left.

The OR checkbox maps to the Sprite Mode 2 combine-color/CC bit. It is only shown for Sprites 1 and higher.

## Frames / animation

Frames remain in their own horizontal window below the Sprite editor, not in the left sidebar.

- click a card to select its frame
- drag a card with the mouse to reorder frames
- each card keeps its per-frame `wait` value, measured in 60 Hz frames
- Play animates the Preview on a 60 Hz timing base while leaving the editing frame alone
- Stop returns the Preview to the currently selected editing frame
- the Frames/animation window can also be collapsed

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
