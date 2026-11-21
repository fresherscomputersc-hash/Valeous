# Master Build Prompt  -  Discovery-to-Commerce Platform MVP

Use this prompt with your coding agent (OpenCode, Cursor, Claude Code, Codex or similar). Provide the PRD and SRS files in the same project context.

---

## ROLE

Act as a senior product-minded full-stack engineering team: staff engineer, product designer, backend engineer, frontend engineer, security engineer and QA engineer. Your task is to turn the supplied PRD and SRS into a working, production-minded MVP - not a mockup, static prototype or collection of disconnected screens.

## SOURCE OF TRUTH

Read these documents completely before writing code:

1. `PRD_Discovery_to_Commerce_MVP.md`
2. `SRS_Discovery_to_Commerce_MVP.md`

The PRD defines product scope and priorities. The SRS defines software behaviour, security and verification. When something is marked as an assumption or open question, preserve that uncertainty and implement a configurable default only when the documents specify one. Do not present assumptions as validated business facts.

The original concept is a three-sided discovery-to-commerce platform:

- Customers discover recommendations, businesses and offers.
- Creators publish recommendations and understand engagement.
- Businesses publish offers, verify claims and measure activity.
- Admins approve and moderate users, content and offers.

The product journey is Discover -> Trust -> Act -> Benefit.

## NON-NEGOTIABLE PRODUCT BOUNDARIES

Build the MVP described in the PRD/SRS. Do not silently expand scope.

**Must implement:**

- Responsive public discovery experience.
- Search and category/city/area filters.
- Customer registration, login, logout and secure password recovery.
- Customer profile, saved recommendations/offers and creator follows.
- Creator access application, approval workflow, profile and recommendation management.
- Business access application, approval workflow and public business profile.
- Business offer creation, editing, pause/end and moderation lifecycle.
- Customer offer claims with unique, non-guessable, single-use codes.
- Business-side code verification and atomic single-use redemption.
- Recommendation-to-creator attribution on offer claims when the customer claims from a recommendation.
- Basic creator and business analytics: views, CTA clicks, saves, claims and verified redemptions as applicable.
- Admin dashboard for approvals, content/offer moderation, reports, account suspension/reactivation and audit history.
- Server-side validation and authorisation for every protected operation.
- Automated tests for the critical workflows and security boundaries.

**Explicitly out of scope:**

- Payments, checkout, wallets, refunds, payouts, commissions or subscriptions.
- Delivery, shipping, inventory, order management or POS integrations.
- Reservations, appointments or ticketing.
- Native iOS/Android apps.
- Video hosting, live streaming, comments, messaging or public reviews/ratings.
- AI recommendation ranking or AI content generation.
- Creator contracts/payment settlement.
- Features not present in the PRD/SRS unless a blocker requires a minimal supporting feature.

A claim is not a sale. A redemption is not proof of payment. Never label platform views, clicks, claims or redemptions as sales or revenue.

## PHASE 0  -  REPOSITORY AND REQUIREMENTS AUDIT

Before changing files:

1. Inspect the repository structure, package manager, framework, current routes, components, database schema, authentication, environment configuration, tests and deployment setup.
2. Identify what already works and what is incomplete. Do not delete working code or replace the project architecture without a documented reason.
3. Detect whether this is an existing app or a greenfield repository.
4. Read the PRD/SRS and create a requirements checklist mapping each P0 requirement to code locations and tests.
5. Report blockers or contradictions. If a decision is not essential to proceed, use the documented MVP default and record it in `docs/implementation-decisions.md`.
6. Do not ask broad questions that are already answered by the documents. Ask only if a genuinely blocking secret, provider, or business decision is unavailable; otherwise use local development adapters/placeholders that are safe and clearly documented.

At the end of the audit, create:

- `docs/implementation-plan.md`
- `docs/implementation-decisions.md`
- `docs/requirements-traceability.md`

Then proceed with implementation; do not stop after writing a plan.

## TECHNOLOGY RULES

- Prefer the existing stack if it is maintainable, secure and compatible with the requirements.
- If the repository is greenfield, use the proposed reference stack from the SRS: Next.js App Router, TypeScript, PostgreSQL, Prisma (or equivalent), maintained authentication, schema validation, accessible components and Playwright-style E2E tests.
- Use strict TypeScript. Avoid `any`; explain and isolate unavoidable exceptions.
- Use domain/service modules. Do not place core business logic in React components or route handlers.
- Use database migrations. Never rely on manually created production tables.
- Use object storage for uploaded images in deployed environments; provide a safe local development strategy.
- Include `.env.example` with placeholders, never real secrets.
- Validate required environment variables at startup.
- Keep the app deployable using the repository's existing hosting model unless it is broken; document the deployment steps.

## DESIGN AND EXPERIENCE DIRECTION

Create a polished, credible, modern discovery product - not a generic admin template.

Product experience:

- Discovery should feel simple, visual and useful.
- Use a clear hierarchy for recommendations, creators, businesses and offers.
- Make offer terms, expiry, eligibility and redemption instructions easy to understand.
- Make creator identity and business identity visible so recommendations feel attributable.
- Use mobile-first responsive layouts. The customer discovery and claim experience is especially important on mobile.
- Provide good loading skeletons, empty states, validation messages, toasts/feedback and error recovery.
- Avoid fake counters, fake testimonials, fake user profiles, fake reviews and fabricated business listings.
- Seed only clearly labelled development/demo data. Do not expose demo fixtures in production.
- Follow accessible semantic HTML, keyboard interaction, focus states, labels, alt text and adequate contrast.

The presentation's illustrative discovery concepts should be represented where appropriate: search, Local Picks, Creator Favourites, New Experiences, For You, Popular and Nearby. In MVP, these can be deterministic query groups; do not implement machine-learning personalisation.

## IMPLEMENTATION MILESTONES

Implement in vertical slices. Each slice must work end-to-end and have tests.

### MILESTONE 1  -  Foundation and identity

- Configure app, database, migrations, linting, formatting, type-checking and tests.
- Implement authentication using a maintained provider/library.
- Implement user model, active/suspended states and role grants.
- Public registration grants customer access only.
- Implement secure creator/business access applications and admin approval/rejection.
- Implement server-side RBAC and ownership helpers.
- Build responsive shared layouts and navigation.
- Add protected-route and IDOR tests.

**Exit criteria:** customer can register/login; admin can approve creator/business requests; a customer cannot access creator/business/admin functions by editing URLs or API payloads.

### MILESTONE 2  -  Public discovery and profiles

- Build the discovery home page.
- Build public search and filters for keyword, category, city and area.
- Build recommendation detail, creator profile and business profile pages.
- Only approved/published/active records may be public.
- Implement stable pagination and useful empty states.
- Implement creator/business profile editing for authorised owners.

**Exit criteria:** a visitor can discover and search approved content; drafts, pending content and private data never appear in public APIs.

### MILESTONE 3  -  Creator recommendations

- Build creator dashboard and recommendation create/edit/archive workflow.
- Support title, description, category, cover image, location, optional linked business and optional linked offer.
- Validate all fields on server and client.
- Implement moderation states and admin actions.
- Record valid recommendation views and CTA clicks with deduplication/rate limiting.

**Exit criteria:** approved creator publishes a recommendation; it appears publicly only in an allowed state; creator cannot edit another creator's recommendation.

### MILESTONE 4  -  Business profiles and offers

- Build business dashboard and public profile management.
- Build offer CRUD and state transitions: draft, pending review, active, paused, expired, rejected and ended.
- Include clear terms, start/end times, per-customer limit, optional total quota and redemption instructions.
- Enforce offer ownership and business approval on the server.
- Add admin review actions and audit logging.

**Exit criteria:** approved business can publish a valid offer; paused, rejected, expired and ended offers cannot be newly claimed.

### MILESTONE 5  -  Customer actions, claims and redemptions

- Implement follow/unfollow creator.
- Implement save/unsave recommendation and offer.
- Implement offer claim flow with sign-in gate.
- Generate cryptographically strong, unique codes. Do not use sequential database IDs.
- Prefer storing a hash of the code; never log raw codes.
- Enforce offer validity, total quota and per-customer limits in a database transaction.
- Preserve `source_recommendation_id` and `source_creator_profile_id` if the claim originated from a recommendation.
- Implement customer claims page with claimed/redeemed/expired states.
- Implement business code verification and one-time redemption using a transaction/conditional state update.
- Handle simultaneous claim and simultaneous redemption attempts safely.
- Provide clear invalid/expired/already-used/wrong-business responses without leaking customer data.

**Exit criteria:** customer claims an offer and receives a code; only the owning business can redeem it; repeated or concurrent redemption attempts result in exactly one successful redemption.

### MILESTONE 6  -  Analytics, reports and admin operations

- Implement event records for recommendation views, CTA clicks, business profile views, offer views, saves, follows, claims and redemptions.
- Implement creator analytics restricted to the creator's own content.
- Implement business analytics restricted to the business's own profile/offers.
- Clearly label metrics; do not call claims/redemptions sales.
- Implement content/profile reporting and admin review/resolution.
- Implement account suspension/reactivation and audit logs.

**Exit criteria:** no creator or business can query another party's analytics; moderation and sensitive admin operations are audited.

### MILESTONE 7  -  Hardening and release readiness

- Complete unit, integration, E2E and security tests.
- Add rate limits for authentication, claim and redemption verification.
- Validate upload MIME/extension/size and safe image processing.
- Add security headers, secure cookies, CSRF protections as applicable, CORS restrictions and output escaping.
- Add health endpoint, structured logs and error monitoring integration hooks.
- Add database backup/restore and deployment documentation.
- Check mobile breakpoints and keyboard accessibility.
- Run dependency and secret scanning.

**Exit criteria:** all P0 requirements pass; no known critical/high severity vulnerabilities; clean database migration and deployment are documented and reproducible.

## BUSINESS-CRITICAL IMPLEMENTATION RULES

### Claims must be transaction-safe

A claim operation must check offer state, date validity, per-customer limit and total quota inside a transaction. Add database constraints/conditional updates so concurrent requests cannot oversell the claim quota. A frontend disable button is not sufficient.

### Redemptions must be single-use

Redeem through one atomic state transition. Verify the acting business owns the offer. Use a conditional update or transaction that succeeds only when claim status is `CLAIMED` and the claim is still valid. Two concurrent attempts must never both succeed.

### Attribution must be honest

When a customer claims from a recommendation, preserve the source recommendation and creator IDs in the claim record. Do not infer attribution from unrelated browsing. If the source is unknown, store null. Analytics must distinguish platform activity from completed sales.

### Permissions must be server-side

Every protected query and mutation must enforce authentication, role and resource ownership. Never rely only on hidden buttons or client-side route guards. Test IDOR by swapping IDs in requests.

### Moderation and audit must be real

Admin approval/rejection, hide/remove, suspension/reactivation and report resolution must change persisted state and create audit entries. Do not implement decorative admin buttons.

## DATA MODEL EXPECTATIONS

Implement the entities and relationships from SRS Section 6. At minimum include:

- User
- RoleGrant
- CreatorProfile
- Business
- BusinessMembership (or an equivalent ownership model)
- Category
- Recommendation
- Offer
- OfferClaim
- Follow
- SavedItem
- ProductEvent
- ContentReport
- AuditLog

Use UUID/opaque IDs, foreign keys, useful indexes, unique constraints, check constraints and migrations. Do not store uploaded image binaries in database rows. Avoid overengineering multi-tenant business organisations; keep the schema extensible.

## API AND CODE QUALITY EXPECTATIONS

- Use explicit request and response schemas.
- Return consistent error codes/messages.
- Paginate list endpoints.
- Keep public DTOs separate from internal database models.
- Add idempotency handling for claim/redeem requests where practical.
- Keep all timestamps in UTC in storage.
- Make search sorting deterministic.
- Avoid N+1 queries; add indexes based on real query patterns.
- Do not add unnecessary infrastructure (microservices, event brokers, Kubernetes) for this MVP.
- Keep code readable, typed and documented where the logic is non-obvious.

## REQUIRED TEST MATRIX

Write automated tests for all of the following:

1. Registration, login, logout and password recovery.
2. Customer cannot self-assign creator, business or admin roles.
3. Creator application approval and rejection.
4. Business application approval and rejection.
5. Creator can create/edit/publish own recommendation; cannot edit another creator's.
6. Admin can hide/reject recommendation; hidden content is not public.
7. Business can create/pause/end own offer; cannot manage another business's offer.
8. Customer cannot claim inactive, future, expired or exhausted offer.
9. Customer cannot exceed configured per-customer claim limit.
10. Concurrent claims do not exceed total quota.
11. Claim code is random/non-sequential and raw code is not logged.
12. Correct business can redeem a valid code.
13. Wrong business cannot redeem the code.
14. Expired, unknown and already-redeemed codes are rejected.
15. Concurrent redemption attempts produce exactly one success.
16. Claim from recommendation preserves creator/recommendation attribution.
17. Creator analytics are isolated to that creator.
18. Business analytics are isolated to that business.
19. Customer cannot read another customer's claim.
20. Admin moderation/suspension/report resolution creates audit records.
21. Upload validation rejects unsafe file types and oversized files.
22. Core customer and business flows work at mobile viewport widths.

Do not merely create placeholder tests. Tests must execute the actual service/API path and assert persisted outcomes.

## REQUIRED UX PAGES

At minimum deliver these pages/routes (adapt naming to existing conventions):

**Public:**
- `/` discovery home
- `/search`
- `/recommendations/[id]`
- `/creators/[handle]`
- `/businesses/[slug]`
- `/offers/[id]`
- `/login`, `/register`, `/forgot-password`, `/reset-password`

**Customer:**
- `/saved`
- `/my-claims`
- `/profile`

**Creator:**
- `/creator/dashboard`
- `/creator/recommendations`
- `/creator/recommendations/new`
- `/creator/recommendations/[id]/edit`
- `/creator/analytics`

**Business:**
- `/business/dashboard`
- `/business/profile`
- `/business/offers`
- `/business/offers/new`
- `/business/offers/[id]/edit`
- `/business/redemptions`
- `/business/analytics`

**Admin:**
- `/admin`
- `/admin/applications`
- `/admin/recommendations`
- `/admin/offers`
- `/admin/reports`
- `/admin/users`
- `/admin/audit-log`

If the project uses another routing convention, preserve the same user capabilities.

## SEED DATA AND DEMO MODE

- Create a development-only seed script for one admin, a small number of customer/creator/business demo accounts, sample businesses, recommendations and offers.
- Make it impossible for seed data to run against production accidentally; require an explicit environment check.
- Clearly label demo credentials in local development documentation only.
- Never put real users or real businesses into seed fixtures without permission.
- Do not fabricate ratings, reviews, testimonials or performance numbers.

## DOCUMENTATION TO PRODUCE

Keep these updated:

- `README.md`  -  setup, scripts, stack, architecture and troubleshooting.
- `docs/implementation-plan.md`
- `docs/implementation-decisions.md`
- `docs/requirements-traceability.md`  -  PRD IDs mapped to implementation and tests.
- `docs/architecture.md`  -  components, data flow, deployment.
- `docs/data-model.md`  -  entities, constraints and key indexes.
- `docs/security.md`  -  auth, RBAC, claim-code and operational security.
- `docs/deployment.md`  -  environments, migrations, secrets, backups and rollback.
- `.env.example`  -  placeholders only.

## EXECUTION AND REPORTING RULES

- Work directly in the repository. Do not stop at recommendations or wireframes.
- Implement complete vertical slices and run checks after each milestone.
- After edits, run formatting, lint, type-check, unit/integration tests and relevant E2E tests.
- Fix errors rather than suppressing them or weakening assertions.
- Do not claim a test passed unless you actually ran it and observed a passing result.
- Do not claim deployment, email, storage or third-party integration works unless configured and verified.
- Do not leave TODO buttons, fake success states, static dashboards pretending to contain live analytics, or mock-only API endpoints in the final MVP.
- If a provider credential is unavailable, implement a well-defined local/test adapter and document the production setup required. Do not hard-code credentials.
- Do not make irreversible changes to the existing repository without explaining them first.
- If the task cannot be completed in one execution, finish the highest-priority end-to-end slice, leave the project in a runnable state, and report precisely what is complete and incomplete.

## FINAL DELIVERY REPORT

At the end, provide:

1. What was implemented, grouped by milestone.
2. Main routes/pages and user roles supported.
3. Database entities and migrations created.
4. Tests actually run and their exact results.
5. Setup commands for local development.
6. Required environment variables and how to obtain them (never ask the user to paste secrets into chat).
7. Deployment instructions and any manual provider setup.
8. Known limitations and incomplete items.
9. A PRD/SRS traceability summary for every P0 requirement.
10. A clear statement of whether the result is a local MVP, preview deployment or production deployment.

Now inspect the repository, read the PRD and SRS, create the implementation plan, and build the MVP in the existing project.
