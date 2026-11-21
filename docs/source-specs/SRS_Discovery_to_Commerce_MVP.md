# Software Requirements Specification (SRS)
## Discovery-to-Commerce Platform  -  MVP

**Document version:** 1.0  
**Date:** 6 November 2026  
**Status:** Draft for engineering review  
**Related document:** Product Requirements Document (PRD), version 1.0  
**Source basis:** *Founding Technical Partner Opportunity* presentation, slides 1-12, expanded into proposed MVP requirements

---

## 1. Introduction

### 1.1 Purpose

This SRS defines the software behaviour, architecture constraints, data model, interfaces, security controls and verification requirements for the first release of the Discovery-to-Commerce Platform. It is intended for product owners, designers, software engineers, QA engineers and deployment operators.

### 1.2 Product scope

The system is a responsive web application connecting customers, creators and businesses through recommendations and offers. It supports public discovery, authenticated customer actions, creator publishing, business offer management, claim-code redemption, basic analytics and platform administration.

The system does not process payments or complete orders in MVP. A claim is a code issued for an offer; a redemption is a business-verified use of that code. Neither should be represented as a confirmed sale.

### 1.3 Definitions

| Term | Definition |
|---|---|
| User | Registered account that may hold one or more approved roles. |
| Customer | User who follows creators, saves content and claims offers. |
| Creator | Approved user who publishes recommendations. |
| Business | Approved business profile owner/operator who publishes offers and verifies claims. |
| Admin | Privileged platform operator who approves, moderates and manages platform accounts/content. |
| Recommendation | Creator-authored discovery content. |
| Offer | Business-published promotion/benefit with terms and validity. |
| Claim | Unique customer-specific code associated with an offer. |
| Redemption | Atomic, one-time verification of a claim by the business that owns the offer. |
| Event | An immutable product activity record used for metrics and attribution. |

### 1.4 Source-derived requirements versus engineering proposals

The presentation defines the three participant groups, the discovery-to-action journey, the need for more measurable outcomes and an illustrative discovery interface. It does not define implementation details. All technical stack choices, endpoint shapes, database structures, performance targets and detailed workflows below are engineering proposals to make the MVP implementable.

## 2. Overall Description

### 2.1 System context

The product is a browser-based application with one web frontend, a trusted server/API layer, a relational database and object storage for media. The server is the authority for authentication, permissions, offer claims, redemption, moderation and analytics aggregation.

### 2.2 User classes

| User class | Authentication | Main permissions |
|---|---|---|
| Visitor | No | Browse/search public content and public profiles; register/sign in; submit report if product policy permits anonymous reporting (recommended: require sign-in). |
| Customer | Yes | Follow creators, save content/offers, claim offers, view own claims and manage own profile. |
| Creator | Yes + approved role | Customer permissions plus create/edit/publish own recommendations and view own analytics. |
| Business operator | Yes + approved business membership | Manage own business profile/offers, verify own offer claims, view own business analytics. |
| Admin/moderator | Yes + admin permission | Approve, reject, moderate, suspend, resolve reports and inspect audit/platform metrics. |

A user may have customer access plus approved creator and/or business access. Admin must be assigned out-of-band or through a secure administrative process; public registration must never allow a user to self-assign admin.

### 2.3 Operating environment

- Modern evergreen browsers: latest stable Chrome, Edge, Firefox and Safari at release time.
- Responsive mobile, tablet and desktop layouts.
- HTTPS required in any deployed environment exposed beyond localhost.
- Server-side runtime compatible with the selected web framework.
- Relational database with transaction and unique-constraint support.
- Object storage for user-uploaded images; do not store binary image content in the relational database.

### 2.4 Proposed reference technology baseline

The implementation prompt instructs the coding agent to inspect the existing repository first and retain a working stack where practical. For a greenfield repository, the proposed baseline is:

- **Web:** Next.js App Router + TypeScript.
- **UI:** Tailwind CSS and an accessible component library (for example, shadcn/ui) or equivalent existing project components.
- **Database:** PostgreSQL.
- **ORM/migrations:** Prisma or an equivalent type-safe migration-backed ORM.
- **Authentication:** Auth.js or a similarly maintained authentication solution with secure sessions and password recovery. Do not invent a home-grown password/session system.
- **Validation:** Zod or equivalent schema validation shared where appropriate.
- **Media:** S3-compatible object storage or managed storage with private upload signing and safe public delivery.
- **Testing:** Unit/integration tests plus browser-based end-to-end tests (for example, Vitest/Jest and Playwright).

The project may choose an equivalent stack based on existing repository constraints. These are implementation suggestions, not source-deck requirements.

### 2.5 Constraints

- No payment gateway or payout logic in MVP.
- No reliance on browser-only checks for permissions or offer limits.
- Claim creation and redemption must be transaction-safe under concurrency.
- Public pages must not expose private account, claim or business application data.
- Every privileged write must be authorised server-side.
- All date/time values must be stored consistently in UTC and displayed in the user's/business's configured local timezone. The pilot timezone must be configurable.
- Do not hard-code a city, categories, pricing or currency into application logic.

### 2.6 Assumptions and dependencies

- Founders choose the pilot market and content categories.
- A person is responsible for reviewing creator/business applications and reported content.
- Participating businesses can verify a code using a web dashboard and have a process to honour the displayed offer terms.
- Email delivery is available for account verification and password recovery if those flows are included in the chosen authentication provider.
- A storage provider and deployment host will be selected before production deployment.

## 3. High-Level Architecture

### 3.1 Logical components

The logical request path is:

1. **Clients:** visitors, customers, creators, business operators and admins use the responsive web client.
2. **Web client:** renders pages and submits user actions over HTTPS. It is not trusted to enforce access control or business rules.
3. **Server/API layer:** authenticates the actor, validates input and dispatches work to domain services.
4. **Domain services:** authentication and RBAC, discovery, creator publishing, business/offers, claims/redemptions, media, analytics and moderation/audit.
5. **Data services:** PostgreSQL stores relational application data and events; object storage stores uploaded media; admin reporting reads authorised aggregate data.

### 3.2 Component responsibilities

- **Web client:** Page rendering, responsive interactions, accessible forms and user feedback. It is not trusted for access control or business rules.
- **Authentication:** Registration, sign-in, sign-out, session renewal and password recovery.
- **Authorization/RBAC:** Role checks and object ownership checks on every protected server action/API.
- **Discovery service:** Search, filtering, sorting and retrieval of public recommendations, businesses and offers.
- **Creator service:** Recommendation lifecycle and creator-profile management.
- **Business service:** Business profile and offer lifecycle.
- **Claim/redemption service:** Atomic claim issuance, code validation and single-use redemption.
- **Event/analytics service:** Append-only event recording and authorised aggregation.
- **Moderation service:** Applications, content review, reports, account suspension and audit logs.
- **Media service:** Validates and stores uploads, enforces ownership and returns safe asset URLs.

### 3.3 Recommended application structure

Organise code by domain rather than putting business logic inside page components. Example:

Example domain-oriented organisation (adapt to the repository rather than forcing this layout):

- `src/app/` - routes and layouts.
- `src/components/` - shared UI components.
- `src/features/auth/`, `discovery/`, `creators/`, `businesses/`, `offers/`, `claims/`, `analytics/` and `moderation/` - domain-specific UI and workflows.
- `src/server/auth/`, `db/`, `permissions/`, `services/`, `validation/` and `audit/` - trusted server-side logic.
- `src/lib/` and `src/types/` - shared utilities and types.
- `prisma/` - schema and migrations, if Prisma is used.
- `tests/` - unit, integration and end-to-end tests.

This is illustrative; follow existing repository conventions when they are sound.

## 4. External Interface Requirements

### 4.1 User interface

The interface shall:

- Use a consistent responsive layout with clear public and authenticated navigation.
- Provide the discovery elements shown in the presentation: search, local picks, creator favourites, new experiences, For You, Popular and Nearby. In MVP, these may be deterministic lists/filters rather than personalised machine-learning feeds.
- Show creator identity and business identity for linked recommendations.
- Show offer terms, eligibility, start/end time, redemption instructions and remaining availability where applicable before claim.
- Clearly distinguish active, paused, expired, claimed and redeemed states.
- Provide loading, empty, success and failure states for all important flows.
- Provide accessible labels, keyboard focus, sensible heading order, alt text and adequate contrast.
- Never display fake metrics, fake ratings, fabricated creator accounts or sample offers as real production content.

### 4.2 API/interface conventions

The implementation may use REST endpoints, typed server actions or framework-native route handlers. Regardless of transport:

- All inputs must be validated at the server boundary.
- All errors must use a consistent structure with a machine-readable code and safe human-readable message.
- Mutating endpoints must enforce authentication, authorisation, CSRF protections where applicable and rate limits.
- Paginated collection APIs must use stable ordering and bounded page sizes.
- Public API responses must use explicit response DTOs; do not serialise database models wholesale.
- The server must derive user identity from the authenticated session, never trust a client-provided user ID as the actor.

Suggested error shape:

```json
{
  "error": {
    "code": "OFFER_NOT_CLAIMABLE",
    "message": "This offer is not currently available."
  }
}
```

### 4.3 Suggested endpoint map

The actual path structure may vary, but all capabilities must exist.

| Method | Suggested path | Purpose | Access |
|---|---|---|---|
| GET | `/api/discovery` | Public discovery feed with filters | Public |
| GET | `/api/search` | Search public content/businesses | Public |
| GET | `/api/recommendations/:id` | Recommendation detail | Public if published |
| POST | `/api/recommendations` | Create draft | Approved creator |
| PATCH | `/api/recommendations/:id` | Update own recommendation | Owner creator/admin |
| POST | `/api/recommendations/:id/publish` | Publish/submit | Owner creator |
| GET | `/api/creators/:id` | Public creator profile | Public if approved |
| POST | `/api/creators/applications` | Request creator access | Authenticated user |
| GET/PATCH | `/api/businesses/:id` | View/update business profile | Public read; owner write |
| POST | `/api/businesses/applications` | Request business access | Authenticated user |
| POST | `/api/offers` | Create offer draft | Approved business |
| PATCH | `/api/offers/:id` | Update own offer | Business owner/admin |
| POST | `/api/offers/:id/claim` | Claim offer | Authenticated customer |
| GET | `/api/me/claims` | View own claims | Claim owner |
| POST | `/api/redemptions/verify` | Verify/redeem code | Owning business operator |
| POST | `/api/follows` | Follow creator | Authenticated customer |
| DELETE | `/api/follows/:creatorId` | Unfollow creator | Authenticated customer |
| POST | `/api/saves` | Save item | Authenticated customer |
| DELETE | `/api/saves/:id` | Remove saved item | Owner customer |
| GET | `/api/creator/analytics` | Own creator analytics | Approved creator |
| GET | `/api/business/analytics` | Own business analytics | Approved business |
| POST | `/api/reports` | Report content/profile | Authenticated user |
| GET/POST | `/api/admin/*` | Moderation/admin operations | Admin only |

## 5. Functional Behaviour and Detailed Requirements

### 5.1 Authentication and account lifecycle

- Registration requires a unique email and password or a supported external identity provider.
- Passwords, if managed by the application, must be hashed using a modern password-hashing algorithm and never logged or returned.
- Authentication provider must support secure, httpOnly, sameSite cookies or equivalent secure session storage.
- Password reset tokens must be random, single-use, time-limited and stored safely (hashed where feasible).
- Rate-limit registration, login, password recovery and verification endpoints.
- Public registration creates customer access only. Creator/business permissions are granted after approval. Admin access is never self-service.
- Account suspension must block publishing, claiming and business operations as defined by policy; a suspended business must not accept new claims.

### 5.2 Role and ownership checks

For every protected request, validate:

1. Is there an authenticated actor?
2. Is the actor active and not suspended?
3. Does the actor have the required approved role?
4. Does the resource belong to the actor or to a business where the actor has authorised membership?
5. Is the resource in a state that permits this operation?

Return 401 for unauthenticated access, 403 for authenticated but unauthorised access, 404 when revealing resource existence would create an information leak, and 409 for state conflicts where appropriate.

### 5.3 Discovery and search

- Public query results must include only approved, published, non-archived and currently visible content.
- Support keyword search across recommendation title/body, business name and category labels.
- Support filtering by category, city and area. These fields must be stored as normalised or controlled values where possible.
- Support deterministic sort options: newest, popular (based on defined valid event count) and nearby (only when a usable location is supplied). Do not claim personalised relevance in MVP.
- Search and listing APIs must paginate and cap page size.
- Avoid exposing private drafts, applications, claim codes or internal moderation notes.

### 5.4 Recommendation lifecycle

Proposed state machine:

```text
DRAFT -> PENDING_REVIEW -> PUBLISHED -> UNPUBLISHED -> ARCHIVED
                  |             |
                  v             v
               REJECTED       HIDDEN (admin moderation)
```

- Creator can create and edit own drafts.
- Creator can submit for review or publish directly only if founder policy explicitly disables pre-moderation. Recommended pilot policy: pre-moderate first publications; later allow approved creators to publish with post-moderation.
- Admin can approve, reject, hide or restore content.
- Every status change records actor, time and reason.
- Public detail responses show only safe, public fields.

### 5.5 Business and offer lifecycle

Business profile states: `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`.  
Offer states: `DRAFT`, `PENDING_REVIEW`, `ACTIVE`, `PAUSED`, `EXPIRED`, `REJECTED`, `ENDED`.

Offer required fields:

- Business ID.
- Title and description.
- Category/type (configurable; e.g. discount, bonus or experience benefit).
- Full terms and eligibility text.
- Start timestamp and end timestamp.
- Total claim limit (optional or unlimited, subject to founder decision).
- Per-customer claim limit (default 1).
- Redemption instructions.
- Status and moderation metadata.

Business ownership must be validated on every create/update/pause operation. Offer dates and quota rules must be checked on the server.

### 5.6 Claim creation

Claim creation must be one atomic transaction:

1. Authenticate customer.
2. Load offer and confirm it is active and within its validity window.
3. Confirm business is approved/active.
4. Check total and per-customer limits.
5. Check that this customer has not already claimed beyond the allowed limit.
6. Generate a cryptographically strong, unique redemption token/code.
7. Create claim row and reserve quota in a concurrency-safe manner.
8. Store attribution source if passed from a trusted server-side context or validated recommendation reference.
9. Commit and return the new claim details.

A database unique constraint must prevent duplicate claims when per-customer limit is one. Total quota must be reserved transactionally or with an atomic conditional update. A frontend-only check is insufficient.

The code must not be sequential or guessable. Prefer storing a hash of the code and return the plaintext only at creation/display time as required. Never include a full claim code in analytics events or application logs.

### 5.7 Redemption verification

The business operator submits a code while authenticated.

The server must:

- Resolve the code safely (hash lookup or equivalent).
- Confirm the claim exists.
- Confirm the claim belongs to an offer owned by the acting business.
- Confirm claim is not expired, cancelled or already redeemed.
- Confirm offer/business status and redemption policy.
- Atomically transition claim from `CLAIMED` to `REDEEMED` and record `redeemed_at`, `redeemed_by` and business ID.
- Reject concurrent duplicate redemption attempts; only one transaction may succeed.

Suggested claim states: `CLAIMED`, `REDEEMED`, `EXPIRED`, `CANCELLED`. Expired state may be derived at read time or materialised by a background task; business logic must still check expiry at redemption.

The business UI should display a minimal confirmation such as offer name, masked customer identifier and validity status. Do not expose unnecessary personal information.

### 5.8 Attribution and analytics events

Core event types:

- `RECOMMENDATION_VIEW`
- `RECOMMENDATION_CTA_CLICK`
- `BUSINESS_PROFILE_VIEW`
- `OFFER_VIEW`
- `SAVE_CREATED`
- `CREATOR_FOLLOWED`
- `OFFER_CLAIMED`
- `OFFER_REDEEMED`

Each event should contain:

- Event ID.
- Event type.
- Server timestamp.
- Actor user ID when authenticated; otherwise a privacy-conscious anonymous/session identifier if needed.
- Object type and object ID.
- Source recommendation ID and creator ID when applicable.
- Business ID when applicable.
- Metadata restricted to non-sensitive, allow-listed fields.

Do not record passwords, session tokens, claim codes, payment details or unnecessary personal data in events/logs. Implement deduplication or reasonable aggregation so repeated reloads/bots do not create misleading metrics. Rate-limit event endpoints and consider server-side event creation for important actions such as claim and redemption.

Metric definitions:

- Views = qualifying unique or deduplicated view events in the selected period; specify the chosen counting rule in UI.
- Clicks = qualifying CTA click events.
- Saves = save records/events.
- Claims = valid claim records created.
- Redemptions = claims successfully transitioned to redeemed.
- Attribution = claim-time source association; do not infer it later from unrelated browsing.

### 5.9 Moderation and audit

- Admin actions require admin permission and a reason for rejection, hiding, suspension or removal.
- Reports have statuses `OPEN`, `IN_REVIEW`, `RESOLVED`, `DISMISSED`.
- Audit log records actor ID, action, target type/ID, timestamp, reason and safe metadata.
- Audit log must not include passwords, raw claim codes, reset tokens or secrets.
- Admin list endpoints must be paginated and protected.
- Admin access should be protected with strong authentication and ideally multi-factor authentication before public launch.

## 6. Data Requirements

### 6.1 Conceptual data model

```text
User 1---* RoleGrant
User 1---0..1 CreatorProfile
User 1---0..* BusinessMembership *---1 Business
CreatorProfile 1---* Recommendation
Business 1---* Recommendation (optional link)
Business 1---* Offer
Recommendation 0..1---0..1 Offer (optional featured offer)
User 1---* OfferClaim *---1 Offer
OfferClaim 0..1---1 Recommendation (source)
User *---* CreatorProfile (Follow)
User *---* ContentItem (SavedItem)
User 1---* ProductEvent
User 1---* ContentReport
User 1---* AuditLog (actor)
```

### 6.2 Proposed entities and key fields

The following is a logical model; exact table/column names may follow repository conventions.

**User**
- `id` (UUID/opaque primary key)
- `email` (unique, normalised)
- `password_hash` (nullable if external auth)
- `display_name`
- `avatar_url` (nullable)
- `status` (`ACTIVE`, `SUSPENDED`, `DELETED`)
- `email_verified_at` (nullable)
- `created_at`, `updated_at`

**RoleGrant**
- `id`, `user_id`, `role` (`CUSTOMER`, `CREATOR`, `BUSINESS`, `ADMIN`)
- `status` (`PENDING`, `APPROVED`, `REJECTED`, `REVOKED`)
- `approved_by`, `approved_at`, `decision_reason`
- Unique constraint on active user/role grant as appropriate.

**CreatorProfile**
- `id`, `user_id` (unique), `handle` (unique), `display_name`, `bio`, `avatar_url`, `status`, timestamps.

**Business**
- `id`, `owner_user_id` or membership relation, `name`, `slug`, `description`, `category_id`, `address_text`, `city`, `area`, `latitude`/`longitude` nullable, `phone`/`email` nullable, `cover_image_url`, `status`, timestamps.

**BusinessMembership**
- `id`, `business_id`, `user_id`, `role` (`OWNER`, `OPERATOR`), `status`, timestamps. For strict MVP one owner is sufficient; model can still allow future operators.

**Category**
- `id`, `name`, `slug`, `type` (`RECOMMENDATION`, `BUSINESS`, `OFFER`), `is_active`, sort order.

**Recommendation**
- `id`, `creator_profile_id`, `business_id` nullable, `offer_id` nullable, `title`, `slug`, `description`, `category_id`, `cover_image_url`, `city`, `area`, `status`, `published_at`, moderation fields, timestamps.

**Offer**
- `id`, `business_id`, `title`, `description`, `terms`, `offer_type`, `starts_at`, `ends_at`, `total_claim_limit` nullable, `per_customer_limit`, `redemption_instructions`, `status`, moderation fields, timestamps.

**OfferClaim**
- `id`, `offer_id`, `customer_user_id`, `code_hash`, `code_last4` (optional display aid), `status`, `claimed_at`, `expires_at`, `redeemed_at` nullable, `redeemed_by_user_id` nullable, `source_recommendation_id` nullable, `source_creator_profile_id` nullable, timestamps.
- Add indexes for offer, customer, status and expiry.
- Add unique constraint(s) that enforce per-customer limits. If configurable limits greater than one are supported, implement a transaction-safe quota counter or claim ordinal strategy.

**Follow**
- `id`, `customer_user_id`, `creator_profile_id`, `created_at`; unique composite key.

**SavedItem**
- `id`, `customer_user_id`, `item_type`, `item_id`, `created_at`; unique composite key. Validate referenced item exists and is public.

**ProductEvent**
- `id`, `event_type`, `actor_user_id` nullable, `anonymous_session_hash` nullable, `object_type`, `object_id`, `business_id` nullable, `recommendation_id` nullable, `creator_profile_id` nullable, `occurred_at`, `dedupe_key` nullable, safe `metadata` JSON.

**ContentReport**
- `id`, `reporter_user_id`, `target_type`, `target_id`, `reason_code`, `description` nullable, `status`, `assigned_admin_id` nullable, `resolution_note` nullable, timestamps.

**AuditLog**
- `id`, `actor_user_id`, `action`, `target_type`, `target_id`, `reason` nullable, safe metadata JSON, `created_at`.

### 6.3 Data integrity rules

- Use foreign keys for all relational ownership links.
- Use unique constraints for email, handles, business slugs, follows and saved items.
- Use database transactions for offer claims and redemptions.
- Use check constraints for valid date windows and non-negative quota values where practical.
- Soft deletion/archive for user content where audit/history matters; do not silently delete financial/claim/audit history.
- Index common search filters, public status, city/area, category, business ID, creator ID and claim lookups.
- Avoid storing exact geolocation unless the feature needs it; city/area text is adequate for initial local filtering.

## 7. Security Requirements

### 7.1 Authentication and session security

- Use a maintained authentication library/provider.
- Hash passwords with Argon2id, scrypt or an equivalent modern password hashing function if locally managed.
- Secure cookies: `HttpOnly`, `Secure` in production, appropriate `SameSite`, narrow path/domain.
- Rotate/invalidate sessions on credential changes and account suspension.
- Enforce rate limits and backoff on login, password recovery, claim and code verification flows.
- Use MFA for administrative accounts before public launch.

### 7.2 Authorisation

- Enforce role and object ownership at the server/service layer.
- Do not rely on hidden UI controls as a security boundary.
- Prevent insecure direct object reference (IDOR) by checking resource ownership for every read/write.
- Admin APIs must be separately guarded and audited.
- Public responses must be DTO allow-lists, not full ORM objects.

### 7.3 Input, media and web security

- Validate all inputs with schemas on the server.
- Encode output and use framework protections against XSS; render user content as text/limited safe formatting, not arbitrary HTML.
- Use parameterised queries/ORM methods; never concatenate untrusted SQL.
- Configure CSRF protection for cookie-authenticated mutations as required by the selected framework.
- Restrict CORS to approved origins; do not use wildcard credentialed CORS.
- Validate MIME type, extension, size and image decoding for uploads; strip metadata where practical; store outside the application server filesystem.
- Protect against mass assignment by accepting only explicitly allowed fields.
- Add security headers (CSP, HSTS in production, frame restrictions, content type options, referrer policy).
- Keep secrets in environment/secret manager, never in source control or client bundles.

### 7.4 Claim-code security

- Generate codes with a cryptographically secure random generator.
- Do not use sequential IDs or short predictable counters as codes.
- Store only a hash of the redeemable code where possible.
- Rate-limit verification attempts and add abuse monitoring.
- Never log raw claim codes.
- Verify the business owning the offer before redemption.
- Use a transaction/conditional update to guarantee one-time redemption.

### 7.5 Privacy

- Collect only information required for account, profile, offer and redemption operations.
- Keep customer claim details private to the customer, the owning business to the minimum required for redemption, and authorised admins.
- Provide a documented process for account/data access and deletion requests according to the applicable jurisdiction and final privacy policy.
- Set data retention and analytics aggregation rules before production.
- Obtain legal review of privacy, consumer promotion and creator disclosure obligations in the chosen launch jurisdiction. This SRS does not constitute legal advice.

## 8. Non-Functional Requirements

Targets below are proposed engineering objectives for a small pilot and must be revisited with hosting, traffic and budget choices.

| ID | Category | Requirement / target |
|---|---|---|
| NFR-001 | Performance | Typical public page server response target: p95 under 2 seconds under expected pilot load, excluding third-party asset delivery. |
| NFR-002 | Performance | Search results should return within 2 seconds p95 for the initial indexed dataset and bounded page size. |
| NFR-003 | Performance | Claim and redemption operations should complete within 2 seconds p95 under normal conditions and remain transaction-safe under concurrency. |
| NFR-004 | Availability | Pilot target: 99.5% monthly application availability, excluding planned maintenance and third-party outages. This is an objective, not a contractual SLA. |
| NFR-005 | Scalability | Stateless application instances should be horizontally scalable; shared state belongs in database/cache/object storage. |
| NFR-006 | Security | No known critical/high severity vulnerabilities at pilot release; dependency and secret scanning included in CI. |
| NFR-007 | Accessibility | Aim for WCAG 2.2 AA practices on core flows; perform automated and manual keyboard checks. |
| NFR-008 | Compatibility | Support modern evergreen browsers and responsive widths from 360px mobile to desktop. |
| NFR-009 | Reliability | Critical writes use transactions; retries must not duplicate claims or redemptions. |
| NFR-010 | Observability | Structured logs, error monitoring and health endpoint; never log credentials, tokens or raw claim codes. |
| NFR-011 | Maintainability | Domain logic separated from UI; schema migrations version-controlled; lint, type-check and tests run in CI. |
| NFR-012 | Backup/recovery | Production database backups enabled; restoration procedure tested before public launch. |
| NFR-013 | Data integrity | UTC timestamps, referential integrity, uniqueness and concurrency constraints enforced by database. |
| NFR-014 | Usability | Core customer claim and business redemption journeys should be testable with first-time users without developer assistance. |

## 9. Error Handling and Edge Cases

The system must explicitly handle:

- User tries to claim an offer before start or after end.
- Offer paused/expired/ended while customer is viewing it.
- Offer quota exhausted during simultaneous claim attempts.
- Customer double-clicks Claim or retries after a network timeout.
- Customer already reached per-customer claim limit.
- Code is malformed, unknown, expired, already redeemed or belongs to another business.
- Two operators attempt to redeem the same code simultaneously.
- Business is suspended after claims already exist.
- Creator/business access is pending or revoked.
- Recommendation is unpublished after a customer has saved it.
- Linked offer expires while a recommendation remains published.
- Image upload fails or file exceeds allowed size/type.
- Search/filter returns no results.
- User loses connectivity during claim or redemption; UI must re-fetch authoritative state rather than assume the write failed or succeeded.
- Admin attempts to act on an already-resolved report or invalid state transition.

For any operation with an uncertain network result, the frontend should query the persisted server state before allowing a second write. Use idempotency keys for sensitive operations where practical.

## 10. Testing and Verification

### 10.1 Unit tests

- Offer validity and quota rule functions.
- Role and resource authorization helpers.
- Recommendation/offer state transition guards.
- Claim code generation and hashing utilities.
- Analytics metric aggregation rules.
- Input validation schemas.

### 10.2 Integration tests

- Registration/login/password recovery using test provider or local test adapter.
- Creator/business application and approval.
- Recommendation draft, publish, edit and archive.
- Business profile and offer lifecycle.
- Claim success, duplicate claim, quota exhaustion and expired offer.
- Redemption success, wrong-business redemption, repeated redemption and concurrent redemption.
- Attribution persistence from recommendation to claim.
- Analytics access isolation between two creators/businesses.
- Report submission, moderation and audit events.

### 10.3 End-to-end tests

At minimum automate these full paths:

1. Visitor discovers a recommendation, registers, claims its linked offer and sees a claim code.
2. Business logs in, verifies the claim and sees the redemption reflected in analytics.
3. Creator creates a recommendation, admin approves it, and it appears in public discovery.
4. Business applies, admin approves it, business creates an offer and it appears publicly.
5. A customer cannot access another customer's claim or another business's analytics.
6. Admin rejects a creator/business application and the applicant sees the decision reason.

### 10.4 Security tests

- IDOR tests across users, creator profiles, businesses, offers and claims.
- Role escalation tests (customer attempting creator/business/admin routes).
- Rate-limit tests for login, password reset and code verification.
- Input/XSS tests for creator content and business descriptions.
- Upload validation tests.
- Concurrent claim quota test.
- Concurrent redemption test.
- Session invalidation test after suspension/password reset.

### 10.5 Release gate

Do not release until:

- Migrations apply cleanly to a fresh database and an upgrade database.
- Lint, type-check, unit, integration and E2E suites pass.
- No secrets or production credentials exist in source control.
- Core pages and flows pass responsive/keyboard checks.
- Claim/redemption concurrency tests pass.
- Production backups and error monitoring are configured.
- Admin account/bootstrap process is documented and secure.

## 11. Deployment and Operations

### 11.1 Environments

- Local development.
- Test/preview environment.
- Production.

Use separate databases and storage buckets per environment. Never use production customer data in local development without approved anonymisation.

### 11.2 Environment configuration

At minimum document and validate:

- Database connection URL.
- Authentication/session secrets and provider settings.
- App base URL and allowed origins.
- Email provider credentials/from address, if email is enabled.
- Object storage endpoint, bucket, region, access keys and public asset base URL.
- Rate-limit storage/configuration if externalised.
- Error-monitoring DSN.
- Admin bootstrap configuration or documented secure bootstrap command.

Provide `.env.example` with placeholders only. Validate required variables at startup and fail with clear, non-secret error messages.

### 11.3 Database and media operations

- Use versioned migrations; do not mutate production schema manually.
- Add backups and a documented restore procedure.
- Use lifecycle/cleanup rules for abandoned uploads and deleted content.
- Restrict media upload permissions and size/type.
- Avoid storing media in ephemeral application filesystem.

### 11.4 Monitoring

Monitor:

- Application health and error rates.
- API latency and database connection health.
- Failed login and password recovery bursts.
- Claim creation failures and quota conflicts.
- Redemption failures and suspicious verification attempts.
- Media upload failures.
- Admin/moderation activity.

## 12. Traceability Matrix

| PRD requirement group | SRS sections |
|---|---|
| FR-001 to FR-007: identity and roles | 2.2, 5.1, 5.2, 7.1, 7.2 |
| FR-010 to FR-017: discovery | 4.1, 4.2, 5.3 |
| FR-020 to FR-025: creator recommendations | 5.4, 6.2, 8.2 |
| FR-030 to FR-035: business profiles/offers | 5.5, 6.2 |
| FR-040 to FR-046: claims/redemption | 5.6, 5.7, 7.4, 9 |
| FR-050 to FR-054: analytics | 5.8, 6.2 |
| FR-060 to FR-065: moderation/audit | 5.9, 6.2, 7.2 |
| FR-070 to FR-074: UX/accessibility | 4.1, 8 |

## 13. Open Technical Decisions

The engineering lead and founder should decide before production:

1. Final stack based on existing repository and team capability.
2. Authentication provider and email delivery provider.
3. Object storage provider and media processing rules.
4. Whether creator and offer content is pre-moderated or post-moderated after first approval.
5. Claim quota policy (unlimited, total cap, per-user cap or combination).
6. Exact claim-code format and whether QR display is needed (manual code entry is sufficient for MVP).
7. Search engine choice; database full-text search is likely sufficient for early data volume.
8. Whether public discovery uses city/area only or device geolocation; city/area is recommended initially.
9. Analytics deduplication window and whether view counts are unique users, sessions or raw events.
10. Hosting, backup, monitoring and incident-response ownership.

