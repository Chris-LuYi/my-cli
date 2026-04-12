import { describe, expect, test } from "bun:test"
import { parseLsofKillOutput, validatePort } from "../src/kill"

describe("validatePort", () => {
  test("rejects non-numeric", () => {
    expect(validatePort("abc")).toBeNull()
  })

  test("rejects port 0", () => {
    expect(validatePort("0")).toBeNull()
  })

  test("rejects port > 65535", () => {
    expect(validatePort("65536")).toBeNull()
  })

  test("accepts valid port", () => {
    expect(validatePort("3000")).toBe(3000)
    expect(validatePort("80")).toBe(80)
    expect(validatePort("65535")).toBe(65535)
  })
})

describe("parseLsofKillOutput", () => {
  test("returns null when stdout is empty (port free)", () => {
    expect(parseLsofKillOutput("", 1)).toBeNull()
  })

  test("returns pid string when found", () => {
    expect(parseLsofKillOutput("12345\n", 0)).toBe("12345")
  })

  test("trims whitespace from pid", () => {
    expect(parseLsofKillOutput("  12345  \n", 0)).toBe("12345")
  })
})
