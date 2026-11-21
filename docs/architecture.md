# System Architecture

## 1. Architectural Style: Modular Monolith

Following SRS Section 4.1, Curio is structured as a **single deployable Next.js App Router modular monolith** backed by **PostgreSQL 17**. Domain logic lives strictly in server-side service modules (`src/server/services/*`) rather than inside UI components or thin route handlers, ensuring identical business-rule enforcement whether invoked from Server Components, REST Route Handlers, or integration tests.

```text
Browser / Mobile Client
   │
   ├── GET Pages (SSR Server Components: src/app/**/page.tsx)
   │      └── RBAC & Session Guards (src/server/permissions/rbac.ts)
   │             └── Domain Services (src/server/services/*.service.ts)
   │
   └── JSON Mutations & Queries (Route Handlers: src/app/api/**/route.ts)
          ├── CSRF Origin Verification + Rate Limiting
          ├── Zod v4 Input Validation (src/server/validation/schemas.ts)
          ├── RBAC & Ownership Checks (src/server/permissions/rbac.ts)
          └── Domain Services + Transactions + Audit Log
                 └── PostgreSQL 17 (Drizzle ORM: src/server/db/*)
```

---

## 2. Directory & Module Boundaries

| Path | Responsibility |
|---|---|
| `src/app/` | Next.js App Router pages, workspace layouts (`/creator`, `/business`, `/admin`), error/loading boundaries, and `/api/*` REST route handlers. |
| `src/components/` | Reusable accessible UI primitives (`ToastProvider`, `ConfirmDialog`, `StatusBadge`, `ImageUploader`, `ReportModal`) and discovery widgets (`RecommendationCard`, `OfferClaimWidget`, `FollowSaveButtons`, `EventTracker`). |
| `src/features/` | Role-specific interactive client views (`customer/`, `creators/`, `businesses/`, `moderation/`). |
| `src/server/auth/` | Database-backed opaque session management, cookie lifecycle, and CSRF Origin/Referer verification. |
| `src/server/permissions/` | Centralized `requireActor`, `requireApprovedCreator`, `requireApprovedBusiness`, and `requireAdmin` guards. |
| `src/server/services/` | Domain business rules: `auth`, `application`, `discovery`, `recommendation`, `offer`, `claim`, `engagement`, `analytics`, `moderation`, `media`, and `email`. |
| `src/server/audit/` | Append-only `recordAuditLog` writer with automatic secret redaction. |
| `src/server/db/` | Drizzle PostgreSQL connection pool and 17-table schema definition. |
| `src/lib/` | Validated environment config (`env.ts`), redacting structured logger (`logger.ts`), typed `AppError` (`errors.ts`), sliding-window rate limiter (`rate-limit.ts`), and `Asia/Kolkata` date formatting (`format.ts`). |

---

## 3. Pluggable Infrastructure Adapters

1. **Media Storage Adapter (`src/server/services/media.service.ts`):**
   - Validates declared MIME type (`image/jpeg`, `image/png`, `image/webp`), inspects binary magic bytes (`FF D8 FF`, `89 50 4E 47`, `RIFF....WEBP`), and enforces `UPLOAD_MAX_BYTES` (5 MB default).
   - Generates random UUID storage keys (never user-supplied filenames) and writes to `storage/uploads/` in local development (`STORAGE_DRIVER=LOCAL`), served safely via `/api/media/[key]` with `Content-Security-Policy: default-src 'none'` and `X-Content-Type-Options: nosniff`. The interface is S3/R2-ready for cloud object storage in production.
2. **Transactional Email Adapter (`src/server/services/email.service.ts`):**
   - Delivers password-recovery emails via a clean `EmailTransport` interface. In development/test (`NODE_ENV !== 'production'`), messages are written to a local outbox (`storage/dev-emails.jsonl`) without logging raw reset tokens to stdout.

---

## 4. Feed & Ranking Transparency

Curio intentionally avoids opaque engagement-maximizing ML ranking:
- **For You:** Chronological by `published_at DESC` (filterable by city, neighbourhood area, category, or followed creators).
- **Local Picks & Creator Favourites:** Explicit editorial curation flags (`is_local_pick`, `is_creator_favourite`) managed in the Admin Console and recorded in `audit_logs`.
- **Popular Experiences:** Deterministic count of deduplicated `product_events` over a 30-day window.
- **Nearby / New:** Deterministic neighbourhood/city filter + chronological ordering without collecting browser GPS coordinates.
