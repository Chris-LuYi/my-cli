import type React from 'react';

export interface CommandArgs {
  positional: string[]; // argv after domain + subcommand (argv.slice(4))
  setExitCode: (code: number) => void; // signal non-zero exit to entry point
}

export interface CommandEntry {
  name: string;        // subcommand name, e.g. "log"
  description: string; // shown in HelpTable
  usage: string;       // e.g. "cgit squash last <n>"
  // Ink-rendered commands use `component`. Passthrough commands use `run`.
  // Never set both.
  component?: React.FC<CommandArgs>;
  run?: (positional: string[]) => Promise<number>; // exit code; bypasses Ink
}

export interface DomainRegistry {
  domain: string;     // e.g. "git"
  shellAlias: string; // e.g. "cgit"
  commands: CommandEntry[];
}
