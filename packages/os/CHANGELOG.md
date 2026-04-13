# @chrisluyi/os

## 0.3.0

### Minor Changes

- a5d33f0: Add `cos cpwd` and `cos cb` clipboard commands.

  - `cos cpwd` copies the current directory path to the system clipboard and saves it to history
  - `cos cb` opens an interactive history panel (↑↓ to navigate, Enter to copy, d to delete, q to quit)
  - `cos cb push <text>` pushes arbitrary text into history
  - History stored as individual `.txt` files in `~/.local/share/my-cli/clipboard/` (max 50, deduped)
  - Platform-aware clipboard write: `clip.exe` (WSL), `pbcopy` (macOS), `xclip` (Linux)

## 0.2.0

### Minor Changes

- e546a4f: Add @chrisluyi/os package with cos open, cos term, cos ports, cos kill, and cos info commands.
