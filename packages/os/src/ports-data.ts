export type PortEntry = {
  port: number
  pid: number
  name: string
  startedAt: string
  isSub: boolean
  killed: boolean
}

export type ProcessGroup = {
  name: string
  pid: number
  startedAt: string
  isMain: boolean
  ports: PortEntry[]
}

/** Parse `lsof -i -P -n -sTCP:LISTEN` output */
export function parseLsofOutput(
  output: string,
): Array<{ name: string; pid: number; port: number }> {
  if (!output.trim()) return []
  return output
    .trim()
    .split("\n")
    .slice(1) // skip header
    .flatMap((line) => {
      const parts = line.trim().split(/\s+/)
      if (parts.length < 9) return []
      const name = parts[0]
      const pid = Number.parseInt(parts[1])
      // NAME column (second-to-last before "(LISTEN)") is like "*:3000"
      const nameCol = parts[parts.length - 2]
      const port = Number.parseInt(nameCol.split(":").pop() ?? "")
      if (!Number.isFinite(pid) || !Number.isFinite(port) || port === 0)
        return []
      return [{ name, pid, port }]
    })
}

const SHELL_NAMES = new Set([
  "bash",
  "zsh",
  "sh",
  "fish",
  "csh",
  "tcsh",
  "dash",
])

export function isSubProcess(ppid: number, parentName: string): boolean {
  if (ppid <= 1) return false
  if (SHELL_NAMES.has(parentName.toLowerCase())) return false
  return true
}

export function formatRelativeTime(lstart: string): string {
  const d = new Date(lstart.trim())
  if (Number.isNaN(d.getTime())) return lstart.trim()

  const diffMs = Date.now() - d.getTime()
  const s = Math.floor(diffMs / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function buildGroups(
  entries: Array<{ name: string; pid: number; port: number }>,
  pidInfo: Map<number, { startedAt: string; ppid: number; parentName: string }>,
): ProcessGroup[] {
  const groupMap = new Map<number, ProcessGroup>()

  for (const entry of entries) {
    const info = pidInfo.get(entry.pid)
    const startedAt = info ? formatRelativeTime(info.startedAt) : "unknown"
    const sub = info ? isSubProcess(info.ppid, info.parentName) : false

    if (!groupMap.has(entry.pid)) {
      groupMap.set(entry.pid, {
        name: entry.name,
        pid: entry.pid,
        startedAt,
        isMain: !sub,
        ports: [],
      })
    }

    // biome-ignore lint/style/noNonNullAssertion: just inserted above
    groupMap.get(entry.pid)!.ports.push({
      port: entry.port,
      pid: entry.pid,
      name: entry.name,
      startedAt,
      isSub: sub,
      killed: false,
    })
  }

  return Array.from(groupMap.values())
}
