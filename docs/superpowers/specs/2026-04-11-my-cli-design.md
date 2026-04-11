# my-cli Design Spec

**Date:** 2026-04-11
**Status:** Approved

---

## Overview

`my-cli` is a personal CLI toolkit for Chris, built as a Bun monorepo. It provides domain-scoped shorthand commands (starting with `cgit`) and a master `my-cli` command that lists all registered personal commands. The UI layer uses [Ink](https://github.com/vadimdemedes/ink) (React for CLIs) for structured terminal output and interactive prompts.

---

## Goals

- Fast to invoke (Bun runs TypeScript source directly — no compile step)
- Easy to install (one script) and update (`git pull` is enough)
- Structured for growth (new domains added as new workspace packages)
- Clean terminal output via Ink components

---

## Repository Structure

```
my-cli/
├── package.json                  # root Bun workspace config (lists packages/*)
├── install.sh                    # idempotent install + ~/.bashrc wiring
├── docs/
│   └── superpowers/specs/        # design docs
└── packages/
    ├── core/                     # @my-cli/core — shared utilities and Ink components
    │   ├── package.json
    │   └── src/
    │       ├── components/
    │       │   ├── HelpTable.tsx   # master command list table
    │       │   ├── ErrorBox.tsx    # red error display
    │       │   └── Spinner.tsx     # loading indicator
    │       ├── utils/
    │       │   ├── exec.ts         # runCommand() — wraps Bun shell, returns stdout/stderr
    │       │   └── format.ts       # formatDate(), etc.
    │       └── types.ts            # CommandEntry interface (shared across all packages)
    ├── git/                      # @my-cli/git — git domain commands
    │   ├── package.json
    │   └── src/
    │       ├── index.ts          # git command registry
    │       ├── log.tsx           # cgit log
    │       ├── wip.tsx           # cgit wip
    │       ├── branch.tsx        # cgit branch <name>
    │       └── squash.tsx        # cgit squash tag|commit|last <ref>
    └── cli/                      # @my-cli/cli — master entry point
        ├── package.json
        └── src/
            └── index.tsx         # aggregates all registries, routes argv, renders
```

### Root `package.json`

```json
{
  "name": "my-cli",
  "private": true,
  "workspaces": ["packages/*"]
}
```

---

## Shared Types (`@my-cli/core`)

```ts
// packages/core/src/types.ts

export interface CommandArgs {
  positional: string[];   // remaining argv after domain + subcommand
}

// Each domain package defines its own concrete prop types per command.
// CommandEntry uses React.FC<any> at the registry level; the component
// itself is typed with its own interface internally.
export interface CommandEntry {
  name: string;           // subcommand name, e.g. "log", "squash"
  description: string;    // shown in HelpTable
  usage: string;          // e.g. "cgit squash last <n>"
  component: React.FC<CommandArgs>;
  // Each component internally casts/validates positional[] to its own types.
}

export interface DomainRegistry {
  domain: string;         // e.g. "git"
  shellAlias: string;     // e.g. "cgit"
  commands: CommandEntry[];
}
```

### Per-command argument conventions

Each component receives raw `positional: string[]` and is responsible for interpreting its own args:

| Command | `positional` shape |
|---|---|
| `log` | `[]` — no args |
| `wip` | `[]` — no args |
| `branch` | `[name: string]` |
| `squash tag` | `["tag", tag: string]` — git tag name |
| `squash commit` | `["commit", sha: string]` — commit SHA |
| `squash last` | `["last", n: string]` — integer as string, parsed via `parseInt` |

Components validate their positionals at render time and surface an `<ErrorBox>` if required args are missing or invalid (e.g. `squash` receives variant not in `["tag","commit","last"]`).

---

## Commands

### `cgit` — git domain

| Subcommand | Usage | Description |
|---|---|---|
| `log` | `cgit log` | Pretty-printed git log (graph, short hash, relative date, author) |
| `wip` | `cgit wip` | Stage all changes + commit as `WIP [ISO timestamp]` |
| `branch` | `cgit branch <name>` | Detect default branch, fetch it, create + switch to new branch off it |
| `squash tag` | `cgit squash tag <tag>` | Squash all commits since `<tag>` into one (interactive commit message) |
| `squash commit` | `cgit squash commit <sha>` | Squash all commits since `<sha>` into one (interactive commit message) |
| `squash last` | `cgit squash last <n>` | Squash last `n` commits into one (interactive commit message) |

### `my-cli` — master help

Running `my-cli` with no arguments (or unrecognized arguments) renders a formatted Ink `<HelpTable>` of all commands across all domain registries.

---

## Architecture

### `cli/src/index.tsx` composition

The master entry point explicitly imports each domain registry and composes them into a single array:

```ts
// packages/cli/src/index.tsx
import { render } from 'ink';
import { gitRegistry } from '@my-cli/git';
import { HelpTable, ErrorBox } from '@my-cli/core';

const registries = [gitRegistry]; // add new domains here

// routing logic below (see Routing section)
```

When new domain packages are added, a single import + array push is all that's needed.

### Routing

`packages/cli/src/index.tsx` parses `process.argv` and routes as follows:

```
argv[2] = domain (e.g. "git")
argv[3] = subcommand (e.g. "squash")
argv[4] = subcommand variant or first positional (e.g. "last")
argv[5..] = remaining positionals

Routing logic:
  if no argv[2]:                render <HelpTable registries={all} />
  if argv[2] is unknown domain: render <ErrorBox> + exit 1
  if no argv[3]:                render <HelpTable> for that domain only
  if argv[3] is unknown:        render <ErrorBox> + exit 1
  else:                         render matched CommandEntry.component with CommandArgs
```

`CommandArgs.positional` receives `argv.slice(4)` — the component is responsible for interpreting its own positionals (e.g. `squash` reads `positional[0]` as variant: `"tag" | "commit" | "last"` and `positional[1]` as the ref/n).

### `cgit log` implementation

Implemented as a passthrough to `git log` with a fixed `--format` and `--graph` flag. Output is streamed directly to stdout (preserving terminal colors). No Ink rendering — Ink is used only for the error case.

```
git log --oneline --graph --decorate --all \
  --format="%C(yellow)%h%C(reset) %C(green)(%ar)%C(reset) %s %C(blue)<%an>%C(reset)"
```

### `cgit wip` implementation

1. `git add -A`
2. `git commit -m "WIP $(date -u +%Y-%m-%dT%H:%M:%SZ)"`
3. Render Ink success message with the commit hash

### `cgit branch <name>` implementation

1. Detect default branch: `git remote show origin | grep 'HEAD branch' | awk '{print $NF}'`
2. `git fetch origin <default>`
3. `git checkout -b <name> origin/<default>`
4. Does **not** push the branch (local only)
5. Render Ink success message: branch name + base branch

### `cgit squash` implementation

1. Validate ref/n exists and squash range has ≥ 2 commits
2. Render Ink interactive `<TextInput>` prompt for commit message
3. On confirm: `git reset --soft <base>` then `git commit -m "<message>"`
4. Render Ink success message with squashed commit hash

---

## Error Handling

- All git subprocess calls wrapped in try/catch; failures render `<ErrorBox>` (red border, message) and exit with code 1
- Non-zero git exit codes mapped to descriptive messages:
  - Branch already exists → "Branch `<name>` already exists"
  - Nothing to squash → "Need at least 2 commits to squash"
  - Invalid ref → "Ref `<ref>` not found"
- `squash last <n>` validates `n >= 2` before running any git commands
- `branch <name>` validates name is non-empty before proceeding

### Exit code pattern

`ErrorBox` uses Ink's `useApp().exit(error)` to signal failure. This flushes the final rendered frame before stopping. The entry point awaits `waitUntilExit()` and calls `process.exit(1)` if it rejects:

```ts
// packages/cli/src/index.tsx
const { waitUntilExit } = render(<App registries={registries} argv={process.argv.slice(2)} />);
try {
  await waitUntilExit();
} catch {
  process.exit(1);
}

// packages/core/src/components/ErrorBox.tsx
const { exit } = useApp();
useEffect(() => { exit(new Error(message)); }, []);
```

This ensures the error message is always visible before the process exits.

---

## Install & Update

### `install.sh`

```bash
#!/usr/bin/env bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

# Install dependencies
bun install --cwd "$REPO_DIR"

# Write shell integrations to ~/.bashrc (idempotent)
MARKER="# my-cli"
if ! grep -q "$MARKER" ~/.bashrc; then
  cat >> ~/.bashrc <<EOF

$MARKER
cgit() { bun run "$REPO_DIR/packages/cli/src/index.tsx" git "\$@"; }
alias my-cli="bun run '$REPO_DIR/packages/cli/src/index.tsx'"
EOF
  echo "Shell functions added to ~/.bashrc. Run: source ~/.bashrc"
else
  echo "Shell functions already present in ~/.bashrc"
fi
```

The exact shell integrations injected into `~/.bashrc`:

```bash
# my-cli
cgit() { bun run "$REPO_DIR/packages/cli/src/index.tsx" git "$@"; }
alias my-cli="bun run '$REPO_DIR/packages/cli/src/index.tsx'"
```

Where `$REPO_DIR` is the resolved absolute path captured at install time. Invocation is via `bun run <path>` — no shebang, no bin field, no global install required. Bun executes the TypeScript source file directly.

Notes:
- `cgit` is a bash function (supports `"$@"` argument passthrough)
- `my-cli` is an alias (hyphens are fragile in bash function names)
- Marker comment `# my-cli` prevents duplicate entries on re-run

### Updating

```bash
cd ~/Github/my-cli && git pull
```

No reinstall needed. Shell functions reference source by path; Bun runs TypeScript directly. Only run `bun install` again if `package.json` dependencies change.

---

## Testing

`bun test` unit tests for pure logic in `@my-cli/core` and domain packages:

- Argv parsing and routing (domain/subcommand extraction)
- Squash range validation (n >= 2, ref exists check)
- Branch name non-empty validation
- `runCommand()` output/error handling

No integration tests against real git repos.

---

## Future Domains

New domains follow the same pattern:
1. Add `packages/<domain>/` with its own `package.json`, registry, and command components
2. Import and add the `DomainRegistry` in `packages/cli/src/index.tsx`
3. The domain's shell alias function is added to `install.sh`

Examples: `@my-cli/docker`, `@my-cli/ssh`, `@my-cli/bun`
