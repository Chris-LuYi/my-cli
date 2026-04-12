# @chrisluyi/os Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `@chrisluyi/os` domain package exposing `cos open`, `cos term`, `cos ports`, `cos kill`, and `cos info` commands via the `cos` shell alias.

**Architecture:** New `packages/os/` follows the same `DomainRegistry` pattern as `packages/git/`. Pure logic is extracted into testable helper functions; Ink components handle UI. Platform detection is centralised in `platform.ts` and injected as function parameters for testability.

**Tech Stack:** Bun, TypeScript, Ink 5, `@chrisluyi/core` (`runCommand`, `ErrorBox`, `CommandArgs`, `DomainRegistry`), Node `fs`/`os` modules.

---

## File Map

| File | Responsibility |
|------|----------------|
| `packages/os/package.json` | Package metadata and deps |
| `packages/os/CLAUDE.md` | Package-level docs |
| `packages/os/src/platform.ts` | `detectPlatform()` + exported `isWSL/isMac/isLinux` |
| `packages/os/src/open.ts` | `getOpenCommand()` pure helper + `runOsOpen` run fn |
| `packages/os/src/term.ts` | `getTermCommand()` pure helper + `runOsTerm` run fn |
| `packages/os/src/kill.ts` | `findPidOnPort()` + `runOsKill` run fn |
| `packages/os/src/info.tsx` | `formatBytes()`, `formatMode()`, `gatherInfo()` + `OsInfo` Ink component |
| `packages/os/src/ports-data.ts` | `parseLsofOutput()`, `buildGroups()`, `isSubProcess()`, `formatRelativeTime()` pure fns |
| `packages/os/src/ports.tsx` | `OsPorts` Ink component (interactive kill UI) |
| `packages/os/src/index.ts` | `osRegistry: DomainRegistry` |
| `packages/os/tests/platform.test.ts` | Tests for `detectPlatform()` |
| `packages/os/tests/open.test.ts` | Tests for `getOpenCommand()` |
| `packages/os/tests/term.test.ts` | Tests for `getTermCommand()` |
| `packages/os/tests/kill.test.ts` | Tests for `findPidOnPort()` + `runOsKill` validation |
| `packages/os/tests/info.test.ts` | Tests for `formatBytes()`, `formatMode()`, `gatherInfo()` |
| `packages/os/tests/ports.test.ts` | Tests for `parseLsofOutput()`, `buildGroups()`, `isSubProcess()`, `formatRelativeTime()` |
| `packages/cli/package.json` | Add `@chrisluyi/os` dependency |
| `packages/cli/src/index.tsx` | Import + register `osRegistry` |
| `install.sh` | Add `cos` shell function |

---

## Task 1: Package scaffold

**Files:**
- Create: `packages/os/package.json`
- Create: `packages/os/CLAUDE.md`
- Create: `packages/os/src/index.ts`

- [ ] **Step 1: Create `packages/os/package.json`**

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

- [ ] **Step 2: Create `packages/os/CLAUDE.md`**

```markdown
# @chrisluyi/os

OS utility commands, exposed via `cos` shell function.

## Commands

| Subcommand | Usage | Notes |
|---|---|---|
| `open` | `cos open` | Open cwd in native file manager |
| `term` | `cos term` | Open new terminal window at cwd |
| `ports` | `cos ports` | Interactive list of listening TCP ports; select to kill |
| `kill` | `cos kill <port>` | Kill process on port directly |
| `info` | `cos info [path]` | File or directory metadata |

## Platform support

`src/platform.ts` exports `isWSL`, `isMac`, `isLinux`. Use these via function
parameters (not direct import) in command logic for testability.

## Registry

`src/index.ts` exports `osRegistry: DomainRegistry` — imported by `@chrisluyi/cli`.
```

- [ ] **Step 3: Create stub `packages/os/src/index.ts`**

```ts
import type { DomainRegistry } from "@chrisluyi/core"

export const osRegistry: DomainRegistry = {
  domain: "os",
  shellAlias: "cos",
  commands: [],
}
```

- [ ] **Step 4: Run `bun install` to register workspace package**

```bash
bun install
```

Expected: `@chrisluyi/os` appears in the workspace.

- [ ] **Step 5: Commit**

```bash
git add packages/os/
git commit -m "feat(os): scaffold @chrisluyi/os package"
```

---

## Task 2: `platform.ts`

**Files:**
- Create: `packages/os/src/platform.ts`
- Create: `packages/os/tests/platform.test.ts`

`★ Insight ─────────────────────────────────────`
Platform constants evaluated at module load time can't be mocked after import. Exporting `detectPlatform()` as a pure function lets tests call it after mocking `process.platform` and `readFileSync` — avoiding the need for Bun's `mock.module`.
`─────────────────────────────────────────────────`

- [ ] **Step 1: Write failing tests**

Create `packages/os/tests/platform.test.ts`:

```ts
import { describe, expect, test, mock, beforeEach } from "bun:test"

// We test detectPlatform by mocking its dependencies.
// Import the module factory so we can call detectPlatform with controlled inputs.
import { detectPlatform } from "../src/platform"

describe("detectPlatform", () => {
  test("detects macOS", () => {
    const result = detectPlatform("darwin", () => "")
    expect(result).toEqual({ isWSL: false, isMac: true, isLinux: false })
  })

  test("detects WSL", () => {
    const result = detectPlatform("linux", () => "Linux version 5.15 (microsoft-standard-WSL2)")
    expect(result).toEqual({ isWSL: true, isMac: false, isLinux: false })
  })

  test("detects native Linux", () => {
    const result = detectPlatform("linux", () => "Linux version 5.15 (Ubuntu)")
    expect(result).toEqual({ isWSL: false, isMac: false, isLinux: true })
  })

  test("handles /proc/version read error gracefully", () => {
    const result = detectPlatform("linux", () => { throw new Error("ENOENT") })
    expect(result).toEqual({ isWSL: false, isMac: false, isLinux: true })
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd packages/os && bun test tests/platform.test.ts
```

Expected: FAIL — `detectPlatform` not found.

- [ ] **Step 3: Implement `packages/os/src/platform.ts`**

```ts
import { readFileSync } from "node:fs"

type Platform = { isWSL: boolean; isMac: boolean; isLinux: boolean }

export function detectPlatform(
  platform: string = process.platform,
  readProcVersion: () => string = () => readFileSync("/proc/version", "utf8"),
): Platform {
  const mac = platform === "darwin"
  const linux = platform === "linux"
  let wsl = false
  if (linux) {
    try {
      wsl = /microsoft/i.test(readProcVersion())
    } catch {
      wsl = false
    }
  }
  return { isWSL: wsl, isMac: mac, isLinux: linux && !wsl }
}

const { isWSL, isMac, isLinux } = detectPlatform()
export { isWSL, isMac, isLinux }
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
cd packages/os && bun test tests/platform.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/os/src/platform.ts packages/os/tests/platform.test.ts
git commit -m "feat(os): add platform detection"
```

---

## Task 3: `cos open`

**Files:**
- Create: `packages/os/src/open.ts`
- Create: `packages/os/tests/open.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/os/tests/open.test.ts`:

```ts
import { describe, expect, test } from "bun:test"
import { getOpenCommand } from "../src/open"

describe("getOpenCommand", () => {
  test("WSL2 uses explorer.exe", () => {
    expect(getOpenCommand(true, false)).toEqual(["explorer.exe", ["."]])
  })

  test("macOS uses open", () => {
    expect(getOpenCommand(false, true)).toEqual(["open", ["."]])
  })

  test("Linux uses xdg-open", () => {
    expect(getOpenCommand(false, false)).toEqual(["xdg-open", ["."]])
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd packages/os && bun test tests/open.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `packages/os/src/open.ts`**

```ts
import { runCommand } from "@chrisluyi/core"
import { isMac, isWSL } from "./platform"

export function getOpenCommand(
  wsl: boolean,
  mac: boolean,
): [string, string[]] {
  if (wsl) return ["explorer.exe", ["."]]
  if (mac) return ["open", ["."]]
  return ["xdg-open", ["."]]
}

export async function runOsOpen(_positional: string[]): Promise<number> {
  const [cmd, args] = getOpenCommand(isWSL, isMac)
  const result = await runCommand(cmd, args)
  if (result.exitCode !== 0) {
    console.error(result.stderr.trim() || `${cmd} failed`)
    return 1
  }
  return 0
}
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
cd packages/os && bun test tests/open.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/os/src/open.ts packages/os/tests/open.test.ts
git commit -m "feat(os): add cos open command"
```

---

## Task 4: `cos term`

**Files:**
- Create: `packages/os/src/term.ts`
- Create: `packages/os/tests/term.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/os/tests/term.test.ts`:

```ts
import { describe, expect, test } from "bun:test"
import { getTermCommand } from "../src/term"

const alwaysAvailable = (_: string) => true
const neverAvailable = (_: string) => false
const onlyXterm = (cmd: string) => cmd === "xterm"

describe("getTermCommand", () => {
  test("WSL2 uses wt.exe", () => {
    expect(getTermCommand(true, false, alwaysAvailable)).toEqual(["wt.exe", ["-d", "."]])
  })

  test("macOS uses open -a Terminal", () => {
    expect(getTermCommand(false, true, alwaysAvailable)).toEqual(["open", ["-a", "Terminal", "."]])
  })

  test("Linux tries x-terminal-emulator first", () => {
    expect(getTermCommand(false, false, alwaysAvailable)).toEqual(["x-terminal-emulator", ["."]])
  })

  test("Linux falls back through list", () => {
    expect(getTermCommand(false, false, onlyXterm)).toEqual(["xterm", ["."]])
  })

  test("Linux returns null if no emulator found", () => {
    expect(getTermCommand(false, false, neverAvailable)).toBeNull()
  })

  test("gnome-terminal uses --working-directory flag", () => {
    const onlyGnome = (cmd: string) => cmd === "gnome-terminal"
    expect(getTermCommand(false, false, onlyGnome)).toEqual([
      "gnome-terminal",
      ["--working-directory=."],
    ])
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd packages/os && bun test tests/term.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `packages/os/src/term.ts`**

```ts
import { which } from "bun"
import { runCommand } from "@chrisluyi/core"
import { isLinux, isMac, isWSL } from "./platform"

const LINUX_TERMINALS: Array<[string, string[]]> = [
  ["x-terminal-emulator", ["."]],
  ["gnome-terminal", ["--working-directory=."]],
  ["xterm", ["."]],
]

export function getTermCommand(
  wsl: boolean,
  mac: boolean,
  available: (cmd: string) => boolean,
): [string, string[]] | null {
  if (wsl) return ["wt.exe", ["-d", "."]]
  if (mac) return ["open", ["-a", "Terminal", "."]]
  for (const [t, args] of LINUX_TERMINALS) {
    if (available(t)) return [t, args]
  }
  return null
}

export async function runOsTerm(_positional: string[]): Promise<number> {
  const cmd = getTermCommand(isWSL, isMac, (t) => which(t) !== null)
  if (!cmd) {
    console.error("No supported terminal emulator found")
    return 1
  }
  const [bin, args] = cmd
  const result = await runCommand(bin, args)
  if (result.exitCode !== 0) {
    console.error(result.stderr.trim() || `${bin} failed`)
    return 1
  }
  return 0
}
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
cd packages/os && bun test tests/term.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/os/src/term.ts packages/os/tests/term.test.ts
git commit -m "feat(os): add cos term command"
```

---

## Task 5: `cos kill`

**Files:**
- Create: `packages/os/src/kill.ts`
- Create: `packages/os/tests/kill.test.ts`

`★ Insight ─────────────────────────────────────`
`lsof -ti tcp:<port>` returns exit code 1 when nothing listens — indistinguishable from an error at the OS level. The contract: empty stdout + exit 1 = port free (not an error). Non-empty stdout + exit 0 = pid found. Anything else (non-zero + non-empty stderr) = real error.
`─────────────────────────────────────────────────`

- [ ] **Step 1: Write failing tests**

Create `packages/os/tests/kill.test.ts`:

```ts
import { describe, expect, test } from "bun:test"
import { validatePort, parseLsofKillOutput } from "../src/kill"

describe("validatePort", () => {
  test("rejects non-numeric", () => {
    expect(validatePort("abc")).toBeNull()
  })

  test("rejects port 0", () => {
    expect(validatePort("0")).toBeNull()
  })

  test("rejects port > 65535", () => {
    expect(validatePort("65536")).toBeNull()
  })

  test("accepts valid port", () => {
    expect(validatePort("3000")).toBe(3000)
    expect(validatePort("80")).toBe(80)
    expect(validatePort("65535")).toBe(65535)
  })
})

describe("parseLsofKillOutput", () => {
  test("returns null when stdout is empty (port free)", () => {
    expect(parseLsofKillOutput("", 1)).toBeNull()
  })

  test("returns pid string when found", () => {
    expect(parseLsofKillOutput("12345\n", 0)).toBe("12345")
  })

  test("trims whitespace from pid", () => {
    expect(parseLsofKillOutput("  12345  \n", 0)).toBe("12345")
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd packages/os && bun test tests/kill.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `packages/os/src/kill.ts`**

```ts
import { which } from "bun"
import { runCommand } from "@chrisluyi/core"

/** Returns port number (1–65535) or null if invalid */
export function validatePort(arg: string): number | null {
  const n = Number(arg)
  if (!Number.isInteger(n) || n < 1 || n > 65535) return null
  return n
}

/**
 * Parse `lsof -ti tcp:<port>` output.
 * lsof exits 1 with empty stdout when nothing listens — that means port free, not error.
 * Returns pid string or null (port free).
 */
export function parseLsofKillOutput(stdout: string, exitCode: number): string | null {
  const pid = stdout.trim()
  if (exitCode !== 0 && !pid) return null  // port free
  if (pid) return pid
  return null
}

export async function runOsKill(positional: string[]): Promise<number> {
  const arg = positional[0]
  if (!arg) {
    console.error("Usage: cos kill <port>")
    return 1
  }

  const port = validatePort(arg)
  if (port === null) {
    console.error(`Invalid port: ${arg}`)
    return 1
  }

  if (!which("lsof")) {
    console.error("lsof is required but not installed")
    return 1
  }

  const lsofResult = await runCommand("lsof", ["-ti", `tcp:${port}`])
  const pid = parseLsofKillOutput(lsofResult.stdout, lsofResult.exitCode)

  if (pid === null) {
    console.log(`Nothing listening on :${port}`)
    return 0
  }

  // Get process name for the confirmation message
  const psResult = await runCommand("ps", ["-o", "comm=", "-p", pid])
  const name = psResult.stdout.trim() || "unknown"

  const killResult = await runCommand("kill", ["-9", pid])
  if (killResult.exitCode !== 0) {
    console.error(killResult.stderr.trim() || "kill failed")
    return 1
  }

  console.log(`Killed :${port} (${name}, pid ${pid})`)
  return 0
}
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
cd packages/os && bun test tests/kill.test.ts
```

Expected: 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/os/src/kill.ts packages/os/tests/kill.test.ts
git commit -m "feat(os): add cos kill command"
```

---

## Task 6: `cos info`

**Files:**
- Create: `packages/os/src/info.tsx`
- Create: `packages/os/tests/info.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/os/tests/info.test.ts`:

```ts
import { describe, expect, test } from "bun:test"
import { formatBytes, formatMode, parseDuOutput } from "../src/info"

describe("formatBytes", () => {
  test("bytes", () => expect(formatBytes(512)).toBe("512 B"))
  test("kilobytes", () => expect(formatBytes(4300)).toBe("4.2 KB"))
  test("megabytes", () => expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB"))
  test("gigabytes", () => expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe("2.0 GB"))
})

describe("formatMode", () => {
  test("regular file rw-r--r--", () => {
    expect(formatMode(0o100644)).toBe("-rw-r--r--")
  })

  test("directory rwxr-xr-x", () => {
    expect(formatMode(0o40755)).toBe("drwxr-xr-x")
  })

  test("falls back to octal when type bits absent", () => {
    // 0o777 has no type bits — typical on WSL /mnt/c/
    expect(formatMode(0o777)).toBe("0777")
  })
})

describe("parseDuOutput", () => {
  test("parses 'du -sh' output", () => {
    expect(parseDuOutput("48.3K\t./packages/git/src\n")).toBe("48.3 KB")
    expect(parseDuOutput("1.2M\t./dist\n")).toBe("1.2 MB")
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd packages/os && bun test tests/info.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement pure helpers in `packages/os/src/info.tsx`**

Start with the helper functions (add the Ink component in the same file afterwards):

```ts
import { statSync } from "node:fs"
import { userInfo } from "node:os"
import path from "node:path"
import { runCommand, ErrorBox } from "@chrisluyi/core"
import type { CommandArgs } from "@chrisluyi/core"
import { Text, Box, useApp } from "ink"
import type React from "react"
import { useEffect, useState } from "react"

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

const TYPE_BITS: Record<number, string> = {
  0o100000: "-", // regular file
  0o040000: "d", // directory
  0o120000: "l", // symlink
}

export function formatMode(mode: number): string {
  const typeMask = mode & 0o170000
  const typeChar = TYPE_BITS[typeMask]
  if (!typeChar) return `0${(mode & 0o777).toString(8)}`  // WSL /mnt/c/ fallback

  const perm = mode & 0o777
  const bits = [
    perm & 0o400 ? "r" : "-",
    perm & 0o200 ? "w" : "-",
    perm & 0o100 ? "x" : "-",
    perm & 0o040 ? "r" : "-",
    perm & 0o020 ? "w" : "-",
    perm & 0o010 ? "x" : "-",
    perm & 0o004 ? "r" : "-",
    perm & 0o002 ? "w" : "-",
    perm & 0o001 ? "x" : "-",
  ].join("")
  return typeChar + bits
}

/** Parse `du -sh <path>` output → human-readable size string */
export function parseDuOutput(raw: string): string {
  const size = raw.trim().split(/\s/)[0] ?? ""
  // du uses K/M/G suffixes; normalise to KB/MB/GB
  return size
    .replace(/K$/, " KB")
    .replace(/M$/, " MB")
    .replace(/G$/, " GB")
}

// --- Ink component ---

type FileData = {
  kind: "file"
  label: string
  size: string
  mode: string
  owner: string
  created: string
  modified: string
  accessed: string
}

type DirData = {
  kind: "dir"
  label: string
  files: number
  dirs: number
  totalSize: string
  modified: string
}

type InfoData = FileData | DirData

function formatDate(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 16)
}

async function gatherInfo(target: string): Promise<InfoData> {
  const stat = statSync(target)
  const label = path.relative(process.cwd(), path.resolve(target)) || target

  if (stat.isDirectory()) {
    const duResult = await runCommand("du", ["-sh", target])
    const totalSize = duResult.exitCode === 0 ? parseDuOutput(duResult.stdout) : "unknown"

    const findResult = await runCommand("find", [target, "-maxdepth", "1", "-mindepth", "1"])
    const entries = findResult.stdout.trim() ? findResult.stdout.trim().split("\n") : []
    let files = 0
    let dirs = 0
    for (const e of entries) {
      try {
        statSync(e).isDirectory() ? dirs++ : files++
      } catch { /* skip */ }
    }

    return {
      kind: "dir",
      label,
      files,
      dirs,
      totalSize,
      modified: formatDate(stat.mtime),
    }
  }

  const cu = userInfo()
  const owner = stat.uid === cu.uid ? cu.username : String(stat.uid)

  return {
    kind: "file",
    label,
    size: formatBytes(stat.size),
    mode: formatMode(stat.mode),
    owner,
    created: formatDate(stat.birthtime),
    modified: formatDate(stat.mtime),
    accessed: formatDate(stat.atime),
  }
}

export const OsInfo: React.FC<CommandArgs> = ({ positional, setExitCode }) => {
  const { exit } = useApp()
  const target = positional[0] ?? "."
  const [phase, setPhase] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; data: InfoData }
  >({ status: "loading" })

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-once effect
  useEffect(() => {
    ;(async () => {
      try {
        const data = await gatherInfo(target)
        setPhase({ status: "ready", data })
      } catch (err) {
        setPhase({
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        })
      }
    })()
  }, [])

  useEffect(() => {
    if (phase.status === "ready") exit()
  }, [phase.status, exit])

  if (phase.status === "loading") return <Text dimColor>Gathering info...</Text>
  if (phase.status === "error")
    return <ErrorBox message={phase.message} setExitCode={setExitCode} />

  const { data } = phase
  const col = 12

  if (data.kind === "file") {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>File: {data.label}</Text>
        <Text />
        <Text>{"  "}<Text dimColor>{"Size".padEnd(col)}</Text>{data.size}</Text>
        <Text>{"  "}<Text dimColor>{"Permissions".padEnd(col)}</Text>{data.mode}</Text>
        <Text>{"  "}<Text dimColor>{"Owner".padEnd(col)}</Text>{data.owner}</Text>
        <Text>{"  "}<Text dimColor>{"Created".padEnd(col)}</Text>{data.created}</Text>
        <Text>{"  "}<Text dimColor>{"Modified".padEnd(col)}</Text>{data.modified}</Text>
        <Text>{"  "}<Text dimColor>{"Accessed".padEnd(col)}</Text>{data.accessed}</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>Directory: {data.label}</Text>
      <Text />
      <Text>{"  "}<Text dimColor>{"Files".padEnd(col)}</Text>{data.files}</Text>
      <Text>{"  "}<Text dimColor>{"Directories".padEnd(col)}</Text>{data.dirs}</Text>
      <Text>{"  "}<Text dimColor>{"Total size".padEnd(col)}</Text>{data.totalSize}</Text>
      <Text>{"  "}<Text dimColor>{"Modified".padEnd(col)}</Text>{data.modified}</Text>
    </Box>
  )
}
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
cd packages/os && bun test tests/info.test.ts
```

Expected: 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/os/src/info.tsx packages/os/tests/info.test.ts
git commit -m "feat(os): add cos info command"
```

---

## Task 7: `cos ports` — data layer

**Files:**
- Create: `packages/os/src/ports-data.ts`
- Create: `packages/os/tests/ports.test.ts`

`★ Insight ─────────────────────────────────────`
Separating the parsing and grouping logic from the Ink component means all data-heavy logic is unit-testable with plain strings. The component only handles rendering and keyboard events — two things that are hard to unit test and easy to verify manually.
`─────────────────────────────────────────────────`

- [ ] **Step 1: Write failing tests**

Create `packages/os/tests/ports.test.ts`:

```ts
import { describe, expect, test } from "bun:test"
import {
  parseLsofOutput,
  isSubProcess,
  formatRelativeTime,
  buildGroups,
} from "../src/ports-data"

describe("parseLsofOutput", () => {
  const sample = `COMMAND   PID  USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
node     1234  chris   22u  IPv4  12345      0t0  TCP *:3000 (LISTEN)
node     1234  chris   24u  IPv4  12346      0t0  TCP *:3001 (LISTEN)
postgres 5678  chris   10u  IPv6  12347      0t0  TCP *:5432 (LISTEN)`

  test("parses multiple entries", () => {
    const result = parseLsofOutput(sample)
    expect(result).toHaveLength(3)
  })

  test("extracts port correctly", () => {
    const result = parseLsofOutput(sample)
    expect(result[0].port).toBe(3000)
    expect(result[2].port).toBe(5432)
  })

  test("extracts pid correctly", () => {
    const result = parseLsofOutput(sample)
    expect(result[0].pid).toBe(1234)
  })

  test("returns empty array for empty input", () => {
    expect(parseLsofOutput("")).toHaveLength(0)
    expect(parseLsofOutput("COMMAND PID USER")).toHaveLength(0)
  })
})

describe("isSubProcess", () => {
  test("PID 1 parent is main", () => {
    expect(isSubProcess(1, "systemd")).toBe(false)
  })

  test("shell parent is main", () => {
    expect(isSubProcess(100, "bash")).toBe(false)
    expect(isSubProcess(100, "zsh")).toBe(false)
    expect(isSubProcess(100, "sh")).toBe(false)
  })

  test("non-shell user process parent is sub", () => {
    expect(isSubProcess(100, "node")).toBe(true)
    expect(isSubProcess(200, "chrome")).toBe(true)
  })
})

describe("formatRelativeTime", () => {
  test("formats hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const lstart = twoHoursAgo.toString()
    expect(formatRelativeTime(lstart)).toBe("2h ago")
  })

  test("formats days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    expect(formatRelativeTime(threeDaysAgo.toString())).toBe("3d ago")
  })

  test("returns raw string on unparseable input", () => {
    expect(formatRelativeTime("not a date")).toBe("not a date")
  })
})

describe("buildGroups", () => {
  const entries = [
    { name: "node", pid: 1234, port: 3000 },
    { name: "node", pid: 1234, port: 3001 },
    { name: "postgres", pid: 5678, port: 5432 },
  ]

  const pidInfo = new Map([
    [1234, { startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toString(), ppid: 1, parentName: "systemd" }],
    [5678, { startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toString(), ppid: 1, parentName: "systemd" }],
  ])

  test("groups ports by pid", () => {
    const groups = buildGroups(entries, pidInfo)
    expect(groups).toHaveLength(2)
    expect(groups[0].ports).toHaveLength(2)
    expect(groups[1].ports).toHaveLength(1)
  })

  test("marks process as main when ppid is 1", () => {
    const groups = buildGroups(entries, pidInfo)
    expect(groups[0].isMain).toBe(true)
  })

  test("marks process as sub when ppid is user process", () => {
    const subPidInfo = new Map([
      [1234, { startedAt: new Date().toString(), ppid: 999, parentName: "node" }],
    ])
    const groups = buildGroups([entries[0]], subPidInfo)
    expect(groups[0].isMain).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd packages/os && bun test tests/ports.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `packages/os/src/ports-data.ts`**

```ts
export type PortEntry = {
  port: number
  pid: number
  name: string
  startedAt: string
  isSub: boolean
  killed: boolean
}

export type ProcessGroup = {
  name: string
  pid: number
  startedAt: string
  isMain: boolean
  ports: PortEntry[]
}

/** Parse `lsof -i -P -n -sTCP:LISTEN` output */
export function parseLsofOutput(
  output: string,
): Array<{ name: string; pid: number; port: number }> {
  if (!output.trim()) return []
  return output
    .trim()
    .split("\n")
    .slice(1) // skip header
    .flatMap((line) => {
      const parts = line.trim().split(/\s+/)
      if (parts.length < 9) return []
      const name = parts[0]
      const pid = Number.parseInt(parts[1])
      const nameCol = parts[parts.length - 2] // e.g. "*:3000"
      const port = Number.parseInt(nameCol.split(":").pop() ?? "")
      if (!Number.isFinite(pid) || !Number.isFinite(port) || port === 0) return []
      return [{ name, pid, port }]
    })
}

const SHELL_NAMES = new Set(["bash", "zsh", "sh", "fish", "csh", "tcsh", "dash"])

export function isSubProcess(ppid: number, parentName: string): boolean {
  if (ppid <= 1) return false
  if (SHELL_NAMES.has(parentName.toLowerCase())) return false
  return true
}

export function formatRelativeTime(lstart: string): string {
  const d = new Date(lstart.trim())
  if (Number.isNaN(d.getTime())) return lstart.trim()

  const diffMs = Date.now() - d.getTime()
  const s = Math.floor(diffMs / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function buildGroups(
  entries: Array<{ name: string; pid: number; port: number }>,
  pidInfo: Map<number, { startedAt: string; ppid: number; parentName: string }>,
): ProcessGroup[] {
  const groupMap = new Map<number, ProcessGroup>()

  for (const entry of entries) {
    const info = pidInfo.get(entry.pid)
    const startedAt = info ? formatRelativeTime(info.startedAt) : "unknown"
    const sub = info ? isSubProcess(info.ppid, info.parentName) : false

    if (!groupMap.has(entry.pid)) {
      groupMap.set(entry.pid, {
        name: entry.name,
        pid: entry.pid,
        startedAt,
        isMain: !sub,
        ports: [],
      })
    }

    // biome-ignore lint/style/noNonNullAssertion: just inserted above
    groupMap.get(entry.pid)!.ports.push({
      port: entry.port,
      pid: entry.pid,
      name: entry.name,
      startedAt,
      isSub: sub,
      killed: false,
    })
  }

  return Array.from(groupMap.values())
}
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
cd packages/os && bun test tests/ports.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/os/src/ports-data.ts packages/os/tests/ports.test.ts
git commit -m "feat(os): add ports data layer"
```

---

## Task 8: `cos ports` — Ink component

**Files:**
- Create: `packages/os/src/ports.tsx`

The component fetches data then renders an interactive list. Navigation uses a flat index that skips killed entries.

- [ ] **Step 1: Implement `packages/os/src/ports.tsx`**

```tsx
import { which } from "bun"
import { runCommand, ErrorBox } from "@chrisluyi/core"
import type { CommandArgs } from "@chrisluyi/core"
import { Text, Box, useApp, useInput } from "ink"
import type React from "react"
import { useEffect, useState, useCallback } from "react"
import { parseLsofOutput, buildGroups } from "./ports-data"
import type { ProcessGroup, PortEntry } from "./ports-data"

type Phase =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; groups: ProcessGroup[]; cursor: number }

/** Flat ordered list of all port entries for cursor navigation */
function flatPorts(groups: ProcessGroup[]): PortEntry[] {
  return groups.flatMap((g) => g.ports)
}

/** Next navigable index (skips killed), or current if all killed */
function nextIdx(ports: PortEntry[], from: number, dir: 1 | -1): number {
  let i = from + dir
  while (i >= 0 && i < ports.length) {
    if (!ports[i].killed) return i
    i += dir
  }
  return from
}

export const OsPorts: React.FC<CommandArgs> = ({ setExitCode }) => {
  const { exit } = useApp()
  const [phase, setPhase] = useState<Phase>({ status: "loading" })

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-once effect
  useEffect(() => {
    ;(async () => {
      try {
        if (!which("lsof")) {
          setPhase({ status: "error", message: "lsof is required but not installed" })
          return
        }

        const lsof = await runCommand("lsof", ["-i", "-P", "-n", "-sTCP:LISTEN"])
        if (lsof.exitCode !== 0 && !lsof.stdout.trim()) {
          setPhase({ status: "error", message: lsof.stderr.trim() || "lsof failed" })
          return
        }

        const raw = parseLsofOutput(lsof.stdout)
        if (raw.length === 0) {
          setPhase({ status: "empty" })
          return
        }

        // Gather per-pid start time and ppid
        const pids = [...new Set(raw.map((e) => e.pid))]
        const pidInfo = new Map<number, { startedAt: string; ppid: number; parentName: string }>()

        await Promise.all(
          pids.map(async (pid) => {
            const [lstartRes, ppidRes] = await Promise.all([
              runCommand("ps", ["-o", "lstart=", "-p", String(pid)]),
              runCommand("ps", ["-o", "ppid=,comm=", "-p", String(pid)]),
            ])
            const startedAt = lstartRes.stdout.trim()
            const ppidParts = ppidRes.stdout.trim().split(/\s+/)
            const ppid = Number.parseInt(ppidParts[0] ?? "1")
            const parentName = ppidParts.slice(1).join(" ") || "unknown"
            pidInfo.set(pid, { startedAt, ppid, parentName })
          }),
        )

        const groups = buildGroups(raw, pidInfo)
        setPhase({ status: "ready", groups, cursor: 0 })
      } catch (err) {
        setPhase({
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        })
      }
    })()
  }, [])

  useEffect(() => {
    if (phase.status === "empty") exit()
  }, [phase.status, exit])

  const killSelected = useCallback(async () => {
    if (phase.status !== "ready") return
    const ports = flatPorts(phase.groups)
    const entry = ports[phase.cursor]
    if (!entry || entry.killed) return

    await runCommand("kill", ["-9", String(entry.pid)])

    // Mark killed and advance cursor
    const newGroups = phase.groups.map((g) => ({
      ...g,
      ports: g.ports.map((p) =>
        p.port === entry.port && p.pid === entry.pid ? { ...p, killed: true } : p,
      ),
    }))
    const newPorts = flatPorts(newGroups)
    const next = newPorts.findIndex((p, i) => i > phase.cursor && !p.killed)
    const newCursor = next !== -1 ? next : phase.cursor

    setPhase({ status: "ready", groups: newGroups, cursor: newCursor })
  }, [phase])

  useInput((input, key) => {
    if (phase.status !== "ready") return
    const ports = flatPorts(phase.groups)

    if (key.upArrow) {
      setPhase({ ...phase, cursor: nextIdx(ports, phase.cursor, -1) })
    } else if (key.downArrow) {
      setPhase({ ...phase, cursor: nextIdx(ports, phase.cursor, 1) })
    } else if (key.return) {
      killSelected()
    } else if (input === "q") {
      exit()
    }
  })

  if (phase.status === "loading") return <Text dimColor>Scanning ports...</Text>
  if (phase.status === "error")
    return <ErrorBox message={phase.message} setExitCode={setExitCode} />
  if (phase.status === "empty") return <Text>No listening ports found.</Text>

  const ports = flatPorts(phase.groups)

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>Listening ports</Text>
      <Text />
      {phase.groups.map((g) => (
        <Box key={g.pid} flexDirection="column" marginBottom={1}>
          <Text>
            {"  "}
            <Text bold>{g.name.padEnd(16)}</Text>
            {"  "}
            <Text dimColor>pid {g.pid}{"  "}started {g.startedAt}{"  "}</Text>
            <Text color={g.isMain ? "green" : "yellow"}>{g.isMain ? "main" : "sub"}</Text>
          </Text>
          {g.ports.map((p) => {
            const flatIdx = ports.findIndex((fp) => fp.port === p.port && fp.pid === p.pid)
            const selected = flatIdx === phase.cursor
            return (
              <Text key={p.port}>
                {"  "}
                {selected ? <Text color="cyan">{"● "}</Text> : "  "}
                {p.killed ? (
                  <Text color="green">✓ Killed :{p.port} ({p.name}, pid {p.pid})</Text>
                ) : (
                  <Text color={selected ? "cyan" : undefined}>
                    :{p.port}
                    {p.isSub ? <Text dimColor>{"  (sub)"}</Text> : ""}
                  </Text>
                )}
              </Text>
            )
          })}
        </Box>
      ))}
      <Text dimColor>↑↓ navigate · Enter kill · q quit</Text>
    </Box>
  )
}
```

- [ ] **Step 2: Run full test suite to confirm nothing broken**

```bash
cd packages/os && bun test
```

Expected: all tests PASS (ports.tsx has no unit tests — covered by ports-data tests + manual smoke).

- [ ] **Step 3: Commit**

```bash
git add packages/os/src/ports.tsx
git commit -m "feat(os): add cos ports interactive component"
```

---

## Task 9: Wire `osRegistry` and integrate

**Files:**
- Modify: `packages/os/src/index.ts`
- Modify: `packages/cli/package.json`
- Modify: `packages/cli/src/index.tsx`
- Modify: `install.sh`

- [ ] **Step 1: Complete `packages/os/src/index.ts`**

```ts
import type { DomainRegistry } from "@chrisluyi/core"
import { runOsOpen } from "./open"
import { runOsTerm } from "./term"
import { OsPorts } from "./ports"
import { runOsKill } from "./kill"
import { OsInfo } from "./info"

export const osRegistry: DomainRegistry = {
  domain: "os",
  shellAlias: "cos",
  commands: [
    {
      name: "open",
      description: "Open current directory in native file manager",
      usage: "cos open",
      run: runOsOpen,
    },
    {
      name: "term",
      description: "Open new terminal window at current directory",
      usage: "cos term",
      run: runOsTerm,
    },
    {
      name: "ports",
      description: "Interactive list of listening ports — select to kill",
      usage: "cos ports",
      component: OsPorts,
    },
    {
      name: "kill",
      description: "Kill process on port",
      usage: "cos kill <port>",
      run: runOsKill,
    },
    {
      name: "info",
      description: "Show file or directory metadata",
      usage: "cos info [path]",
      component: OsInfo,
    },
  ],
}
```

- [ ] **Step 2: Add `@chrisluyi/os` to `packages/cli/package.json`**

Open `packages/cli/package.json`. Add to `dependencies`:

```json
"@chrisluyi/os": "workspace:*"
```

- [ ] **Step 3: Register `osRegistry` in `packages/cli/src/index.tsx`**

Current line 1–2:
```ts
import { ErrorBox, HelpTable } from "@chrisluyi/core"
import { gitRegistry } from "@chrisluyi/git"
```

Add after the `gitRegistry` import:
```ts
import { osRegistry } from "@chrisluyi/os"
```

Current line 7:
```ts
const registries = [gitRegistry]
```

Change to:
```ts
const registries = [gitRegistry, osRegistry]
```

- [ ] **Step 4: Add `cos` function to `install.sh`**

Find this block in `install.sh`:
```bash
cgit() { bun run "$REPO_DIR/packages/cli/src/index.tsx" git "$@"; }
alias my-cli="bun run \"$REPO_DIR/packages/cli/src/index.tsx\""
```

Add the `cos` line after `cgit`:
```bash
cgit() { bun run "$REPO_DIR/packages/cli/src/index.tsx" git "$@"; }
cos() { bun run "$REPO_DIR/packages/cli/src/index.tsx" os "$@"; }
alias my-cli="bun run \"$REPO_DIR/packages/cli/src/index.tsx\""
```

- [ ] **Step 5: Run `bun install` to link workspace**

```bash
bun install
```

- [ ] **Step 6: Run full test suite**

```bash
bun test
```

Expected: all tests across all packages PASS.

- [ ] **Step 7: Run Biome check**

```bash
bunx biome check .
```

Fix any issues before committing.

- [ ] **Step 8: Commit**

```bash
git add packages/os/src/index.ts packages/cli/package.json packages/cli/src/index.tsx install.sh bun.lockb
git commit -m "feat(os): wire osRegistry and integrate into CLI"
```

---

## Task 10: Smoke test

- [ ] **Step 1: Re-source shell**

```bash
source ~/.bashrc
```

- [ ] **Step 2: Test `cos open`**

```bash
cos open
```

Expected: file manager opens at current directory.

- [ ] **Step 3: Test `cos term`**

```bash
cos term
```

Expected: new terminal window opens.

- [ ] **Step 4: Test `cos ports`**

```bash
cos ports
```

Expected: interactive list of listening ports; ↑↓ navigation; Enter kills selected port.

- [ ] **Step 5: Test `cos kill`**

```bash
cos kill 99999    # should print: Nothing listening on :99999
cos kill abc      # should print: Invalid port: abc
```

- [ ] **Step 6: Test `cos info`**

```bash
cos info packages/os/src/index.ts    # file info
cos info packages/os/src            # directory info
cos info /nonexistent               # error box
```

- [ ] **Step 7: Add changeset and push**

```bash
cat > .changeset/os-package.md << 'EOF'
---
"@chrisluyi/os": minor
"@chrisluyi/cli": patch
---

Add @chrisluyi/os package with cos open, cos term, cos ports, cos kill, and cos info commands.
EOF

git add .changeset/os-package.md
git commit -m "chore: add changeset for os package"
git push
```
