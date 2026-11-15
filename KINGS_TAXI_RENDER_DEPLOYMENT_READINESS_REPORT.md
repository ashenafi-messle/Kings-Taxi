# Kings Taxi Central Backend — Render Deployment Readiness Report

**Task:** Security and Reliability Corrections for Kings Taxi Render Deployment  
**Date:** November 14, 2026  
**Status:** Code Corrected, Hardened, and Locally Validated (Ready for Render Service Configuration)  

---

## 1. Exact Files Created & Modified

### Files Created
1. [`.dockerignore`](file:///c:/Users/USER/kings-taxi/.dockerignore)  
   Root build context ignore file ensuring sensitive secrets (`.env*`, `*.key`, `*.pem`, `id_*`), `.git`, `node_modules`, build outputs (`dist`, `.expo`), and mobile source code (`apps/passenger-mobile/src`, `apps/passenger-mobile/app`) never enter the Docker build context, while preserving root manifests, `backend/` source, `shared/` domain types, and Prisma migrations.
2. [`backend/start-with-tunnel.sh`](file:///c:/Users/USER/kings-taxi/backend/start-with-tunnel.sh)  
   Hardened production startup supervisor script (POSIX/bash, LF line endings) with exit-status preservation, child process reaping, bounded SSH reconnection with process cleanup, strict database username enforcement (`kings_taxi_dev_user`), and root secret staging with non-root privilege dropping via `su-exec node`.
3. [`backend/src/config/database-isolation.ts`](file:///c:/Users/USER/kings-taxi/backend/src/config/database-isolation.ts)  
   Application-level startup isolation safeguard enforcing strict PostgreSQL protocol, host `127.0.0.1`, port `15433`, database `kings_taxi_dev`, and mandatory account `kings_taxi_dev_user`. Unconditionally blocks access to the production database `kings_taxi` and redacts credentials from all diagnostics.
4. [`backend/tests/unit/database-isolation.test.ts`](file:///c:/Users/USER/kings-taxi/backend/tests/unit/database-isolation.test.ts)  
   11 comprehensive unit tests verifying strict username enforcement, missing/incorrect username rejection, production database lockout, wrong host/port rejection, development mode compatibility, and URL-encoded credential handling.
5. [`deployment/render/known_hosts.example`](file:///c:/Users/USER/kings-taxi/deployment/render/known_hosts.example)  
   Reference file containing the verified ED25519 public host key for VPS `196.188.250.186`.

### Files Modified
1. [`backend/Dockerfile`](file:///c:/Users/USER/kings-taxi/backend/Dockerfile)  
   Multi-stage build (`node:22-alpine`). Removed `--include-workspace-root` from `npm ci` in `prod-deps` and `builder` to eliminate root mobile dependencies. Installed `su-exec` alongside `openssl`, `libc6-compat`, `dumb-init`, `openssh-client`, `bash`, and `netcat-openbsd`. Configured Docker health check against `/api/v1/health/live`.
2. [`backend/src/config/env.ts`](file:///c:/Users/USER/kings-taxi/backend/src/config/env.ts)  
   Integrated `validateDatabaseIsolationAtStartup` and added optional Render/SSH environment keys.
3. [`backend/src/config/database.ts`](file:///c:/Users/USER/kings-taxi/backend/src/config/database.ts)  
   Recognized port `15433` alongside `5433` as a dev/tunnel connection.
4. [`backend/src/server.ts`](file:///c:/Users/USER/kings-taxi/backend/src/server.ts)  
   Bound HTTP server explicitly to host `'0.0.0.0'`.

---

## 2. Updated SSH Lifecycle Behavior

### Exit-Status Preservation & Child Reaping
- **Original Bug:** The initial `cleanup()` handler ended with `exit 0`, which converted failed startups and backend crashes into successful zero exits.
- **Correction:**
  - Added explicit `EXIT_CODE` tracking across all failure paths.
  - In `cleanup()`, captured the exit code (`final_status=$?`).
  - Preserved standard signal exit codes: `SIGTERM` $\rightarrow 143$ (`128 + 15`), `SIGINT` $\rightarrow 130$ (`128 + 2`).
  - Explicit non-zero error exits (`exit 1`) are strictly preserved.
  - Reaped child processes using `wait "$PID"` so no zombie processes remain.
  - Re-entrancy guard (`IS_CLEANING_UP=1`) prevents recursive trap loops.

### SSH Reconnection Logic
- **Original Bug:** If an SSH process hung or failed to establish local forwarding, it could remain alive and block subsequent reconnection attempts.
- **Correction:**
  - Added dedicated `stop_ssh_tunnel()` function: issues `SIGTERM`, waits up to 5s, falls back to `SIGKILL` if unresponsive, and reaps the process via `wait`.
  - In `wait_for_tunnel()`, if the tunnel times out (30s) or the SSH process terminates prematurely, `stop_ssh_tunnel()` is automatically invoked to kill and reap the failed SSH process before returning failure.
  - In `start_ssh_tunnel()`, `stop_ssh_tunnel()` is called defensively prior to spawning a new SSH process, ensuring multiple SSH processes never compete for local port `15433`.
  - In the supervisor monitor loop, bounded retries (`RECONNECT_MAX_ATTEMPTS=5` with `RECONNECT_INTERVAL_SECONDS=3`) manage disconnects. Successful reconnects reset the counter to 0. If retries are exhausted, the supervisor gracefully terminates Node and exits with code 1.

---

## 3. Database Isolation Test Results

The Render deployment connects exclusively to `kings_taxi_dev` on the VPS via `127.0.0.1:15433`. Access to `kings_taxi` (production) is strictly blocked.

### Strict Production Enforcement Rules:
1. **Protocol:** `postgresql:` or `postgres:`
2. **Host:** Strictly `127.0.0.1`
3. **Port:** Strictly `15433`
4. **Database:** Strictly `kings_taxi_dev`
5. **Database Username:** Strictly `kings_taxi_dev_user` (missing or incorrect usernames fail immediately)
6. **Production Database Lockout:** `kings_taxi` is rejected in all contexts.
7. **Credential Redaction:** Passwords and tokens are never printed in logs or errors.

### Vitest Unit Test Results (`backend/tests/unit/database-isolation.test.ts`):
- `✓ 1. accepts valid Render development database URL with correct username in strict mode`
- `✓ 2. rejects incorrect database username in strict production mode`
- `✓ 3. rejects missing database username in strict production mode`
- `✓ 4. strictly blocks connection to production database kings_taxi (in both strict and non-strict modes)`
- `✓ 5. rejects host other than 127.0.0.1 in strict mode`
- `✓ 6. rejects port other than 15433 in strict mode`
- `✓ 7. accepts correct development database configuration in non-strict mode (port 5433)`
- `✓ 8. handles URL-encoded credentials and special characters without exposing password`
- `✓ 9. rejects database names other than kings_taxi_dev`
- `✓ 10. rejects non-PostgreSQL protocols`
- `✓ 11. rejects empty or missing DATABASE_URL`
- **Result:** **11 passed, 0 failed (100% pass rate)**.

---

## 4. Docker Dependency Analysis

### Elimination of Root Mobile Dependencies:
- **Observation:** Root `package.json` contains mobile packages:
  `@react-native-async-storage/async-storage`, `expo-localization`, `react-native-svg`.
- **Root Cause of Bloat:** The previous Dockerfile passed `--include-workspace-root` to `npm ci`.
- **Correction:** Removed `--include-workspace-root` from both `prod-deps` and `builder` stages:
  ```dockerfile
  RUN npm ci --omit=dev --workspace=@kings-taxi/backend --workspace=@kings-taxi/shared --ignore-scripts
  ```
- **Outcome:**
  - npm workspace resolution is preserved using the authoritative root `package-lock.json`.
  - Mobile packages and Expo dependencies are completely excluded from `node_modules` in the production runner.
  - Production `node_modules` contains only backend dependencies (`@prisma/client`, `express`, `pino`, `helmet`, `jsonwebtoken`, `nodemailer`, `cloudinary`, `zod`, etc.) and shared domain types.

---

## 5. Secret-File Permission Strategy

### Handling Render Secret Mount Permissions:
- **Challenge:** Render mounts Secret Files in `/etc/secrets/` as `root:root` with mode `0400` or `0444`. If the container process starts as unprivileged user `node`, it cannot read files with mode `0400 root:root`.
- **Implemented Solution:**
  1. The container entrypoint starts with root filesystem access for secret staging.
  2. If running as root (UID 0), `start-with-tunnel.sh`:
     - Verifies `SSH_KEY_PATH` and `SSH_KNOWN_HOSTS_PATH` exist and are non-empty.
     - Copies secrets to `/home/node/.ssh/id_render_tunnel` (mode `0600`) and `/home/node/.ssh/known_hosts` (mode `0644`).
     - Changes ownership of `/home/node/.ssh` and `/app/backend/public` to `node:node`.
     - Uses `su-exec node "$0" "$@"` to drop privileges to non-root user `node` (UID 1000).
  3. If started directly as non-root user `node`, the script verifies readable secret files, installs them with `0600`/`0644`, or confirms they are already staged.
  4. All subsequent application processes (SSH tunnel, Express backend, Node runtime) run strictly as `node`. No application code executes as root.

---

## 6. Runtime Asset Analysis

1. **Static Media Uploads (`backend/public/uploads`):**
   - In `backend/src/app.ts`, local file uploads use `public/uploads` (or `backend/public/uploads`).
   - The directory `/app/backend/public/uploads` is created during Docker build and ownership assigned to `node:node`.
   - In production, passenger profile images use Cloudinary for persistent cloud storage. If local uploads are used, a Render Persistent Disk can be mounted at `/app/backend/public/uploads`.
2. **Prisma Engine & Schema (`backend/prisma`):**
   - The runner stage copies `/app/backend/prisma` and generated `@prisma/client` + `.prisma/client` engines.
   - Alpine compatibility libraries (`openssl`, `libc6-compat`) are installed in the runner stage.
3. **No Missing Runtime Dependencies:**
   - Compiled JavaScript is in `/app/backend/dist`.
   - Node process supervisor `dumb-init` runs as PID 1.

---

## 7. Build and Validation Summary

| Check | Tool / Command | Result |
| :--- | :--- | :---: |
| Bash Script Syntax | `bash -n backend/start-with-tunnel.sh` | **PASS (0 errors)** |
| Line Endings Audit | PowerShell Regex (`\r\n`) | **PASS (LF only)** |
| Exit Status Preservation | `bash -c "./backend/start-with-tunnel.sh"` (startup failure) | **PASS (exit code 1)** |
| Database Isolation Tests | `npx vitest run tests/unit/database-isolation.test.ts` | **PASS (11/11 passed)** |
| Backend TypeScript Build | `npm run build --prefix backend` | **PASS (exit code 0)** |
| Prisma Schema Validation | `npx prisma validate --schema=backend/prisma/schema.prisma` | **PASS (valid 🚀)** |
| Workspace Installation | `npm ci --workspace=@kings-taxi/backend --omit=dev` | **PASS (clean install)** |
| Git Formatting & Whitespace | `git diff --check` | **PASS (0 whitespace errors)** |

### Limitations Documented
- **Local Docker CLI:** Docker CLI is not installed on the local Windows development machine (`docker: CommandNotFoundException`). Full static Dockerfile linting, multi-stage instruction validation, and workspace path audits were performed.
- **VPS Network Connection During Build:** Connecting to the VPS during build is prohibited and was not attempted.

---

## 8. Remaining Manual Steps for Render Deployment

1. Commit and push the updated deployment files to the repository.
2. In the Render Dashboard, create a new **Web Service** using **Docker**:
   - Context: `.` (repo root)
   - Dockerfile: `backend/Dockerfile`
3. In **Environment $\rightarrow$ Secret Files**:
   - `kings_render_tunnel`: Paste private key for `kings-render-tunnel`.
   - `kings_render_known_hosts`: Paste verified entry for `196.188.250.186` from [`deployment/render/known_hosts.example`](file:///c:/Users/USER/kings-taxi/deployment/render/known_hosts.example).
4. In **Environment Variables**:
   - `DATABASE_URL`: `postgresql://kings_taxi_dev_user:<PASSWORD>@127.0.0.1:15433/kings_taxi_dev?schema=public&sslmode=disable`
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `API_PREFIX`, etc.
5. In **Health Check**:
   - Path: `/api/v1/health/live`
6. Deploy and monitor logs:
   - Check tunnel readiness: `[SSH Tunnel] Local port 127.0.0.1:15433 is UP and accepting PostgreSQL traffic.`
   - Check backend startup: `🚀 Kings Taxi Central Backend listening on 0.0.0.0:<PORT>`.
