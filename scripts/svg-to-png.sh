#!/usr/bin/env bash
# svg-to-png.sh — convert SVG diagrams to PNG (for Medium, which strips inline SVG).
#
# Usage:
#   ./scripts/svg-to-png.sh                       # convert every SVG under assets/
#   ./scripts/svg-to-png.sh assets/B-13           # convert one folder
#   ./scripts/svg-to-png.sh path/to/file.svg      # convert one file
#   ./scripts/svg-to-png.sh -s 2 assets/B-15      # render at 2x scale
#   ./scripts/svg-to-png.sh -w 1600 file.svg      # render at fixed width
#   ./scripts/svg-to-png.sh -f assets             # overwrite existing PNGs
#
# Outputs <name>.png next to <name>.svg. Skips when PNG exists and is newer
# than the SVG, unless -f is passed.
#
# Backend auto-detect order: rsvg-convert > magick > convert (ImageMagick) > npx sharp-cli.
# Install hint: brew install librsvg  (rsvg-convert is the most accurate for these diagrams).

set -euo pipefail

SCALE=2          # default 2x retina render
WIDTH=""         # explicit width overrides scale
FORCE=0
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${ROOT}/assets"

usage() {
  sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -s|--scale) SCALE="$2"; shift 2 ;;
    -w|--width) WIDTH="$2"; shift 2 ;;
    -f|--force) FORCE=1; shift ;;
    -h|--help)  usage 0 ;;
    -*)         echo "unknown flag: $1" >&2; usage 1 ;;
    *)          TARGET="$1"; shift ;;
  esac
done

# Pick backend
BACKEND=""
if   command -v rsvg-convert >/dev/null 2>&1; then BACKEND="rsvg"
elif command -v magick       >/dev/null 2>&1; then BACKEND="magick"
elif command -v convert      >/dev/null 2>&1; then BACKEND="convert"
elif command -v npx          >/dev/null 2>&1; then BACKEND="sharp"
else
  echo "No SVG converter found." >&2
  echo "Install one of:" >&2
  echo "  brew install librsvg          # rsvg-convert (recommended)" >&2
  echo "  brew install imagemagick      # magick / convert" >&2
  echo "  npm i -g sharp-cli            # sharp-cli (requires Node)" >&2
  exit 1
fi
echo "backend: ${BACKEND}"

render() {
  local svg="$1" png="$2"
  case "$BACKEND" in
    rsvg)
      if [[ -n "$WIDTH" ]]; then
        rsvg-convert -w "$WIDTH" -o "$png" "$svg"
      else
        rsvg-convert -z "$SCALE" -o "$png" "$svg"
      fi ;;
    magick)
      if [[ -n "$WIDTH" ]]; then
        magick -density 192 -background none "$svg" -resize "${WIDTH}x" "$png"
      else
        magick -density "$((96 * SCALE))" -background none "$svg" "$png"
      fi ;;
    convert)
      if [[ -n "$WIDTH" ]]; then
        convert -density 192 -background none "$svg" -resize "${WIDTH}x" "$png"
      else
        convert -density "$((96 * SCALE))" -background none "$svg" "$png"
      fi ;;
    sharp)
      # sharp-cli reads density from input; -w sets width, otherwise scale via density
      if [[ -n "$WIDTH" ]]; then
        npx --yes sharp-cli -i "$svg" -o "$png" resize "$WIDTH"
      else
        # Approximate scale by reading width and multiplying. Falls back to 1600 if missing.
        local w
        w=$(grep -oE 'width="[0-9]+"' "$svg" | head -1 | grep -oE '[0-9]+' || echo 1600)
        npx --yes sharp-cli -i "$svg" -o "$png" resize "$((w * SCALE))"
      fi ;;
  esac
}

needs_rebuild() {
  local svg="$1" png="$2"
  [[ "$FORCE" -eq 1 ]] && return 0
  [[ ! -f "$png" ]] && return 0
  [[ "$svg" -nt "$png" ]] && return 0
  return 1
}

convert_one() {
  local svg="$1"
  local png="${svg%.svg}.png"
  if needs_rebuild "$svg" "$png"; then
    render "$svg" "$png"
    printf "  ✓ %s\n" "${png#$ROOT/}"
  else
    printf "  · skip (up to date) %s\n" "${png#$ROOT/}"
  fi
}

# Resolve target — file, directory, or relative path
if [[ -f "$TARGET" ]]; then
  convert_one "$TARGET"
elif [[ -d "$TARGET" ]]; then
  echo "scanning: ${TARGET#$ROOT/}"
  count=0
  while IFS= read -r -d '' svg; do
    convert_one "$svg"
    count=$((count + 1))
  done < <(find "$TARGET" -type f -name '*.svg' -print0)
  echo "done — ${count} svg(s) processed"
else
  echo "not found: $TARGET" >&2
  exit 1
fi
