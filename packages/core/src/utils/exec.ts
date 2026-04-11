export interface RunResult {
  stdout: string
  stderr: string
  exitCode: number
}

/**
 * Run a command, capture stdout/stderr. Does not throw on non-zero exit.
 */
export async function runCommand(
  cmd: string,
  args: string[],
): Promise<RunResult> {
  const proc = Bun.spawn([cmd, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { stdout, stderr, exitCode }
}

/**
 * Spawn with inherited stdio — streams directly to terminal, preserves colors.
 * MUST be called before Ink's render() to avoid stdout patch conflicts.
 * Resolves with the process exit code.
 */
export async function spawnPassthrough(
  cmd: string,
  args: string[],
): Promise<number> {
  const proc = Bun.spawn([cmd, ...args], {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  })
  return proc.exited
}
