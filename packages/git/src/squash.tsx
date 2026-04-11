import React from 'react';
import { Text } from 'ink';
import type { CommandArgs } from '@my-cli/core';

export const GitSquash: React.FC<CommandArgs> = () => <Text dimColor>squash (not yet implemented)</Text>;
export function parseSquashArgs(_p: string[]): null { return null; }
export function validateSquashN(_n: string): string | null { return null; }
