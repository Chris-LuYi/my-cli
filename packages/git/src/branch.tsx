import { ErrorBox, runCommand } from "@my-cli/core"
import type { CommandArgs } from "@my-cli/core"
import { Text } from "ink"
import type React from "react"
import { useEffect, useState } from "react"

export function validateBranchName(name: string): string | null {
  if (!name) return "Branch name cannot be empty"
  if (name.includes(" ")) return "Branch name cannot contain spaces"
  return null
}

export const GitBranch: React.FC<CommandArgs> = ({
  positional,
  setExitCode,
}) => {
  const branchName = positional[0] ?? ""
  const [status, setStatus] = useState<"running" | "done" | "error">("running")
  const [message, setMessage] = useState("")

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-once effect
  useEffect(() => {
    const err = validateBranchName(branchName)
    if (err) {
      setMessage(err)
      setStatus("error")
      return
    }
    ;(async () => {
      try {
        const remoteResult = await runCommand("git", [
          "remote",
          "show",
          "origin",
        ])
        if (remoteResult.exitCode !== 0) {
          setMessage(remoteResult.stderr.trim() || "Could not reach origin")
          setStatus("error")
          return
        }

        const match = remoteResult.stdout.match(/HEAD branch:\s+(\S+)/)
        if (!match) {
          setMessage("Could not detect default branch from origin")
          setStatus("error")
          return
        }
        const defaultBranch = match[1]

        const fetchResult = await runCommand("git", [
          "fetch",
          "origin",
          defaultBranch,
        ])
        if (fetchResult.exitCode !== 0) {
          setMessage(fetchResult.stderr.trim() || "git fetch failed")
          setStatus("error")
          return
        }

        const checkoutResult = await runCommand("git", [
          "checkout",
          "-b",
          branchName,
          `origin/${defaultBranch}`,
        ])
        if (checkoutResult.exitCode !== 0) {
          const stderr = checkoutResult.stderr.trim()
          setMessage(
            stderr.includes("already exists")
              ? `Branch '${branchName}' already exists`
              : stderr || "git checkout failed",
          )
          setStatus("error")
          return
        }

        setMessage(
          `Created and switched to '${branchName}' from origin/${defaultBranch}`,
        )
        setStatus("done")
      } catch (err) {
        setMessage(err instanceof Error ? err.message : String(err))
        setStatus("error")
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "error")
    return <ErrorBox message={message} setExitCode={setExitCode} />
  if (status === "done") return <Text color="green">{message}</Text>
  return <Text dimColor>Creating branch...</Text>
}
