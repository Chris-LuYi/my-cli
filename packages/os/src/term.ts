import { runCommand } from "@chrisluyi/core"
import { which } from "bun"
import { isLinux, isMac, isWSL } from "./platform"

const LINUX_TERMINALS: Array<[string, string[]]> = [
  ["x-terminal-emulator", ["."]],
  ["gnome-terminal", ["--working-directory=."]],
  ["xterm", ["."]],
]

export function getTermCommand(
  wsl: boolean,
  mac: boolean,
  available: (cmd: string) => boolean,
): [string, string[]] | null {
  if (wsl) return ["wt.exe", ["-d", "."]]
  if (mac) return ["open", ["-a", "Terminal", "."]]
  for (const [t, args] of LINUX_TERMINALS) {
    if (available(t)) return [t, args]
  }
  return null
}

export async function runOsTerm(_positional: string[]): Promise<number> {
  const cmd = getTermCommand(isWSL, isMac, (t) => which(t) !== null)
  if (!cmd) {
    console.error("No supported terminal emulator found")
    return 1
  }
  const [bin, args] = cmd
  const result = await runCommand(bin, args)
  if (result.exitCode !== 0) {
    console.error(result.stderr.trim() || `${bin} failed`)
    return 1
  }
  return 0
}
