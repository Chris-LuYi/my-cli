import { spawnPassthrough } from "@chrisluyi/core"

const FORMAT =
  "%C(yellow)%h%C(reset) %C(green)(%ar)%C(reset) %s %C(blue)<%an>%C(reset)"

export async function runGitLog(_positional: string[]): Promise<number> {
  return spawnPassthrough("git", [
    "log",
    "--oneline",
    "--graph",
    "--decorate",
    "--all",
    `--format=${FORMAT}`,
  ])
}
