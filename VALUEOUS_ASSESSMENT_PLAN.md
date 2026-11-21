# VALUEOUS — Assessment vs PPT Guide & Build Plan

## Executive Summary

**Current codebase**: A functional **PromoBridge** marketplace (Business ↔ Influencer promo-code commissions) built on Next.js 15, Drizzle ORM, SQLite/PostgreSQL, Tailwind CSS.

**PPT Guide target**: **VALUEOUS** — a 3-role platform (Customer, Creator, Business) with **9 features** across discovery, offers, campaigns, collaboration, and post-purchase support.

**Alignment**: ~**45% feature overlap**. Current codebase implements the **Business ↔ Creator (Influencer)** commerce loop well but **missing the Customer role entirely** and most discovery/offer/campaign features.

---

## 1. Color Palette from PPT

Extracted from slide backgrounds/accent shapes:

| Role / Semantic | Hex | Usage in PPT |
|---|---|---|
| **Primary (Customer / Core Action)** | `#2B68C4` | Rounded rect fill, step 1/3/4 ovals, rectangles |
| **Secondary (Creator / Progress)** | `#84BE82` | Step 2 ovals, CREATOR badge, STAGE 2 rectangle |
| **Tertiary (Business / Depth)** | `#183056` | BUSINESS badge, STAGE 3 rectangle |
| **Dark Accent (Final slide role boxes)** | `#2D4366` | CUSTOMERS/CREATORS/BUSINESSES boxes on slide 28 |
| **Light Blue bg** | `#E8F0FC` | Customer sections, Need-to-Offer |
| **Light Green bg** | `#EDF6EB` | Creator sections, Collective Demand, Open Collab |
| **Light Grey-Blue bg** | `#F4F7FB` | Business sections, STAGE 3 |
| **Light Red/Orange bg** | `#FAF1F1` | AI MUST NOT DECIDE warning |
| **Warning Red** | `#C15B5B` | AI MUST NOT DECIDE rectangle |

> **Recommendation**: Replace current Tailwind `brand` (orange) with **Primary Blue `#2B68C4`** as `brand`. Add `creator` = `#84BE82`, `business` = `#183056`, `surface` variants for light backgrounds. Keep `ink` for text.

---

## 2. What's Achieved vs PPT Requirements

### PPT Build Stages (Slide 25)

| Stage | PPT Features | Current Status | Evidence |
|---|---|---|---|
| **Stage 1 — Core Launch** | Need-to-Offer Matching | ❌ **Missing** | No customer request → match → response flow |
| | Proof-Based Recommendations | ❌ **Missing** | No recommendation evidence/disclosure system |
| | Smart Value Passport | 🟡 **Partial** | Business wallet + Influencer earnings wallet exist, but no unified "Passport" with codes/QR/redemption for Customers |
| | Outcome-Based Campaigns | 🟡 **Partial** | Enrollment→promo code→clicks→sales→commission tracking exists; but no campaign brief/application/attribution rules as described |
| **Stage 2 — Connected** | Collective Demand Unlock | ❌ **Missing** | No group-buy/threshold discount campaigns |
| | Open Collaboration | 🟡 **Partial** | Enrollment approval is a simple collaboration; missing proposal records, shared brief, task list, file upload |
| | Local Experience Builder | ❌ **Missing** | No places/map/itinerary system |
| **Stage 3 — Ongoing** | Customer Voice Bridge | ❌ **Missing** | No feedback/suggestion/status system |
| | Post-Purchase Journey | 🟡 **Partial** | Sale logging + payout exists; missing order/booking link, support records, event-based reminders |

### PPT Quality Checks (Slide 26) — Current Coverage

| Check | Coverage | Notes |
|---|---|---|
| **SCREEN** | ✅ | Marketplace, dashboards, forms built |
| **FLOW** | 🟡 | Business↔Influencer flow complete; Customer flows missing |
| **SERVER** | ✅ | API routes, validation, RBAC, services layer |
| **DATA** | ✅ | Comprehensive schema for current domain |
| **ACCESS** | ✅ | Role-based permissions (INFLUENCER/BUSINESS/ADMIN) |
| **ERRORS** | 🟡 | Basic error handling; no unified retry/duplicate prevention |
| **TESTS** | 🟡 | Unit/integration/E2E configured; coverage unknown |

---

## 3. Missing Features — Detailed Gap Analysis

### A. **Customer Role** (Entirely Missing)
- No Customer authentication/profile
- No Customer space: Home & Explore, Search & Requests, Saved Picks & Offers, Passport & History
- No Need-to-Offer Matching (customer request → match → response)
- No Smart Value Passport for customers (voucher wallet, QR codes, redemption)
- No Customer Voice Bridge (feedback submission/status)
- No Post-Purchase Journey for customers (order details, support, reminders)

### B. **Discovery & Matching Features**
| Feature | PPT Description | Missing Pieces |
|---|---|---|
| **Need-to-Offer Matching** | Customer describes need → system finds matches → business/creator responds → customer acts | Request form, matching rules, response inbox, status updates, spam checks |
| **Collective Demand Unlock** | Group joins offer → reaches discount level | Campaign rules, participant records, time limits, threshold checks, payment/refund handling |
| **Proof-Based Recommendations** | Creator labels basis (used/visited/bought/sponsored) + evidence | Recommendation records, disclosure fields, evidence upload, review tools, report action |

### C. **Campaign & Collaboration Features**
| Feature | PPT Description | Missing Pieces |
|---|---|---|
| **Outcome-Based Campaigns** (full) | Business sets goal/creator rules/budget → creator applies → tracked links → attribution/commission | Campaign setup, applications, tracked links, event records, attribution rules, commission ledger, refund adjustments |
| **Open Collaboration** (full) | Business posts opportunity → creator proposes → agree brief → work submitted/reviewed | Proposal records, shared brief, task list, file upload, approval steps, version history, agreed-term records |
| **Local Experience Builder** | Creator builds route/plan with places → customer views map → visits/books | Place records, map view, stop order, business links, availability, booking hand-off |

### D. **Post-Action & Trust Features**
| Feature | PPT Description | Missing Pieces |
|---|---|---|
| **Customer Voice Bridge** | Customer sends feedback → routed → business replies → status update | Feedback form, categories, status history, voting, moderation, notifications, privacy |
| **Post-Purchase Journey** | Purchase recorded → useful updates/support → feedback/return | Order/booking link, support records, message preferences, event reminders, consent |
| **System Rules** (Slide 23) | Access, Offer rules, Payments, Tracking, Privacy, Trust, Failure handling | Payment provider integration, tracking proof verification, trust/report system, safe retry logic |

### E. **AI Integration** (Slide 24)
- AI CAN help: request understanding, matching, recommendations, summarization, brief drafting, itinerary, relevance explanation
- AI MUST NOT decide: purchase verification, voucher redemption, payouts, evidence authenticity, creator usage verification, term changes
- **Current**: No AI integration at all

---

## 4. Proposed Build Plan — Phased, Simple, Aligned to PPT

### Phase 0 — Foundation & Rebrand (Week 1)
> **Goal**: Align codebase to VALUEOUS brand, add Customer role, adopt PPT color palette

| Task | Details | Acceptance |
|---|---|---|
| **0.1 Update Tailwind palette** | Replace `brand` orange → PPT blue `#2B68C4`; add `creator: #84BE82`, `business: #183056`, `surface-*` light variants | `npm run build` passes; visual regression shows new palette |
| **0.2 Add Customer role** | Extend `userRoleEnum` → `['CUSTOMER','CREATOR','BUSINESS','ADMIN']`; add `customerProfiles` table; update RBAC | Customer can register, login, see empty dashboard |
| **0.3 Rename "Influencer" → "Creator"** | Codebase: `influencer` → `creator` (tables, routes, components, types) — keep DB migration safe | No "influencer" string in UI; all tests pass |
| **0.4 Unified navigation** | Single top nav with role-switcher (if multi-role) or role-specific dashboards | Consistent header across all roles |

### Phase 1 — Stage 1 Core Launch Journeys (Weeks 2–5)
> **Goal**: Deliver the 4 Stage-1 features end-to-end for all 3 roles

| Sprint | Feature | Key Deliverables |
|---|---|---|
| **1A** | **Need-to-Offer Matching** | `CustomerRequest` table, matching API, `BusinessResponse` + `CreatorResponse`, response inbox (Business/Creator), status notifications, request list (Customer) |
| **1B** | **Proof-Based Recommendations** | `Recommendation` table (basis enum: USED/VISITED/BOUGHT/RESEARCHED/SPONSORED/GIFTED), evidence upload (images/links), disclosure badge on UI, report flow |
| **1C** | **Smart Value Passport** | `Voucher` table (code, QR, eligibility, expiry), claim flow (Customer), validation endpoint (Business staff), redemption history, wallet view unified for Customer |
| **1D** | **Outcome-Based Campaigns (full)** | `Campaign` table (goal, budget, commission rules), `CampaignApplication`, tracked links (`/c/CAMP-ID/CREATOR`), event ingestion, attribution rules, commission ledger, payout integration |

**Quality Gate after Phase 1**: All 7 Slide-26 checks pass for each feature (SCREEN, FLOW, SERVER, DATA, ACCESS, ERRORS, TESTS).

### Phase 2 — Stage 2 Connected Activities (Weeks 6–9)

| Sprint | Feature | Key Deliverables |
|---|---|---|
| **2A** | **Collective Demand Unlock** | Group campaign type, participant join/leave, threshold levels, discount unlock logic, refund-if-not-met, real-time count display |
| **2B** | **Open Collaboration (full)** | Proposal workflow, shared brief document, task checklist, file uploads, versioned agreement, review/approval steps |
| **2C** | **Local Experience Builder** | Place records (name, location, category, business link), map view (Leaflet/MapLibre), drag-drop stop ordering, public experience pages, booking/deep-link hand-off |

### Phase 3 — Stage 3 Ongoing Support (Weeks 10–12)

| Sprint | Feature | Key Deliverables |
|---|---|---|
| **3A** | **Customer Voice Bridge** | Feedback form (type: suggestion/question/issue), routing rules, business reply thread, status timeline (received→under review→resolved), public theme summaries for Creators |
| **3B** | **Post-Purchase Journey** | Order/booking reference linking, support thread per order, automated reminders (delivery, review request), consent-managed notifications |

### Phase 4 — AI Layer & Polish (Weeks 13–14)

| Task | Details |
|---|---|
| **AI Gateway** | Integrate Neon AI Gateway (or equivalent) for: request parsing → match suggestions; recommendation summarization; campaign brief drafting; itinerary generation |
| **Guardrails** | Enforce "AI MUST NOT DECIDE" rules: all money/trust decisions server-validated, human-in-loop for evidence review |
| **Fallback** | Core flows work without AI (standard search, manual steps) |

### Phase 5 — Hardening & Launch Prep (Week 15)

| Task | Details |
|---|---|
| **Load/Chaos Testing** | Simulate peak enrollment, payout settlement, group campaign threshold |
| **Accessibility Audit** | axe-core, WCAG 2.1 AA across all 3 role dashboards |
| **Security Review** | RBAC penetration, SQL injection, webhook signature verification, rate limits |
| **Documentation** | API docs, runbooks, onboarding guides per role |
| **Demo Data** | Seed script covering all 9 features end-to-end |

---

## 5. Database Schema Additions (Incremental)

> Each migration is backward-compatible. Run via `npm run db:migrate`.

| Migration | Tables Added |
|---|---|
| `0001_customer_role` | `customerProfiles`, `user` role enum update |
| `0002_need_to_offer` | `customerRequests`, `requestMatches`, `requestResponses` |
| `0003_recommendations` | `recommendations`, `recommendationEvidence`, `recommendationReports` |
| `0004_vouchers` | `vouchers`, `voucherEligibility`, `voucherRedemptions` |
| `0005_campaigns` | `campaigns`, `campaignApplications`, `trackedLinks`, `attributionEvents`, `commissionLedger` |
| `0006_collective_demand` | `groupCampaigns`, `groupParticipants`, `groupThresholds` |
| `0007_collaboration` | `collaborationOpportunities`, `proposals`, `sharedBriefs`, `tasks`, `taskAttachments` |
| `0008_experiences` | `places`, `experiences`, `experienceStops`, `placeAvailability` |
| `0009_feedback` | `feedback`, `feedbackReplies`, `feedbackStatusHistory` |
| `0010_post_purchase` | `orders`, `supportThreads`, `reminderSchedules` |

---

## 6. UI Architecture — Keep It Simple

| Principle | Implementation |
|---|---|
| **Single codebase, role-based routes** | `/customer/*`, `/creator/*`, `/business/*`, `/admin/*` |
| **Shared component library** | `components/ui/*` (Button, Input, Card, Modal, Table, Badge, Toast, Tooltip) |
| **Role-specific feature components** | `features/customer/*`, `features/creator/*`, `features/business/*` |
| **Server Components by default** | Only `use client` for interactivity (forms, maps, real-time counts) |
| **TanStack Query / SWR** | Client-side data fetching with cache invalidation |
| **Zod schemas** | Shared validation (already in `server/validation/schemas.ts`) |

### Color Usage in UI

```tsx
// Tailwind config additions
brand: { // Customer / Primary actions
  50: '#E8F0FC', 100: '#D1E1F9', ..., 600: '#2B68C4', 700: '#2458A8'
}
creator: { // Creator / Progress
  50: '#EDF6EB', 100: '#DBEDD9', ..., 600: '#84BE82', 700: '#6AA868'
}
business: { // Business / Depth
  50: '#F4F7FB', 100: '#E9EFF7', ..., 600: '#183056', 700: '#10203E'
}
surface: {
  customer: '#E8F0FC', // Light blue cards for customer sections
  creator: '#EDF6EB',   // Light green for creator
  business: '#F4F7FB',  // Light grey-blue for business
  warning: '#FAF1F1',   // AI warnings
}
```

---

## 7. Current Codebase Strengths to Leverage

| Area | Status | Reuse Strategy |
|---|---|---|
| **Auth + Sessions** | ✅ Complete | Extend for Customer role |
| **RBAC/Permissions** | ✅ Complete | Add CUSTOMER permissions |
| **Business Dashboard** | ✅ Complete | Keep; extend for Campaigns, Collaboration |
| **Creator Dashboard** | ✅ Complete | Rename Influencer→Creator; add Recommendations, Experiences |
| **Marketplace Service** | ✅ Complete | Extend for Need-to-Offer Matching search |
| **Wallet/Ledger** | ✅ Complete | Extend for Vouchers, Group Campaign payouts |
| **Webhook/Order Logging** | ✅ Complete | Extend for Attribution Events |
| **Admin Console** | ✅ Complete | Add Customer moderation, Campaign oversight |
| **Notifications** | ✅ Complete | Extend for all new event types |
| **Media Upload** | ✅ Complete | Reuse for Evidence, Experience images, Attachments |
| **Tests/E2E** | 🟡 Configured | Expand coverage for new features |

---

## 8. Immediate Next Steps (This Week)

1. **Approve this plan** — confirm scope, timeline, priorities
2. **Run migration `0001_customer_role`** — add Customer role + profile table
3. **Update Tailwind palette** — switch to PPT colors
4. **Create Customer dashboard scaffold** — empty state with "Find → Save → Use" nav
5. **Start Need-to-Offer Matching** — request form + matching API (core of Stage 1)

---

## 9. Questions for Approval

| # | Question | Recommendation |
|---|---|---|
| 1 | **Rename "Influencer" → "Creator" everywhere?** | Yes — matches PPT terminology |
| 2 | **Keep SQLite for dev, PostgreSQL for prod?** | Yes — Drizzle supports both |
| 3 | **Use Neon for Postgres + AI Gateway + Realtime?** | Yes — aligns with PPT "Neon" references |
| 4 | **Map provider for Local Experience Builder?** | MapLibre GL + OpenStreetMap (free) or Mapbox (if budget) |
| 5 | **Payment provider for voucher redemptions/payouts?** | Razorpay/Stripe for India; keep wallet-ledger abstraction |
| 6 | **Priority order within Phase 1?** | Need-to-Offer → Passport → Recommendations → Campaigns (Customer value first) |
| 7 | **Single repo or split services?** | Single Next.js repo (monolith) for now; extract services later if needed |

---

**Prepared**: Based on PPT slides 1–28 + full codebase audit (schema, routes, components, services, tests).  
**Next**: Await approval → begin Phase 0.