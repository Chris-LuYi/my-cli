#!/usr/bin/env bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing dependencies..."
bun install --cwd "$REPO_DIR"

MARKER="# my-cli"
if grep -qF "$MARKER" ~/.bashrc 2>/dev/null; then
  echo "Shell functions already present in ~/.bashrc — skipping."
else
  cat >> ~/.bashrc <<EOF

$MARKER
cgit() { bun run "$REPO_DIR/packages/cli/src/index.tsx" git "\$@"; }
alias my-cli="bun run \"$REPO_DIR/packages/cli/src/index.tsx\""
EOF
  echo "Shell functions added to ~/.bashrc."
  echo "Run: source ~/.bashrc"
fi
