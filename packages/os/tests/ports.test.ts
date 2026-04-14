import { describe, expect, test } from "bun:test"
import {
  buildGroups,
  formatRelativeTime,
  isSubProcess,
  parseSsOutput,
} from "../src/ports-data"

describe("parseSsOutput", () => {
  const sample = `State  Recv-Q Send-Q  Local Address:Port Peer Address:Port Process
LISTEN 0      511     0.0.0.0:3000        0.0.0.0:*          users:(("node",pid=1234,fd=10))
LISTEN 0      511     0.0.0.0:3001        0.0.0.0:*          users:(("node",pid=1234,fd=12))
LISTEN 0      128     0.0.0.0:5432        0.0.0.0:*          users:(("postgres",pid=5678,fd=4))`

  test("parses multiple entries", () => {
    const result = parseSsOutput(sample)
    expect(result).toHaveLength(3)
  })

  test("extracts port correctly", () => {
    const result = parseSsOutput(sample)
    expect(result[0].port).toBe(3000)
    expect(result[2].port).toBe(5432)
  })

  test("extracts pid correctly", () => {
    const result = parseSsOutput(sample)
    expect(result[0].pid).toBe(1234)
  })

  test("extracts process name correctly", () => {
    const result = parseSsOutput(sample)
    expect(result[0].name).toBe("node")
    expect(result[2].name).toBe("postgres")
  })

  test("handles missing process column (system-owned sockets)", () => {
    const noProc = `State  Recv-Q Send-Q  Local Address:Port Peer Address:Port Process
LISTEN 0      4096    127.0.0.53%lo:53        0.0.0.0:*          `
    const result = parseSsOutput(noProc)
    expect(result).toHaveLength(1)
    expect(result[0].pid).toBe(0)
    expect(result[0].name).toBe("unknown")
    expect(result[0].port).toBe(53)
  })

  test("returns empty array for empty input", () => {
    expect(parseSsOutput("")).toHaveLength(0)
    expect(parseSsOutput("State Recv-Q Send-Q")).toHaveLength(0)
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
    [
      1234,
      {
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toString(),
        ppid: 1,
        parentName: "systemd",
      },
    ],
    [
      5678,
      {
        startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toString(),
        ppid: 1,
        parentName: "systemd",
      },
    ],
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
      [
        1234,
        { startedAt: new Date().toString(), ppid: 999, parentName: "node" },
      ],
    ])
    const groups = buildGroups([entries[0]], subPidInfo)
    expect(groups[0].isMain).toBe(false)
  })
})
