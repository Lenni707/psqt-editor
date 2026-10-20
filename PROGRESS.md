# PROGRESS

## Rules
- Static site only: `index.html`, `style.css`, `app.js`. No framework, no build, no backend.
- Served by GitHub Pages from `main` / root.
- Keep the UI minimal: one board, one control row, one hint line. No menus or modals.
- Commit + push after each milestone; update the log below.

## Architecture
- `app.js` (IIFE): `state.values` is an `Int32Array(64)` in **visual order** (0 = a8, 63 = h1); `state.selected` is a `Set` of indices.
- `commit(fn)` snapshots the values for undo, mutates them, saves to `localStorage` (`psqt:v1`), and re-renders.
- `toRust()` formats right-aligned rows and reverses them for `a1` order. `parseNumbers()` strips comments and `[T; N]` type annotations before pulling out integers (used by paste-import).
- Theme tokens on `:root`, dark mode through `prefers-color-scheme`. Square font size uses `cqw` (the board is a size container).

## Checklist
- [x] Board, rank/file labels, value tint
- [x] Toggle selection by default, drag paint, ⇧+click rectangle from anchor, ⌘A, Esc
- [x] Typed entry shown in every selected tile, ↑↓ nudge, ⌫ zero, undo/redo
- [x] Rust export (i16/i32, a8/a1 order), clipboard
- [x] Paste import (64 ints), localStorage persistence
- [x] Light/dark, phone layout
- [ ] Ideas: multiple tables (per piece, mg/eg), keyboard cursor movement, mirror/symmetry tools

## Log
- 2026-10-20: Initial build. Verified in headless Chrome (puppeteer): drag select, multi-select set, nudges, undo, export in both orders, round-trip import, no overflow at 390px. Exported Rust compiles (`rustc --emit=metadata`).
- 2026-10-20: Selection is now additive by default (click toggles; a drag keeps the first square's add/remove mode). ⇧+click selects the rectangle from the last clicked square. Removed the centered pill: the pending value is drawn in every selected tile. Enter applies the value and clears the selection.
