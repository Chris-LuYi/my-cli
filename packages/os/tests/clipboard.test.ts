import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

// We test the pure/logic functions directly.
// File-system functions are tested with a temp dir by monkey-patching the module's
// CLIP_DIR constant — instead, we duplicate the logic inline for unit tests.
import {
  formatRelativeTime,
  getClipboardCommand,
} from "../src/clipboard-data"

describe("getClipboardCommand", () => {
  test("WSL returns clip.exe", () => {
    expect(getClipboardCommand(true, false)).toEqual(["clip.exe", []])
  })

  test("macOS returns pbcopy", () => {
    expect(getClipboardCommand(false, true)).toEqual(["pbcopy", []])
  })

  test("Linux returns xclip", () => {
    expect(getClipboardCommand(false, false)).toEqual([
      "xclip",
      ["-selection", "clipboard"],
    ])
  })
})

describe("formatRelativeTime", () => {
  test("just now for < 60s", () => {
    expect(formatRelativeTime(new Date(Date.now() - 5000))).toBe("just now")
  })

  test("minutes ago", () => {
    expect(formatRelativeTime(new Date(Date.now() - 3 * 60 * 1000))).toBe(
      "3m ago",
    )
  })

  test("hours ago", () => {
    expect(formatRelativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000))).toBe(
      "2h ago",
    )
  })

  test("days ago", () => {
    expect(
      formatRelativeTime(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
    ).toBe("3d ago")
  })
})

// Filesystem integration tests using a temp directory
describe("clipboard file storage", () => {
  let dir: string

  beforeEach(() => {
    dir = join(tmpdir(), `cb-test-${Date.now()}`)
    mkdirSync(dir, { recursive: true })
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  function writeTxt(id: string, content: string): void {
    writeFileSync(join(dir, `${id}.txt`), content)
  }

  function listIds(): string[] {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".txt"))
      .sort()
      .reverse()
      .map((f) => f.slice(0, -4))
  }

  test("files sorted newest-first by epoch name", () => {
    writeTxt("1000", "a")
    writeTxt("2000", "b")
    writeTxt("3000", "c")
    expect(listIds()).toEqual(["3000", "2000", "1000"])
  })

  test("content is raw text", () => {
    const bigText = "x".repeat(10_000)
    writeTxt("9000", bigText)
    const files = readdirSync(dir).filter((f) => f.endsWith(".txt"))
    expect(files).toHaveLength(1)
    const content = require("node:fs").readFileSync(join(dir, files[0]), "utf8")
    expect(content).toBe(bigText)
  })

  test("files beyond 50 are oldest", () => {
    // Use a real epoch base so string sort == numeric sort (13-digit timestamps)
    const base = 1_700_000_000_000
    for (let i = 1; i <= 55; i++) {
      writeTxt(String(base + i * 1000), `entry ${i}`)
    }
    const all = readdirSync(dir)
      .filter((f) => f.endsWith(".txt"))
      .sort()
    // the 5 oldest (smallest epoch) should be pruned
    const pruned = all.slice(0, Math.max(0, all.length - 50))
    const prunedIds = pruned.map((f) => f.slice(0, -4))
    const expectedOldest = Array.from({ length: 5 }, (_, i) =>
      String(base + (i + 1) * 1000),
    )
    expect(prunedIds).toEqual(expectedOldest)
  })
})
