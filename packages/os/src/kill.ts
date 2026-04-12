import { which } from "bun"
import { runCommand } from "@chrisluyi/core"

/** Returns port number (1–65535) or null if invalid */
export function validatePort(arg: string): number | null {
  const n = Number(arg)
  if (!Number.isInteger(n) || n < 1 || n > 65535) return null
  return n
}

/**
 * Parse `lsof -ti tcp:<port>` output.
 * lsof exits 1 with empty stdout when nothing listens — port free, not an error.
 * Returns pid string or null (port free).
 */
export function parseLsofKillOutput(stdout: string, exitCode: number): string | null {
  const pid = stdout.trim()
  if (exitCode !== 0 && !pid) return null
  if (pid) return pid
  return null
}

export async function runOsKill(positional: string[]): Promise<number> {
  const arg = positional[0]
  if (!arg) {
    console.error("Usage: cos kill <port>")
    return 1
  }

  const port = validatePort(arg)
  if (port === null) {
    console.error(`Invalid port: ${arg}`)
    return 1
  }

  if (!which("lsof")) {
    console.error("lsof is required but not installed")
    return 1
  }

  const lsofResult = await runCommand("lsof", ["-ti", `tcp:${port}`])
  const pid = parseLsofKillOutput(lsofResult.stdout, lsofResult.exitCode)

  if (pid === null) {
    console.log(`Nothing listening on :${port}`)
    return 0
  }

  const psResult = await runCommand("ps", ["-o", "comm=", "-p", pid])
  const name = psResult.stdout.trim() || "unknown"

  const killResult = await runCommand("kill", ["-9", pid])
  if (killResult.exitCode !== 0) {
    console.error(killResult.stderr.trim() || "kill failed")
    return 1
  }

  console.log(`Killed :${port} (${name}, pid ${pid})`)
  return 0
}
