/** Returns UTC ISO 8601 timestamp without milliseconds, e.g. "2026-04-11T10:30:00Z" */
export function formatISOTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z")
}
