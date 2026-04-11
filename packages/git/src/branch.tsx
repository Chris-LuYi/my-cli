import React from 'react';
import { Text } from 'ink';
import type { CommandArgs } from '@my-cli/core';

export const GitBranch: React.FC<CommandArgs> = () => <Text dimColor>branch (not yet implemented)</Text>;
export function validateBranchName(_name: string): string | null { return null; }
