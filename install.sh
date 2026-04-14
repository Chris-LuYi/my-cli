#!/usr/bin/env bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing dependencies..."
bun install --cwd "$REPO_DIR"

START_MARKER="# my-cli start"
END_MARKER="# my-cli end"

BLOCK="
$START_MARKER
cgit() { bun run \"$REPO_DIR/packages/cli/src/index.tsx\" git \"\$@\"; }
cos() { bun run \"$REPO_DIR/packages/cli/src/index.tsx\" os \"\$@\"; }
alias my-cli=\"bun run \\\"$REPO_DIR/packages/cli/src/index.tsx\\\"\"
$END_MARKER"

if grep -qF "$START_MARKER" ~/.bashrc 2>/dev/null; then
  # Remove the old block between markers (inclusive)
  sed -i "/^$START_MARKER$/,/^$END_MARKER$/d" ~/.bashrc
fi

printf '%s\n' "$BLOCK" >> ~/.bashrc
echo "Shell functions written to ~/.bashrc."
echo "Run: source ~/.bashrc"
