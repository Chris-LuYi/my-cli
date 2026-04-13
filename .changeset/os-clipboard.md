---
"@chrisluyi/os": minor
---

Add `cos cpwd` and `cos cb` clipboard commands.

- `cos cpwd` copies the current directory path to the system clipboard and saves it to history
- `cos cb` opens an interactive history panel (↑↓ to navigate, Enter to copy, d to delete, q to quit)
- `cos cb push <text>` pushes arbitrary text into history
- History stored as individual `.txt` files in `~/.local/share/my-cli/clipboard/` (max 50, deduped)
- Platform-aware clipboard write: `clip.exe` (WSL), `pbcopy` (macOS), `xclip` (Linux)
