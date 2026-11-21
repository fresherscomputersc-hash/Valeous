# Deployment & Pilot Operations Runbook

## 1. Required Production Environment Variables

Configure all variables in `.env` (or platform secret manager) before starting the server:

| Variable | Required | Production Guidance |
|---|---|---|
| `NODE_ENV` | Yes | Set to `production`. |
| `DATABASE_URL` | Yes | PostgreSQL 15+ connection URI with TLS (`?sslmode=require` in cloud deployments). |
| `APP_URL` | Yes | Public HTTPS origin (e.g. `https://pilot.curio.example`). |
| `SESSION_SECRET` | Yes | Minimum 32 random bytes (`openssl rand -base64 48`). |
| `CLAIM_CODE_SECRET` | Yes | Minimum 32 random bytes, distinct from `SESSION_SECRET`. |
| `ALLOW_DEV_SEED` | No | **Must be `false` or omitted in production.** |
| `RECOMMENDATION_MODERATION_MODE` | No | `FIRST_POST_PREMODERATION` (recommended for pilot), `PRE_MODERATE_ALL`, or `POST_MODERATE`. |
| `OFFER_MODERATION_MODE` | No | `POST_MODERATE` or `PRE_MODERATE_ALL`. |
| `STORAGE_DRIVER` | No | `LOCAL` for single-node pilot with persistent volume on `UPLOAD_DIR`, or S3-compatible object storage adapter. |
| `CSP_FRAME_ANCESTORS` | No | `'none'` for standalone production domain (or explicit parent origin if embedded). |

---

## 2. Release & Migration Sequence

```bash
# 1. Install locked dependencies
npm ci

# 2. Apply SQL migrations to PostgreSQL
npm run db:migrate

# 3. Build optimized Next.js production bundle
npm run build

# 4. Start HTTP server (behind TLS reverse proxy)
npm run start -- -H 0.0.0.0 -p 3000
```

---

## 3. Health Checks & Monitoring

- **Readiness Endpoint:** `GET /api/health`
  - Executes `SELECT 1` against PostgreSQL and returns `200 OK` (`{"status":"ok","database":"connected"}`) or `503 Service Unavailable` (`{"status":"degraded","database":"unreachable"}`).
- **Structured Logs:** JSON logs are emitted to stdout/stderr via `src/lib/logger.ts` with automatic redaction of credentials, tokens, cookies, and claim codes.

---

## 4. Database Backup & Restore Runbook

- **Create Timestamped SQL Snapshot:**
  ```bash
  ./scripts/backup-db.sh
  # Writes storage/backups/backup-YYYYMMDDTHHMMSSZ.sql
  ```
- **Restore From Snapshot:**
  ```bash
  ./scripts/restore-db.sh storage/backups/backup-YYYYMMDDTHHMMSSZ.sql
  ```
- Schedule daily automated `pg_dump` snapshots to encrypted off-host storage before opening external pilot traffic, and test restore monthly into a staging database.

---

## 5. Pilot Bootstrap Checklist

1. Confirm `ALLOW_DEV_SEED` is `false` so no `[Demo]` fixtures exist in production.
2. Seed initial real taxonomy categories (`categories` table) and bootstrap the initial `ADMIN` user + `role_grants` row via an audited administrative SQL script.
3. Verify `GET /api/health` returns `200 OK` over HTTPS.
4. Walk through one real test creator onboarding, offer creation, claim, and counter verification before inviting external pilot merchants.
