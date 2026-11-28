import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { closeDbPool, getDb } from '../src/server/db';
import {
  auditLogs,
  brandWalletTransactions,
  businessProfiles,
  categories,
  customerProfiles,
  enrollments,
  influencerProfiles,
  notifications,
  payoutRequests,
  products,
  promoClicks,
  promoSales,
  users,
} from '../src/server/db/schema';
import { hashPassword } from '../src/server/lib/crypto';

async function main() {
  if (process.env.ALLOW_DEV_SEED !== 'true') {
    console.error(
      'Refusing to run seed script: requires ALLOW_DEV_SEED="true".'
    );
    process.exit(1);
  }

  console.log('Seeding PromoBridge Business & Influencer Marketplace demo data...');
  const db = getDb();

  await db.execute(sql`DELETE FROM rate_limit_hits`);
  await db.execute(sql`DELETE FROM sessions`);
  await db.execute(sql`DELETE FROM password_reset_tokens`);
  await db.execute(sql`DELETE FROM email_verification_tokens`);
  await db.execute(sql`DELETE FROM media_assets`);
  await db.execute(sql`DELETE FROM notifications`);
  await db.execute(sql`DELETE FROM brand_wallet_transactions`);
  await db.execute(sql`DELETE FROM promo_clicks`);
  await db.execute(sql`DELETE FROM promo_sales`);
  await db.execute(sql`DELETE FROM payout_requests`);
  await db.execute(sql`DELETE FROM enrollments`);
  await db.execute(sql`DELETE FROM products`);
  await db.execute(sql`DELETE FROM influencer_profiles`);
  await db.execute(sql`DELETE FROM business_profiles`);
  await db.execute(sql`DELETE FROM customer_profiles`);
  await db.execute(sql`DELETE FROM categories`);
  await db.execute(sql`DELETE FROM audit_logs`);
  await db.execute(sql`DELETE FROM users`);

  const demoPasswordHash = await hashPassword('DemoPass123!');
  const verifiedNow = new Date().toISOString();

  const insertedCategories = await db
    .insert(categories)
    .values([
      { name: 'Beauty & Skincare', slug: 'beauty-skincare' },
      { name: 'Coffee, Food & Beverage', slug: 'food-beverage' },
      { name: 'Fashion & Apparel', slug: 'fashion-apparel' },
      { name: 'Tech & Gadgets', slug: 'tech-gadgets' },
      { name: 'Fitness & Wellness', slug: 'fitness-wellness' },
    ])
    .returning();

  const catBeauty = insertedCategories[0]!;
  const catCoffee = insertedCategories[1]!;
  const catFitness = insertedCategories[4]!;

  const [adminUser, bizGlowUser, bizRoastUser, infAnanyaUser, infKabirUser, custUser] = await db
    .insert(users)
    .values([
      {
        email: 'admin@demo.local',
        passwordHash: demoPasswordHash,
        displayName: 'Platform Admin',
        role: 'ADMIN',
        emailVerifiedAt: verifiedNow,
      },
      {
        email: 'business.glow@demo.local',
        passwordHash: demoPasswordHash,
        displayName: 'VedaGlow Botanicals',
        role: 'BUSINESS',
        emailVerifiedAt: verifiedNow,
      },
      {
        email: 'business.roast@demo.local',
        passwordHash: demoPasswordHash,
        displayName: 'Koraput Estate Coffee',
        role: 'BUSINESS',
        emailVerifiedAt: verifiedNow,
      },
      {
        email: 'influencer.ananya@demo.local',
        passwordHash: demoPasswordHash,
        displayName: 'Ananya Mohanty',
        role: 'INFLUENCER',
        emailVerifiedAt: verifiedNow,
      },
      {
        email: 'influencer.kabir@demo.local',
        passwordHash: demoPasswordHash,
        displayName: 'Kabir Das',
        role: 'INFLUENCER',
        emailVerifiedAt: verifiedNow,
      },
      {
        email: 'customer@demo.local',
        passwordHash: demoPasswordHash,
        displayName: 'Priya Sharma',
        role: 'CUSTOMER',
        emailVerifiedAt: verifiedNow,
      },
    ])
    .returning();

  // VedaGlow: ₹25,000 deposited (2500000p), spent ₹701.40 creator + ₹70.14 fee = 77154p -> balance 2422846p
  // Koraput: ₹18,000 deposited (1800000p), spent ₹900 creator + ₹90 fee = 99000p -> balance 1701000p
  const [bizGlow, bizRoast] = await db
    .insert(businessProfiles)
    .values([
      {
        userId: bizGlowUser!.id,
        brandName: 'VedaGlow Botanicals',
        slug: 'vedaglow-botanicals',
        categoryId: catBeauty.id,
        description:
          'Clean botanical skincare crafted in small batches. Partnering with skincare & lifestyle creators across India.',
        websiteUrl: 'https://vedaglow.example.com',
        city: 'Bhubaneswar',
        gstin: '21AAACV1234F1Z5',
        walletBalancePaise: 2422846,
        totalDepositedPaise: 2500000,
        totalSpentPaise: 77154,
        webhookKey: 'whk_vedaglow_demo01',
        webhookSecret: 'whsec_vedaglow_demo_hmac_secret_2026',
      },
      {
        userId: bizRoastUser!.id,
        brandName: 'Koraput Estate Coffee',
        slug: 'koraput-estate-coffee',
        categoryId: catCoffee.id,
        description:
          'Single-origin shade-grown specialty coffee & cold brew concentrates from Koraput highlands.',
        websiteUrl: 'https://koraputcoffee.example.com',
        city: 'Bhubaneswar',
        gstin: '21AABCK5678M1Z2',
        walletBalancePaise: 1701000,
        totalDepositedPaise: 1800000,
        totalSpentPaise: 99000,
        webhookKey: 'whk_koraput_demo02',
        webhookSecret: 'whsec_koraput_demo_hmac_secret_2026',
      },
    ])
    .returning();

  await db.insert(brandWalletTransactions).values([
    {
      businessId: bizGlow!.id,
      type: 'DEPOSIT',
      amountPaise: 2500000,
      balanceAfterPaise: 2500000,
      reference: 'UPI-VG-900120',
      description: 'Initial campaign budget deposit via UPI',
      createdByUserId: bizGlowUser!.id,
    },
    {
      businessId: bizGlow!.id,
      type: 'SALE_COMMISSION_DEBIT',
      amountPaise: 77154,
      balanceAfterPaise: 2422846,
      reference: 'GLOW-ANANYA',
      description: '2 verified promo orders (Creator ₹701.40 + 10% Platform Fee ₹70.14)',
      createdByUserId: bizGlowUser!.id,
    },
    {
      businessId: bizRoast!.id,
      type: 'DEPOSIT',
      amountPaise: 1800000,
      balanceAfterPaise: 1800000,
      reference: 'NEFT-KC-441022',
      description: 'Campaign wallet deposit via NetBanking',
      createdByUserId: bizRoastUser!.id,
    },
    {
      businessId: bizRoast!.id,
      type: 'SALE_COMMISSION_DEBIT',
      amountPaise: 99000,
      balanceAfterPaise: 1701000,
      reference: 'BREW-KABIR',
      description: '2 verified promo orders (Creator ₹900.00 + 10% Platform Fee ₹90.00)',
      createdByUserId: bizRoastUser!.id,
    },
  ]);

  const serumSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fef3c7"/><stop offset="100%" stop-color="#fde68a"/></linearGradient></defs><rect width="800" height="520" fill="url(#g1)"/><circle cx="620" cy="130" r="140" fill="#f59e0b" opacity="0.16"/><rect x="330" y="110" width="140" height="290" rx="28" fill="#78350f"/><rect x="365" y="65" width="70" height="55" rx="12" fill="#1c1917"/><rect x="348" y="175" width="104" height="150" rx="12" fill="#fffbeb"/><text x="400" y="238" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="bold" fill="#78350f">VEDAGLOW</text><text x="400" y="266" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#92400e">Vit-C + Saffron</text></svg>`
  )}`;
  const nightOilSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520"><defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fce7f3"/><stop offset="100%" stop-color="#fbcfe8"/></linearGradient></defs><rect width="800" height="520" fill="url(#g2)"/><circle cx="200" cy="390" r="150" fill="#db2777" opacity="0.12"/><rect x="335" y="120" width="130" height="280" rx="26" fill="#831843"/><rect x="370" y="72" width="60" height="54" rx="10" fill="#500724"/><rect x="352" y="185" width="96" height="140" rx="10" fill="#fdf2f8"/><text x="400" y="244" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="bold" fill="#831843">KUMKUMADI</text><text x="400" y="270" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9d174d">Recovery Oil</text></svg>`
  )}`;
  const brewSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520"><defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ecfdf5"/><stop offset="100%" stop-color="#d1fae5"/></linearGradient></defs><rect width="800" height="520" fill="url(#g3)"/><rect x="260" y="125" width="120" height="270" rx="22" fill="#1c1917"/><rect x="420" y="125" width="120" height="270" rx="22" fill="#292524"/><rect x="275" y="190" width="90" height="130" rx="10" fill="#ecfdf5"/><rect x="435" y="190" width="90" height="130" rx="10" fill="#ecfdf5"/><text x="320" y="250" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#065f46">COLD BREW</text><text x="480" y="250" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#065f46">KORAPUT</text></svg>`
  )}`;
  const proteinSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520"><defs><linearGradient id="g4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#eff6ff"/><stop offset="100%" stop-color="#dbeafe"/></linearGradient></defs><rect width="800" height="520" fill="url(#g4)"/><rect x="300" y="110" width="200" height="300" rx="28" fill="#1e3a8a"/><rect x="320" y="180" width="160" height="150" rx="14" fill="#eff6ff"/><text x="400" y="246" text-anchor="middle" font-family="sans-serif" font-size="17" font-weight="bold" fill="#1e3a8a">PLANT PROTEIN</text><text x="400" y="274" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1d4ed8">Cacao + Maca</text></svg>`
  )}`;

  const [prodSerum, , prodBrew, prodProtein] = await db
    .insert(products)
    .values([
      {
        businessId: bizGlow!.id,
        categoryId: catBeauty.id,
        title: 'Vitamin C & Saffron Radiance Serum (30ml)',
        slug: 'vitamin-c-saffron-radiance-serum',
        description:
          'Daily brightening facial serum formulated with 15% ethyl ascorbic acid and Kashmiri saffron extract. Great fit for morning skincare routines, GRWM reels, and honest 14-day texture reviews.',
        imageUrl: serumSvg,
        imageAlt: 'VedaGlow Vitamin C & Saffron Serum bottle illustration',
        externalProductUrl: 'https://vedaglow.example.com/products/vit-c-serum',
        retailPricePaise: 129900,
        commissionType: 'PERCENTAGE',
        commissionPercent: 20,
        buyerDiscountPercent: 10,
        promoCodePrefix: 'GLOW',
        status: 'ACTIVE',
      },
      {
        businessId: bizGlow!.id,
        categoryId: catBeauty.id,
        title: 'Ayurvedic Kumkumadi Night Recovery Elixir',
        slug: 'ayurvedic-kumkumadi-night-elixir',
        description:
          'Rich overnight facial oil blended with 16 Ayurvedic herbs. Ideal for night-routine creators and bridal/festive skincare guides.',
        imageUrl: nightOilSvg,
        imageAlt: 'Kumkumadi Night Recovery Oil bottle illustration',
        externalProductUrl: 'https://vedaglow.example.com/products/kumkumadi-oil',
        retailPricePaise: 185000,
        commissionType: 'FIXED_PER_SALE',
        commissionFixedPaise: 35000,
        buyerDiscountPercent: 15,
        promoCodePrefix: 'VEDA',
        status: 'ACTIVE',
      },
      {
        businessId: bizRoast!.id,
        categoryId: catCoffee.id,
        title: 'Cold Brew Concentrate Starter Pack (3 Bottles)',
        slug: 'cold-brew-concentrate-starter-pack',
        description:
          '18-hour slow-steeped Koraput Arabica cold brew concentrate—makes 21 iced coffees in 10 seconds. High repeat orders on Instagram & YouTube desk-setup reels.',
        imageUrl: brewSvg,
        imageAlt: 'Koraput Cold Brew Concentrate bottles illustration',
        externalProductUrl: 'https://koraputcoffee.example.com/products/cold-brew-pack',
        retailPricePaise: 99900,
        commissionType: 'FIXED_PER_SALE',
        commissionFixedPaise: 18000,
        buyerDiscountPercent: 10,
        promoCodePrefix: 'BREW',
        status: 'ACTIVE',
      },
      {
        businessId: bizRoast!.id,
        categoryId: catFitness.id,
        title: 'Clean Cacao & Espresso Plant Protein (1kg)',
        slug: 'cacao-espresso-plant-protein-1kg',
        description:
          '24g pea + brown rice protein infused with real Koraput espresso shot & raw cacao. Zero artificial sweeteners.',
        imageUrl: proteinSvg,
        imageAlt: 'Clean Cacao & Espresso Plant Protein tub illustration',
        externalProductUrl: 'https://koraputcoffee.example.com/products/espresso-protein',
        retailPricePaise: 219900,
        commissionType: 'PERCENTAGE',
        commissionPercent: 15,
        buyerDiscountPercent: 10,
        promoCodePrefix: 'FIT',
        status: 'ACTIVE',
      },
    ])
    .returning();

  const [infAnanya, infKabir] = await db
    .insert(influencerProfiles)
    .values([
      {
        userId: infAnanyaUser!.id,
        handle: 'ananya',
        displayName: 'Ananya Mohanty',
        bio: 'Skincare minimalist & lifestyle creator sharing honest routines, indie Indian brands, and everyday rituals.',
        niche: 'Beauty & Lifestyle',
        instagramUrl: 'https://instagram.com/ananya.demo',
        youtubeUrl: 'https://youtube.com/@ananya.demo',
        followerCount: 68500,
        upiId: 'ananya.creator@okicici',
        panNumber: 'ABCDE1234F',
        totalEarnedPaise: 70140,
        pendingClearancePaise: 0,
        availableBalancePaise: 70140,
        pendingPayoutPaise: 0,
        totalPaidPaise: 0,
      },
      {
        userId: infKabirUser!.id,
        handle: 'kabir',
        displayName: 'Kabir Das',
        bio: 'Desk setups, specialty coffee brews, and productivity gear vlogs.',
        niche: 'Coffee, Tech & Vlogs',
        instagramUrl: 'https://instagram.com/kabir.demo',
        youtubeUrl: 'https://youtube.com/@kabir.demo',
        followerCount: 42000,
        upiId: 'kabir.vlogs@ybl',
        bankAccountNumber: '501004829102',
        bankIfsc: 'HDFC0001204',
        panNumber: 'FGHIJ5678K',
        totalEarnedPaise: 90000,
        pendingClearancePaise: 0,
        availableBalancePaise: 40000,
        pendingPayoutPaise: 50000,
        totalPaidPaise: 0,
      },
    ])
    .returning();

  await db.insert(customerProfiles).values({
    userId: custUser!.id,
    displayName: 'Priya Sharma',
    city: 'Bhubaneswar',
    preferences: JSON.stringify({ interests: ['Skincare', 'Specialty Coffee', 'Fitness'] }),
  });

  const [enrAnanyaSerum, enrKabirBrew] = await db
    .insert(enrollments)
    .values([
      {
        productId: prodSerum!.id,
        influencerId: infAnanya!.id,
        pitchNote:
          'Will feature the Vitamin C serum in two morning skincare reels + story link sticker.',
        status: 'APPROVED',
        promoCode: 'GLOW-ANANYA',
        clicksCount: 38,
        totalSalesCount: 2,
        totalUnitsSold: 3,
        totalGrossSalesPaise: 350700,
        totalCommissionPaise: 70140,
        decidedAt: new Date(Date.now() - 3 * 86400_000).toISOString(),
      },
      {
        productId: prodBrew!.id,
        influencerId: infKabir!.id,
        pitchNote:
          'Featuring Cold Brew Starter Pack in my weekly desk-setup + morning coffee YouTube short.',
        status: 'APPROVED',
        promoCode: 'BREW-KABIR',
        clicksCount: 29,
        totalSalesCount: 2,
        totalUnitsSold: 5,
        totalGrossSalesPaise: 449550,
        totalCommissionPaise: 90000,
        decidedAt: new Date(Date.now() - 4 * 86400_000).toISOString(),
      },
      {
        productId: prodBrew!.id,
        influencerId: infAnanya!.id,
        pitchNote:
          'My audience loves iced coffee recipes—planning a 30s morning iced latte reel!',
        status: 'PENDING',
      },
      {
        productId: prodProtein!.id,
        influencerId: infKabir!.id,
        pitchNote: 'Post-workout mocha shake reel for my fitness & productivity series.',
        status: 'PENDING',
      },
    ])
    .returning();

  await db.insert(promoClicks).values([
    {
      enrollmentId: enrAnanyaSerum!.id,
      productId: prodSerum!.id,
      influencerId: infAnanya!.id,
      ipHash: 'a1b2c3d4',
      userAgent: 'Instagram 310.0 Mobile',
    },
    {
      enrollmentId: enrKabirBrew!.id,
      productId: prodBrew!.id,
      influencerId: infKabir!.id,
      ipHash: 'e5f6g7h8',
      userAgent: 'YouTube Mobile Web',
    },
  ]);

  await db.insert(promoSales).values([
    {
      enrollmentId: enrAnanyaSerum!.id,
      productId: prodSerum!.id,
      businessId: bizGlow!.id,
      influencerId: infAnanya!.id,
      promoCodeSnapshot: 'GLOW-ANANYA',
      quantity: 2,
      grossAmountPaise: 233800,
      commissionAmountPaise: 46760,
      platformFeePaise: 4676,
      status: 'CONFIRMED',
      source: 'STORE_WEBHOOK',
      orderReference: 'ORD-VG-1041',
      customerNote: '2 bottles ordered via website checkout with GLOW-ANANYA',
      loggedByUserId: bizGlowUser!.id,
    },
    {
      enrollmentId: enrAnanyaSerum!.id,
      productId: prodSerum!.id,
      businessId: bizGlow!.id,
      influencerId: infAnanya!.id,
      promoCodeSnapshot: 'GLOW-ANANYA',
      quantity: 1,
      grossAmountPaise: 116900,
      commissionAmountPaise: 23380,
      platformFeePaise: 2338,
      status: 'CONFIRMED',
      source: 'MANUAL',
      orderReference: 'ORD-VG-1058',
      customerNote: '1 bottle repeat order',
      loggedByUserId: bizGlowUser!.id,
    },
    {
      enrollmentId: enrKabirBrew!.id,
      productId: prodBrew!.id,
      businessId: bizRoast!.id,
      influencerId: infKabir!.id,
      promoCodeSnapshot: 'BREW-KABIR',
      quantity: 2,
      grossAmountPaise: 179820,
      commissionAmountPaise: 36000,
      platformFeePaise: 3600,
      status: 'CONFIRMED',
      source: 'STORE_WEBHOOK',
      orderReference: 'INV-KC-309',
      customerNote: '2 starter packs redeemed via Instagram reel code',
      loggedByUserId: bizRoastUser!.id,
    },
    {
      enrollmentId: enrKabirBrew!.id,
      productId: prodBrew!.id,
      businessId: bizRoast!.id,
      influencerId: infKabir!.id,
      promoCodeSnapshot: 'BREW-KABIR',
      quantity: 3,
      grossAmountPaise: 269730,
      commissionAmountPaise: 54000,
      platformFeePaise: 5400,
      status: 'CONFIRMED',
      source: 'MANUAL',
      orderReference: 'INV-KC-314',
      customerNote: 'Office group order using BREW-KABIR',
      loggedByUserId: bizRoastUser!.id,
    },
  ]);

  await db.insert(payoutRequests).values({
    influencerId: infKabir!.id,
    amountPaise: 50000,
    payoutMethodSnapshot: 'UPI: kabir.vlogs@ybl',
    status: 'PENDING',
    note: 'Weekly commission withdrawal',
  });

  await db.insert(notifications).values([
    {
      userId: bizRoastUser!.id,
      type: 'ENROLLMENT_APPLIED',
      title: '2 creators requested promo codes for your products',
      body: '@ananya and @kabir applied to promote Cold Brew & Plant Protein.',
      href: '/business/enrollments',
    },
    {
      userId: infAnanyaUser!.id,
      type: 'PROMO_SALE_EARNED',
      title: 'New sale with GLOW-ANANYA! +₹233.80',
      body: '1 unit of Vitamin C & Saffron Radiance Serum purchased.',
      href: '/influencer/earnings',
    },
    {
      userId: adminUser!.id,
      type: 'PAYOUT_REQUESTED',
      title: 'Pending ₹500.00 UPI payout from @kabir',
      body: 'Destination: UPI: kabir.vlogs@ybl',
      href: '/admin',
    },
  ]);

  await db.insert(auditLogs).values({
    actorUserId: adminUser!.id,
    action: 'DEMO_MARKETPLACE_SEEDED',
    targetType: 'SYSTEM',
    targetId: 'seed',
    metadata: JSON.stringify({ products: 4, businesses: 2, influencers: 2, sales: 4 }),
  });

  console.log('Seed completed cleanly!');
  await closeDbPool();
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  await closeDbPool();
  process.exit(1);
});
