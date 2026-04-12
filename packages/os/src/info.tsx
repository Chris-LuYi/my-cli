import { statSync } from "node:fs"
import { userInfo } from "node:os"
import path from "node:path"
import { ErrorBox, runCommand } from "@chrisluyi/core"
import type { CommandArgs } from "@chrisluyi/core"
import { Box, Text, useApp } from "ink"
import type React from "react"
import { useEffect, useState } from "react"

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function getTypeChar(mode: number): string | undefined {
  const t = mode & 0o170000
  if (t === 0o100000) return "-"
  if (t === 0o040000) return "d"
  if (t === 0o120000) return "l"
  return undefined
}

export function formatMode(mode: number): string {
  const typeChar = getTypeChar(mode)
  if (!typeChar) return `0${(mode & 0o777).toString(8)}`

  const perm = mode & 0o777
  const bits = [
    perm & 0o400 ? "r" : "-",
    perm & 0o200 ? "w" : "-",
    perm & 0o100 ? "x" : "-",
    perm & 0o040 ? "r" : "-",
    perm & 0o020 ? "w" : "-",
    perm & 0o010 ? "x" : "-",
    perm & 0o004 ? "r" : "-",
    perm & 0o002 ? "w" : "-",
    perm & 0o001 ? "x" : "-",
  ].join("")
  return typeChar + bits
}

/** Parse `du -sh <path>` first field → human-readable size */
export function parseDuOutput(raw: string): string {
  const size = raw.trim().split(/\s/)[0] ?? ""
  return size.replace(/K$/, " KB").replace(/M$/, " MB").replace(/G$/, " GB")
}

// --- Types ---

type FileData = {
  kind: "file"
  label: string
  size: string
  mode: string
  owner: string
  created: string
  modified: string
  accessed: string
}

type DirData = {
  kind: "dir"
  label: string
  files: number
  dirs: number
  totalSize: string
  modified: string
}

type InfoData = FileData | DirData

function formatDate(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 16)
}

async function gatherInfo(target: string): Promise<InfoData> {
  const stat = statSync(target)
  const label = path.relative(process.cwd(), path.resolve(target)) || target

  if (stat.isDirectory()) {
    const duResult = await runCommand("du", ["-sh", target])
    const totalSize =
      duResult.exitCode === 0 ? parseDuOutput(duResult.stdout) : "unknown"

    const findResult = await runCommand("find", [
      target,
      "-maxdepth",
      "1",
      "-mindepth",
      "1",
    ])
    const entries = findResult.stdout.trim()
      ? findResult.stdout.trim().split("\n")
      : []
    let files = 0
    let dirs = 0
    for (const e of entries) {
      try {
        statSync(e).isDirectory() ? dirs++ : files++
      } catch {
        // skip unreadable entries
      }
    }

    return {
      kind: "dir",
      label,
      files,
      dirs,
      totalSize,
      modified: formatDate(stat.mtime),
    }
  }

  const cu = userInfo()
  const owner = stat.uid === cu.uid ? cu.username : String(stat.uid)

  return {
    kind: "file",
    label,
    size: formatBytes(stat.size),
    mode: formatMode(stat.mode),
    owner,
    created: formatDate(stat.birthtime),
    modified: formatDate(stat.mtime),
    accessed: formatDate(stat.atime),
  }
}

// --- Component ---

export const OsInfo: React.FC<CommandArgs> = ({ positional, setExitCode }) => {
  const { exit } = useApp()
  const target = positional[0] ?? "."
  const [phase, setPhase] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; data: InfoData }
  >({ status: "loading" })

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-once effect
  useEffect(() => {
    ;(async () => {
      try {
        const data = await gatherInfo(target)
        setPhase({ status: "ready", data })
      } catch (err) {
        setPhase({
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        })
      }
    })()
  }, [])

  useEffect(() => {
    if (phase.status === "ready") exit()
  }, [phase.status, exit])

  if (phase.status === "loading") return <Text dimColor>Gathering info...</Text>
  if (phase.status === "error")
    return <ErrorBox message={phase.message} setExitCode={setExitCode} />

  const { data } = phase
  const col = 14

  if (data.kind === "file") {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>File: {data.label}</Text>
        <Text />
        <Text>
          {"  "}
          <Text dimColor>{"Size".padEnd(col)}</Text>
          {data.size}
        </Text>
        <Text>
          {"  "}
          <Text dimColor>{"Permissions".padEnd(col)}</Text>
          {data.mode}
        </Text>
        <Text>
          {"  "}
          <Text dimColor>{"Owner".padEnd(col)}</Text>
          {data.owner}
        </Text>
        <Text>
          {"  "}
          <Text dimColor>{"Created".padEnd(col)}</Text>
          {data.created}
        </Text>
        <Text>
          {"  "}
          <Text dimColor>{"Modified".padEnd(col)}</Text>
          {data.modified}
        </Text>
        <Text>
          {"  "}
          <Text dimColor>{"Accessed".padEnd(col)}</Text>
          {data.accessed}
        </Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>Directory: {data.label}</Text>
      <Text />
      <Text>
        {"  "}
        <Text dimColor>{"Files".padEnd(col)}</Text>
        {data.files}
      </Text>
      <Text>
        {"  "}
        <Text dimColor>{"Directories".padEnd(col)}</Text>
        {data.dirs}
      </Text>
      <Text>
        {"  "}
        <Text dimColor>{"Total size".padEnd(col)}</Text>
        {data.totalSize}
      </Text>
      <Text>
        {"  "}
        <Text dimColor>{"Modified".padEnd(col)}</Text>
        {data.modified}
      </Text>
    </Box>
  )
}
