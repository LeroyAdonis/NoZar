#!/bin/bash
# Wrapper for ai-match-notify.mjs cron job
# Sources production env vars, then runs the scan

set -a
source /root/NoZar/.env.production 2>/dev/null || source /root/NoZar/.env.local 2>/dev/null
set +a

cd /root/NoZar
node scripts/ai-match-notify.mjs 2>&1
