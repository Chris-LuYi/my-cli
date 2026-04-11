import type { DomainRegistry, CommandEntry } from '@my-cli/core';

export type RouteResult =
  | { type: 'help-all' }
  | { type: 'help-domain'; domain: string }
  | { type: 'command'; entry: CommandEntry; positional: string[] }
  | { type: 'error'; message: string };

export function resolveRoute(args: string[], registries: DomainRegistry[]): RouteResult {
  const [domain, subcommand, ...positional] = args;

  if (!domain) return { type: 'help-all' };

  const registry = registries.find((r) => r.domain === domain);
  if (!registry) return { type: 'error', message: `Unknown domain: '${domain}'` };

  if (!subcommand) return { type: 'help-domain', domain };

  const entry = registry.commands.find((c) => c.name === subcommand);
  if (!entry) return { type: 'error', message: `Unknown command: '${domain} ${subcommand}'` };

  return { type: 'command', entry, positional };
}
