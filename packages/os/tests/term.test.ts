import { describe, expect, test } from "bun:test"
import { getTermCommand } from "../src/term"

const alwaysAvailable = (_: string) => true
const neverAvailable = (_: string) => false
const onlyXterm = (cmd: string) => cmd === "xterm"
const onlyGnome = (cmd: string) => cmd === "gnome-terminal"

describe("getTermCommand", () => {
  test("WSL2 uses wt.exe", () => {
    expect(getTermCommand(true, false, alwaysAvailable)).toEqual([
      "wt.exe",
      ["-d", "."],
    ])
  })

  test("macOS uses open -a Terminal", () => {
    expect(getTermCommand(false, true, alwaysAvailable)).toEqual([
      "open",
      ["-a", "Terminal", "."],
    ])
  })

  test("Linux tries x-terminal-emulator first", () => {
    expect(getTermCommand(false, false, alwaysAvailable)).toEqual([
      "x-terminal-emulator",
      ["."],
    ])
  })

  test("Linux falls back through list", () => {
    expect(getTermCommand(false, false, onlyXterm)).toEqual(["xterm", ["."]])
  })

  test("Linux returns null if no emulator found", () => {
    expect(getTermCommand(false, false, neverAvailable)).toBeNull()
  })

  test("gnome-terminal uses --working-directory flag", () => {
    expect(getTermCommand(false, false, onlyGnome)).toEqual([
      "gnome-terminal",
      ["--working-directory=."],
    ])
  })
})
