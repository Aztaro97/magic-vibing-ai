#!/bin/bash
set -euo pipefail

# Optional analytics envs used by the app (kept for parity with other templates)
export NEXT_PUBLIC_POSTHOG_KEY="${NEXT_PUBLIC_POSTHOG_KEY:-}"
export NEXT_PUBLIC_POSTHOG_HOST="${NEXT_PUBLIC_POSTHOG_HOST:-}"

# Ensure Expo CLI is non-interactive inside the sandbox
export EXPO_NO_INTERACTIVE=1

# Use port 8081 consistently
export PORT="${PORT:-8081}"
export EXPO_WEB_PORT="${EXPO_WEB_PORT:-8081}"

# Allow custom tunnel subdomain if provided by the sandbox creator
# When set, Expo's ngrok tunnel will use this subdomain
export EXPO_TUNNEL_SUBDOMAIN="${EXPO_TUNNEL_SUBDOMAIN:-expo-web-app}"

# Wait until the server responds on the configured port
function ping_server() {
  local counter=0
  local response
  response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/status")
  while [[ ${response} -ne 200 ]]; do
    ((counter++))
    if (( counter % 20 == 0 )); then
      echo "Waiting for server to start on port ${PORT}..."
      sleep 0.1
    fi
    response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/status")
  done
}

ping_server &

cd /home/user

# Start Expo with tunnel enabled so the sandbox exposes a public URL.
# Respect the EXPO_TUNNEL_SUBDOMAIN when present.
npx --yes expo start --tunnel --port "${PORT}" --non-interactive