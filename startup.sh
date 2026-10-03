#!/bin/sh
# Revive the preview after hibernate. Idempotent: exit if already healthy.
if curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8080/; then
  exit 0
fi
cd /workspace
npm run dev -- --host 0.0.0.0 --port 8080 > /tmp/dev-server.log 2>&1 &
exit 0
