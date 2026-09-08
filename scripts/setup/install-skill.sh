#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
target=${1:-"$HOME/.agents/skills/lesou"}
[[ ! -e "$target" ]] || { echo "Skill destination exists: $target. Review it before replacing it." >&2; exit 1; }
mkdir -p "$(dirname "$target")"
cp -R "$root/skills/lesou" "$target"
printf 'Installed LeSou skill at %s\n' "$target"
