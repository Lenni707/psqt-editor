# PSQT Editor

A minimal piece-square-table editor. Select squares, type a number, copy the table as a Rust array.

**Live:** https://lenni707.github.io/psqt-editor/

| Action | Input |
| --- | --- |
| Select / deselect | click (toggles), or drag (adds or removes, depending on the first square) |
| Select an area | click one corner, <kbd>⇧</kbd>+click the other |
| Select all / clear | <kbd>⌘A</kbd> / <kbd>Esc</kbd> |
| Set value | type a number (shown live in every selected square), <kbd>↵</kbd> applies and clears the selection |
| Nudge | <kbd>↑</kbd>/<kbd>↓</kbd> ±1, with <kbd>⇧</kbd> ±10 |
| Zero selection | <kbd>⌫</kbd> |
| Undo / redo | <kbd>⌘Z</kbd> / <kbd>⇧⌘Z</kbd> |
| Copy Rust | button, or <kbd>⌘C</kbd> |
| Import | <kbd>⌘V</kbd> any text with 64 integers (e.g. a previous export) |

Export order: **a8 first** writes the table as it looks on the board (index 0 = a8). **a1 first** uses little-endian rank-file (index 0 = a1). Import uses the same setting.

Static HTML/CSS/JS with no build step. State is kept in `localStorage`.
