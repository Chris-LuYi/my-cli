import { describe, expect, test } from "bun:test"
import { validateBranchName } from "../src/branch"

describe("validateBranchName", () => {
  test("returns error for empty name", () => {
    expect(validateBranchName("")).toBe("Branch name cannot be empty")
  })

  test("returns error for name with spaces", () => {
    expect(validateBranchName("my branch")).toBe(
      "Branch name cannot contain spaces",
    )
  })

  test("returns null for valid names", () => {
    expect(validateBranchName("feature/my-thing")).toBeNull()
    expect(validateBranchName("fix-123")).toBeNull()
  })
})
