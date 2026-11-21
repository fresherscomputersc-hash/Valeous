# Requirements Traceability Matrix — Discovery-to-Commerce MVP

Maps every PRD Functional Requirement (`FR-001` through `FR-074`) and the 22-scenario test matrix to implemented code modules and executed automated test suites.

| ID | Priority | Requirement Summary | Primary Implementation Modules | Verified Automated Test Coverage |
|---|---|---|---|---|
| FR-001 | P0 | Public browsing without account; sign-in gate on actions | `src/app/page.tsx`, `src/server/services/discovery.service.ts` | `tests/integration/content-offers.test.ts`, `tests/e2e/pilot-journeys.spec.ts` |
| FR-002 | P0 | Secure registration & login; non-enumerating errors | `src/server/services/auth.service.ts`, `src/app/api/auth/{register,login}` | `tests/integration/auth-rbac.test.ts`, `tests/e2e/pilot-journeys.spec.ts` |
| FR-003 | P0 | Sign-out & time-limited single-use password reset | `src/server/services/auth.service.ts`, `src/app/api/auth/{logout,forgot-password,reset-password}` | `tests/integration/auth-rbac.test.ts` |
| FR-004 | P0 | Customer, creator, business & admin server-side RBAC | `src/server/permissions/rbac.ts`, all `/api/*` handlers | `tests/integration/auth-rbac.test.ts`, `tests/integration/analytics-moderation-uploads.test.ts` |
| FR-005 | P0 | Customer can request creator or business access | `src/server/services/application.service.ts`, `/api/creators/applications`, `/api/businesses/applications` | `tests/integration/auth-rbac.test.ts`, `tests/e2e/pilot-journeys.spec.ts` |
| FR-006 | P0 | Admin approves/rejects applications with persisted reason | `src/server/services/moderation.service.ts`, `/api/admin/applications` | `tests/integration/auth-rbac.test.ts`, `tests/e2e/pilot-journeys.spec.ts` |
| FR-007 | P1 | Multi-role account support & explicit workspace navigation | `src/components/layout/Navbar.tsx`, `src/server/permissions/rbac.ts` | `tests/integration/auth-rbac.test.ts`, `tests/e2e/pilot-journeys.spec.ts` |
| FR-010 | P0 | Discover shows only published, approved, visible items | `src/server/services/discovery.service.ts`, `src/app/page.tsx` | `tests/integration/content-offers.test.ts` |
| FR-011 | P0 | Keyword search across recommendations & businesses | `src/server/services/discovery.service.ts`, `src/app/search/page.tsx`, `/api/search` | `tests/integration/content-offers.test.ts` |
| FR-012 | P0 | Combined filters by category, city, and area | `src/server/services/discovery.service.ts`, `/api/discovery`, `/api/search` | `tests/integration/content-offers.test.ts` |
| FR-013 | P0 | Recommendation detail with creator, business & offer | `src/app/recommendations/[id]/page.tsx`, `/api/recommendations/[id]` | `tests/integration/content-offers.test.ts`, `tests/e2e/pilot-journeys.spec.ts` |
| FR-014 | P0 | Public business and creator profiles (approved only) | `src/app/creators/[handle]/page.tsx`, `src/app/businesses/[slug]/page.tsx` | `tests/e2e/pilot-journeys.spec.ts` |
| FR-015 | P1 | Deterministic Local Picks, Creator Favourites, New, Popular, Nearby | `src/server/services/discovery.service.ts`, `src/app/page.tsx` | `tests/integration/content-offers.test.ts`, `tests/e2e/pilot-journeys.spec.ts` |
| FR-016 | P1 | Follow / unfollow creators + Following view | `src/server/services/engagement.service.ts`, `/api/follows`, `src/app/saved/page.tsx` | `src/components/discovery/FollowSaveButtons.tsx` |
| FR-017 | P1 | Save / unsave recommendations & offers + `/saved` | `src/server/services/engagement.service.ts`, `/api/saves`, `src/app/saved/page.tsx` | `src/features/customer/SavedListClient.tsx` |
| FR-020 | P0 | Approved creators create private recommendation drafts | `src/server/services/recommendation.service.ts`, `/api/recommendations` | `tests/integration/content-offers.test.ts` |
| FR-021 | P0 | Recommendation fields, media validation & valid links | `src/server/validation/schemas.ts`, `src/server/services/media.service.ts` | `tests/integration/analytics-moderation-uploads.test.ts` |
| FR-022 | P0 | Approved creators submit/publish own recommendations | `src/server/services/recommendation.service.ts`, `/api/recommendations/[id]/publish` | `tests/integration/content-offers.test.ts`, `tests/e2e/pilot-journeys.spec.ts` |
| FR-023 | P0 | Creators edit, unpublish, or archive own recommendations | `src/server/services/recommendation.service.ts`, `/api/recommendations/[id]` | `tests/integration/content-offers.test.ts` |
| FR-024 | P0 | Deduplicated recommendation view & CTA click events | `src/server/services/analytics.service.ts`, `/api/events` | `tests/integration/analytics-moderation-uploads.test.ts` |
| FR-025 | P1 | Creator analytics dashboard (own content only) | `src/server/services/analytics.service.ts`, `src/app/creator/analytics/page.tsx` | `tests/integration/analytics-moderation-uploads.test.ts`, `tests/e2e/pilot-journeys.spec.ts` |
| FR-030 | P0 | Approved businesses create & edit public profile | `src/server/services/application.service.ts`, `src/app/business/profile/page.tsx` | `src/features/businesses/BusinessProfileForm.tsx` |
| FR-031 | P0 | Businesses create offers with terms, limits & validity | `src/server/services/offer.service.ts`, `src/app/business/offers/new/page.tsx` | `tests/integration/content-offers.test.ts`, `tests/unit/domain-rules.test.ts` |
| FR-032 | P0 | Offer state machine enforced server-side | `src/server/services/offer.service.ts` | `tests/integration/content-offers.test.ts` |
| FR-033 | P0 | Only approved businesses publish; only active claimable | `src/server/services/offer.service.ts`, `src/server/services/claim.service.ts` | `tests/integration/claims-redemptions.test.ts` |
| FR-034 | P0 | Business can pause or end own offer | `src/server/services/offer.service.ts`, `/api/offers/[id]` | `tests/integration/content-offers.test.ts` |
| FR-035 | P0 | Business dashboard shows own views, claims & redemptions | `src/server/services/analytics.service.ts`, `src/app/business/analytics/page.tsx` | `tests/integration/analytics-moderation-uploads.test.ts`, `tests/e2e/pilot-journeys.spec.ts` |
| FR-040 | P0 | Signed-in customers claim active eligible offers (concurrency-safe) | `src/server/services/claim.service.ts`, `/api/offers/[id]/claim` | `tests/integration/claims-redemptions.test.ts`, `tests/e2e/pilot-journeys.spec.ts` |
| FR-041 | P0 | Cryptographically random, hashed, unique claim codes | `src/server/lib/crypto.ts`, `src/server/services/claim.service.ts` | `tests/unit/domain-rules.test.ts`, `tests/integration/claims-redemptions.test.ts` |
| FR-042 | P0 | Customer views active, redeemed & expired claims | `src/app/my-claims/page.tsx`, `/api/me/claims` | `tests/integration/claims-redemptions.test.ts`, `tests/e2e/pilot-journeys.spec.ts` |
| FR-043 | P0 | Owning business verifies & atomically redeems code once | `src/server/services/claim.service.ts`, `/api/redemptions/verify` | `tests/integration/claims-redemptions.test.ts`, `tests/e2e/pilot-journeys.spec.ts` |
| FR-044 | P0 | Invalid, expired, used, or wrong-business codes rejected | `src/server/services/claim.service.ts` | `tests/integration/claims-redemptions.test.ts`, `tests/e2e/pilot-journeys.spec.ts` |
| FR-045 | P0 | Claim preserves immutable recommendation & creator source | `src/server/services/claim.service.ts` | `tests/integration/claims-redemptions.test.ts` |
| FR-046 | P1 | Rate-limited manual code lookup/verification in dashboard | `src/app/business/redemptions/page.tsx`, `/api/redemptions/verify` | `tests/e2e/pilot-journeys.spec.ts` |
| FR-050 | P0 | Record core product events with deduplication | `src/server/services/analytics.service.ts` | `tests/integration/analytics-moderation-uploads.test.ts` |
| FR-051 | P0 | Creator analytics strictly isolated to owning creator | `src/server/services/analytics.service.ts`, `/api/creator/analytics` | `tests/integration/analytics-moderation-uploads.test.ts` |
| FR-052 | P0 | Business analytics strictly isolated to owning business | `src/server/services/analytics.service.ts`, `/api/business/analytics` | `tests/integration/analytics-moderation-uploads.test.ts` |
| FR-053 | P0 | Explicit non-sales labels distinguishing claims & redemptions | `src/app/creator/analytics/page.tsx`, `src/app/business/analytics/page.tsx` | `tests/e2e/pilot-journeys.spec.ts` |
| FR-054 | P1 | Admin aggregate platform activity overview | `src/server/services/moderation.service.ts`, `src/app/admin/page.tsx` | `src/app/admin/page.tsx` |
| FR-060 | P0 | Admin approves/rejects creator & business applications | `src/server/services/moderation.service.ts`, `src/app/admin/applications/page.tsx` | `tests/integration/auth-rbac.test.ts`, `tests/e2e/pilot-journeys.spec.ts` |
| FR-061 | P0 | Admin reviews, hides, approves or rejects content/offers | `src/server/services/moderation.service.ts`, `/api/admin/{recommendations,offers}/[id]` | `tests/integration/content-offers.test.ts`, `tests/e2e/pilot-journeys.spec.ts` |
| FR-062 | P0 | Admin suspends/reactivates accounts + session revocation | `src/server/services/moderation.service.ts`, `/api/admin/users/[id]` | `tests/integration/analytics-moderation-uploads.test.ts` |
| FR-063 | P0 | Rate-limited user content/profile reporting | `src/server/services/moderation.service.ts`, `/api/reports` | `tests/integration/analytics-moderation-uploads.test.ts` |
| FR-064 | P0 | Admin reviews & resolves/dismisses reports | `src/server/services/moderation.service.ts`, `/api/admin/reports/[id]` | `tests/integration/analytics-moderation-uploads.test.ts` |
| FR-065 | P0 | Append-only audit log for admin/moderation/security ops | `src/server/audit/audit.service.ts`, `src/app/admin/audit-log/page.tsx` | `tests/integration/analytics-moderation-uploads.test.ts`, `tests/e2e/pilot-journeys.spec.ts` |
| FR-070 | P0 | Mobile, tablet & desktop responsive layouts (360px+) | `src/components/*`, `src/app/*` | `tests/e2e/pilot-journeys.spec.ts` (`360x800` overflow assertions) |
| FR-071 | P0 | Form validation, loading, success & actionable error states | `src/components/ui/*`, all workspace forms | `tests/e2e/pilot-journeys.spec.ts` |
| FR-072 | P0 | Confirmation dialogs for destructive actions | `src/components/ui/ConfirmDialog.tsx` | `src/features/creators/CreatorRecommendationsTable.tsx`, `src/features/businesses/BusinessOffersTable.tsx` |
| FR-073 | P0 | Image alt text, semantic labels & keyboard focus | `src/components/*`, `src/app/globals.css` | `tests/e2e/pilot-journeys.spec.ts` |
| FR-074 | P1 | Actionable empty states across discovery & dashboards | `src/components/ui/EmptyState.tsx` | `src/app/{page,search/page,saved/page,my-claims/page}.tsx` |
