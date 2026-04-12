import { describe, expect, test } from "bun:test"
import { getOpenCommand } from "../src/open"

describe("getOpenCommand", () => {
  test("WSL2 uses explorer.exe", () => {
    expect(getOpenCommand(true, false)).toEqual(["explorer.exe", ["."]])
  })

  test("macOS uses open", () => {
    expect(getOpenCommand(false, true)).toEqual(["open", ["."]])
  })

  test("Linux uses xdg-open", () => {
    expect(getOpenCommand(false, false)).toEqual(["xdg-open", ["."]])
  })
})
