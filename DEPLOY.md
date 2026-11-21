# Deploying VALUEOUS live

The app is a Next.js 15 server that needs **a writable filesystem**: it stores data in a
local SQLite file (`@libsql/client`) and saves uploaded images to disk.

That means:

| Platform | Works? | Notes |
| --- | --- | --- |
| Docker on a VPS / any container host with a volume | ✅ Yes | Recommended. Everything already wired up. |
| Render / Railway (Docker + persistent disk) | ✅ Yes | Attach a disk mounted at `/app/storage`. |
| Fly.io (volume at `/app/storage`) | ✅ Yes | Needs `fly.toml` + a volume. |
| Vercel | ⚠️ Only with changes | Needs Turso (remote libSQL) **and** real S3 uploads. The `s3` storage branch is currently a stub that only rewrites URLs and never uploads — so uploads would silently break. |
| Static hosts (Netlify, GH Pages, S3 website) | ❌ No | Needs a Node server + database. |

---

## Option A — Docker (recommended)

Everything needed is in the repo: `Dockerfile`, `.dockerignore`, `.env.example`.

### 1. Build the image

`NEXT_PUBLIC_*` values are **inlined at build time**, so pass them as build args:

```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_NAME="VALUEOUS" \
  --build-arg NEXT_PUBLIC_PILOT_LABEL="Customers x Creators x Businesses" \
  --build-arg NEXT_PUBLIC_DEFAULT_TIMEZONE="Asia/Kolkata" \
  --build-arg NEXT_PUBLIC_DEMO_MODE="true" \
  -t valueous:latest .
```

### 2. Create the environment file on the host

Copy `.env.example` to `.env` and set at minimum:

```env
NODE_ENV=production
APP_BASE_URL=https://your-domain.example
ALLOWED_ORIGINS=https://your-domain.example
DATABASE_FILE=file:/app/storage/d2c_mvp.sqlite
SESSION_SECRET=<openssl rand -hex 32>
CLAIM_CODE_SECRET=<openssl rand -hex 32>
CRON_SECRET=<openssl rand -hex 32>
COOKIE_PARTITIONED_PREVIEW=false
STORAGE_PROVIDER=local
EMAIL_PROVIDER=local
ALLOW_DEV_SEED=false
```

### 3. Run it

```bash
docker volume create valueous_storage

docker run -d --name valueous \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  -v valueous_storage:/app/storage \
  valueous:latest
```

The container runs `npm run db:migrate` automatically, then `npm start`.

### 4. Seed demo data (optional, one time)

```bash
docker exec -it valueous sh -c \
  "NODE_ENV=development ALLOW_DEV_SEED=true npm run db:seed"
```

Demo logins (password `DemoPass123!`):

- `customer@demo.local`
- `business.glow@demo.local`
- `influencer.ananya@demo.local`
- `admin@demo.local`

> Change or disable these before showing anything to real users.

### 5. HTTPS

Put Caddy / nginx / Traefik in front, or use Cloudflare Tunnel:

```bash
cloudflared tunnel --url http://localhost:3000
```

Set `APP_BASE_URL` and `ALLOWED_ORIGINS` to the final public origin and restart.

---

## Option B — Render / Railway

1. New **Web Service** → deploy from the repo using the `Dockerfile`.
2. Add a **persistent disk** mounted at `/app/storage` (1 GB is plenty for a demo).
3. Add env vars from `.env.example` (above). Set `APP_BASE_URL`/`ALLOWED_ORIGINS` to the
   generated `https://…` URL.
4. Health check path: `/api/health` (if absent, use `/`).

---

## Option C — Quick public demo link from a laptop

No account needed, dies when the machine sleeps — good for a same-day investor call:

```bash
npm run build
npm start                     # serves production build on :3000
cloudflared tunnel --url http://localhost:3000
```

Use the printed `https://*.trycloudflare.com` URL. Set `ALLOWED_ORIGINS` to that origin
and restart `npm start` so CORS/CSRF checks pass.

---

## Going to Vercel (not ready yet)

Two blockers must be solved first:

1. **Database** — replace the local file with Turso: set `DATABASE_URL`/`TURSO_AUTH_TOKEN`
   and make `src/server/db/index.ts` create the client from those instead of a file path.
2. **Uploads** — implement a real S3 `PutObject` in `src/server/services/media.service.ts`
   (today the `s3` branch only builds a URL and writes nothing).

Until both are done, a Vercel deploy will look fine and then lose all data and images.

---

## Post-deploy checklist

- [ ] `/` loads and shows seeded products
- [ ] Login works for all four demo roles
- [ ] Create a product → upload an image → image renders (proves the volume is writable)
- [ ] Generate a promo code, record a sale, request a payout (proves DB writes persist)
- [ ] Restart the container → data is still there (proves the volume is mounted)
- [ ] `SESSION_SECRET` and `CLAIM_CODE_SECRET` are real random values, not the placeholders
- [ ] `ALLOW_DEV_SEED=false` in production
- [ ] Demo credentials rotated or removed
