import { runCommand, spawnPassthrough } from "@chrisluyi/core"

export async function runGitPush(_positional: string[]): Promise<number> {
  const result = await runCommand("git", ["rev-parse", "--abbrev-ref", "HEAD"])
  if (result.exitCode !== 0) {
    console.error(result.stderr.trim() || "Failed to get current branch")
    return 1
  }
  const branch = result.stdout.trim()
  return spawnPassthrough("git", ["push", "-u", "origin", branch])
}
