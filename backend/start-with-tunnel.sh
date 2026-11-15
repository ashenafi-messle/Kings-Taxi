#!/usr/bin/env bash
# ==============================================================================
# Kings Taxi Central Backend — Production Startup with SSH Tunnel (Render)
# ==============================================================================
# Security & Initialization Architecture:
#   1. Container initialization starts as root (PID 1 dumb-init -> supervisor).
#   2. Root stages Render Secret Files from /etc/secrets/ into /home/node/.ssh/.
#   3. Key file set to 0600, known_hosts to 0644, ownership set to node:node.
#   4. Validates secret files are non-empty.
#   5. Drops privileges to user 'node' (UID 1000) using su-exec.
#   6. Enforces database isolation rules (127.0.0.1:15433/kings_taxi_dev with kings_taxi_dev_user).
#   7. Spawns SSH tunnel (kings-render-tunnel@196.188.250.186).
#   8. Verifies local port readiness on 127.0.0.1:15433.
#   9. Starts Node.js backend (dist/server.js).
#  10. Monitors tunnel and backend; reaps failed processes; exits with true exit code.
# ==============================================================================

set -uo pipefail

# ------------------------------------------------------------------------------
# 1. Configuration & Secret File Paths
# ------------------------------------------------------------------------------
RENDER_SECRET_KEY="${SSH_KEY_PATH:-/etc/secrets/kings_render_tunnel}"
RENDER_SECRET_KNOWN_HOSTS="${SSH_KNOWN_HOSTS_PATH:-/etc/secrets/kings_render_known_hosts}"

NODE_USER="node"
NODE_HOME="/home/node"
SSH_RUNTIME_DIR="${NODE_HOME}/.ssh"
LOCAL_KEY_FILE="${SSH_RUNTIME_DIR}/id_render_tunnel"
LOCAL_KNOWN_HOSTS="${SSH_RUNTIME_DIR}/known_hosts"

SSH_USER="kings-render-tunnel"
SSH_HOST="196.188.250.186"
LOCAL_TUNNEL_PORT="15433"
REMOTE_FORWARD_TARGET="127.0.0.1:15432"

MAX_TUNNEL_WAIT_SECONDS=30
RECONNECT_MAX_ATTEMPTS=5
RECONNECT_INTERVAL_SECONDS=3

NODE_PID=""
SSH_PID=""
IS_CLEANING_UP=0
EXIT_CODE=0

# ------------------------------------------------------------------------------
# 2. Secret Staging & Non-Root Privilege Dropping
# ------------------------------------------------------------------------------
CURRENT_UID=$(id -u)

if [ "$CURRENT_UID" -eq 0 ]; then
  echo "================================================================================"
  echo "  KINGS TAXI CENTRAL BACKEND — RENDER INITIALIZATION & SECRET STAGING (ROOT)"
  echo "================================================================================"

  # 1. Validate Render secret files presence while root has filesystem access
  if [ ! -f "$RENDER_SECRET_KEY" ]; then
    echo "[FATAL] SSH private key file not found at: $RENDER_SECRET_KEY"
    echo "[FATAL] In Render Dashboard -> Environment -> Secret Files, add 'kings_render_tunnel'."
    exit 1
  fi

  if [ ! -s "$RENDER_SECRET_KEY" ]; then
    echo "[FATAL] SSH private key file is empty: $RENDER_SECRET_KEY"
    exit 1
  fi

  if [ ! -f "$RENDER_SECRET_KNOWN_HOSTS" ]; then
    echo "[FATAL] SSH known_hosts file not found at: $RENDER_SECRET_KNOWN_HOSTS"
    echo "[FATAL] In Render Dashboard -> Environment -> Secret Files, add 'kings_render_known_hosts'."
    exit 1
  fi

  if [ ! -s "$RENDER_SECRET_KNOWN_HOSTS" ]; then
    echo "[FATAL] SSH known_hosts file is empty: $RENDER_SECRET_KNOWN_HOSTS"
    exit 1
  fi

  # 2. Prepare non-root runtime SSH directory
  mkdir -p "$SSH_RUNTIME_DIR"
  chmod 700 "$SSH_RUNTIME_DIR"

  # 3. Securely copy secrets into /home/node/.ssh/
  cp "$RENDER_SECRET_KEY" "$LOCAL_KEY_FILE"
  chmod 600 "$LOCAL_KEY_FILE"

  cp "$RENDER_SECRET_KNOWN_HOSTS" "$LOCAL_KNOWN_HOSTS"
  chmod 644 "$LOCAL_KNOWN_HOSTS"

  # 4. Set ownership to node:node
  chown -R "${NODE_USER}:${NODE_USER}" "$SSH_RUNTIME_DIR"

  # 5. Ensure application directories are owned by node
  mkdir -p /app/backend/public/uploads
  chown -R "${NODE_USER}:${NODE_USER}" /app/backend/public

  # 6. Validate that staged files are non-empty
  if [ ! -s "$LOCAL_KEY_FILE" ] || [ ! -s "$LOCAL_KNOWN_HOSTS" ]; then
    echo "[FATAL] Staged secret files in $SSH_RUNTIME_DIR are empty or corrupt."
    exit 1
  fi

  echo "[Security Stage] Secrets successfully staged in $SSH_RUNTIME_DIR with permissions 0600/0644."
  echo "[Security Stage] Dropping privileges to user '${NODE_USER}' (UID 1000)..."

  # 7. Drop privileges using su-exec and update environment variables to point to staged paths
  exec su-exec "$NODE_USER" env \
    HOME="$NODE_HOME" \
    USER="$NODE_USER" \
    LOGNAME="$NODE_USER" \
    SSH_KEY_PATH="$LOCAL_KEY_FILE" \
    SSH_KNOWN_HOSTS_PATH="$LOCAL_KNOWN_HOSTS" \
    "$0" "$@"
fi

# Beyond this point, the process is guaranteed to execute as non-root user 'node'
CURRENT_USER=$(id -un 2>/dev/null || echo "uid-$CURRENT_UID")
if [ "$CURRENT_UID" -eq 0 ]; then
  echo "[FATAL] Privilege drop failed: application supervisor is still running as root."
  exit 1
fi
echo "[Security] Application supervisor running as non-root user: $CURRENT_USER (UID: $CURRENT_UID)"

# If running directly as non-root (e.g., local testing or custom environment)
if [ ! -f "$LOCAL_KEY_FILE" ]; then
  echo "[SSH Secrets] Staging secrets directly as non-root user..."

  if [ ! -f "$RENDER_SECRET_KEY" ]; then
    echo "[FATAL] SSH private key file not found at: $RENDER_SECRET_KEY"
    echo "[FATAL] In Render Dashboard -> Environment -> Secret Files, add 'kings_render_tunnel'."
    exit 1
  fi

  if [ ! -s "$RENDER_SECRET_KEY" ]; then
    echo "[FATAL] SSH private key file is empty: $RENDER_SECRET_KEY"
    exit 1
  fi

  if [ ! -f "$RENDER_SECRET_KNOWN_HOSTS" ]; then
    echo "[FATAL] SSH known_hosts file not found at: $RENDER_SECRET_KNOWN_HOSTS"
    echo "[FATAL] In Render Dashboard -> Environment -> Secret Files, add 'kings_render_known_hosts'."
    exit 1
  fi

  if [ ! -s "$RENDER_SECRET_KNOWN_HOSTS" ]; then
    echo "[FATAL] SSH known_hosts file is empty: $RENDER_SECRET_KNOWN_HOSTS"
    exit 1
  fi

  mkdir -p "$SSH_RUNTIME_DIR"
  chmod 700 "$SSH_RUNTIME_DIR"

  if ! cp "$RENDER_SECRET_KEY" "$LOCAL_KEY_FILE" 2>/dev/null; then
    echo "[FATAL] Cannot read secret key file: $RENDER_SECRET_KEY (Permission denied)."
    echo "[FATAL] Ensure container entrypoint can read Render secret files or run with initial root staging."
    exit 1
  fi
  chmod 600 "$LOCAL_KEY_FILE"

  if ! cp "$RENDER_SECRET_KNOWN_HOSTS" "$LOCAL_KNOWN_HOSTS" 2>/dev/null; then
    echo "[FATAL] Cannot read known_hosts file: $RENDER_SECRET_KNOWN_HOSTS (Permission denied)."
    exit 1
  fi
  chmod 644 "$LOCAL_KNOWN_HOSTS"
fi

echo "[SSH Secrets] Verified runtime credentials: key (0600), known_hosts (0644)."

# ------------------------------------------------------------------------------
# 3. Critical Database Isolation Safeguard
# ------------------------------------------------------------------------------
echo "[DB Isolation] Enforcing strict database isolation rules..."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[FATAL] DATABASE_URL environment variable is missing."
  EXIT_CODE=1
  exit 1
fi

# Parse and validate DATABASE_URL using Node.js without printing credentials
node -e '
  const rawUrl = process.env.DATABASE_URL;
  try {
    const url = new URL(rawUrl);
    const protocol = url.protocol;
    const host = url.hostname;
    const port = url.port || "5432";
    const dbName = url.pathname.replace(/^\//, "").split("?")[0];
    const username = url.username;

    if (protocol !== "postgresql:" && protocol !== "postgres:") {
      console.error("[FATAL] Invalid DATABASE_URL protocol: " + protocol + " (expected postgresql:)");
      process.exit(1);
    }
    if (host !== "127.0.0.1") {
      console.error("[FATAL] Invalid DATABASE_URL host: " + host + " (Render deployment must connect to 127.0.0.1 via local SSH tunnel)");
      process.exit(1);
    }
    if (port !== "15433") {
      console.error("[FATAL] Invalid DATABASE_URL port: " + port + " (Render deployment must use local tunnel port 15433)");
      process.exit(1);
    }
    if (dbName.toLowerCase() === "kings_taxi") {
      console.error("[FATAL] CRITICAL SECURITY VIOLATION: Target database is production kings_taxi. Access is strictly blocked.");
      process.exit(1);
    }
    if (dbName !== "kings_taxi_dev") {
      console.error("[FATAL] Invalid DATABASE_URL database: " + dbName + " (Render deployment must use kings_taxi_dev)");
      process.exit(1);
    }
    const decodedUser = decodeURIComponent(username || "");
    if (!decodedUser) {
      console.error("[FATAL] Missing DATABASE_URL username. Render deployment strictly requires account kings_taxi_dev_user.");
      process.exit(1);
    }
    if (decodedUser !== "kings_taxi_dev_user") {
      console.error("[FATAL] Invalid DATABASE_URL username: " + decodedUser + " (must be kings_taxi_dev_user)");
      process.exit(1);
    }
    console.log("[DB Isolation] Verified: protocol=" + protocol + " host=127.0.0.1 port=15433 database=kings_taxi_dev user=" + decodedUser);
  } catch (err) {
    console.error("[FATAL] Could not parse DATABASE_URL (credentials redacted). Ensure standard postgresql:// format.");
    process.exit(1);
  }
' || {
  EXIT_CODE=1
  exit 1
}

# ------------------------------------------------------------------------------
# 4. SSH Tunnel Management & Reconnection Functions
# ------------------------------------------------------------------------------
stop_ssh_tunnel() {
  if [ -n "$SSH_PID" ]; then
    echo "[SSH Tunnel] Terminating existing SSH tunnel process (PID: $SSH_PID)..."
    kill -TERM "$SSH_PID" 2>/dev/null || true
    local wait_count=0
    while kill -0 "$SSH_PID" 2>/dev/null && [ "$wait_count" -lt 5 ]; do
      sleep 1
      wait_count=$((wait_count + 1))
    done
    if kill -0 "$SSH_PID" 2>/dev/null; then
      echo "[SSH Tunnel WARNING] SSH process did not exit after SIGTERM; sending SIGKILL..."
      kill -KILL "$SSH_PID" 2>/dev/null || true
    fi
    wait "$SSH_PID" 2>/dev/null || true
    SSH_PID=""
    echo "[SSH Tunnel] SSH tunnel process stopped and reaped."
  fi
}

start_ssh_tunnel() {
  # Defensive: ensure no competing SSH process exists before starting
  stop_ssh_tunnel

  echo "[SSH Tunnel] Launching secure tunnel to ${SSH_USER}@${SSH_HOST}..."
  ssh -N \
    -i "$LOCAL_KEY_FILE" \
    -o UserKnownHostsFile="$LOCAL_KNOWN_HOSTS" \
    -o StrictHostKeyChecking=yes \
    -o PasswordAuthentication=no \
    -o PubkeyAuthentication=yes \
    -o BatchMode=yes \
    -o ExitOnForwardFailure=yes \
    -o ServerAliveInterval=15 \
    -o ServerAliveCountMax=3 \
    -o ConnectTimeout=10 \
    -o TCPKeepAlive=yes \
    -L "${LOCAL_TUNNEL_PORT}:${REMOTE_FORWARD_TARGET}" \
    "${SSH_USER}@${SSH_HOST}" &
  SSH_PID=$!
  echo "[SSH Tunnel] Tunnel process initiated with PID: $SSH_PID"
}

wait_for_tunnel() {
  local waited=0
  echo "[SSH Tunnel] Waiting for local port 127.0.0.1:${LOCAL_TUNNEL_PORT} to accept connections..."
  while [ "$waited" -lt "$MAX_TUNNEL_WAIT_SECONDS" ]; do
    # Check if SSH process died prematurely
    if [ -n "$SSH_PID" ] && ! kill -0 "$SSH_PID" 2>/dev/null; then
      echo "[FATAL] SSH process exited unexpectedly during tunnel initialization."
      stop_ssh_tunnel
      return 1
    fi

    # Probe 127.0.0.1:15433 using Node.js TCP socket
    if node -e "
      const net = require('net');
      const socket = net.createConnection({ port: $LOCAL_TUNNEL_PORT, host: '127.0.0.1' });
      socket.setTimeout(1000);
      socket.on('connect', () => { socket.destroy(); process.exit(0); });
      socket.on('error', () => { process.exit(1); });
      socket.on('timeout', () => { socket.destroy(); process.exit(1); });
    " 2>/dev/null; then
      echo "[SSH Tunnel] Local port 127.0.0.1:${LOCAL_TUNNEL_PORT} is UP and accepting PostgreSQL traffic."
      return 0
    fi

    sleep 1
    waited=$((waited + 1))
  done

  echo "[FATAL] Timed out after ${MAX_TUNNEL_WAIT_SECONDS}s waiting for SSH tunnel on 127.0.0.1:${LOCAL_TUNNEL_PORT}."
  # Critical: terminate and reap the failed/hung SSH process so it cannot compete with future attempts
  stop_ssh_tunnel
  return 1
}

# ------------------------------------------------------------------------------
# 5. Graceful Shutdown & Exit Status Preservation
# ------------------------------------------------------------------------------
cleanup() {
  local captured_exit=$?
  local sig="${1:-}"

  if [ "$IS_CLEANING_UP" -eq 1 ]; then
    return
  fi
  IS_CLEANING_UP=1
  trap - SIGTERM SIGINT EXIT

  # Calculate final exit code:
  # - If signaled via SIGTERM: 143 (128 + 15)
  # - If signaled via SIGINT: 130 (128 + 2)
  # - If explicit non-zero EXIT_CODE was set: EXIT_CODE
  # - Else captured exit status from $?
  local final_status=0
  if [ "$sig" = "SIGTERM" ]; then
    final_status=143
  elif [ "$sig" = "SIGINT" ]; then
    final_status=130
  elif [ "$EXIT_CODE" -ne 0 ]; then
    final_status="$EXIT_CODE"
  elif [ "$captured_exit" -ne 0 ]; then
    final_status="$captured_exit"
  fi

  echo ""
  echo "================================================================================"
  if [ -n "$sig" ]; then
    echo "  [Shutdown] Caught signal ${sig}. Coordinating graceful shutdown..."
  else
    echo "  [Shutdown] Exiting supervisor (status: ${final_status}). Cleaning up processes..."
  fi
  echo "================================================================================"

  # 1. Gracefully shut down Node.js backend
  if [ -n "$NODE_PID" ] && kill -0 "$NODE_PID" 2>/dev/null; then
    echo "[Shutdown] Sending SIGTERM to Node.js backend (PID: $NODE_PID)..."
    kill -TERM "$NODE_PID" 2>/dev/null || true

    local wait_count=0
    while kill -0 "$NODE_PID" 2>/dev/null && [ "$wait_count" -lt 10 ]; do
      sleep 1
      wait_count=$((wait_count + 1))
    done

    if kill -0 "$NODE_PID" 2>/dev/null; then
      echo "[Shutdown] Node backend did not exit in 10s; sending SIGKILL..."
      kill -KILL "$NODE_PID" 2>/dev/null || true
    fi
    wait "$NODE_PID" 2>/dev/null || true
    echo "[Shutdown] Node.js backend cleanly reaped."
  fi

  # 2. Terminate and reap SSH tunnel
  stop_ssh_tunnel

  # 3. Securely remove temporary runtime key
  if [ -f "$LOCAL_KEY_FILE" ]; then
    rm -f "$LOCAL_KEY_FILE"
    echo "[Shutdown] Runtime SSH identity file securely unlinked."
  fi

  echo "[Shutdown] Shutdown complete. Exiting with status: ${final_status}."
  exit "$final_status"
}

trap 'cleanup "SIGTERM"' SIGTERM
trap 'cleanup "SIGINT"' SIGINT
trap 'cleanup "EXIT"' EXIT

# ------------------------------------------------------------------------------
# 6. Startup Execution & Tunnel Supervision Loop
# ------------------------------------------------------------------------------
start_ssh_tunnel
if ! wait_for_tunnel; then
  echo "[FATAL] Failed to establish SSH tunnel before backend startup. Terminating."
  EXIT_CODE=1
  exit 1
fi

echo "[Backend] Starting compiled Express backend (dist/server.js)..."
node dist/server.js &
NODE_PID=$!
echo "[Backend] Express backend started successfully (PID: $NODE_PID)"

reconnect_count=0

while true; do
  # 1. Check if backend Node.js process has stopped
  if ! kill -0 "$NODE_PID" 2>/dev/null; then
    wait "$NODE_PID" 2>/dev/null
    NODE_EXIT_CODE=$?
    echo "[Backend] Node.js process terminated with exit code $NODE_EXIT_CODE."
    EXIT_CODE="$NODE_EXIT_CODE"
    exit "$NODE_EXIT_CODE"
  fi

  # 2. Check if SSH tunnel is still alive
  if ! kill -0 "$SSH_PID" 2>/dev/null; then
    echo "[SSH Tunnel WARNING] SSH tunnel process (PID: $SSH_PID) dropped unexpectedly."
    if [ "$reconnect_count" -lt "$RECONNECT_MAX_ATTEMPTS" ]; then
      reconnect_count=$((reconnect_count + 1))
      echo "[SSH Tunnel] Attempting reconnection ($reconnect_count of $RECONNECT_MAX_ATTEMPTS)..."

      stop_ssh_tunnel
      start_ssh_tunnel
      if wait_for_tunnel; then
        echo "[SSH Tunnel] Reconnection successful. Tunnel restored."
        reconnect_count=0
      else
        echo "[SSH Tunnel ERROR] Reconnection attempt $reconnect_count failed."
        sleep "$RECONNECT_INTERVAL_SECONDS"
      fi
    else
      echo "[FATAL] Exceeded maximum SSH reconnection attempts ($RECONNECT_MAX_ATTEMPTS)."
      echo "[FATAL] Triggering backend shutdown to prevent orphaned database errors."
      EXIT_CODE=1
      exit 1
    fi
  fi

  sleep 2
done
