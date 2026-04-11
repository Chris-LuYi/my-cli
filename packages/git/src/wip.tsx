import React, { useEffect, useState } from 'react';
import { Text, useApp } from 'ink';
import { runCommand, formatISOTimestamp, ErrorBox } from '@my-cli/core';
import type { CommandArgs } from '@my-cli/core';

export const GitWip: React.FC<CommandArgs> = ({ setExitCode }) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<'running' | 'done' | 'error'>('running');
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const addResult = await runCommand('git', ['add', '-A']);
        if (addResult.exitCode !== 0) {
          setMessage(addResult.stderr.trim() || 'git add failed');
          setStatus('error');
          return;
        }

        const timestamp = formatISOTimestamp();
        const commitMsg = `WIP ${timestamp}`;
        const commitResult = await runCommand('git', ['commit', '-m', commitMsg]);
        if (commitResult.exitCode !== 0) {
          setMessage(commitResult.stderr.trim() || 'git commit failed');
          setStatus('error');
          return;
        }

        const hashMatch = commitResult.stdout.match(/\[[\w/]+ ([a-f0-9]+)\]/);
        const hash = hashMatch?.[1] ?? '';
        setMessage(`${hash} ${commitMsg}`);
        setStatus('done');
      } catch (err) {
        setMessage(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'error') return <ErrorBox message={message} setExitCode={setExitCode} />;
  if (status === 'done') {
    exit();
    return <Text color="green">WIP commit: {message}</Text>;
  }
  return <Text dimColor>Staging and committing...</Text>;
};
