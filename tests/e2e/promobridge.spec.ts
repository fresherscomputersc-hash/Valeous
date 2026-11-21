import { expect, test } from '@playwright/test';

const runSuffix = Date.now().toString().slice(-5);

test('1-Click Demo Login works reliably for Business, Influencer & Admin even when third-party cookies are completely blocked (iframe simulation)', async ({
  page,
}) => {
  // Strip Set-Cookie on every API response to simulate strict cross-origin iframe cookie blocking!
  await page.route('**/api/**', async (route) => {
    const response = await route.fetch();
    const headers = { ...response.headers() };
    delete headers['set-cookie'];
    await route.fulfill({ response, headers });
  });

  // 1. Click Business 1-Click Demo Login -> lands in /business/dashboard and stays signed in across tabs!
  await page.goto('/login');
  await page.getByTestId('demo-biz-glow').click();
  await page.waitForURL((u) => u.pathname === '/business/dashboard');
  await expect(page.getByText(/VedaGlow Botanicals/i).first()).toBeVisible();

  await page.getByRole('link', { name: /Campaign Wallet/i }).first().click();
  await page.waitForURL((u) => u.pathname === '/business/wallet');
  await expect(page.getByText(/Available Campaign Balance/i)).toBeVisible();

  // Sign out
  await page.getByRole('button', { name: /Sign out/i }).click();
  await page.waitForURL((u) => u.pathname === '/');

  // 2. Click Influencer 1-Click Demo Login -> lands in /influencer/dashboard and sees active promo code!
  await page.goto('/login');
  await page.getByTestId('demo-inf-ananya').click();
  await page.waitForURL((u) => u.pathname === '/influencer/dashboard');
  await expect(page.getByText(/GLOW-ANANYA/i).first()).toBeVisible();

  await page.getByRole('button', { name: /Sign out/i }).click();
  await page.waitForURL((u) => u.pathname === '/');

  // 3. Click Admin 1-Click Demo Login -> lands in /admin console!
  await page.goto('/login');
  await page.getByTestId('demo-admin').click();
  await page.waitForURL((u) => u.pathname === '/admin');
  await expect(
    page.getByRole('heading', { name: /Platform Admin & Payout Settlement Console/i })
  ).toBeVisible();
});

test('End-to-End PromoBridge Journey: Influencer Enrolls -> Business Approves & Issues Promo Code -> Short-Link Redirect -> Business Logs Sale -> Influencer Wallet Credited', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });

  // 1. Register a brand-new Influencer on mobile viewport
  await page.goto('/register?role=INFLUENCER');
  await page.getByLabel(/Your Creator Name/i).fill(`Aarav Creator ${runSuffix}`);
  await page.getByLabel(/Creator handle/i).fill(`aarav${runSuffix}`);
  await page.getByLabel(/Email address/i).fill(`aarav.${runSuffix}@demo.local`);
  await page.getByLabel(/^Password/i).fill('DemoPass123!');
  await page.getByRole('button', { name: /Create Influencer Account/i }).click();
  await page.waitForURL((u) => u.pathname === '/influencer/dashboard');

  // 2. Open VedaGlow Vitamin C Serum product and apply to enroll
  await page.goto('/products/vitamin-c-saffron-radiance-serum');
  await page
    .getByLabel(/How will you promote this product/i)
    .fill('Sharing an Instagram Reel + story link with my audience.');
  await page.getByTestId('enroll-submit-btn').click();
  await expect(page.getByTestId('pending-enrollment-card')).toBeVisible();

  // 3. Business (VedaGlow Botanicals) logs in via 1-Click Demo button, approves Aarav, and issues unique promo code
  await page.goto('/login');
  await page.getByTestId('demo-biz-glow').click();
  await page.waitForURL((u) => u.pathname === '/business/dashboard');

  await page.goto('/business/enrollments?status=PENDING');
  const approveResponsePromise = page.waitForResponse(
    (r) => r.url().includes('/api/business/enrollments/') && r.status() === 200
  );
  await page.getByRole('button', { name: /Approve & Issue Code/i }).first().click();
  await approveResponsePromise;

  // 4. Verify tracked short-link /r/CODE redirects cleanly with promo query param
  const expectedCode = `GLOW-AARAV${runSuffix}`.slice(0, 13);
  await page.goto(`/r/${expectedCode}`);
  await page.waitForURL((u) =>
    u.pathname.includes('/products/vitamin-c-saffron-radiance-serum')
  );
  await expect(page.getByText(expectedCode).first()).toBeVisible();

  // 5. Business logs 2 units sold using Aarav's newly issued promo code
  await page.goto('/business/sales');
  await page.getByLabel(/Influencer Promo Code/i).fill(expectedCode);
  await page.getByLabel(/Units Sold/i).fill('2');
  await page.getByRole('button', { name: /Record Sale & Credit Influencer/i }).click();
  await expect(page.getByText(/Sale Recorded/i).first()).toBeVisible();

  // 6. Influencer signs back in and sees active promo code + credited commission in Wallet!
  await page.goto('/login');
  await page.getByLabel(/Email address/i).fill(`aarav.${runSuffix}@demo.local`);
  await page.getByLabel(/^Password$/i).fill('DemoPass123!');
  await page.getByRole('button', { name: /^Sign in$/i }).click();
  await page.waitForURL((u) => u.pathname === '/influencer/dashboard');

  await page.goto('/influencer/earnings');
  await expect(page.getByTestId('available-wallet-balance')).not.toHaveText('₹0');
  await expect(page.getByText(expectedCode).first()).toBeVisible();
});
