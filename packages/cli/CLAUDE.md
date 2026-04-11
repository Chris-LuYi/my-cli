# @chrisluyi/cli

Master entry point. Aggregates all domain registries and routes argv.

## Entry point

`src/index.tsx` — invoked via `bun run packages/cli/src/index.tsx`

## Routing

```
argv[2] = domain  |  argv[3] = subcommand  |  argv.slice(4) = positional

no argv[2]         → <HelpTable registries={all} />
unknown domain     → <ErrorBox> + exit 1
no argv[3]         → <HelpTable> for that domain
unknown subcommand → <ErrorBox> + exit 1
matched            → render component({ positional: argv.slice(4) })
```

## Adding a new domain

1. Create `packages/<domain>/` with a `DomainRegistry` export
2. Import it here and add to the `registries` array
3. Add the shell alias/function to `install.sh`
