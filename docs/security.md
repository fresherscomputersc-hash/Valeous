# Security Controls & Threat Mitigations

This document maps Curio’s implemented security controls to SRS Section 5.2 and the OWASP ASVS baseline required by the MVP specification.

---

## 1. Authentication & Session Security

- **Password Hashing:** Argon2id (`@node-rs/argon2`, `memoryCost: 19456`, `timeCost: 2`, `parallelism: 1`). Plaintext passwords are never logged or persisted.
- **Opaque Revocable Sessions:** Login issues 32 bytes of CSPRNG entropy encoded as base64url. Only `SHA-256(token)` is persisted in `sessions.token_hash`. Cookies are `HttpOnly`, `Path=/`, `SameSite=Lax` (or `SameSite=None; Secure; Partitioned` when running inside HTTPS preview iframes).
- **Immediate Session Revocation:** Logging out revokes the current session; resetting a password or suspending an account (`moderateUserAccountStatus`) revokes **all** active sessions for that user immediately.
- **Non-Enumerating Password Recovery:** `POST /api/auth/forgot-password` returns an identical `{ accepted: true }` response whether or not the email exists. Reset tokens are 32-byte CSPRNG values hashed with SHA-256, expire in 30 minutes, and are single-use (`used_at`).

---

## 2. Authorization, Role Separation & IDOR Prevention

- **Least-Privilege Registration:** `POST /api/auth/register` grants **only** `CUSTOMER`, explicitly ignoring any `role` or `roles` properties in submitted JSON.
- **Admin Approval Gate:** `CREATOR` and `BUSINESS` roles require submitting an application (`PENDING`) and receiving explicit `ADMIN` approval. `ADMIN` can never be self-requested via public APIs.
- **Server-Side Ownership Enforcement:**
  - Creators can only edit, publish, unpublish, archive, or view analytics for recommendations where `creator_profile_id === actor.creatorProfile.id`.
  - Businesses can only edit/transition offers, view business analytics, or redeem codes belonging to businesses where the actor holds an `ACTIVE` `business_memberships` record on an `APPROVED` business.
  - Customers can only read or reissue claim codes where `offer_claims.customer_user_id === actor.user.id`.

---

## 3. Claim Code & Redemption Security

- **CSPRNG Non-Sequential Codes:** 12 characters drawn from a 32-symbol unambiguous alphabet (`23456789ABCDEFGHJKLMNPQRSTUVWXYZ` -> ~60 bits of entropy), formatted `XXXX-XXXX-XXXX`.
- **HMAC-SHA256 Storage:** Only `HMAC-SHA256(CLAIM_CODE_SECRET, normalizedCode)` (`code_hash`) and `code_last4` are stored in PostgreSQL. If customer device storage is cleared while a claim is still `CLAIMED` and unredeemed, `POST /api/me/claims/[id]` rotates `code_hash` to a newly generated code inside a transaction and logs `CLAIM_CODE_REISSUED`.
- **Zero Raw Code Leakage:** `sanitizeForLog` in `src/lib/logger.ts` automatically redacts any object key matching `password`, `token`, `secret`, `cookie`, `claimCode`, `redemptionCode`, or `rawCode`. Integration tests verify raw codes never appear in `offer_claims`, `audit_logs`, or `product_events`.
- **Minimal Counter Disclosure:** Wrong-business verification returns `403 WRONG_BUSINESS` without revealing customer PII or offer details. Validowning-business verification displays only a masked customer identifier (e.g. `Meera N.`).

---

## 4. CSRF, Rate Limiting, Uploads & Headers

- **CSRF Defense:** Mutating `/api/*` handlers verify `Origin` / `Referer` host alignment against `Host` / `X-Forwarded-Host` in addition to cookie protections.
- **Rate Limiting:** Sliding-window rate limiters protect `/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`, `/api/offers/[id]/claim`, `/api/redemptions/verify`, `/api/events`, `/api/uploads`, and `/api/reports`.
- **Safe Media Uploads:** Rejects SVG/HTML/executable uploads; verifies binary magic bytes for JPEG/PNG/WebP; enforces 5 MB size cap; stores under UUID keys outside `public/`; serves with `Content-Security-Policy: default-src 'none'` and `X-Content-Type-Options: nosniff`.
- **Append-Only Audit Trail:** Role decisions, content/offer moderation, curation changes, report resolutions, user suspensions, claims, and redemptions all write immutable rows to `audit_logs`.
