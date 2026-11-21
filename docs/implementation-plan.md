# Implementation Plan — Discovery-to-Commerce Platform MVP

**Date:** 2026-11-06  
**Repository Audit Status:** Greenfield repository (`/home/user` contained only uploaded source specifications).  
**Source Documents:** `PRD_Discovery_to_Commerce_MVP.md` (v1.0), `SRS_Discovery_to_Commerce_MVP.md` (v1.0), `MVP_BUILD_PROMPT.md`.

---

## 1. Phase 0 Audit Findings

1. **Repository State:** Greenfield workspace. No pre-existing application code, database schema, package manifest, or test suite existed prior to initialization.
2. **Runtime & Infrastructure:**
   - Node.js `v20.20.2`, `npm 10.8.2`, PostgreSQL `17.11` available locally.
   - Selected stack aligns with the SRS Section 2.4 greenfield reference baseline:
     - **Web & API:** Next.js App Router + React + Strict TypeScript.
     - **Database & Migrations:** PostgreSQL 17 + Drizzle ORM (`drizzle-orm` + `pg` + `drizzle-kit`) with version-controlled SQL migrations (`drizzle/migrations/`).
     - **Authentication:** Database-backed revocable sessions signed with `jose` + Argon2id password hashing (`@node-rs/argon2`), secure `HttpOnly` cookies, and hashed single-use password-reset tokens.
     - **Validation:** Shared and server-enforced `zod` schemas.
     - **UI & Styling:** Tailwind CSS + accessible semantic components, mobile-first layouts (360px+ to desktop), skeleton loading states, confirmation modals, and toast feedback.
     - **Testing:** Vitest (unit, service/integration, security, and concurrency tests against an isolated PostgreSQL test database `d2c_mvp_test`) + Playwright (browser E2E and mobile viewport verification).
3. **Non-Negotiable Scope Enforcement:**
   - Zero payment processing, checkout, wallets, payouts, commissions, bookings, POS integrations, native apps, video hosting, comments, messaging, AI ranking, or public star ratings/reviews.
   - All metrics strictly represent platform activity (`views`, `CTA clicks`, `saves`, `claims`, `verified redemptions`) and are explicitly distinguished from completed sales or revenue.

---

## 2. Vertical Slice Milestones

### Milestone 1 — Foundation & Identity
- Initialize Next.js TypeScript project, Tailwind CSS, Drizzle ORM, PostgreSQL schema & SQL migrations, environment startup validation (`src/lib/env.ts`), structured logger (redacting credentials, tokens, and claim codes), and rate limiter.
- Implement `users`, `sessions`, `password_reset_tokens`, `role_grants`, `creator_profiles`, `businesses`, `business_memberships`, `audit_logs`.
- Implement registration (customer-only grant), login, logout, session invalidation on password reset or suspension, and password recovery adapter (dev outbox log/store when SMTP is unconfigured).
- Implement Creator and Business access application flows and Admin approval/rejection with persisted reasons and audit entries.
- Implement server-side RBAC and resource ownership guards (`src/server/permissions/`).
- Deliver responsive shared navigation and role-aware workspace switcher.

### Milestone 2 — Public Discovery & Profiles
- Build `/` Discovery Home featuring deterministic transparent sections from the concept deck: *For You (Featured Published)*, *Local Picks*, *Creator Favourites*, *New Experiences (Newest)*, *Popular (Top Engaged)*, *Nearby (City/Area Filter)*, plus a *Following* filter for signed-in customers.
- Build `/search` with keyword search (recommendations, businesses, categories), category/city/area filters, deterministic sorting, and bounded pagination.
- Build public detail pages: `/recommendations/[id]`, `/creators/[handle]`, `/businesses/[slug]`, `/offers/[id]`.
- Enforce strict DTO projection so drafts, pending/rejected/hidden items, suspended accounts, and private fields never leak publicly.

### Milestone 3 — Creator Recommendations
- Build `/creator/dashboard`, `/creator/recommendations`, `/creator/recommendations/new`, `/creator/recommendations/[id]/edit`.
- Support full lifecycle (`DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `REJECTED`, `UNPUBLISHED`, `ARCHIVED`, `HIDDEN`), image upload validation, optional business link, and optional active offer link.
- Implement deduplicated/rate-limited `RECOMMENDATION_VIEW` and `RECOMMENDATION_CTA_CLICK` event tracking.

### Milestone 4 — Business Profiles & Offers
- Build `/business/dashboard`, `/business/profile`, `/business/offers`, `/business/offers/new`, `/business/offers/[id]/edit`.
- Support offer lifecycle (`DRAFT`, `PENDING_REVIEW`, `ACTIVE`, `PAUSED`, `EXPIRED`, `REJECTED`, `ENDED`, `HIDDEN`), clear terms, eligibility, validity windows, total quota, per-customer limit, and redemption instructions.
- Enforce server-side business approval and ownership checks + admin moderation actions.

### Milestone 5 — Customer Actions, Claims & Atomic Redemptions
- Implement creator follow/unfollow and recommendation/offer save/unsave (`/saved`).
- Implement transaction-safe offer claiming (`POST /api/offers/[id]/claim`) with row-level `FOR UPDATE` locking, DB `CHECK` constraints, idempotency support, cryptographic random claim codes (storing only `code_hash` + `code_last4` in PostgreSQL), preserved terms snapshot, and honest claim-time recommendation/creator attribution.
- Build `/my-claims` showing active (`CLAIMED`), `REDEEMED`, and `EXPIRED` claims plus safe unredeemed code rotation if a customer loses their plaintext code.
- Build `/business/redemptions` and `POST /api/redemptions/verify` with atomic single-use conditional transition (`WHERE status = 'CLAIMED'`), business ownership enforcement, masked customer display, and rate limiting.

### Milestone 6 — Analytics, Reports & Admin Operations
- Build `/creator/analytics` and `/business/analytics` with date-range filtering, strict tenant isolation, and explicit non-sales metric definitions.
- Build content/profile reporting (`POST /api/reports`) with spam rate limiting and reporter anonymity.
- Build `/admin`, `/admin/applications`, `/admin/recommendations`, `/admin/offers`, `/admin/reports`, `/admin/users`, and `/admin/audit-log`.

### Milestone 7 — Hardening, Seed Data & Verification
- Add upload MIME/magic-byte/size validation and safe storage adapter (`local` + `s3`-ready interface).
- Add security headers, `/api/health` readiness check, development-only seed script (`scripts/seed.ts` guarded against `NODE_ENV=production`), full 22-scenario automated test matrix (Vitest + Playwright), and complete operational documentation.
