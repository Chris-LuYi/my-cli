import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const CLIP_DIR = join(homedir(), ".local", "share", "my-cli", "clipboard")

export interface ClipEntry {
  /** Epoch-ms string — also the filename stem and sort key */
  id: string
  text: string
  addedAt: Date
}

function ensureDir(): void {
  if (!existsSync(CLIP_DIR)) mkdirSync(CLIP_DIR, { recursive: true })
}

/** Load history newest-first, capped at 50. */
export function loadHistory(): ClipEntry[] {
  ensureDir()
  const files = readdirSync(CLIP_DIR)
    .filter((f) => f.endsWith(".txt"))
    .sort()
    .reverse()
    .slice(0, 50)
  return files.map((f) => {
    const id = f.slice(0, -4) // strip .txt
    const text = readFileSync(join(CLIP_DIR, f), "utf8")
    return { id, text, addedAt: new Date(Number(id)) }
  })
}

/**
 * Push text to history.
 * Deduplicates by content (removes prior match), then writes a new file.
 * Prunes to 50 entries after writing.
 */
export function pushEntry(text: string): void {
  ensureDir()
  const existing = readdirSync(CLIP_DIR).filter((f) => f.endsWith(".txt"))
  for (const f of existing) {
    if (readFileSync(join(CLIP_DIR, f), "utf8") === text) {
      unlinkSync(join(CLIP_DIR, f))
    }
  }
  writeFileSync(join(CLIP_DIR, `${Date.now()}.txt`), text)
  // Prune oldest beyond 50
  const all = readdirSync(CLIP_DIR)
    .filter((f) => f.endsWith(".txt"))
    .sort()
  for (const f of all.slice(0, Math.max(0, all.length - 50))) {
    unlinkSync(join(CLIP_DIR, f))
  }
}

export function deleteEntry(id: string): void {
  const file = join(CLIP_DIR, `${id}.txt`)
  if (existsSync(file)) unlinkSync(file)
}

/** Returns the clipboard write command for the current platform. */
export function getClipboardCommand(
  wsl: boolean,
  mac: boolean,
): [string, string[]] | null {
  if (wsl) return ["clip.exe", []]
  if (mac) return ["pbcopy", []]
  return ["xclip", ["-selection", "clipboard"]]
}

/** Write text to the system clipboard. Returns false if the tool is unavailable. */
export async function copyToClipboard(
  text: string,
  wsl: boolean,
  mac: boolean,
): Promise<boolean> {
  const cmd = getClipboardCommand(wsl, mac)
  if (!cmd) return false
  const [bin, args] = cmd
  try {
    const proc = Bun.spawn([bin, ...args], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    })
    proc.stdin.write(text)
    proc.stdin.end()
    const code = await proc.exited
    return code === 0
  } catch {
    return false
  }
}

/** Human-readable relative time from an ISO/epoch date string. */
export function formatRelativeTime(addedAt: Date): string {
  const diffMs = Date.now() - addedAt.getTime()
  const secs = Math.floor(diffMs / 1000)
  if (secs < 60) return "just now"
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
