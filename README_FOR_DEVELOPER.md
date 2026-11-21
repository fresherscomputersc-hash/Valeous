# 🚀 Quick Start: Building VALUEOUS Platform

This repo is the **PromoBridge** codebase — a working Business ↔ Influencer marketplace that we're evolving into **VALUEOUS** (Customer, Creator, Business) per the PPT guide.

---

## 📋 Overview of Current State vs PPT Requirements

| Area | Current | PPT Target |
|---|---|---|
| **User Roles** | INFLUENCER, BUSINESS, ADMIN | + CUSTOMER |
| **User Flow** | Business ↔ Influencer (commission sales) | + Customer discovery & consumption |
| **Core Features** | Products, Enrollments, Sales, Wallets, Payouts | + Need-to-Offer Matching, Proof Recommendations, Smart Passport, Collective Demand, Customer Voice, Post-Purchase, Local Experiences, Collaboration |
| **UI Navigation** | Influencer Studio, Business Hub, Marketplace | + Customer Space (Find → Save → Use) |

**Achieved**: The foundation for Business ↔ Creator commerce is solid. We just need to add the **Customer role** and **Customer-facing features**.

---

## 🎯 Immediate Goal (Phase 0)

Add the **Customer** role and its associated features so the platform supports:

1. **Sign-up as Customer** (can have multiple roles)
2. **Customer dashboard** at `/customer/dashboard` (Find → Save → Use)
3. **Need-to-Offer Matching** (customer request → system finds matches → business/creator responds)
4. **Integration with existing features** (Smart Value Passport, Recommendations, etc.)

**Note**: The "Influencer → Creator" terminology rename is **deferred** to later phases for stability. The code will continue using "influencer" during Phase 0.

---

## 🧩 Quick Development Guide

### Phase 0: Add Customer Role + Basic Dashboard

#### 1. Update Tailwind Config (`tailwind.config.ts`)
```bash
# Add PPT colors to the 'brand' object or extend 'colors'
# Reference VALUEOUS_ASSESSMENT_PLAN.md for exact hex values
```

#### 2. Extend User Role Enum
In `src/server/db/schema.ts`:
```typescript
export const userRoleEnum = ['INFLUENCER', 'BUSINESS', 'ADMIN', 'CUSTOMER'] as const;
export type UserRole = (typeof userRoleEnum)[number];
```

Also update:
- `src/server/validation/schemas.ts` registerSchema role enum
- `src/server/auth/session.ts` AuthenticatedActor.role
- `src/components/auth/AuthProvider.tsx` ClientActor.role
- `src/server/permissions/rbac.ts` requireCustomer()

#### 3. Create Customer Profile Table
Add to `src/server/db/schema.ts`:
```typescript
export const customerProfiles = sqliteTable('customer_profiles', {
  id: text('id').notNull().primaryKey().$default(() => randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Add fields as needed: preferences, savedItems, etc.
  createdAt: text('created_at').notNull().$default(() => new Date().toISOString()),
});
```

#### 4. Update Auth Provider (`src/components/auth/AuthProvider.tsx`)
- Add customerProfile field to ClientActor interface
- Add customerProfile to AuthenticatedActor (session.ts)
- Add `requireCustomer()` export in `src/server/permissions/rbac.ts`

#### 5. Create Customer Dashboard Page
Create: `src/app/customer/dashboard/page.tsx`
- Show customer profile, saved items, recent requests, etc.

#### 6. Update Navbar (`src/components/layout/Navbar.tsx`)
- Add Customer navigation links when actor.role === 'CUSTOMER'
- Show Customer dashboard link, maybe Customer voice bridge, etc.

#### 7. Register Flow
In `src/app/register/page.tsx`:
- Add Customer role option (maybe checkbox or radio: Business, Creator, Customer)
- Handle customer-specific profile fields (if any)

#### 8. Customer API Routes
Create `src/app/api/customer/route.ts` (or add to existing routes):
- `GET /api/customer/profile` -> customer profile
- `PUT /api/customer/profile` -> update customer profile

#### 9. Update Pages UI References
In `src/components/auth/AuthProvider.tsx`, `src/server/auth/session.ts`, etc.
- Update references from "Creator" back to "Influencer" for now (deferred rename)

#### 10. Testing
- Add `describe('Customer Role', ...) tests in `tests/`
- Add end-to-end tests for Customer dashboard, registration

---

## 🔄 Later Phases (Phase 1–5)

1. **Complete "Influencer → Creator" rename** (deferred)
2. **Stage 1 features**: Need-to-Offer, Recommendations, Smart Passport, Campaigns
3. **Stage 2 features**: Collective Demand, Collaboration, Local Experiences
4. **Stage 3 features**: Customer Voice Bridge, Post-Purchase Journey
5. **AI layer** and polish

---

## 🛠️ Useful Scripts

```bash
# Run database migrations
npm run db:migrate

# Generate TypeScript types for schema changes
npm run typecheck

# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build
```

---

## 📂 File Structure (for Phase 0)

**New files to add/create**:
- `src/server/db/schema.ts` — customerProfiles table
- `src/server/validation/schemas.ts` — customer-specific validation (if needed)
- `src/server/permissions/rbac.ts` — requireCustomer()
- `src/app/customer/dashboard/page.tsx` — Customer dashboard
- `src/app/customer/profile/route.ts` — customer API routes
- `src/components/customer/CustomerDashboard.tsx` (optional component)

**Files to modify**:
- `tailwind.config.ts` — add colors
- `src/components/auth/AuthProvider.tsx` — add customerProfile field
- `src/server/auth/session.ts` — resolve customer profile
- `src/components/layout/Navbar.tsx` — add Customer nav links
- `src/app/register/page.tsx` — add Customer role option
- `src/app/page.tsx` — optional Customer homepage

---

## 🎨 UI/UX Considerations

- **Keep it simple**: The Customer dashboard should be clean and task-oriented
- **Reuse existing components**: Use existing cards, tables, forms from Business/Creator dashboards
- **Color palette**: Use PPT colors, especially Primary Blue (#2B68C4) for Customer actions
- **Navigation**: Single top nav with role-specific sections for Customer
- **Responsive**: Mobile-first, with clear CTAs (Find → Save → Use)

---

## 🚨 Known Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Database schema changes** | Run migrations in test environment first |
| **Auth/authorization changes** | Ensure requireCustomer() works with role-based RBAC |
| **UI breaking changes** | Keep changes minimal, reuse existing components |
| **Route conflicts** | Use `/customer/*` prefix for new routes |

---

## 📝 Documentation

- See **`VALUEOUS_ASSESSMENT_PLAN.md`** for full roadmap, color palette, and feature details
- Update **`README.md`** to reflect new Customer role
- Add component documentation in `docs/` for new Customer features

---

## 🚀 Get Started

```bash
# 1. Review the full plan in VALUEOUS_ASSESSMENT_PLAN.md
# 2. Begin with Phase 0: Tailwind colors + Customer role schema
# 3. Add Customer registration and dashboard
# 4. Test thoroughly
# 5. Then move to Phase 1: Stage 1 features
```

Good luck building VALUEOUS! The foundation is strong; let's add the Customer role to complete the 3-role platform. 🎯