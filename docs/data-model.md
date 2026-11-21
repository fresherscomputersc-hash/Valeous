# Data Model & State Machines

All persistent entities use UUID primary keys, `TIMESTAMPTZ` UTC timestamps, explicit foreign keys, check constraints, and composite indexes defined in `src/server/db/schema.ts` and migrated via `drizzle/migrations/0000_ambiguous_hobgoblin.sql`.

---

## 1. Core Tables (17 Tables)

1. **`users`** — Canonical identity (`id`, normalized `email` unique, `password_hash`, `display_name`, `status` [`ACTIVE` | `SUSPENDED`], timestamps).
2. **`sessions`** — Server-revocable sessions (`token_hash` unique SHA-256, `user_id`, `expires_at`, `revoked_at`, `ip_address`, `user_agent`).
3. **`password_reset_tokens`** — Single-use recovery tokens (`token_hash` unique SHA-256, `user_id`, `expires_at`, `used_at`).
4. **`role_grants`** — Role assignments (`CUSTOMER`, `CREATOR`, `BUSINESS`, `ADMIN`) with status (`PENDING`, `APPROVED`, `REJECTED`, `REVOKED`), `decided_by_user_id`, and `decision_reason`. Unique `(user_id, role)`.
5. **`creator_profiles`** — 1:1 with `users` (`handle` unique, `display_name`, `bio`, `city`, `area`, `status` [`PENDING` | `APPROVED` | `REJECTED` | `SUSPENDED`], `has_published_approved`, `decision_reason`).
6. **`categories`** — Admin-curated discovery taxonomy (`name`, `slug` unique, `type`, `is_active`).
7. **`businesses`** — Business profiles (`owner_user_id`, `name`, `slug` unique, `category_id`, `description`, `address_text`, `city`, `area`, `status` [`PENDING` | `APPROVED` | `REJECTED` | `SUSPENDED`], `decision_reason`).
8. **`business_memberships`** — Operator authorization (`business_id`, `user_id`, `role` [`OWNER` | `STAFF`], `status`). Unique `(business_id, user_id)`.
9. **`offers`** — Merchant promotional offers (`business_id`, `title`, `description`, `terms`, `eligibility_text`, `offer_type`, `starts_at`, `ends_at`, `total_claim_limit`, `claimed_count`, `per_customer_limit`, `redemption_instructions`, `status`). Check constraints enforce `ends_at > starts_at`, `per_customer_limit >= 1`, and `claimed_count <= total_claim_limit` (when bounded).
10. **`recommendations`** — Structured creator posts (`creator_profile_id`, optional `business_id`, optional `offer_id`, `category_id`, `title`, `slug`, `description`, `city`, `area`, `is_local_pick`, `is_creator_favourite`, `status`, `published_at`).
11. **`offer_claims`** — Customer claim records (`offer_id`, `customer_user_id`, `code_hash` unique HMAC-SHA256, `code_last4`, `status` [`CLAIMED` | `REDEEMED` | `EXPIRED` | `CANCELLED`], `claimed_at`, `expires_at`, `redeemed_at`, `redeemed_by_user_id`, immutable `source_recommendation_id` & `source_creator_profile_id`, `idempotency_key`, snapshots of `offer_title` / `terms` / `redemption_instructions`).
12. **`follows`** — Customer -> Creator follows. Unique `(follower_user_id, creator_profile_id)`.
13. **`saved_items`** — Customer polymorphic saves (`item_type` [`RECOMMENDATION` | `OFFER` | `BUSINESS`], `item_id`). Unique `(user_id, item_type, item_id)`.
14. **`product_events`** — Analytics telemetry (`RECOMMENDATION_VIEW`, `RECOMMENDATION_CTA_CLICK`, `BUSINESS_PROFILE_VIEW`, `OFFER_VIEW`, `SAVE_CREATED`, `CREATOR_FOLLOWED`, `OFFER_CLAIMED`, `OFFER_REDEEMED`) with `dedupe_key` unique index for 15-minute window deduplication.
15. **`content_reports`** — Moderation queue (`reporter_user_id`, `target_type`, `target_id`, `reason_code`, `status` [`OPEN` | `IN_REVIEW` | `RESOLVED` | `DISMISSED`], `resolved_by_user_id`, `resolution_note`).
16. **`media_assets`** — Validated image upload metadata (`owner_user_id`, `storage_key` unique, `mime_type`, `size_bytes`, `alt_text`).
17. **`audit_logs`** — Append-only security & moderation log (`actor_user_id`, `action`, `target_type`, `target_id`, `reason`, sanitized `metadata`, `created_at`).

---

## 2. Lifecycle State Machines

- **Recommendation:** `DRAFT -> PENDING_REVIEW (first post) | PUBLISHED -> UNPUBLISHED | ARCHIVED | HIDDEN (admin) | REJECTED (admin)`. Only `PUBLISHED` items on `APPROVED` creators with `ACTIVE` user accounts are visible publicly.
- **Offer:** `DRAFT -> PENDING_REVIEW | ACTIVE -> PAUSED <-> ACTIVE -> ENDED | EXPIRED | REJECTED (admin)`. Only `ACTIVE` offers on `APPROVED` businesses within `[starts_at, ends_at)` with remaining quota are claimable.
- **Offer Claim:** `CLAIMED -> REDEEMED | EXPIRED | CANCELLED`.

---

## 3. Concurrency & Attribution Invariants

- **Quota-Safe Claiming (`claimOffer`):** Locks the `offers` row via `SELECT ... FOR UPDATE` inside a PostgreSQL transaction, verifies status, window, `claimed_count < total_claim_limit`, and customer active/redeemed claim count `< per_customer_limit`, increments `claimed_count`, and inserts the hashed `offer_claims` row atomically. Verified under 12-way parallel race tests.
- **Single-Use Redemption (`verifyAndRedeemCode`):** Executes a conditional atomic update `UPDATE offer_claims SET status = 'REDEEMED', redeemed_at = NOW(), redeemed_by_user_id = $actor WHERE id = $id AND status = 'CLAIMED' AND expires_at > NOW() RETURNING id`. Concurrent requests racing on the same code receive `0` updated rows and fail deterministically with `409 ALREADY_REDEEMED`. Verified under 10-way parallel race tests.
- **Immutable Honest Attribution:** `source_recommendation_id` and `source_creator_profile_id` are recorded only at claim time when the provided recommendation is `PUBLISHED` and genuinely linked to that offer/business. Direct claims from `/offers/[id]` or `/businesses/[slug]` leave attribution `NULL`.
