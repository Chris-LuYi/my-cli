import { describe, expect, test } from "bun:test"
import { nextVersionBranch } from "../src/v2"

describe("nextVersionBranch", () => {
  test("appends -v2 to plain branch name", () => {
    expect(nextVersionBranch("feature")).toBe("feature-v2")
  })

  test("increments existing version suffix", () => {
    expect(nextVersionBranch("feature-v2")).toBe("feature-v3")
    expect(nextVersionBranch("feature-v3")).toBe("feature-v4")
    expect(nextVersionBranch("feature-v10")).toBe("feature-v11")
  })

  test("handles branch names with hyphens", () => {
    expect(nextVersionBranch("my-feature")).toBe("my-feature-v2")
    expect(nextVersionBranch("fix-some-bug")).toBe("fix-some-bug-v2")
  })

  test("handles branch with hyphens and existing version", () => {
    expect(nextVersionBranch("my-feature-v2")).toBe("my-feature-v3")
  })

  test("v suffix must be at end to be incremented", () => {
    expect(nextVersionBranch("v2-feature")).toBe("v2-feature-v2")
  })
})
