import { ErrorBox, runCommand } from "@my-cli/core"
import type { CommandArgs } from "@my-cli/core"
import { Box, Text, useApp } from "ink"
import TextInput from "ink-text-input"
import type React from "react"
import { useEffect, useState } from "react"

type SquashVariant = "tag" | "commit" | "last"
interface SquashArgs {
  variant: SquashVariant
  ref: string
}

export function parseSquashArgs(positional: string[]): SquashArgs | null {
  const [variant, ref] = positional
  if (!ref) return null
  if (variant !== "tag" && variant !== "commit" && variant !== "last")
    return null
  return { variant, ref }
}

export function validateSquashN(n: string): string | null {
  const parsed = Number(n)
  if (!Number.isInteger(parsed) || Number.isNaN(parsed))
    return "n must be a positive integer"
  if (parsed < 2) return "Need at least 2 commits to squash"
  return null
}

async function resolveBase(
  variant: SquashVariant,
  ref: string,
): Promise<{ base: string; error?: string }> {
  if (variant === "last") {
    const n = Number.parseInt(ref, 10)
    const result = await runCommand("git", ["rev-parse", `HEAD~${n}`])
    if (result.exitCode !== 0)
      return { base: "", error: `Ref HEAD~${n} not found` }
    return { base: result.stdout.trim() }
  }
  const result = await runCommand("git", ["rev-parse", ref])
  if (result.exitCode !== 0)
    return { base: "", error: `Ref '${ref}' not found` }
  return { base: result.stdout.trim() }
}

export const GitSquash: React.FC<CommandArgs> = ({
  positional,
  setExitCode,
}) => {
  const { exit } = useApp()
  const [phase, setPhase] = useState<
    "validating" | "prompt" | "squashing" | "done" | "error"
  >("validating")
  const [errorMsg, setErrorMsg] = useState("")
  const [commitMsg, setCommitMsg] = useState("")
  const [baseRef, setBaseRef] = useState("")
  const [resultHash, setResultHash] = useState("")

  const parsed = parseSquashArgs(positional)

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-once effect
  useEffect(() => {
    if (!parsed) {
      setErrorMsg("Usage: cgit squash tag|commit|last <ref|n>")
      setPhase("error")
      return
    }
    if (parsed.variant === "last") {
      const nError = validateSquashN(parsed.ref)
      if (nError) {
        setErrorMsg(nError)
        setPhase("error")
        return
      }
    }
    ;(async () => {
      const { base, error } = await resolveBase(parsed.variant, parsed.ref)
      if (error) {
        setErrorMsg(error)
        setPhase("error")
        return
      }
      setBaseRef(base)
      setPhase("prompt")
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (msg: string) => {
    if (!msg.trim()) return
    setPhase("squashing")
    try {
      const resetResult = await runCommand("git", ["reset", "--soft", baseRef])
      if (resetResult.exitCode !== 0) {
        setErrorMsg(resetResult.stderr.trim() || "git reset failed")
        setPhase("error")
        return
      }
      const commitResult = await runCommand("git", ["commit", "-m", msg.trim()])
      if (commitResult.exitCode !== 0) {
        setErrorMsg(commitResult.stderr.trim() || "git commit failed")
        setPhase("error")
        return
      }
      const hashMatch = commitResult.stdout.match(/\[[\w/]+ ([a-f0-9]+)\]/)
      setResultHash(hashMatch?.[1] ?? "")
      setPhase("done")
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setPhase("error")
    }
  }

  useEffect(() => {
    if (phase === "done") exit()
  }, [phase, exit])

  if (phase === "error")
    return <ErrorBox message={errorMsg} setExitCode={setExitCode} />
  if (phase === "validating") return <Text dimColor>Validating...</Text>
  if (phase === "prompt") {
    return (
      <Box>
        <Text>Commit message: </Text>
        <TextInput
          value={commitMsg}
          onChange={setCommitMsg}
          onSubmit={handleSubmit}
        />
      </Box>
    )
  }
  if (phase === "squashing") return <Text dimColor>Squashing commits...</Text>
  return (
    <Text color="green">
      Squashed into {resultHash}: {commitMsg}
    </Text>
  )
}
