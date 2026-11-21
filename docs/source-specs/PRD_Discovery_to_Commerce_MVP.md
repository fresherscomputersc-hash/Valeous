# Product Requirements Document (PRD)
## Discovery-to-Commerce Platform  -  MVP

**Document version:** 1.0  
**Date:** 6 November 2026  
**Status:** Draft for founder and engineering review  
**Product name:** Not defined in source deck; use a working title only  
**Source:** *Founding Technical Partner Opportunity* presentation, slides 1-12

---

## 1. Executive Summary

The proposed product is a discovery-to-commerce platform connecting three participant groups:

1. **People / customers** who want to discover useful offers, products, places and experiences.
2. **Creators** who share recommendations and want a clearer connection between their influence and measurable outcomes.
3. **Businesses** that want to reach relevant customers and understand whether discovery creates meaningful interest and offer redemptions.

The platform aims to connect recommendation, discovery and real-world value in one experience. The source presentation frames the idea as a more useful bridge between social discovery and commerce. It describes the product direction as Discover -> Trust -> Act -> Benefit and shows an illustrative discovery interface with search, local picks, creator favourites, new experiences, For You, Popular and Nearby sections.

The presentation explicitly places the opportunity at the idea and research stage. It does not establish a validated market, final business model, final product scope, pricing, funding plan, launch geography, or agreed founder compensation. This PRD therefore separates **what the presentation says** from **proposed MVP decisions** that must be approved before implementation.

### MVP recommendation

Build a responsive web application that lets:

- Customers browse recommendations and approved businesses, search/filter discovery content, follow creators, save content/offers, and claim eligible offers.
- Approved creators create and publish recommendations linked to businesses or places, and view basic engagement and offer-claim attribution.
- Approved businesses manage a public business profile, publish time-bounded offers, verify customer redemption codes, and view basic performance metrics.
- Platform administrators approve creator/business accounts, moderate content/offers, suspend accounts and review audit activity.

The MVP will measure **platform activity** (views, clicks, saves, claims and verified redemptions). It will not claim that a click or redemption is a completed sale, nor will it process payments.

## 2. Product Context and Source Boundaries

### 2.1 Requirements grounded in the presentation

The following are directly stated or clearly depicted in the 12-slide presentation:

- The opportunity is a discovery-to-commerce concept built around people, creators and businesses.
- People should discover worthwhile offers and experiences through recommendations.
- Creators should share recommendations and build meaningful audience connections.
- Businesses should reach relevant customers and turn discovery into measurable interest and sales.
- The identified gap is fragmented discovery, inconsistent creator outcome measurement and the need for practical customer acquisition for smaller businesses.
- The product journey is Discover, Trust, Act and Benefit.
- The illustrative UI contains search, local picks, creator favourites, new experiences, For You, Popular and Nearby.
- The concept is at idea/research stage; the final business model, product scope and features are not fixed.
- The proposed technical co-founder would own technology strategy, architecture, engineering, security, reliability and technical execution.

### 2.2 Items not defined by the presentation

The presentation does **not** specify the following. They must not be represented as established facts:

- Product/company name, launch city, target country or launch date.
- Market size, competitor analysis, customer research results or validated demand.
- Monetisation, commissions, subscriptions, advertising, creator payouts or business pricing.
- Checkout, payments, order fulfilment, delivery, bookings, reservations or POS integrations.
- Exact roles, permission rules, feature list, technology stack, service-level targets or data retention policy.
- Equity, salary, ownership or founder vesting terms.

### 2.3 Proposed MVP assumptions

These are recommended product decisions to make the first release buildable. They are assumptions, not facts from the deck:

| ID | Proposed decision | Reason / validation needed |
|---|---|---|
| A-01 | Start with one configurable pilot city/market, with city and area stored as data rather than hard-coded. | Makes local discovery operationally testable. Founder must choose the launch market. |
| A-02 | Launch as a responsive web application/PWA, not native iOS/Android apps. | Reduces build and distribution cost for an early test. |
| A-03 | Do not process payments or complete purchases in the MVP. | The deck does not define checkout, settlement or payment operations. |
| A-04 | Use creator recommendations linked to a business/location, with optional offer association. | Connects discovery to measurable action. |
| A-05 | Use a one-time claim code for offer redemption, verified by the business in its dashboard. | Creates a measurable offline action without POS integration. |
| A-06 | Track views, CTA clicks, saves, offer claims and verified redemptions. | Provides a simple first attribution model. These are activity metrics, not sales. |
| A-07 | Require admin approval for creator and business publishing access. | Reduces spam and protects early marketplace quality. |
| A-08 | Allow public browsing; require sign-in for follows, saves, claims and publishing. | Low-friction discovery with authenticated actions. |
| A-09 | Support image-based recommendations only in MVP; defer native video hosting. | Keeps upload, storage and moderation scope manageable. |
| A-10 | No public user reviews/ratings in MVP. | Avoids adding a separate trust and moderation system before validation. |

## 3. Product Vision

**Vision statement:** Make it easier for people to discover worthwhile places, products, experiences and offers through trusted recommendations, while giving creators and businesses a clearer way to understand the actions those recommendations generate.

**Product principle:** Every feature should strengthen at least one connection in this chain:

`Creator / business content -> customer discovery -> informed action -> measurable outcome`

The product should feel useful and trustworthy, not like an unfiltered coupon directory or an imitation of a social network.

## 4. Goals, Outcomes and Non-Goals

### 4.1 MVP goals

- G-01: Provide one searchable discovery experience for approved recommendations, businesses and active offers.
- G-02: Let approved creators publish structured recommendations connected to businesses/places.
- G-03: Let approved businesses publish offers with clear eligibility, terms and expiry.
- G-04: Let customers save recommendations/offers and claim eligible offers.
- G-05: Let businesses verify claims and prevent the same claim from being redeemed more than once.
- G-06: Attribute offer claims to the recommendation/creator that referred the customer when that path is known.
- G-07: Give creators and businesses basic, clearly defined activity analytics.
- G-08: Provide admin controls for approval, moderation, suspension and auditability.
- G-09: Validate the core value proposition with a small pilot before expanding scope.

### 4.2 Proposed success measures

These are measurement definitions, not promised targets. Baselines and numerical targets should be set after the pilot cohort and test period are agreed.

| Metric | Definition | Why it matters |
|---|---|---|
| Activated customers | Unique customers who complete at least one meaningful action (follow, save or claim) in the measurement period. | Indicates value beyond page views. |
| Creator activation | Approved creators who publish at least one recommendation. | Indicates creator-side supply. |
| Business activation | Approved businesses with a complete profile and at least one active offer. | Indicates merchant-side supply. |
| Recommendation engagement rate | Unique recommendation detail views that result in a CTA click or save ÷ unique recommendation detail views. | Indicates whether recommendations are useful. |
| Offer claim rate | Unique offer claims ÷ unique offer detail views. | Indicates offer relevance and clarity. |
| Redemption rate | Verified redemptions ÷ valid claims whose validity period has ended. | Indicates real-world usage. Do not divide by all claims before expiry. |
| Attribution coverage | Claims with a recorded recommendation/creator source ÷ all claims. | Indicates how measurable discovery is. |
| Repeat discovery | Customers returning and taking a meaningful action in a later session/period. | Early retention signal. |

Do not use GMV, revenue, conversion-to-sale or creator earnings as MVP metrics unless a verified transaction/payment system is added later.

### 4.3 Non-goals for MVP

- In-app payments, checkout, wallets, refunds, payouts or commissions.
- Delivery, shipping, inventory management or order management.
- Restaurant table reservations, appointment booking or ticketing.
- POS integration or automatic point-of-sale sales attribution.
- Creator marketplace contracts, campaign negotiation or payment settlement.
- Native mobile applications.
- Live streaming, short-form video hosting, direct messaging or comments.
- AI recommendations, ranking personalisation or automated creator matching.
- Public reviews, star ratings or user-generated business ratings.
- Multi-country tax, currency or localisation workflows.
- Complex business organisations, staff seats or multi-branch inventory.

## 5. Users and Personas

### 5.1 Customer / person

**Need:** Discover places, products, experiences and offers that are relevant and credible. Understand the offer terms before acting.  
**Primary actions:** Browse, search, filter, open a recommendation/business/offer, follow creators, save items, claim offers and present a claim code.  
**Pain to solve:** Useful recommendations are scattered and it is difficult to move from inspiration to a clear next step.

### 5.2 Creator

**Need:** Publish recommendations in an organised way and understand whether people engage with them.  
**Primary actions:** Complete creator profile, submit for approval, publish/edit/archive recommendations, link recommendations to businesses/offers, view performance.  
**Pain to solve:** Attention is not always connected to a measurable outcome.

### 5.3 Business owner/operator

**Need:** Present a trustworthy business profile, publish clear offers and understand engagement/redemptions.  
**Primary actions:** Apply for business access, manage profile, create/pause/expire offers, view claims, verify redemption codes, review analytics.  
**Pain to solve:** Visibility alone does not tell the business whether a promotion created meaningful interest or visits.

### 5.4 Platform administrator/moderator

**Need:** Keep the platform safe, accurate and useful.  
**Primary actions:** Approve/reject creator and business applications, moderate recommendations and offers, handle reports, suspend users, view audit logs and platform metrics.

## 6. Product Scope and Information Architecture

### 6.1 Main navigation

Customer-facing navigation (responsive):

- Discover
- Search
- Saved
- Following (or a Following filter within Discover)
- Profile / Sign in

Creator navigation after approval:

- Creator dashboard
- My recommendations
- Create recommendation
- Analytics
- Public profile

Business navigation after approval:

- Business dashboard
- Business profile
- Offers
- Redemptions
- Analytics

Admin navigation:

- Overview
- Creator applications
- Business applications
- Recommendations moderation
- Offers moderation
- Reports
- Users
- Audit log

### 6.2 Public pages

- Home/discovery feed.
- Search results.
- Recommendation detail.
- Creator public profile.
- Business public profile.
- Offer detail.
- Sign-in, registration and password recovery.

### 6.3 Authenticated pages

- Customer saved items and followed creators.
- Customer active/used/expired offer claims.
- Creator workspace and analytics.
- Business workspace, offer management and redemption verification.
- Admin workspace.

## 7. Core User Journeys

### 7.1 Customer discovers and claims an offer

1. Customer opens Discover without signing in.
2. Customer browses recommendations or searches by keyword/category/city/area.
3. Customer opens a recommendation or business profile.
4. Customer sees the linked offer, eligibility and terms.
5. Customer signs in or registers if necessary.
6. Customer selects Claim offer.
7. System atomically creates one valid claim for that customer and offer, subject to limits.
8. Customer sees a unique claim code and validity details.
9. At the business, customer presents the code.
10. Business operator verifies and marks the code redeemed.
11. System records the redemption and source attribution, if present.

### 7.2 Creator publishes a recommendation

1. User registers and requests creator access.
2. Creator supplies a profile name, bio and relevant details.
3. Admin approves or rejects the application.
4. Approved creator creates a recommendation with title, text, category, cover image, location/business association and optional offer.
5. Creator previews and publishes it.
6. Recommendation becomes visible after any required moderation rule is satisfied.
7. Creator views aggregate views, clicks, saves and attributed claims.

### 7.3 Business publishes and verifies an offer

1. User registers and requests business access.
2. User supplies business identity and contact/location details.
3. Admin approves or rejects the business.
4. Approved business completes its public profile.
5. Business creates an offer with title, description, terms, validity, limits and redemption instructions.
6. Offer is reviewed/approved according to admin policy, then becomes visible while active.
7. Customer claims offer and receives a unique code.
8. Business operator enters/scans the code in its authenticated dashboard.
9. System verifies ownership, status and validity, then records one redemption.
10. Business sees aggregate views, clicks, claims and verified redemptions.

### 7.4 Admin approval and moderation

1. Admin opens pending applications/content.
2. Admin reviews provided information and supporting content.
3. Admin approves, rejects with a reason, requests correction (optional) or suspends.
4. System records actor, action, target, timestamp and reason in an audit log.
5. User sees the resulting status and reason where appropriate.

## 8. Functional Requirements

Priority definitions: **P0** = required for MVP launch; **P1** = important, implement if capacity permits; **P2** = later enhancement.

### 8.1 Identity, accounts and roles

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-001 | P0 | A visitor can browse public discovery pages without an account. | Public pages load without authentication; protected actions request sign-in. |
| FR-002 | P0 | A person can register and sign in securely. | Valid registration creates one account; duplicate email is rejected; invalid credentials do not reveal whether an email exists. |
| FR-003 | P0 | A user can sign out and recover access through a secure password-reset flow. | Reset token is time-limited, single-use and does not disclose account existence. |
| FR-004 | P0 | The system supports customer, creator, business and admin permissions. | Server-side authorization is enforced for every protected operation. |
| FR-005 | P0 | A customer can request creator or business access. | Request status is pending/approved/rejected; only approved profiles can publish. |
| FR-006 | P0 | Admin can approve/reject creator and business requests with a reason. | Status changes are persisted and audited; rejected applicants can see the reason. |
| FR-007 | P1 | One account may hold customer access plus one or more approved creator/business profiles. | Role switching is explicit and does not expose another profile's data. |

### 8.2 Discovery and search

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-010 | P0 | Discover page displays published, approved and currently visible recommendations. | Draft, rejected, archived or suspended content is not publicly visible. |
| FR-011 | P0 | Users can search recommendations and businesses by text. | Search supports title, description and business name; empty results show a useful empty state. |
| FR-012 | P0 | Users can filter by category and city/area. | Filters can be combined and are reflected in the result set. |
| FR-013 | P0 | Users can view recommendation details and linked creator/business/offer information. | Detail page shows creator, content, location, linked business and valid offer when present. |
| FR-014 | P0 | Users can view business and creator public profiles. | Only active, approved profiles are public. |
| FR-015 | P1 | Discover includes Local Picks, Creator Favourites, New Experiences, Popular and Nearby groupings. | MVP may implement these as deterministic, transparent sort/filter groups; no ML ranking is required. |
| FR-016 | P1 | Users can follow/unfollow creators. | Follow state is unique per customer/creator and reflected in Following view. |
| FR-017 | P1 | Users can save/unsave recommendations and offers. | Save state is unique per customer/item and visible in Saved. |

### 8.3 Creator recommendations

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-020 | P0 | Approved creators can create a recommendation draft. | Required fields are validated; draft is private to creator and admins. |
| FR-021 | P0 | A recommendation supports title, description, category, cover image, location and optional linked business/offer. | Field limits, file type and size rules are enforced; relationships are valid. |
| FR-022 | P0 | Approved creators can submit/publish recommendations. | Published content passes moderation policy; creator cannot publish as another account. |
| FR-023 | P0 | Creators can edit, unpublish or archive their own recommendations. | Changes are audited; archived/unpublished content disappears from public discovery. |
| FR-024 | P0 | Each public recommendation records view and CTA interaction events. | Events are deduplicated/rate-limited as defined in SRS and attributed to the content. |
| FR-025 | P1 | Creators can view basic analytics for their own recommendations. | Dashboard shows date range and counts for views, CTA clicks, saves and attributed claims. |

### 8.4 Business profiles and offers

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-030 | P0 | Approved businesses can create and edit a public profile. | Profile includes name, description, category, address/area, contact details, opening information (optional) and images. |
| FR-031 | P0 | Businesses can create offers with clear terms and validity. | Required fields include title, description, terms, start/end time, redemption instructions and claim limit settings. |
| FR-032 | P0 | Offers have draft, pending review, active, paused, expired and rejected states. | Invalid transitions are rejected server-side. |
| FR-033 | P0 | Only approved businesses can submit offers; only active offers are claimable. | Ownership and status checks occur server-side. |
| FR-034 | P0 | Business can pause or end its own offer. | Paused/ended offers cannot be newly claimed; existing valid claims follow the stated claim terms. |
| FR-035 | P0 | Business dashboard shows offer views, claims and verified redemptions. | Metrics use consistent event definitions and only show the business's data. |

### 8.5 Claims, redemption and attribution

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-040 | P0 | Signed-in customers can claim an active offer. | Claim succeeds only if offer is active, within validity, within quota and customer has not exceeded per-customer limits. |
| FR-041 | P0 | Each claim receives a unique, non-guessable redemption code. | Code is stored securely (preferably hashed) and is not reused. |
| FR-042 | P0 | A customer can view active, redeemed and expired claims. | Claim state and expiry are clear; code is visible only to the claimant and authorised business/admin. |
| FR-043 | P0 | An authorised business operator can verify and redeem a code. | System validates business ownership, offer, expiry and unused status; redemption is atomic and single-use. |
| FR-044 | P0 | A redemption attempt that is invalid, expired, already used or owned by another business is rejected. | Clear safe error is returned; no state is changed. |
| FR-045 | P0 | Claim records preserve recommendation/creator source when the customer claims from a tagged recommendation. | Attribution stores recommendation ID and creator ID as immutable claim-time source fields. |
| FR-046 | P1 | Business can manually search a claim by code in the dashboard. | Exact match lookup is rate-limited and does not expose unrelated customer data. |

### 8.6 Analytics and event tracking

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-050 | P0 | System records core product events: recommendation view, CTA click, save, offer view, claim and redemption. | Events include timestamp, actor/session, object, source and deduplication key where available. |
| FR-051 | P0 | Creator analytics are restricted to that creator's content. | Cross-creator data cannot be accessed by changing URL or API parameters. |
| FR-052 | P0 | Business analytics are restricted to that business's profile/offers. | Cross-business data cannot be accessed by changing URL or API parameters. |
| FR-053 | P0 | Analytics distinguish claims from verified redemptions and do not label either as sales. | UI labels and definitions are explicit. |
| FR-054 | P1 | Admin can view aggregate platform activity. | Only authorised admin roles can access aggregate reporting. |

### 8.7 Administration, moderation and trust

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-060 | P0 | Admin can review and approve/reject creator and business applications. | Every decision has actor, timestamp and optional reason. |
| FR-061 | P0 | Admin can review, hide or remove recommendations and offers. | Removed content is unavailable publicly and action is audited. |
| FR-062 | P0 | Admin can suspend/reactivate an account. | Suspended accounts cannot publish or perform privileged actions; customer account impact is communicated. |
| FR-063 | P0 | Users can report a recommendation, offer or business profile. | Report includes target, reason and optional note; duplicate/spam reports are rate-limited. |
| FR-064 | P0 | Admin can review and resolve reports. | Report state and resolution are recorded. |
| FR-065 | P0 | System keeps an audit log for security-sensitive and moderation actions. | Logs are append-only from application flows and identify actor, action, target and time. |

### 8.8 General UX and accessibility

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-070 | P0 | Application is responsive across mobile, tablet and desktop. | Core flows work at common viewport widths without horizontal page overflow. |
| FR-071 | P0 | All forms have validation, loading, success and error states. | Errors are actionable and field-specific where possible. |
| FR-072 | P0 | Destructive actions require confirmation. | Delete/archive/suspend operations provide confirmation and clear consequences. |
| FR-073 | P0 | Images have alt text and controls are keyboard accessible. | Core flows can be completed using keyboard; visible focus is present. |
| FR-074 | P1 | Empty states explain what the user can do next. | No blank dashboards or unexplained empty lists. |

## 9. Content and Data Rules

### 9.1 Recommendation rules

- Only approved creators can publish recommendations.
- Every recommendation has one owner/creator.
- A recommendation may be linked to zero or one primary business in MVP.
- A recommendation may reference zero or one active offer, subject to business ownership and offer status.
- Recommendations may be draft, pending review, published, rejected, unpublished or archived.
- A public recommendation must not expose private customer data.
- Media must be limited to approved image formats and size limits.

### 9.2 Offer rules

- Offer terms and eligibility must be visible before claim.
- Start time must be before end time.
- An offer cannot accept claims before its start or after its end.
- Claim limits and per-customer limits must be enforced in a transaction.
- A claim is not a purchase and does not imply a payment.
- Business may verify a claim only for its own offer.
- A claim may be redeemed only once.
- Existing claims must preserve the terms/expiry that applied at claim time, unless a documented admin intervention is required.

### 9.3 Trust and moderation rules

- Business/creator public publishing access is gated by approval.
- Admin moderation actions must be audited.
- Reports must not reveal reporter identity to the reported user.
- The product must support clear offer terms and creator/business identity.
- Before public launch, founders should review applicable privacy, consumer, advertising-disclosure and business-promotion obligations in the launch jurisdiction with qualified counsel. This PRD is not legal advice.

## 10. MVP Release Plan

### Phase 0  -  Product definition and validation

- Choose pilot market and initial business category/categories.
- Interview a small set of customers, creators and businesses.
- Validate whether users value creator-led recommendations and claim-code offers.
- Confirm operational owner for business onboarding and in-person redemption.
- Approve monetisation hypothesis for future testing, without implementing payments in MVP.

### Phase 1  -  Platform foundation

- Authentication, profiles, roles and approval workflows.
- Public discovery/search and business/creator pages.
- Creator recommendation publishing.
- Business profiles and offer publishing.

### Phase 2  -  Action and measurement

- Saves and follows.
- Offer claim codes.
- Business redemption verification.
- Event tracking and creator/business dashboards.

### Phase 3  -  Pilot readiness

- Admin moderation and reporting workflows.
- Security review, automated tests, backups and deployment checks.
- Seed initial approved businesses, creators and recommendations.
- Conduct pilot usability tests and reconcile redemption process with actual businesses.

## 11. Release Acceptance Criteria

The MVP is ready for a controlled pilot only when all of the following are true:

1. A visitor can browse and search approved discovery content.
2. A customer can register, sign in, follow/save and claim an eligible offer.
3. A creator can apply, be approved, publish a recommendation and see their own metrics.
4. A business can apply, be approved, publish an offer, verify a claim and see its own metrics.
5. An offer claim cannot exceed configured limits under concurrent requests.
6. A redemption code can be redeemed only once and only by the owning business.
7. Claim attribution to a recommendation/creator is preserved where available.
8. Admin can approve/reject, moderate, suspend and review reports.
9. Role and object ownership checks are enforced server-side.
10. Core flows pass automated tests and are usable on mobile and desktop.
11. Production environment has secrets configured securely, HTTPS, backups, migrations and basic error monitoring.
12. The UI does not represent views, clicks, claims or redemptions as completed sales.

## 12. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Three-sided marketplace cold start | Poor customer experience if there is too little supply or demand. | Start with one pilot market and a narrow set of categories; onboard supply before broad promotion. |
| Unclear business model | Difficult to assess long-term viability. | Validate willingness to pay and monetisation separately; do not bake a speculative model into MVP. |
| Offer abuse or code sharing | Business loses trust in the platform. | Unique claim codes, per-customer/offer limits, expiry and atomic single-use redemption. |
| False attribution | Creators/businesses may overstate impact. | Define events clearly; preserve source at claim time; label metrics as platform events, not sales. |
| Low-quality/spam content | Customer trust declines. | Approval, reporting, moderation and suspension. |
| Operational friction at redemption | Offers are claimed but not accepted smoothly. | Test code verification with pilot businesses and provide clear redemption instructions. |
| Scope expansion | MVP becomes too expensive and delayed. | Enforce explicit non-goals and prioritise P0 requirements. |
| Privacy/security weaknesses | Exposure of personal/business data. | Least privilege, secure auth, validation, rate limiting, audit logging and security testing. |

## 13. Open Questions Requiring Founder Decisions

These should be resolved before a production pilot. The MVP can be developed with configurable defaults, but it should not silently assume answers.

1. What is the product/company name and domain?
2. Which city/market and which initial business categories will be piloted?
3. Is the first use case local places/experiences only, or also physical products?
4. What is the exact redemption experience expected at the business counter?
5. Are creators independently approved, invited by the platform, or onboarded by businesses?
6. Will a creator recommendation require a linked business, or can it be a general product/experience recommendation?
7. Who handles verification of business identity and disputes over offers?
8. Which offer limits are needed: total claims, claims per person, or both?
9. What is the expected business model after validation?
10. What privacy policy, terms, content policy and creator disclosure rules will apply?
11. What team will operate moderation and business onboarding during the pilot?
12. What are the agreed pilot success thresholds and duration?

## 14. Glossary

- **Discovery:** Browsing/searching for recommendations, businesses and offers.
- **Recommendation:** Creator-authored content suggesting a place, product or experience.
- **Offer:** A business-defined benefit available under stated terms and validity.
- **Claim:** A customer action that reserves/obtains a unique code for an offer; it is not a purchase.
- **Redemption:** Business verification that a valid claim has been used.
- **Attribution:** Recording which recommendation/creator led to a claim when the customer journey provides that source.
- **MVP:** Minimum viable product used to test the core value proposition with real users.

---

**Approval note:** This PRD is a proposed implementation baseline derived from the presentation. Founder decisions in Section 13 and assumptions in Section 2.3 should be reviewed before the engineering team treats this document as final.
