import { ErrorBox, runCommand } from "@chrisluyi/core"
import type { CommandArgs } from "@chrisluyi/core"
import { Text, useApp } from "ink"
import type React from "react"
import { useEffect, useState } from "react"

/** "feature" → "feature-v2", "feature-v2" → "feature-v3", etc. */
export function nextVersionBranch(current: string): string {
  const match = current.match(/^(.+)-v(\d+)$/)
  if (match) {
    return `${match[1]}-v${Number.parseInt(match[2]) + 1}`
  }
  return `${current}-v2`
}

export const GitV2: React.FC<CommandArgs> = ({ setExitCode }) => {
  const { exit } = useApp()
  const [status, setStatus] = useState<"running" | "done" | "error">("running")
  const [message, setMessage] = useState("")

  useEffect(() => {
    ;(async () => {
      try {
        const branchResult = await runCommand("git", [
          "rev-parse",
          "--abbrev-ref",
          "HEAD",
        ])
        if (branchResult.exitCode !== 0) {
          setMessage(
            branchResult.stderr.trim() || "Failed to get current branch",
          )
          setStatus("error")
          return
        }

        const current = branchResult.stdout.trim()
        const next = nextVersionBranch(current)

        const checkoutResult = await runCommand("git", ["checkout", "-b", next])
        if (checkoutResult.exitCode !== 0) {
          setMessage(checkoutResult.stderr.trim() || "git checkout failed")
          setStatus("error")
          return
        }

        setMessage(`${current} → ${next}`)
        setStatus("done")
      } catch (err) {
        setMessage(err instanceof Error ? err.message : String(err))
        setStatus("error")
      }
    })()
  }, [])

  useEffect(() => {
    if (status === "done") exit()
  }, [status, exit])

  if (status === "error")
    return <ErrorBox message={message} setExitCode={setExitCode} />
  if (status === "done") {
    return <Text color="green">Created branch: {message}</Text>
  }
  return <Text dimColor>Creating version branch...</Text>
}
