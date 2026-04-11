import { Box, Text, useApp } from "ink"
import type React from "react"
import { useEffect } from "react"
import type { CommandArgs } from "../types"

interface ErrorBoxProps {
  message: string
  setExitCode: CommandArgs["setExitCode"]
}

export const ErrorBox: React.FC<ErrorBoxProps> = ({ message, setExitCode }) => {
  const { exit } = useApp()
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-once effect
  useEffect(() => {
    setExitCode(1)
    exit()
  }, [])

  return (
    <Box borderStyle="round" borderColor="red" paddingX={1}>
      <Text color="red">Error: {message}</Text>
    </Box>
  )
}
