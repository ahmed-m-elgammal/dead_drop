#!/bin/bash
# M3 W4.7 visual refinement pass — sync the sandbox-host live surface into apps/web.
# Same transformation as m3_polish_sync.sh: '@/engine' → '@dead-drop/engine';
# everything else copies verbatim.
set -euo pipefail

SRC=/home/z/my-project
REPO=/home/z/my-project/dead_drop
WEB="$REPO/apps/web"

files=(
  src/app/page.tsx
  src/components/dd/CaseBriefPanel.tsx
  src/components/dd/MapCanvas.tsx
  src/components/dd/ActionBar.tsx
)

for f in "${files[@]}"; do
  mkdir -p "$WEB/$(dirname "$f")"
  sed 's|@/engine|@dead-drop/engine|g' "$SRC/$f" > "$WEB/$f"
  echo "synced $f"
done
