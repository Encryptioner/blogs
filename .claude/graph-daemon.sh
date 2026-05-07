#!/usr/bin/env bash
# Called automatically by SessionStart hook — starts graphify watch + vault sync daemon

command -v graphify > /dev/null 2>&1 || exit 0

PROJECT_HASH=$(printf '%s' "$PWD" | shasum -a 256 | cut -c1-8)

# graphify watch — rebuilds graph on every code change
WATCH_MARK="graphify-watch-$PROJECT_HASH"
if ! pgrep -f "$WATCH_MARK" > /dev/null 2>&1; then
  nohup bash -c "# $WATCH_MARK
    graphify watch ." > ~/.cache/graphify-watch.log 2>&1 &
fi

# Vault sync daemon — polls GRAPH_REPORT.md, mirrors to ai-vault/ on change
VAULT_MARK="vault-sync-$PROJECT_HASH"
if ! pgrep -f "$VAULT_MARK" > /dev/null 2>&1; then
  nohup bash -c "# $VAULT_MARK
    LAST=''
    while true; do
      if [ -f graphify-out/GRAPH_REPORT.md ]; then
        CURR=\$(stat -f%m graphify-out/GRAPH_REPORT.md 2>/dev/null || stat -c%Y graphify-out/GRAPH_REPORT.md 2>/dev/null)
        if [ \"\$CURR\" != \"\$LAST\" ] && [ -n \"\$CURR\" ]; then
          mkdir -p ai-vault/graphify
          cp graphify-out/GRAPH_REPORT.md ai-vault/graphify/GRAPH_REPORT.md
          LAST=\"\$CURR\"
        fi
      fi
      sleep 3
    done" > /dev/null 2>&1 &
fi
