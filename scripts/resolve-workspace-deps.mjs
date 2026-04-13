// Replaces workspace:* references in each package's package.json with the
// actual published versions of sibling packages, so npm tarballs contain
// real semver ranges instead of the monorepo-only workspace: protocol.
// Run automatically as part of `bun run release` before `changeset publish`.
import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

// Build a map of package name → current version from all workspace packages
const versionMap = new Map()
for (const dir of readdirSync("packages")) {
  try {
    const pkg = JSON.parse(
      readFileSync(join("packages", dir, "package.json"), "utf-8"),
    )
    if (pkg.name) versionMap.set(pkg.name, pkg.version)
  } catch {
    // skip if no package.json
  }
}

// Resolve workspace:* in each package
for (const dir of readdirSync("packages")) {
  const pkgPath = join("packages", dir, "package.json")
  let pkg
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf-8"))
  } catch {
    continue
  }

  let changed = false
  for (const field of ["dependencies", "peerDependencies"]) {
    if (!pkg[field]) continue
    for (const [name, range] of Object.entries(pkg[field])) {
      if (range.startsWith("workspace:") && versionMap.has(name)) {
        const resolved = `^${versionMap.get(name)}`
        pkg[field][name] = resolved
        console.log(`${dir}: ${name} workspace:* → ${resolved}`)
        changed = true
      }
    }
  }

  if (changed) {
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  }
}
