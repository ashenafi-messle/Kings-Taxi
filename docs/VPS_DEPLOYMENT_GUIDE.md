# Kings Taxi Central Backend — VPS Deployment & Operations Guide

## 1. Infrastructure Overview

The Kings Taxi Central Backend will be deployed on the existing **Zergaw VPS**:
- **Operating System**: Ubuntu 24.04 LTS
- **Resources**: 2 vCPU, 4 GB RAM
- **Existing Workloads**: Erkab Platform, PostgreSQL container, Nginx reverse proxy, Certbot SSL

> [!CRITICAL]
> **Coexistence Rule**: Kings Taxi **must coexist safely** with the active Erkab platform.
> - Never run `docker system prune -a`
> - Never run `docker compose down` on the Erkab project
> - Never restart or alter the Erkab application containers
> - Maintain separate database names, database users, and credentials

---

## 2. PostgreSQL Database Provisioning (Safe Coexistence)

Inspect the existing PostgreSQL instance on the VPS to obtain its container name and internal Docker network:
```bash
docker ps --filter "ancestor=postgres" --format "{{.ID}}: {{.Names}} ({{.Ports}})"
docker network ls
```

Create a dedicated database and role for Kings Taxi within the existing PostgreSQL server:
```bash
# Connect to the existing PostgreSQL container via psql
docker exec -it <existing_postgres_container> psql -U postgres

# Execute scoped database creation
CREATE ROLE kings_user WITH LOGIN PASSWORD 'USE_STRONG_GENERATED_PASSWORD_2026';
CREATE DATABASE kings_taxi_db OWNER kings_user;
GRANT ALL PRIVILEGES ON DATABASE kings_taxi_db TO kings_user;

# Connect to the new database and configure schema permissions
\c kings_taxi_db
GRANT ALL ON SCHEMA public TO kings_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kings_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO kings_user;
\q
```

---

## 3. Deployment Directory Structure on VPS

Prepare an isolated application directory on the VPS:
```text
/opt/kings-taxi/
├── .env
├── docker-compose.yml
├── nginx/
│   └── taxi-api.conf
└── backups/
```

---

## 4. Environment Variables (`/opt/kings-taxi/.env`)

```env
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1
LOG_LEVEL=info

# Internal PostgreSQL connection within Docker network
DATABASE_URL=postgresql://kings_user:USE_STRONG_GENERATED_PASSWORD_2026@<postgres_container_or_service_name>:5432/kings_taxi_db?schema=public

# Cryptographically generated 64-character JWT secrets
JWT_ACCESS_SECRET=replace_with_openssl_rand_hex_32
JWT_REFRESH_SECRET=replace_with_different_openssl_rand_hex_32

# CORS configuration
CORS_ORIGINS=https://taxi-api.erkabskill.com,https://api.kingstaxi.com

# External Docker network name where PostgreSQL container runs
VPS_DATABASE_NETWORK=<name_of_existing_postgres_network>
```

---

## 5. Nginx & SSL Configuration

1. Copy [`deployment/docker/nginx/conf.d/taxi-api.conf`](../deployment/docker/nginx/conf.d/taxi-api.conf) to `/etc/nginx/sites-available/taxi-api.conf`.
2. Create a symlink to enable the site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/taxi-api.conf /etc/nginx/sites-enabled/
   ```
3. Issue Let's Encrypt SSL certificate:
   ```bash
   sudo certbot certonly --webroot -w /var/www/certbot -d taxi-api.erkabskill.com
   ```
4. Verify Nginx configuration syntax:
   ```bash
   sudo nginx -t
   ```
5. Reload Nginx without interrupting Erkab virtual hosts:
   ```bash
   sudo systemctl reload nginx
   ```

---

## 6. Building and Starting Kings Taxi

From `/opt/kings-taxi`:
```bash
# Pull/clone latest code and build image
docker compose -p kings-taxi build

# Run database migrations
docker compose -p kings-taxi run --rm kings-taxi-backend npx prisma migrate deploy

# Start the backend container
docker compose -p kings-taxi up -d

# Verify container health
docker compose -p kings-taxi ps
curl -i https://taxi-api.erkabskill.com/api/v1/health/ready
```

---

## 7. Rollback Runbook

If a critical issue occurs during deployment:
1. Revert container image to previous tag:
   ```bash
   docker compose -p kings-taxi stop kings-taxi-backend
   docker tag kings-taxi-backend:previous kings-taxi-backend:latest
   docker compose -p kings-taxi up -d kings-taxi-backend
   ```
2. If database schema rollback is required:
   ```bash
   docker compose -p kings-taxi run --rm kings-taxi-backend npx prisma migrate resolve --rolled-back <migration_name>
   ```

---

## 8. Backup & Maintenance

Automated daily backup cron for Kings Taxi database:
```bash
#!/bin/bash
BACKUP_DIR="/opt/kings-taxi/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

docker exec <postgres_container> pg_dump -U kings_user kings_taxi_db | gzip > "$BACKUP_DIR/kings_taxi_db_$TIMESTAMP.sql.gz"

# Retain last 14 days of backups
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +14 -delete
```

