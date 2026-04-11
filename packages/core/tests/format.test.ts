import { expect, test } from "bun:test"
import { formatISOTimestamp } from "../src/utils/format"

test("formatISOTimestamp returns UTC ISO string without milliseconds", () => {
  const d = new Date("2026-04-11T10:30:00.000Z")
  expect(formatISOTimestamp(d)).toBe("2026-04-11T10:30:00Z")
})
