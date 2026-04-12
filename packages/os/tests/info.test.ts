import { describe, expect, test } from "bun:test"
import { formatBytes, formatMode, parseDuOutput } from "../src/info"

describe("formatBytes", () => {
  test("bytes", () => expect(formatBytes(512)).toBe("512 B"))
  test("kilobytes", () => expect(formatBytes(4300)).toBe("4.2 KB"))
  test("megabytes", () => expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB"))
  test("gigabytes", () => expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe("2.0 GB"))
})

describe("formatMode", () => {
  test("regular file rw-r--r--", () => {
    expect(formatMode(0o100644)).toBe("-rw-r--r--")
  })

  test("directory rwxr-xr-x", () => {
    expect(formatMode(0o40755)).toBe("drwxr-xr-x")
  })

  test("falls back to octal when type bits absent", () => {
    expect(formatMode(0o777)).toBe("0777")
  })
})

describe("parseDuOutput", () => {
  test("parses K suffix", () => {
    expect(parseDuOutput("48.3K\t./packages/git/src\n")).toBe("48.3 KB")
  })

  test("parses M suffix", () => {
    expect(parseDuOutput("1.2M\t./dist\n")).toBe("1.2 MB")
  })
})
