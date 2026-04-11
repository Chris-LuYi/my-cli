# my-cli

Personal CLI toolkit. Bun monorepo, Ink UI.

## Structure

- `packages/core` — shared types, Ink components, shell exec utils
- `packages/git` — `cgit` commands
- `packages/cli` — master entry point, routes argv to domain packages

Each package has its own `CLAUDE.md` with package-specific details.

## Key conventions

- Runtime: Bun — TypeScript run directly via `bun run`, no compile step
- UI: Ink (React for CLIs) — use `useApp().exit(err)` + `waitUntilExit()` for error exits
- Commands registered via `DomainRegistry` in each domain package, imported in `packages/cli`
- Shell entry: `cgit` (bash function) and `my-cli` (alias) wired by `install.sh`

## Spec

`docs/superpowers/specs/2026-04-11-my-cli-design.md`
