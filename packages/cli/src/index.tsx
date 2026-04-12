import { ErrorBox, HelpTable } from "@chrisluyi/core"
import { gitRegistry } from "@chrisluyi/git"
import { osRegistry } from "@chrisluyi/os"
import { render } from "ink"
import React from "react"
import { resolveRoute } from "./router"

const registries = [gitRegistry, osRegistry]
const args = process.argv.slice(2)
const route = resolveRoute(args, registries)

let exitCode = 0
const setExitCode = (code: number) => {
  exitCode = code
}

// Passthrough commands run before render() to avoid Ink's stdout patch
if (route.type === "command" && route.entry.run) {
  try {
    const code = await route.entry.run(route.positional)
    process.exit(code)
  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

// All other routes go through Ink
function App() {
  if (route.type === "help-all") {
    return <HelpTable registries={registries} />
  }
  if (route.type === "help-domain") {
    return <HelpTable registries={registries} domain={route.domain} />
  }
  if (route.type === "error") {
    return <ErrorBox message={route.message} setExitCode={setExitCode} />
  }
  // component is guaranteed present: route.type === 'command' with no run field
  // biome-ignore lint/style/noNonNullAssertion: router ensures component exists here
  const Component = route.entry.component!
  return <Component positional={route.positional} setExitCode={setExitCode} />
}

const { waitUntilExit } = render(<App />)
await waitUntilExit()
process.exit(exitCode)
