# OS Package Design

**Date:** 2026-04-12
**Package:** `@chrisluyi/os`
**Shell alias:** `cos`

---

## Overview

A new `packages/os/` domain package exposing OS-level utility commands via the `cos` shell alias. Designed to work on macOS, Linux, and WSL2 (Ubuntu on Windows).

---

## Commands

| Command | Type | Description |
|---------|------|-------------|
| `cos open` | `run` | Open current directory in native file manager |
| `cos term` | `run` | Open new terminal window at current directory |
| `cos ports` | `component` | Interactive list of listening ports — select to kill |
| `cos kill <port>` | `run` | Kill process on specified port directly |
| `cos info [path]` | `component` | Show file or directory metadata |

---

## Cross-Platform Detection

`packages/os/src/platform.ts` — a small utility with three exported booleans:

```ts
export const isWSL: boolean   // linux && /proc/version contains "microsoft"
export const isMac: boolean   // process.platform === 'darwin'
export const isLinux: boolean // linux && !isWSL
```

Used by all commands that need platform-specific behaviour.

---

## Command Details

### `cos open` (`run`)

Opens the current working directory in the native file manager.

| Platform | Command |
|----------|---------|
| WSL2 | `explorer.exe .` |
| macOS | `open .` |
| Linux | `xdg-open .` |

### `cos term` (`run`)

Opens a new terminal window at the current working directory.

| Platform | Command |
|----------|---------|
| WSL2 | `wt.exe -d .` |
| macOS | `open -a Terminal .` |
| Linux | `$TERMINAL .` (falls back with an unsupported warning if unset) |

### `cos ports` (`component` — Ink)

Interactive port manager. Fetches all listening TCP ports, groups them by process, and allows kill-by-selection.

**Data sources:**
- Port + PID + name: `lsof -i -P -n -sTCP:LISTEN` (macOS and Linux/WSL2)
- Process start time: `ps -o lstart -p <pid>`
- Main vs sub: compare PPID — if parent is `init`/`systemd`/`launchd`/a shell → `main`, else → `sub`

**UI layout:**
```
Listening ports

  node              pid 12345   started 2h ago   main
  ● :3000
    :3001  (sub)

  postgres          pid 11111   started 3d ago   main
    :5432

  chrome            pid 67890   started 1h ago   main
    :8080
    :9229  (sub)

↑↓ navigate · Enter kill selected port · q quit
```

**Interaction model:**
- ↑/↓ navigate between port rows (skips group headers)
- Enter: kill the selected port's process; replace row with `✓ Killed :3000 (node, pid 12345)`
- `q`: quit
- Stay in the list after a kill so multiple ports can be killed in one session

**State shape:**
```ts
type PortEntry = {
  port: number
  pid: number
  name: string
  startedAt: string   // human-relative, e.g. "2h ago"
  isSub: boolean
  killed: boolean
}

type ProcessGroup = {
  name: string
  pid: number
  startedAt: string
  isMain: boolean
  ports: PortEntry[]
}
```

### `cos kill <port>` (`run`)

Direct kill for scripting and muscle memory. Uses `lsof -ti tcp:<port>` to find the PID, then sends SIGKILL.

- Prints `Killed :3000 (node, pid 12345)` on success
- Prints `Nothing listening on :3000` if port is free
- Exits non-zero on error

### `cos info [path]` (`component` — Ink)

Defaults to `.` if no path given. Uses Node's `fs.stat` — no shell needed for the stat data; `du -sh` for directory total size; `find` for file/directory counts.

**File output:**
```
File: src/index.ts

  Size        4.2 KB
  Permissions -rw-r--r--
  Owner       chris
  Created     2026-03-01 09:12
  Modified    2026-04-10 14:33
  Accessed    2026-04-12 08:01
```

**Directory output:**
```
Directory: packages/git/src

  Files       12
  Directories 2
  Total size  48.3 KB
  Modified    2026-04-12 08:01
```

---

## Package Structure

```
packages/os/
  src/
    platform.ts       # isWSL / isMac / isLinux
    open.ts           # cos open  (run)
    term.ts           # cos term  (run)
    ports.tsx         # cos ports (component)
    kill.ts           # cos kill  (run)
    info.tsx          # cos info  (component)
    index.ts          # osRegistry: DomainRegistry
  tests/
    platform.test.ts
    kill.test.ts
    info.test.ts
  package.json
  CLAUDE.md
```

---

## Integration

**`packages/cli/src/index.tsx`:** import `osRegistry` from `@chrisluyi/os` and add to `registries` array.

**`install.sh`:** add shell function for `cos`:
```bash
cos() { bun run "$REPO_DIR/packages/cli/src/index.tsx" os "$@"; }
```

**`packages/cli/package.json`:** add `"@chrisluyi/os": "workspace:*"` to dependencies.

---

## Error Handling

- Platform-unsupported commands print a clear message and exit 1 (e.g. `wt.exe` not found on macOS)
- `cos kill` on a free port: informational message, exit 0
- `lsof` not found: print `lsof is required but not installed` and exit 1
- `cos info` on non-existent path: `ErrorBox` component + exit 1

---

## Testing

- `platform.ts`: unit tests mocking `process.platform` and `/proc/version` reads
- `kill.ts`: unit tests for PID extraction and error cases (port free, lsof unavailable)
- `info.tsx`: unit tests for size formatting, stat parsing, file-vs-directory detection
- `ports.tsx`: unit tests for `ProcessGroup` grouping logic and `isSub` detection
- Integration: manual smoke test (`cos open`, `cos term`, `cos ports`, `cos info`)
