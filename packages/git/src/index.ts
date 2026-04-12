import type { DomainRegistry } from "@chrisluyi/core"
import { GitBranch } from "./branch"
import { runGitLog } from "./log"
import { runGitPush } from "./push"
import { GitSquash } from "./squash"
import { GitV2 } from "./v2"
import { GitWip } from "./wip"

export const gitRegistry: DomainRegistry = {
  domain: "git",
  shellAlias: "cgit",
  commands: [
    {
      name: "log",
      description: "Pretty-printed git log with graph",
      usage: "cgit log",
      run: runGitLog,
    },
    {
      name: "wip",
      description: "Stage all changes and commit as WIP [timestamp]",
      usage: "cgit wip",
      component: GitWip,
    },
    {
      name: "branch",
      description: "Create new branch from default, fetch latest",
      usage: "cgit branch <name>",
      component: GitBranch,
    },
    {
      name: "squash",
      description: "Squash commits since tag/commit, or last n",
      usage: "cgit squash tag|commit|last <ref|n>",
      component: GitSquash,
    },
    {
      name: "v2",
      description: "Create next version branch from current (v2, v3, …)",
      usage: "cgit v2",
      component: GitV2,
    },
    {
      name: "push",
      description: "Push current branch to origin, set upstream",
      usage: "cgit push",
      run: runGitPush,
    },
  ],
}
