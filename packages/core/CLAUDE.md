# @my-cli/core

Shared foundation for all domain packages.

## Contents

- `src/types.ts` — `CommandArgs`, `CommandEntry`, `DomainRegistry` interfaces
- `src/components/` — `HelpTable`, `ErrorBox`, `Spinner` Ink components
- `src/utils/exec.ts` — `runCommand()` wrapping Bun shell
- `src/utils/format.ts` — date formatting helpers

## Notes

- `ErrorBox` must call `useApp().exit(new Error(msg))` in a `useEffect` — not `process.exit()`
- All domain packages depend on this package for shared types and components
