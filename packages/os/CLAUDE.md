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
