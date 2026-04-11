import { describe, expect, test } from "bun:test"
import type { DomainRegistry } from "@chrisluyi/core"
import { resolveRoute } from "../src/router"

const stub: DomainRegistry = {
  domain: "git",
  shellAlias: "cgit",
  commands: [
    { name: "log", description: "", usage: "", run: async () => 0 },
    {
      name: "squash",
      description: "",
      usage: "",
      // biome-ignore lint/suspicious/noExplicitAny: test stub only
      component: (() => null) as any,
    },
  ],
}

describe("resolveRoute", () => {
  test("no args → help-all", () => {
    expect(resolveRoute([], [stub]).type).toBe("help-all")
  })

  test("known domain, no subcommand → help-domain", () => {
    const r = resolveRoute(["git"], [stub])
    expect(r.type).toBe("help-domain")
    if (r.type === "help-domain") expect(r.domain).toBe("git")
  })

  test("unknown domain → error", () => {
    expect(resolveRoute(["docker"], [stub]).type).toBe("error")
  })

  test("known domain + known subcommand → command with empty positional", () => {
    const r = resolveRoute(["git", "log"], [stub])
    expect(r.type).toBe("command")
    if (r.type === "command") {
      expect(r.entry.name).toBe("log")
      expect(r.positional).toEqual([])
    }
  })

  test("known domain + known subcommand + positionals → command with positionals", () => {
    const r = resolveRoute(["git", "squash", "last", "3"], [stub])
    expect(r.type).toBe("command")
    if (r.type === "command") expect(r.positional).toEqual(["last", "3"])
  })

  test("known domain + unknown subcommand → error", () => {
    expect(resolveRoute(["git", "unknown"], [stub]).type).toBe("error")
  })
})
