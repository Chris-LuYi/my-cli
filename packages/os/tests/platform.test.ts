import { describe, expect, test } from "bun:test"
import { detectPlatform } from "../src/platform"

describe("detectPlatform", () => {
  test("detects macOS", () => {
    const result = detectPlatform("darwin", () => "")
    expect(result).toEqual({ isWSL: false, isMac: true, isLinux: false })
  })

  test("detects WSL", () => {
    const result = detectPlatform("linux", () => "Linux version 5.15 (microsoft-standard-WSL2)")
    expect(result).toEqual({ isWSL: true, isMac: false, isLinux: false })
  })

  test("detects native Linux", () => {
    const result = detectPlatform("linux", () => "Linux version 5.15 (Ubuntu)")
    expect(result).toEqual({ isWSL: false, isMac: false, isLinux: true })
  })

  test("handles /proc/version read error gracefully", () => {
    const result = detectPlatform("linux", () => {
      throw new Error("ENOENT")
    })
    expect(result).toEqual({ isWSL: false, isMac: false, isLinux: true })
  })
})
