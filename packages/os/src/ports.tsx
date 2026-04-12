import { which } from "bun"
import { runCommand, ErrorBox } from "@chrisluyi/core"
import type { CommandArgs } from "@chrisluyi/core"
import { Text, Box, useApp, useInput } from "ink"
import type React from "react"
import { useEffect, useState, useCallback } from "react"
import { parseLsofOutput, buildGroups } from "./ports-data"
import type { ProcessGroup, PortEntry } from "./ports-data"

type Phase =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; groups: ProcessGroup[]; cursor: number }

function flatPorts(groups: ProcessGroup[]): PortEntry[] {
  return groups.flatMap((g) => g.ports)
}

/** Next navigable index skipping killed entries; returns current if all killed */
function nextIdx(ports: PortEntry[], from: number, dir: 1 | -1): number {
  let i = from + dir
  while (i >= 0 && i < ports.length) {
    if (!ports[i].killed) return i
    i += dir
  }
  return from
}

export const OsPorts: React.FC<CommandArgs> = ({ setExitCode }) => {
  const { exit } = useApp()
  const [phase, setPhase] = useState<Phase>({ status: "loading" })

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-once effect
  useEffect(() => {
    ;(async () => {
      try {
        if (!which("lsof")) {
          setPhase({ status: "error", message: "lsof is required but not installed" })
          return
        }

        const lsof = await runCommand("lsof", ["-i", "-P", "-n", "-sTCP:LISTEN"])
        if (lsof.exitCode !== 0 && !lsof.stdout.trim()) {
          setPhase({ status: "error", message: lsof.stderr.trim() || "lsof failed" })
          return
        }

        const raw = parseLsofOutput(lsof.stdout)
        if (raw.length === 0) {
          setPhase({ status: "empty" })
          return
        }

        const pids = [...new Set(raw.map((e) => e.pid))]
        const pidInfo = new Map<number, { startedAt: string; ppid: number; parentName: string }>()

        await Promise.all(
          pids.map(async (pid) => {
            const [lstartRes, ppidRes] = await Promise.all([
              runCommand("ps", ["-o", "lstart=", "-p", String(pid)]),
              runCommand("ps", ["-o", "ppid=,comm=", "-p", String(pid)]),
            ])
            const startedAt = lstartRes.stdout.trim()
            const ppidParts = ppidRes.stdout.trim().split(/\s+/)
            const ppid = Number.parseInt(ppidParts[0] ?? "1")
            const parentName = ppidParts.slice(1).join(" ") || "unknown"
            pidInfo.set(pid, { startedAt, ppid, parentName })
          }),
        )

        const groups = buildGroups(raw, pidInfo)
        setPhase({ status: "ready", groups, cursor: 0 })
      } catch (err) {
        setPhase({
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        })
      }
    })()
  }, [])

  useEffect(() => {
    if (phase.status === "empty") exit()
  }, [phase.status, exit])

  const killSelected = useCallback(async () => {
    if (phase.status !== "ready") return
    const ports = flatPorts(phase.groups)
    const entry = ports[phase.cursor]
    if (!entry || entry.killed) return

    await runCommand("kill", ["-9", String(entry.pid)])

    const newGroups = phase.groups.map((g) => ({
      ...g,
      ports: g.ports.map((p) =>
        p.port === entry.port && p.pid === entry.pid ? { ...p, killed: true } : p,
      ),
    }))

    const newFlat = flatPorts(newGroups)
    const next = newFlat.findIndex((p, i) => i > phase.cursor && !p.killed)
    const newCursor = next !== -1 ? next : phase.cursor

    setPhase({ status: "ready", groups: newGroups, cursor: newCursor })
  }, [phase])

  useInput((input, key) => {
    if (phase.status !== "ready") return
    const ports = flatPorts(phase.groups)

    if (key.upArrow) {
      setPhase({ ...phase, cursor: nextIdx(ports, phase.cursor, -1) })
    } else if (key.downArrow) {
      setPhase({ ...phase, cursor: nextIdx(ports, phase.cursor, 1) })
    } else if (key.return) {
      killSelected()
    } else if (input === "q") {
      exit()
    }
  })

  if (phase.status === "loading") return <Text dimColor>Scanning ports...</Text>
  if (phase.status === "error")
    return <ErrorBox message={phase.message} setExitCode={setExitCode} />
  if (phase.status === "empty") return <Text>No listening ports found.</Text>

  const ports = flatPorts(phase.groups)

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>Listening ports</Text>
      <Text />
      {phase.groups.map((g) => (
        <Box key={g.pid} flexDirection="column" marginBottom={1}>
          <Text>
            {"  "}
            <Text bold>{g.name.padEnd(16)}</Text>
            {"  "}
            <Text dimColor>
              {"pid "}
              {g.pid}
              {"  started "}
              {g.startedAt}
              {"  "}
            </Text>
            <Text color={g.isMain ? "green" : "yellow"}>{g.isMain ? "main" : "sub"}</Text>
          </Text>
          {g.ports.map((p) => {
            const flatIdx = ports.findIndex((fp) => fp.port === p.port && fp.pid === p.pid)
            const selected = flatIdx === phase.cursor
            return (
              <Text key={p.port}>
                {"  "}
                {selected ? <Text color="cyan">{"● "}</Text> : "  "}
                {p.killed ? (
                  <Text color="green">
                    {"✓ Killed :"}
                    {p.port}
                    {" ("}
                    {p.name}
                    {", pid "}
                    {p.pid}
                    {")"}
                  </Text>
                ) : (
                  <Text color={selected ? "cyan" : undefined}>
                    {":"}
                    {p.port}
                    {p.isSub ? <Text dimColor>{"  (sub)"}</Text> : ""}
                  </Text>
                )}
              </Text>
            )
          })}
        </Box>
      ))}
      <Text dimColor>{"↑↓ navigate · Enter kill · q quit"}</Text>
    </Box>
  )
}
