import type { DomainRegistry } from "@chrisluyi/core"
import { OsClipboard } from "./cb"
import { runOsCpwd } from "./cpwd"
import { OsInfo } from "./info"
import { runOsKill } from "./kill"
import { runOsOpen } from "./open"
import { OsPorts } from "./ports"
import { runOsTerm } from "./term"

export const osRegistry: DomainRegistry = {
  domain: "os",
  shellAlias: "cos",
  commands: [
    {
      name: "open",
      description: "Open current directory in native file manager",
      usage: "cos open",
      run: runOsOpen,
    },
    {
      name: "term",
      description: "Open new terminal window at current directory",
      usage: "cos term",
      run: runOsTerm,
    },
    {
      name: "ports",
      description: "Interactive list of listening ports — select to kill",
      usage: "cos ports",
      component: OsPorts,
    },
    {
      name: "kill",
      description: "Kill process on port",
      usage: "cos kill <port>",
      run: runOsKill,
    },
    {
      name: "info",
      description: "Show file or directory metadata",
      usage: "cos info [path]",
      component: OsInfo,
    },
    {
      name: "cpwd",
      description: "Copy current directory path to clipboard and history",
      usage: "cos cpwd",
      run: runOsCpwd,
    },
    {
      name: "cb",
      description:
        "Clipboard history panel — pick to copy; cb push <text> to add",
      usage: "cos cb [push <text>]",
      component: OsClipboard,
    },
  ],
}
