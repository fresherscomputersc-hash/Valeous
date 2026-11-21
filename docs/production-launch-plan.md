# PromoBridge — Website-Only Production Readiness Plan

A strictly technical, code-level plan to make the **PromoBridge web application itself** 100% ready for real production users—mapped directly to the pages, API routes, database tables, and services in this codebase.

---

## Phase 1: Strip Demo Mode & Harden Auth / Security (`src/app/(auth)`, `src/server/auth`)

1. **Remove / Gate Demo Login UI (`src/app/login/page.tsx`)**
   - Hide the `DEMO_ACCOUNTS` 1-click login panel completely unless `NEXT_PUBLIC_DEMO_MODE === 'true'`.
   - Fix open-redirect edge case on `nextPath`: validate `nextPath.startsWith('/') && !nextPath.startsWith('//')`.
2. **Email Verification Flow (New)**
   - Add `emailVerifiedAt` column on `users` + `email_verification_tokens` table in `src/server/db/schema.ts`.
   - Build `POST /api/auth/verify-email`, `POST /api/auth/resend-verification`, and `/verify-email` page.
   - Block unverified accounts from publishing products (`/api/products`) or requesting withdrawals (`/api/influencer/payouts`).
3. **Account Security & Session Management Page (`/settings/security`)**
   - Allow logged-in users to **change password** (`POST /api/auth/change-password`).
   - List active browser sessions from `sessions` table and add **"Sign out all other devices"**.
4. **Production Rate Limiting & Cleanup (`src/lib/rate-limit.ts`)**
   - Upgrade `src/lib/rate-limit.ts` from an in-memory `Map` (which resets on server restart) to **Redis / PostgreSQL-backed rate limiting**.
   - Add `GET /api/cron/housekeeping` (secured by `CRON_SECRET`) to purge expired `sessions` and `password_reset_tokens`.
5. **Production Headers (`next.config.mjs` & `.env`)**
   - Set `ALLOW_DEV_SEED="false"`, `COOKIE_PARTITIONED_PREVIEW="false"`, `CSP_FRAME_ANCESTORS="'none'"`, and add `Strict-Transport-Security` header for HTTPS.

---

## Phase 2: Production-Grade Promo Links, Sale Refunds & Anti-Duplicate Guards

Right now in `src/server/services/sales-wallet.service.ts`, logged sales immediately become withdrawable and cannot be edited, refunded, or deduplicated. Upgrade the website workflow:

1. **Shareable Tracked Promo Links (`GET /r/[code]`)**
   - Build `/r/[code]/route.ts` so influencers get **both** code `GLOW-ANANYA` **and** tracked link `yourdomain.com/r/GLOW-ANANYA`.
   - Log unique clicks (`promo_clicks` table) and redirect buyers straight to `product.externalProductUrl?discount=GLOW-ANANYA`.
   - Show **Clicks → Sales → Conversion Rate %** on both Influencer and Business dashboards.
2. **Duplicate Order Protection (`promo_sales`)**
   - Make `(business_id, order_reference)` **unique** in PostgreSQL so a business can never accidentally log Order `#1042` twice and pay double commission.
3. **Sale Return / Clearance Status (`PENDING_CLEARANCE -> CONFIRMED | REFUNDED`)**
   - Add `status` (`PENDING_CLEARANCE`, `CONFIRMED`, `REFUNDED`) and `clears_at` on `promo_sales`.
   - New sales enter **Pending Clearance** in the influencer’s wallet first; once the business clicks **Confirm Order Delivered** (or `clears_at` passes via cron), funds move to **Available Balance**.
   - Add a **Refund / Cancel Order** action on `/business/sales` (requiring a reason logged to `audit_logs`) for returned/cancelled buyer orders before payout.
4. **CSV Bulk Sale Import & Export (`/business/sales`)**
   - Add **Upload CSV (`order_reference, promo_code, quantity, sale_amount`)** with a validation preview table so businesses can upload 100+ orders in one click instead of typing one by one.
   - Add **Export CSV** on `/business/sales`, `/influencer/earnings`, and `/admin`.

---

## Phase 3: Brand Wallet, Online Payment Checkout & Automated Store Webhook

Right now the website credits influencer wallets without collecting funds from the Business first. Close the financial loop inside the website:

1. **Business Campaign Wallet Page (`/business/wallet`)**
   - Add `wallet_balance_paise` + `brand_wallet_transactions` table for `business_profiles`.
   - Integrate **Razorpay / Stripe Checkout** directly inside `/business/wallet` (`POST /api/business/wallet/topup` + HMAC-verified `POST /api/webhooks/payments`) so businesses deposit campaign budget online.
   - Deduct `(commission_amount_paise + platform_fee_paise)` from the business’s wallet when a promo sale is recorded; block/warn if balance is ₹0.
2. **Self-Serve Store Webhook Integration Page (`/business/integrations`)**
   - Give every business a unique **Webhook URL + HMAC Secret** right inside their dashboard (`POST /api/webhooks/orders/[businessWebhookKey]`).
   - Businesses on Shopify / WooCommerce / custom checkouts paste that URL once, and their store orders with promo codes automatically record on PromoBridge in real time.
3. **Hardened Influencer Payout Flow (`/influencer/earnings` & `/admin`)**
   - Enforce strict **UPI ID regex** (`^[a-zA-Z0-9._-]+@[a-zA-Z]{2,}$`), **IFSC validation** (`^[A-Z]{4}0[A-Z0-9]{6}$`), and a **minimum withdrawal amount** (e.g. ₹200).
   - Generate a printable/downloadable **Payout Receipt (`/influencer/earnings/receipts/[id]`)** showing date, amount, UPI/Bank destination, and UTR reference.

---

## Phase 4: In-App Notifications & Real Transactional Emails

Right now `src/server/services/email.service.ts` only handles password resets. Wire full event notifications inside the website:

1. **In-App Notification Bell (`Navbar.tsx` + `/api/notifications`)**
   - Add a `notifications` table (`user_id`, `type`, `title`, `body`, `href`, `read_at`, `created_at`) and an unread badge dropdown in `Navbar.tsx`.
2. **Real Email Provider (`Resend` / `Nodemailer SMTP` in `email.service.ts`)**
   - Send instant HTML emails + in-app notifications on 5 core website events:
     1. Influencer applies to a product → notify Business
     2. Business approves/rejects enrollment → notify Influencer with promo code
     3. Business logs/syncs a promo-code sale → notify Influencer (*"You earned ₹X!"*)
     4. Influencer requests a payout → notify Admin
     5. Admin marks payout Paid (with UTR) or Rejected → notify Influencer.

---

## Phase 5: Missing Website Pages, Pagination, Cloud Uploads & SEO

1. **Public Creator Profile Page (`/creators/[handle]`)**
   - Build `/creators/[handle]/page.tsx` (matching `/brands/[slug]`) so businesses reviewing applications on `/business/enrollments` can inspect an influencer’s bio, niche, follower stats, social links, and total completed campaigns.
2. **Real Pagination, Search & Date Filters Across All Tables**
   - Replace hardcoded `.limit(50)` queries with URL-synced pagination (`?page=1&status=...&from=...&to=...`) on:
     - `/` (Marketplace search, category filter, commission % sort, pagination)
     - `/business/sales` & `/business/enrollments`
     - `/influencer/earnings` (ledger + payouts)
     - `/admin` (search users, filter payouts, paginate audit logs).
3. **Cloud Image Upload Pipeline (`src/server/services/media.service.ts`)**
   - Switch local disk `storage/uploads` to **S3 / Cloudflare R2** storage so uploaded product images and avatars persist across container deployments, plus validate image dimensions and auto-compress to WebP.
4. **Essential Production Pages & SEO Metadata**
   - Build `/how-it-works`, `/pricing`, `/terms`, `/privacy`, and `/contact` pages (and link them in `Footer.tsx`).
   - Add `src/app/sitemap.ts`, `src/app/robots.ts`, and dynamic OpenGraph metadata on `/products/[slug]` and `/brands/[slug]` so shared campaign links preview cleanly on WhatsApp, Instagram, and X.

---

## Recommended Build Order (Inside This Repo)

| Sprint | Scope in Website | Key Outcome |
|---|---|---|
| **Sprint 1** | Phase 1 (Auth verification, hide demo login, `/settings/security`, security headers) | Safe for real user signups |
| **Sprint 2** | Phase 2 (`/r/[code]` click tracking, unique order refs, sale clearance/refunds, CSV import/export) | Zero duplicate/mistaken commissions + full analytics |
| **Sprint 3** | Phase 3 (`/business/wallet` online deposit, `/business/integrations` order webhook, payout receipts) | Automated money & order flow inside the site |
| **Sprint 4** | Phase 4 & 5 (Notification bell + emails, `/creators/[handle]`, pagination, S3 uploads, legal/SEO pages) | Complete, polished production web platform |
