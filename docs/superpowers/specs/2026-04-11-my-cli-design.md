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
├── package.json                  # root Bun workspace config
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
    │       └── utils/
    │           ├── exec.ts         # runCommand() — wraps Bun shell, returns stdout/stderr
    │           └── format.ts       # formatDate(), etc.
    ├── git/                      # @my-cli/git — git domain commands
    │   ├── package.json
    │   └── src/
    │       ├── index.ts          # git command registry (name → component + description)
    │       ├── log.tsx           # cgit log
    │       ├── wip.tsx           # cgit wip
    │       ├── branch.tsx        # cgit branch <name>
    │       └── squash.tsx        # cgit squash tag|commit|last <ref>
    └── cli/                      # @my-cli/cli — master entry point
        ├── package.json
        └── src/
            └── index.tsx         # aggregates registries, routes argv, renders
```

---

## Commands

### `cgit` — git domain

| Subcommand | Usage | Description |
|---|---|---|
| `log` | `cgit log` | Pretty-printed git log with graph, short hash, relative date, author |
| `wip` | `cgit wip` | Stage all changes + commit as `WIP [ISO timestamp]` |
| `branch` | `cgit branch <name>` | Fetch default branch, create new branch off it |
| `squash tag` | `cgit squash tag <tag>` | Squash all commits since `<tag>` into one |
| `squash commit` | `cgit squash commit <sha>` | Squash all commits since `<sha>` into one |
| `squash last` | `cgit squash last <n>` | Squash last `n` commits into one |

### `my-cli` — master help

Running `my-cli` with no arguments renders a formatted Ink table of all registered commands across all domain packages.

---

## Architecture

### Command Registry

Each domain package (`@my-cli/git`, future `@my-cli/docker`, etc.) exports a registry:

```ts
// packages/git/src/index.ts
export const registry: CommandEntry[] = [
  { name: 'log',    description: 'Pretty-printed git log',          component: GitLog },
  { name: 'wip',    description: 'Stage all + WIP commit',          component: GitWip },
  { name: 'branch', description: 'New branch from default',         component: GitBranch },
  { name: 'squash', description: 'Squash commits (tag/commit/last)', component: GitSquash },
];
```

The `cli` package imports all registries, namespaces them by domain (`git log`, `git branch`), and handles routing via `argv`.

### Entry Point Flow

```
argv → cli/index.tsx
  → if no args: render <HelpTable registries={all} />
  → if domain + subcommand: lookup registry → render matched component
  → if unknown: render <ErrorBox message="Unknown command" />
```

### Shell Functions (written by install.sh)

```bash
cgit() { bun run /home/chris/Github/my-cli/packages/cli/src/index.tsx git "$@"; }
my-cli() { bun run /home/chris/Github/my-cli/packages/cli/src/index.tsx "$@"; }
```

---

## Error Handling

- All git subprocess calls wrapped in try/catch; failures render `<ErrorBox>` with a readable message — no raw stack traces
- Non-zero git exit codes mapped to descriptive messages ("Branch already exists", "Nothing to squash")
- `squash last <n>` validates `n >= 2` before proceeding
- `squash tag/commit` validates the ref exists before proceeding
- `branch` detects the default branch automatically from `origin/HEAD`

---

## Install & Update

### Install (first time)

```bash
cd ~/Github/my-cli
./install.sh
source ~/.bashrc
```

`install.sh` does:
1. `bun install` at workspace root
2. Appends `cgit` and `my-cli` shell functions to `~/.bashrc` (idempotent — checks before appending)

### Update

```bash
cd ~/Github/my-cli && git pull
```

No reinstall needed. Shell functions reference source by path; Bun runs TypeScript directly.

---

## Testing

Lightweight `bun test` unit tests for pure logic:
- Argv parsing and routing
- Squash range calculation
- Branch name validation
- `runCommand()` utility

No integration tests against real git repos — appropriate for a personal tool.

---

## Future Domains

New domains follow the same pattern:
1. Add `packages/<domain>/` with its own `package.json` and registry
2. Import the registry in `packages/cli/src/index.tsx`
3. Add a shell function to `install.sh`

Examples: `@my-cli/docker`, `@my-cli/ssh`, `@my-cli/bun`
