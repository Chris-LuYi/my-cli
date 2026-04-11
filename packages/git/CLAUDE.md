# @my-cli/git

Git domain commands, exposed via `cgit` shell function.

## Commands

| Subcommand | Usage | Notes |
|---|---|---|
| `log` | `cgit log` | `git log` passthrough with fixed `--format` + `--graph`, streams stdout directly |
| `wip` | `cgit wip` | `git add -A` + commit `WIP [ISO timestamp]` |
| `branch` | `cgit branch <name>` | Detects default branch via `git remote show origin`, local only |
| `squash` | `cgit squash tag\|commit\|last <ref\|n>` | Interactive Ink `TextInput` for commit message; `git reset --soft` + recommit |

## Positional arg shapes

- `log`: `[]`
- `wip`: `[]`
- `branch`: `[name]`
- `squash tag`: `["tag", tagName]`
- `squash commit`: `["commit", sha]`
- `squash last`: `["last", n]` — `n` parsed via `parseInt`, must be >= 2

## Registry

`src/index.ts` exports `gitRegistry: DomainRegistry` — imported by `@my-cli/cli`.
