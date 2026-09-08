#!/usr/bin/env bash
set -euo pipefail
set +x
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
entry=${1:-lesou/agent/nostr}
command -v pass >/dev/null
if ! pass show "$entry" >/dev/null 2>&1; then
  node "$root/src/cli.mjs" keygen | pass insert -m "$entry" >/dev/null
fi
pass show "$entry" | node "$root/src/cli.mjs" pubkey
