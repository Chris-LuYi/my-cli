import { describe, expect, test } from "bun:test"
import {
  parseLsofOutput,
  isSubProcess,
  formatRelativeTime,
  buildGroups,
} from "../src/ports-data"

describe("parseLsofOutput", () => {
  const sample = `COMMAND   PID  USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
node     1234  chris   22u  IPv4  12345      0t0  TCP *:3000 (LISTEN)
node     1234  chris   24u  IPv4  12346      0t0  TCP *:3001 (LISTEN)
postgres 5678  chris   10u  IPv6  12347      0t0  TCP *:5432 (LISTEN)`

  test("parses multiple entries", () => {
    const result = parseLsofOutput(sample)
    expect(result).toHaveLength(3)
  })

  test("extracts port correctly", () => {
    const result = parseLsofOutput(sample)
    expect(result[0].port).toBe(3000)
    expect(result[2].port).toBe(5432)
  })

  test("extracts pid correctly", () => {
    const result = parseLsofOutput(sample)
    expect(result[0].pid).toBe(1234)
  })

  test("returns empty array for empty input", () => {
    expect(parseLsofOutput("")).toHaveLength(0)
    expect(parseLsofOutput("COMMAND PID USER")).toHaveLength(0)
  })
})

describe("isSubProcess", () => {
  test("PID 1 parent is main", () => {
    expect(isSubProcess(1, "systemd")).toBe(false)
  })

  test("shell parent is main", () => {
    expect(isSubProcess(100, "bash")).toBe(false)
    expect(isSubProcess(100, "zsh")).toBe(false)
    expect(isSubProcess(100, "sh")).toBe(false)
  })

  test("non-shell user process parent is sub", () => {
    expect(isSubProcess(100, "node")).toBe(true)
    expect(isSubProcess(200, "chrome")).toBe(true)
  })
})

describe("formatRelativeTime", () => {
  test("formats hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    expect(formatRelativeTime(twoHoursAgo.toString())).toBe("2h ago")
  })

  test("formats days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    expect(formatRelativeTime(threeDaysAgo.toString())).toBe("3d ago")
  })

  test("returns raw string on unparseable input", () => {
    expect(formatRelativeTime("not a date")).toBe("not a date")
  })
})

describe("buildGroups", () => {
  const entries = [
    { name: "node", pid: 1234, port: 3000 },
    { name: "node", pid: 1234, port: 3001 },
    { name: "postgres", pid: 5678, port: 5432 },
  ]

  const pidInfo = new Map([
    [1234, { startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toString(), ppid: 1, parentName: "systemd" }],
    [5678, { startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toString(), ppid: 1, parentName: "systemd" }],
  ])

  test("groups ports by pid", () => {
    const groups = buildGroups(entries, pidInfo)
    expect(groups).toHaveLength(2)
    expect(groups[0].ports).toHaveLength(2)
    expect(groups[1].ports).toHaveLength(1)
  })

  test("marks process as main when ppid is 1", () => {
    const groups = buildGroups(entries, pidInfo)
    expect(groups[0].isMain).toBe(true)
  })

  test("marks process as sub when ppid is user process", () => {
    const subPidInfo = new Map([
      [1234, { startedAt: new Date().toString(), ppid: 999, parentName: "node" }],
    ])
    const groups = buildGroups([entries[0]], subPidInfo)
    expect(groups[0].isMain).toBe(false)
  })
})
