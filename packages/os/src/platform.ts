import { readFileSync } from "node:fs"

type Platform = { isWSL: boolean; isMac: boolean; isLinux: boolean }

export function detectPlatform(
  platform: string = process.platform,
  readProcVersion: () => string = () => readFileSync("/proc/version", "utf8"),
): Platform {
  const mac = platform === "darwin"
  const linux = platform === "linux"
  let wsl = false
  if (linux) {
    try {
      wsl = /microsoft/i.test(readProcVersion())
    } catch {
      wsl = false
    }
  }
  return { isWSL: wsl, isMac: mac, isLinux: linux && !wsl }
}

const { isWSL, isMac, isLinux } = detectPlatform()
export { isWSL, isMac, isLinux }
