# @chrisluyi/core

Shared foundation for all domain packages.

## Contents

- `src/types.ts` — `CommandArgs`, `CommandEntry`, `DomainRegistry` interfaces
- `src/components/` — `HelpTable`, `ErrorBox`, `Spinner` Ink components
- `src/utils/exec.ts` — `runCommand()` wrapping Bun shell
- `src/utils/format.ts` — date formatting helpers

## Notes

- `ErrorBox` calls `setExitCode(1)` then `useApp().exit()` (no argument) in a `useEffect`. Both synchronously in one effect. Entry point reads `exitCode` after `waitUntilExit()` resolves and calls `process.exit(exitCode)`.
- All domain packages depend on this package for shared types and components
