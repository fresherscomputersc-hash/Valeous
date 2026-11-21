# PromoBridge — Business & Influencer Promo-Code Marketplace

**PromoBridge** connects **Businesses** and **Influencers** through trackable social-media promo codes and automated commission wallets:

1. **Businesses List Products & Set Commissions:** Post a product with its retail price (₹), an optional buyer discount %, and choose either a **Fixed ₹ payout per sale** or a **Percentage (%) commission** for influencers.
2. **Influencers Browse & Enroll:** Influencers explore open product campaigns, check exact earnings per sale, and request to enroll.
3. **Business Approves & Issues Unique Promo Code:** Once the business approves an influencer, the platform issues a clean, memorable promo code (e.g., `GLOW-ANANYA` or `BREW-KABIR`) ready to share on Instagram Reels, Stories, or YouTube.
4. **Sales Credit Influencer Wallets Automatically:** Whenever customers purchase using an influencer’s promo code, the business logs the promo-code sale (`Business Hub -> Log Promo Sale`), automatically crediting the influencer’s **Earnings Wallet** for withdrawal via **UPI / Bank**.

---

## 1-Click Demo Accounts (Password: `DemoPass123!`)

Open **`/login`** to switch between any role in one click:

| Role | Account | Email | Highlights |
|---|---|---|---|
| **Business** | VedaGlow Botanicals | `business.glow@demo.local` | 2 listed products (`20%` & `₹350/sale`), active code `GLOW-ANANYA` |
| **Business** | Koraput Estate Coffee | `business.roast@demo.local` | Pending influencer request to approve + active code `BREW-KABIR` |
| **Influencer** | Ananya (`@ananya`) | `influencer.ananya@demo.local` | Active code `GLOW-ANANYA`, `₹701.40` available wallet balance |
| **Influencer** | Kabir (`@kabir`) | `influencer.kabir@demo.local` | Active code `BREW-KABIR`, `₹400` available + `₹500` pending payout |
| **Admin** | Platform Admin | `admin@demo.local` | Settle influencer UPI/Bank payout requests with UTR references |

---

## Commands

```bash
npm run db:migrate   # Run PostgreSQL 17 Drizzle migrations
npm run db:seed      # Seed demo businesses, products, influencers & sales
npm run typecheck    # Strict TypeScript check
npm run lint         # ESLint check
npm test             # Vitest unit, integration & concurrency tests
npm run test:e2e     # Playwright browser E2E journey
npm run build        # Production Next.js build
npm run start        # Start production server on port 3000
```
