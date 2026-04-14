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

/** Parse `ss -tlnp` output into port entries.
 *  Process column format: `users:(("node",pid=1234,fd=10))`
 *  When unprivileged, system-owned sockets have no process column — those are
 *  included with pid=0/name="unknown" so the user can still see all ports.
 */
export function parseSsOutput(
  output: string,
): Array<{ name: string; pid: number; port: number }> {
  if (!output.trim()) return []
  return output
    .trim()
    .split("\n")
    .slice(1) // skip header
    .flatMap((line) => {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith("LISTEN")) return []

      // Local Address:Port is the 4th column (0-indexed)
      const parts = trimmed.split(/\s+/)
      const addrPort = parts[3] ?? ""
      // Port is after the last colon (handles IPv6 like [::]:3000)
      const port = Number.parseInt(addrPort.split(":").pop() ?? "")
      if (!Number.isFinite(port) || port === 0) return []

      // Extract pid and name from users:(("name",pid=NNN,...))
      const usersMatch = trimmed.match(/users:\(\("([^"]+)",pid=(\d+)/)
      const name = usersMatch ? usersMatch[1] : "unknown"
      const pid = usersMatch ? Number.parseInt(usersMatch[2]) : 0

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
