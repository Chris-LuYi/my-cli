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

Error handling: if the spawn fails (command not found or non-zero exit), print the stderr and exit 1.

### `cos term` (`run`)

Opens a new terminal window at the current working directory.

| Platform | Command |
|----------|---------|
| WSL2 | `wt.exe -d .` |
| macOS | `open -a Terminal .` |
| Linux | Try in order: `x-terminal-emulator .`, `gnome-terminal --working-directory=.`, `xterm` — use first one that exists on PATH |

Error handling:
- Linux: if none of the fallbacks are found, print `No supported terminal emulator found` and exit 1.
- All platforms: if the spawn fails, print stderr and exit 1.

### `cos ports` (`component` — Ink)

Interactive port manager. Fetches all listening TCP ports, groups them by process, and allows kill-by-selection.

**Data sources:**
- Port + PID + name: `lsof -i -P -n -sTCP:LISTEN` (macOS and Linux/WSL2)
- Process start time: `ps -o lstart= -p <pid>`
- PPID for main/sub detection: `ps -o ppid= -p <pid>` (note: BSD `ps` on macOS and GNU `ps` on Linux both support this flag)
- Main vs sub: if PPID resolves to PID 1 (`init`/`systemd`/`launchd`) or a shell process (`bash`, `zsh`, `sh`) → `main`, otherwise → `sub`

**Note on permissions:** `lsof -i` without root only shows processes owned by the current user. Ports owned by root or other users are silently omitted. This is expected behaviour.

**Component state machine:**

```ts
type Phase =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }                       // lsof succeeded but no ports listening
  | { status: "ready"; groups: ProcessGroup[]; cursor: number }
```

- **loading**: render `<Text dimColor>Scanning ports...</Text>`
- **error**: render `<ErrorBox message={message} setExitCode={setExitCode} />`
- **empty**: render `<Text>No listening ports found.</Text>` then exit
- **ready**: render the interactive list

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
- Cursor starts on the first port row.
- ↑/↓ navigate between port rows only (group headers are skipped).
- Boundary behaviour: navigation stops at top/bottom (no wrap).
- Enter: send SIGKILL to the port's PID; replace the row with `✓ Killed :3000 (node, pid 12345)`.
- Killed rows are skipped during navigation (cursor jumps over them).
- Pressing Enter on an already-killed row is a no-op.
- `q`: quit (exit 0).
- Stay in the list after a kill so multiple ports can be killed in one session.

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

Direct kill for scripting and muscle memory. Uses `lsof -ti tcp:<port>` to find the PID, then sends SIGKILL via `kill -9 <pid>`.

**Note:** `lsof -ti` exits with code 1 when no process is listening on the port. This must be explicitly handled — do not propagate `lsof`'s exit code directly.

- Non-numeric or out-of-range port argument: print `Invalid port: <arg>` and exit 1.
- Port is free (`lsof` exits 1 with no output): print `Nothing listening on :<port>` and exit 0.
- Killed successfully: print `Killed :<port> (node, pid 12345)` and exit 0.
- Any other error: print stderr and exit 1.

**SIGKILL rationale:** SIGKILL is used for predictable, immediate termination — consistent with the typical dev workflow of freeing a port quickly. Graceful shutdown is not a goal here. If a process (e.g. postgres) leaves stale lock files after SIGKILL, the user must clean those up manually; this is a known trade-off.

### `cos info [path]` (`component` — Ink)

Defaults to `.` if no path given. Uses Node's `fs.stat` for permissions/timestamps/owner; uses `runCommand("du", ["-sh", path])` for directory total size and `runCommand("find", [path, "-maxdepth", "1"])` for file/directory counts. These are subprocess calls via the existing `runCommand` utility — not pure Node fs.

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

**WSL2 caveat:** For files under `/mnt/c/` (Windows filesystem), `fs.stat().mode` may return unexpected permission values. Display the raw octal (e.g. `0777`) as a fallback if the mode does not match a standard POSIX pattern.

Error handling: non-existent path → `<ErrorBox>` + exit 1.

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
    platform.test.ts  # mock process.platform + /proc/version
    open.test.ts      # mock isWSL/isMac/isLinux, verify correct command dispatched
    term.test.ts      # mock platform + PATH, verify fallback sequence
    kill.test.ts      # port free, valid kill, invalid arg, lsof missing
    info.test.ts      # size formatting, stat parsing, file-vs-directory detection
    ports.test.ts     # ProcessGroup grouping logic, isSub detection, state transitions
  package.json
  CLAUDE.md
```

**`packages/os/package.json`:**
```json
{
  "name": "@chrisluyi/os",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "dependencies": {
    "@chrisluyi/core": "workspace:*",
    "ink": "^5.0.0",
    "react": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
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

## Error Handling Summary

| Scenario | Behaviour |
|----------|-----------|
| Platform-unsupported command | Print clear message, exit 1 |
| `cos kill` on free port | `Nothing listening on :<port>`, exit 0 |
| `cos kill` invalid port arg | `Invalid port: <arg>`, exit 1 |
| `cos term` no emulator (Linux) | `No supported terminal emulator found`, exit 1 |
| `lsof` not installed | `lsof is required but not installed`, exit 1 |
| `cos info` non-existent path | `ErrorBox` component + exit 1 |
| `cos ports` `lsof` error | `ErrorBox` component + exit 1 |
| `cos ports` no ports listening | `No listening ports found.` + exit 0 |

---

## Testing

- `platform.ts`: unit tests mocking `process.platform` and `/proc/version` reads
- `open.ts` / `term.ts`: unit tests mocking `isWSL`/`isMac`/`isLinux` to verify correct command is dispatched per platform
- `kill.ts`: unit tests for port-free handling (suppressing `lsof` exit 1), valid kill, invalid arg, lsof missing
- `info.tsx`: unit tests for size formatting, stat parsing, file-vs-directory detection
- `ports.tsx`: unit tests for `ProcessGroup` grouping logic, `isSub` detection, and state machine transitions (loading → ready, loading → error, loading → empty)
- Integration: manual smoke test (`cos open`, `cos term`, `cos ports`, `cos info`)
