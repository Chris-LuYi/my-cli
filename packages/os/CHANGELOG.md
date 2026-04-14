# @chrisluyi/os

## 0.3.5

### Patch Changes

- c9756bd: fix: unique React keys for ports using address:port, fix duplicate group key for system sockets

## 0.3.4

### Patch Changes

- 44870c1: fix: switch ports backend from lsof to ss for WSL2 compatibility

## 0.3.3

### Patch Changes

- 571be25: fix: treat lsof exit 1 with no stderr as empty state, not an error

## 0.3.2

### Patch Changes

- b75cb63: Fix: resolve workspace:\* dependencies to real semver ranges before npm publish.

## 0.3.1

### Patch Changes

- abdffbe: Internal: no changes, CI workflow release test.

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
