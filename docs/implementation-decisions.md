# Implementation Decisions & Open Questions Log

**Date:** 2026-11-06  
**Purpose:** Record engineering decisions, configurable MVP defaults, and preserved founder uncertainties from PRD Sections 2.2, 2.3, 13 and SRS Section 13.

---

## 1. Preserved Product Uncertainties (Not Hard-Coded as Facts)

Per PRD Sections 2.2 and 13, the source presentation is at the idea/research stage. The application preserves the following as configurable settings rather than hard-coded business assumptions:

| Topic | MVP Default / Handling | Configuration Mechanism |
|---|---|---|
| Product / Brand Working Title | Working title `Curio` used purely as a UI placeholder label with an explicit pilot notice. | `NEXT_PUBLIC_APP_NAME` environment variable. |
| Launch City / Market & Areas | Stored strictly as database records (`city`, `area`), never hard-coded in query logic. Any city/area present in published records dynamically populates filters. | Database data + `NEXT_PUBLIC_DEFAULT_TIMEZONE` (`Asia/Kolkata` configurable default). |
| Categories | Stored in `categories` table (`slug`, `name`, `type`, `is_active`, `sort_order`), manageable in DB rather than enum constants. | `categories` database table. |
| Monetisation / Pricing / Sales | Zero pricing, currency, commission, checkout, or GMV logic implemented. UI explicitly states claims and redemptions are platform activity, not sales. | Non-goal enforced across UI and schema. |

---

## 2. Architecture & Technical Decisions

### D-01: ORM & Database Migration Strategy (`Drizzle ORM` + `PostgreSQL 17`)
- **Context:** SRS Section 2.4 specifies PostgreSQL with Prisma or an equivalent type-safe migration-backed ORM.
- **Decision:** Use **Drizzle ORM** (`drizzle-orm` + `node-postgres` + `drizzle-kit`) with SQL migrations stored in `drizzle/migrations/`.
- **Rationale:** Provides strict TypeScript inference, zero native binary memory overhead, first-class PostgreSQL `CHECK` constraints (`claimed_count <= total_claim_limit`, `ends_at > starts_at`), explicit `SELECT ... FOR UPDATE` row locking in transactions, and clean SQL migration files.

### D-02: Authentication & Session Management (`@node-rs/argon2` + `jose` + DB Sessions)
- **Context:** SRS Sections 5.1, 7.1, and 10.4 require modern password hashing (Argon2id/scrypt), `HttpOnly` cookies, single-use time-limited hashed reset tokens, and immediate session invalidation upon account suspension or password reset.
- **Decision:** Hash passwords with **Argon2id** (`@node-rs/argon2`), store SHA-256 hashed session tokens in a PostgreSQL `sessions` table, and sign cookie payloads with `jose` (`HS256`).
- **Cookie Policy:** `HttpOnly`, narrow `Path=/`. In standard HTTPS production, `SameSite=Lax; Secure`. When served behind an HTTPS cross-site preview proxy (`COOKIE_PARTITIONED_PREVIEW=true`), `SameSite=None; Secure; Partitioned` (CHIPS) is supported so browser preview iframes work seamlessly; on local HTTP (`localhost`), `SameSite=Lax` without `Secure` allows local E2E testing.

### D-03: Content Pre-Moderation vs. Post-Moderation Policy
- **Context:** SRS Section 5.4 recommends *"pre-moderate first publications; later allow approved creators to publish with post-moderation"*, while SRS 10.3 tests both admin approval of creator recommendations and approved business offer publication.
- **Decision:** Support configurable moderation policy via `RECOMMENDATION_MODERATION_MODE` (`FIRST_POST_PREMODERATION` default, `ALWAYS_PREMODERATE`, or `POST_MODERATE`) and `OFFER_MODERATION_MODE` (`POST_MODERATE` default for admin-approved businesses, with explicit `Submit for Review` -> `PENDING_REVIEW` also supported, or `ALWAYS_PREMODERATE`).
- **Rationale:** Ensures first-time creator publications go through `PENDING_REVIEW` -> Admin `PUBLISHED` while established creators and approved businesses can publish efficiently, and admins retain full `APPROVE`, `REJECT`, and `HIDE` authority over all items at all times.

### D-04: Claim-Code Generation, Hashing & Customer Recovery
- **Context:** SRS Sections 5.6 and 7.4 require cryptographically random non-sequential codes, storing only a hash in the database, never logging raw codes, and allowing customers to view claim status while keeping codes private.
- **Decision:**
  - Generate codes using Node `crypto.randomBytes(10)` encoded in unambiguous Crockford-style uppercase alphanumeric groups (`XXXX-XXXX-XXXX`, ~60+ bits of entropy).
  - Store **only** `HMAC-SHA256(CLAIM_CODE_SECRET, normalizedCode)` in `offer_claims.code_hash` plus `code_last4` for masked display. No plaintext or reversible code is stored in PostgreSQL or logs.
  - Return the plaintext code once on `POST /api/offers/[id]/claim` (and cache in browser `sessionStorage` for immediate navigation to `/my-claims`).
  - Provide an authenticated owner-only **"Reissue Code"** action (`POST /api/claims/[id]/reissue`) solely while a claim remains `CLAIMED` and unredeemed/unexpired, rotating `code_hash` atomically without consuming extra quota if a customer switches devices before visiting the business.

### D-05: Concurrency Control for Claims & Redemptions
- **Claims:** Executed inside `db.transaction()` using `SELECT ... FROM offers WHERE id = $1 FOR UPDATE`, checking offer status, business status, UTC validity window, `claimed_count < total_claim_limit`, and existing customer claims `< per_customer_limit`, backed by DB `CHECK` constraints (`claimed_count <= total_claim_limit`) and unique `(offer_id, customer_user_id, claim_ordinal)`.
- **Redemptions:** Executed inside `db.transaction()` using an atomic conditional `UPDATE offer_claims SET status = 'REDEEMED', redeemed_at = NOW(), redeemed_by_user_id = $actor WHERE id = $id AND status = 'CLAIMED' AND expires_at > NOW() RETURNING *` after verifying active business ownership. Concurrent requests deterministically yield exactly one `200 OK` and `409 ALREADY_REDEEMED` for all racing callers.

### D-06: Local Adapters for Email & Object Storage
- **Email (Password Recovery):** Uses an adapter (`src/server/services/email.service.ts`). In production, integrates via configurable webhook/SMTP transport; in local/test mode (`EMAIL_PROVIDER=local`), writes reset notifications to a protected local dev outbox (`storage/dev-emails.json` — redacting raw tokens in stdout logs while allowing deterministic local testing).
- **Media Uploads:** Uses a storage adapter (`src/server/services/media.service.ts`) validating file size (`<= 5 MB`), allowed MIME types (`image/jpeg`, `image/png`, `image/webp`), and binary magic bytes. Stores binaries outside the relational database (`storage/uploads/` in local dev served via `/api/media/[key]` with `X-Content-Type-Options: nosniff`; S3-compatible presigned/PUT configuration documented for production).

### D-07: Deterministic Discovery Sections (No ML Ranking)
- Per PRD FR-015 and SRS 4.1/5.3, homepage sections (*For You*, *Local Picks*, *Creator Favourites*, *New Experiences*, *Popular*, *Nearby*) are implemented as transparent, deterministic SQL queries (e.g., curated flags, newest `published_at`, deduplicated event counts, and selected city/area) with explicit UI explanations and zero ML claims.
