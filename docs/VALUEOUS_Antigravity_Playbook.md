# VALUEOUS — Antigravity Start-to-Finish Execution Playbook

**Team:** Subham (Tech Admin & Backend), Arpita (Frontend & UI/UX), Biswas (QA, CI/Docker & Security)

**Target:** Dec 15, 2026 Closed Beta (`VLS-101`–`VLS-310`) → Dec 29 Commercial Launch (`VLS-401`–`VLS-406`) → Phase 2 (`VLS-501`–`VLS-510`) → Phase 3 (`VLS-601`–`VLS-608`).

## 1. What to Submit / Attach Inside Antigravity

Before starting any ticket in Antigravity, attach these files to your Antigravity workspace/context:

1. **`.antigravityrules`** (placed at the root of `Valeous-main` so every agent turn obeys stack, ledger, and UI rules).

2. **`VALUEOUS_Technical_Blueprint_and_Official_Development_Handover.pdf`** (`VLS-TBP-2026-001` — source of truth for schemas, state machines, and screens).

3. **`src/server/db/schema.ts`** (current database schema).

4. **`docs/openapi-v1.yaml`** (published by Subham in Sprint 1 — mandatory for Arpita & Biswas).

5. **The exact Jira Ticket row** from `VALUEOUS - Sprint Jira & 3-Person Task Tracker` (Ticket ID, Repo Path, Acceptance Criteria).

## 2. Zero-to-One Setup (All Members)

1. **Prerequisites:** Install **Node.js 22 LTS**, **Docker Desktop**, **Git**, and **Google Antigravity**.

2. **Clone & Branch:**

   ```
   git clone <owner-org-repo-url> Valeous-main && cd Valeous-main
   cp .env.example .env
   npm install
   
   ```

3. **Start Local PostgreSQL 17 + Redis 7 (after Biswas merges `VLS-102`):**

   ```
   docker compose up -d
   npm run db:migrate && npm run db:seed
   npm run dev
   
   ```

4. **Daily Antigravity Loop:**

   * Pull `main` → create branch `git checkout -b feat/vls-<id>-<slug>`

   * Give Antigravity **one ticket at a time** with the prompt templates below.

   * Verify in terminal: `npm run typecheck && npm run lint && npm test && npm run build`.

   * Push & open PR for Subham's Tech Admin review.

## 3. Member 1: Subham (Tech Admin & Backend Lead)

**Owns:** `src/server/*`, `src/workers/*`, `src/app/api/*`, PG17 Schema, Booking, Ledger, `PaymentProvider`, PR merges.

### Antigravity Prompt Template (Subham)

> "Working on Jira ticket `[VLS-XXX]` on branch `feat/vls-XXX`. Read `.antigravityrules` and `src/server/db/schema.ts`. Implement `[task description]` in `[target file paths]`. Requirements: use PostgreSQL 17 `pgTable`, `bigint` paise, UTC `timestamptz`, Zod boundary validation, and `recordAuditLog`. Do NOT touch UI files in `src/app/` (non-API) or `src/components/`. After editing, run `npm run typecheck` and `npm test`."

### Start-to-Finish Build Order

* **Sprint 1 (26 Nov–2 Dec):** `VLS-103` (SQLite → PG17 Drizzle) → `VLS-104` (5 reserved `pc_*` tables behind `product_commerce_enabled=false`) → `VLS-105` (normalize `customerProfiles.preferences`) → `VLS-106` (Phone OTP + TOTP MFA + Org/Branch RBAC) → `VLS-107` (`PaymentProvider` + `MockPaymentProvider`) → `VLS-110` (BullMQ worker) → `VLS-112` (`docs/openapi-v1.yaml`).

* **Sprint 2 (3–9 Dec):** `VLS-201` (Business KYC + branches/staff) → `VLS-202` (Services/Events + Availability `CHECK reserved+confirmed<=capacity`) → `VLS-203` (5-min Holds + BullMQ expiry) → `VLS-204` (12-state Booking Engine + `booking_events`) → `VLS-205` (Insert-only Double-Entry Ledger + DB trigger + reconciliation) → `VLS-206` (Single-use QR tokens + Refunds).

* **Sprint 3 (10–15 Dec):** `VLS-301` (5k Creator verification + Content Studio `proof_type`) → `VLS-302` (10-stage Campaigns + attribution/self-referral) → `VLS-303` (Need-to-Offer + IST Value Passport) → `VLS-304` (Masked Admin + four-eyes payouts) → `VLS-310` (Staging Beta deploy).

* **Post-Dec 15 → Phase 3:** `VLS-401`–`403` (Razorpay/Cashfree, Offline QR sync, FCM/DLT SMS, isolated AI) → `VLS-501`–`504`, `507` (Collective Unlock, Experience Splits, Voice Bridge, Mobile APIs) → `VLS-601`–`604`, `608` (Product Commerce).

## 4. Member 2: Arpita (Frontend & UI/UX Lead — Direct Next.js + Tailwind)

**Owns:** `tailwind.config.ts`, `src/components/*`, `src/features/*`, `/customer/*`, `/business/*`, `/creator/*`, `/admin/*`, Phase 2 React Native.

### Antigravity Prompt Template (Arpita)

> "Working on Jira ticket `[VLS-XXX]` on branch `feat/vls-XXX`. Read `.antigravityrules`, `tailwind.config.ts`, and `docs/openapi-v1.yaml`. Build `[screen/component]` directly in Next.js 15 App Router + Tailwind CSS matching Blueprint Ch. 5–7. Use `#2B68C4` primary, `#84BE82` creator, `#183056` business, 100ms skeletons, 44px touch targets, and 'Creator' copy (never 'Influencer'). Do NOT modify `src/server/db/` or `src/server/services/`. Run `npm run typecheck`, `npm run lint`, and `npm run build`."

### Start-to-Finish Build Order

* **Sprint 1 (26 Nov–2 Dec):** `VLS-108` (Update Tailwind palette + rename Influencer → Creator) → `VLS-109` (Auth, OTP, TOTP MFA, Account Lockout screens).

* **Sprint 2 (3–9 Dec):** `VLS-207` (Customer Home/Explore/Search map+list + Service Detail with price/inclusions/policy) → `VLS-208` (Business KYC Wizard + Branch/Staff + Availability Calendar) → `VLS-209` (Checkout + 5-min countdown + Mock Checkout simulator + QR Pass + Refund UI + 14 edge-case states).

* **Sprint 3 (10–15 Dec):** `VLS-305` (Creator Onboarding, Content Studio with `proof_type` badge, Campaigns, Referral/QR, Earnings) → `VLS-306` (Need-to-Offer + Value Passport wallet) → `VLS-307` (Admin masked views, moderation queue, four-eyes payout UI).

* **Phase 2 → Phase 3:** `VLS-505`–`506` (Collective Unlock, MapLibre Itinerary Builder, Voice Bridge, React Native Customer & Scanner apps) → `VLS-605` (Product variants, Cart, Orders, Returns UI).

## 5. Member 3: Biswas (QA, CI/CD, Docker & Security Lead)

**Owns:** `.github/workflows/*`, `docker-compose.yml`, `tests/*`, k6 load tests, axe a11y, OWASP ZAP, PITR restore, Ch. 26 Continuity Test.

### Antigravity Prompt Template (Biswas)

> "Working on Jira ticket `[VLS-XXX]` on branch `feat/vls-XXX`. Read `.antigravityrules` and Blueprint Ch. 20. Write automated tests in `[tests/...]` against real Testcontainers PostgreSQL 17 + Redis. Assert exact HTTP status codes, DB constraints, and ledger `SUM(Debits) == SUM(Credits)`. Do NOT weaken assertions to make tests pass—if an invariant fails, report a bug ticket to Subham. Run `npm test` and `npm run test:e2e`."

### Start-to-Finish Build Order

* **Sprint 1 (26 Nov–2 Dec):** `VLS-101` (Move repo to Owner GitHub org + MFA + branch protection) → `VLS-102` (`docker-compose.yml` PG17+Redis & `.github/workflows/ci.yml` with typecheck/lint/Vitest/SAST) → `VLS-111` (Switch `tests/setup.ts` to Testcontainers PG17 + Auth/RBAC matrix tests).

* **Sprint 2 (3–9 Dec):** `VLS-210` (Availability overlap/concurrency + Business E2E) → `VLS-211` (**Critical Scenarios 1–7**) → `VLS-212` (Ledger immutability DB tests + k6 checkout load scripts).

* **Sprint 3 (10–15 Dec):** `VLS-308` (**Critical Scenarios 8–14** + 90% money/booking coverage) → `VLS-309` (axe WCAG 2.2 AA + cross-browser Playwright regression).

* **Post-Dec 15 → Phase 3:** `VLS-404`, `406` (OWASP ZAP DAST, external pen-test, PG PITR restore drill, Ch. 26 Continuity Test) → `VLS-508`–`509` (Phase 2 & Mobile QA) → `VLS-606`–`607` (Commerce oversell & GST/OWASP audit).