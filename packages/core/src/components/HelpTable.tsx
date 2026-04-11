import { Box, Text, useApp } from "ink"
import type React from "react"
import { useEffect } from "react"
import type { DomainRegistry } from "../types"

interface HelpTableProps {
  registries: DomainRegistry[]
  domain?: string // if set, only show commands for this domain
}

export const HelpTable: React.FC<HelpTableProps> = ({ registries, domain }) => {
  const { exit } = useApp()
  const filtered = domain
    ? registries.filter((r) => r.domain === domain)
    : registries

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-once effect
  useEffect(() => {
    exit()
  }, [])

  return (
    <Box flexDirection="column" marginY={1}>
      <Text bold>my-cli — personal commands</Text>
      <Box marginTop={1} flexDirection="column">
        {filtered.map((registry) => (
          <Box key={registry.domain} flexDirection="column" marginBottom={1}>
            <Text bold color="cyan">
              {registry.shellAlias}
            </Text>
            {registry.commands.map((cmd) => (
              <Box key={cmd.name} marginLeft={2}>
                <Box width={36}>
                  <Text color="yellow">{cmd.usage}</Text>
                </Box>
                <Text dimColor>{cmd.description}</Text>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
