#!/usr/bin/env bash
# render-mermaid.sh — render a mermaid diagram source (.mmd) to SVG, then PNG.
#
# Usage:
#   ./scripts/render-mermaid.sh diagram.mmd assets/B-NN/diagram-name
#   ./scripts/render-mermaid.sh diagram.mmd assets/B-NN/diagram-name --dark
#
# Writes <out>.mmd (copy of the source, kept for regeneration), <out>.svg, and
# <out>.png next to each other. Default theme is light — every existing
# diagram asset in this repo is light-themed and shared as-is between blog
# markdown (rendered on GitHub/dev.to/Medium, none of which are under this
# repo's control) and the dark presentation decks; branchdiff's own
# render-mermaid-png.ts makes the same call for the same reason: a
# dark-rendered diagram is light text on transparency, invisible on a page
# you don't control the background of. Pass --dark only for an asset that
# will genuinely only ever be viewed inside the dark deck chrome.
#
# Requires: npx (for @mermaid-js/mermaid-cli, fetched on demand — nothing to
# install ahead of time) and one of rsvg-convert / ImageMagick / sharp-cli for
# the PNG step, same as scripts/svg-to-png.sh already requires.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
THEME="light"
MMD=""
OUT=""

usage() {
  sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

args=()
for a in "$@"; do
  case "$a" in
    --dark) THEME="dark" ;;
    --light) THEME="light" ;;
    -h|--help) usage 0 ;;
    *) args+=("$a") ;;
  esac
done
[[ ${#args[@]} -eq 2 ]] || usage 1
MMD="${args[0]}"
OUT="${args[1]}"

[[ -f "$MMD" ]] || { echo "not found: $MMD" >&2; exit 1; }

CONFIG="${ROOT}/scripts/mermaid-${THEME}-config.json"
BG="#ffffff"
MMDC_THEME="default"
if [[ "$THEME" == "dark" ]]; then
  BG="#0D1117"
  MMDC_THEME="dark"
fi

mkdir -p "$(dirname "$OUT")"
cp "$MMD" "${OUT}.mmd"

# Two separate mmdc calls, not one SVG->PNG pipeline: mermaid node labels are
# HTML foreignObject content (so multi-line labels with <br/> work), and
# scripts/svg-to-png.sh's rsvg-convert backend is a pure-SVG rasterizer — it
# silently drops foreignObject text, leaving empty boxes. mmdc's own puppeteer
# renders PNG through a real browser, so labels come through either way.
npx --yes -p @mermaid-js/mermaid-cli mmdc \
  -i "$MMD" -o "${OUT}.svg" -c "$CONFIG" -b "$BG" -t "$MMDC_THEME"
npx --yes -p @mermaid-js/mermaid-cli mmdc \
  -i "$MMD" -o "${OUT}.png" -c "$CONFIG" -b "$BG" -t "$MMDC_THEME" -w 1600

echo "rendered: ${OUT}.mmd / .svg / .png (theme: ${THEME})"
