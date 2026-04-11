import React from 'react';
import { render } from 'ink';
import { gitRegistry } from '@my-cli/git';
import { HelpTable, ErrorBox } from '@my-cli/core';
import { resolveRoute } from './router';

const registries = [gitRegistry];
const args = process.argv.slice(2);
const route = resolveRoute(args, registries);

let exitCode = 0;
const setExitCode = (code: number) => { exitCode = code; };

// Passthrough commands run before render() to avoid Ink's stdout patch
if (route.type === 'command' && route.entry.run) {
  try {
    const code = await route.entry.run(route.positional);
    process.exit(code);
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

// All other routes go through Ink
function App() {
  if (route.type === 'help-all') {
    return <HelpTable registries={registries} />;
  }
  if (route.type === 'help-domain') {
    return <HelpTable registries={registries} domain={route.domain} />;
  }
  if (route.type === 'error') {
    return <ErrorBox message={route.message} setExitCode={setExitCode} />;
  }
  const Component = route.entry.component!;
  return <Component positional={route.positional} setExitCode={setExitCode} />;
}

const { waitUntilExit } = render(<App />);
await waitUntilExit();
process.exit(exitCode);
