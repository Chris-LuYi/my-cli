import { copyToClipboard, pushEntry } from "./clipboard-data"
import { isMac, isWSL } from "./platform"

export async function runOsCpwd(_positional: string[]): Promise<number> {
  const cwd = process.cwd()
  pushEntry(cwd)
  const ok = await copyToClipboard(cwd, isWSL, isMac)
  if (!ok) {
    console.error("Clipboard tool not available (install xclip on Linux)")
    return 1
  }
  console.log(cwd)
  return 0
}
