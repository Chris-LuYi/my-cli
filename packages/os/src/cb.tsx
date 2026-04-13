import type { CommandArgs } from "@chrisluyi/core"
import { Box, Text, useApp, useInput } from "ink"
import type React from "react"
import { useEffect, useState } from "react"
import {
  type ClipEntry,
  copyToClipboard,
  deleteEntry,
  formatRelativeTime,
  loadHistory,
  pushEntry,
} from "./clipboard-data"
import { isMac, isWSL } from "./platform"

type Phase =
  | { status: "push-done"; text: string }
  | { status: "empty" }
  | {
      status: "ready"
      entries: ClipEntry[]
      cursor: number
      copied: string | null
    }

export const OsClipboard: React.FC<CommandArgs> = ({
  positional,
  setExitCode,
}) => {
  const { exit } = useApp()

  const [phase, setPhase] = useState<Phase>(() => {
    if (positional[0] === "push") {
      const text = positional.slice(1).join(" ")
      if (text) pushEntry(text)
      return { status: "push-done", text }
    }
    const entries = loadHistory()
    return entries.length === 0
      ? { status: "empty" }
      : { status: "ready", entries, cursor: 0, copied: null }
  })

  // Exit immediately after push or when empty
  useEffect(() => {
    if (phase.status === "push-done" || phase.status === "empty") exit()
  }, [phase.status, exit])

  useInput(async (input, key) => {
    if (phase.status !== "ready") return

    if (key.upArrow) {
      setPhase({
        ...phase,
        cursor: Math.max(0, phase.cursor - 1),
        copied: null,
      })
      return
    }
    if (key.downArrow) {
      setPhase({
        ...phase,
        cursor: Math.min(phase.entries.length - 1, phase.cursor + 1),
        copied: null,
      })
      return
    }
    if (key.return) {
      const entry = phase.entries[phase.cursor]
      if (!entry) return
      await copyToClipboard(entry.text, isWSL, isMac)
      setPhase({ ...phase, copied: entry.id })
      return
    }
    if (input === "d") {
      const entry = phase.entries[phase.cursor]
      if (!entry) return
      deleteEntry(entry.id)
      const next = loadHistory()
      if (next.length === 0) {
        exit()
        return
      }
      setPhase({
        status: "ready",
        entries: next,
        cursor: Math.min(phase.cursor, next.length - 1),
        copied: null,
      })
      return
    }
    if (input === "q" || key.escape) {
      exit()
    }
  })

  if (phase.status === "push-done") {
    const label = phase.text ? phase.text.slice(0, 60) : "(empty)"
    return <Text color="green">✓ Pushed: {label}</Text>
  }
  if (phase.status === "empty") {
    return <Text dimColor>Clipboard history is empty.</Text>
  }

  const { entries, cursor, copied } = phase

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>
        Clipboard history{" "}
        <Text dimColor>
          ({entries.length} {entries.length === 1 ? "item" : "items"})
        </Text>
      </Text>
      <Text />
      {entries.map((e, i) => {
        const selected = i === cursor
        const wasCopied = copied === e.id
        const preview = e.text.replace(/\n/g, "↵").slice(0, 56)
        const padded = preview.padEnd(58)
        return (
          <Text key={e.id}>
            {"  "}
            {selected ? <Text color="cyan">{"▶ "}</Text> : "  "}
            {wasCopied ? (
              <Text color="green">{padded}</Text>
            ) : (
              <Text color={selected ? "cyan" : undefined}>{padded}</Text>
            )}
            {"  "}
            <Text dimColor>{formatRelativeTime(e.addedAt).padStart(8)}</Text>
            {wasCopied ? <Text color="green"> ✓ copied</Text> : ""}
          </Text>
        )
      })}
      <Text />
      <Text dimColor>{"↑↓ navigate · Enter copy · d delete · q quit"}</Text>
    </Box>
  )
}
