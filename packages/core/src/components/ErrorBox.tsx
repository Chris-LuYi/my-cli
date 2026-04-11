import React, { useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import type { CommandArgs } from '../types';

interface ErrorBoxProps {
  message: string;
  setExitCode: CommandArgs['setExitCode'];
}

export const ErrorBox: React.FC<ErrorBoxProps> = ({ message, setExitCode }) => {
  const { exit } = useApp();
  useEffect(() => {
    setExitCode(1);
    exit();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box borderStyle="round" borderColor="red" paddingX={1}>
      <Text color="red">Error: {message}</Text>
    </Box>
  );
};
