import { runCommand } from "@chrisluyi/core"
import { isMac, isWSL } from "./platform"

export function getOpenCommand(wsl: boolean, mac: boolean): [string, string[]] {
  if (wsl) return ["explorer.exe", ["."]]
  if (mac) return ["open", ["."]]
  return ["xdg-open", ["."]]
}

export async function runOsOpen(_positional: string[]): Promise<number> {
  const [cmd, args] = getOpenCommand(isWSL, isMac)
  const result = await runCommand(cmd, args)
  if (result.exitCode !== 0) {
    console.error(result.stderr.trim() || `${cmd} failed`)
    return 1
  }
  return 0
}
