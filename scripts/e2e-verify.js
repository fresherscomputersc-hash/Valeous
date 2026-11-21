// E2E workflow verification script for PromoBridge demo
const BASE = 'http://localhost:3000';
const PASS = 'DemoPass123!';

const DEMO_USERS = [
  { role: 'Business (VedaGlow)', email: 'business.glow@demo.local' },
  { role: 'Business (Koraput)', email: 'business.roast@demo.local' },
  { role: 'Influencer (Ananya)', email: 'influencer.ananya@demo.local' },
  { role: 'Influencer (Kabir)', email: 'influencer.kabir@demo.local' },
  { role: 'Admin', email: 'admin@demo.local' },
];

let failures = 0;
let passes = 0;

function assert(cond, msg) {
  if (cond) { passes++; console.log(`  ✅ ${msg}`); }
  else { failures++; console.log(`  ❌ FAIL: ${msg}`); process.exitCode = 1; }
}

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

async function login(email) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASS }),
    redirect: 'manual',
  });
  const data = await res.json().catch(() => ({}));
  assert(res.ok, `Login ${email} → ${res.status}`);
  const setCookie = res.headers.get('set-cookie') || '';
  const cookie = setCookie.split(';')[0];
  assert(cookie.startsWith('pb_session='), `${email} got pb_session cookie`);
  return cookie;
}

async function get(path, cookie) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Cookie: cookie },
    signal: AbortSignal.timeout(15000),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function post(path, body, cookie) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function main() {
  console.log('='.repeat(60));
  console.log('PROMOBRIDGE DEMO WORKFLOW VERIFICATION');
  console.log('='.repeat(60));

  // ── 1. Demo Login ──
  console.log('\n🔐 PHASE 1: Demo Login (all 5 roles)');
  await delay(3000);
  const sessions = {};
  for (const u of DEMO_USERS) {
    const cookie = await login(u.email);
    sessions[u.email] = cookie;
    assert(!!cookie, `${u.role} (${u.email}) got session cookie`);
    await delay(600);
  }

  // ── 2. Business: VedaGlow ──
  console.log('\n🏢 PHASE 2: Business Dashboard & Product Management (VedaGlow)');
  await delay(1000);
  const bizCookie = sessions['business.glow@demo.local'];

  const me = await get('/api/auth/me', bizCookie);
  assert(me.status === 200 && me.data.actor?.user?.role === 'BUSINESS', 'Business me endpoint');

  const bizDash = await get('/api/business/dashboard', bizCookie);
  assert(bizDash.status === 200 && !!bizDash.data, 'Business dashboard');

  await delay(800);
  const bizProducts = await get('/api/business/products', bizCookie);
  assert(bizProducts.status === 200 && Array.isArray(bizProducts.data?.products), 'Business products list');

  await delay(800);
  const bizWallet = await get('/api/business/wallet', bizCookie);
  assert(bizWallet.status === 200 && !!bizWallet.data, 'Business wallet');

  await delay(800);
  const bizEnrollments = await get('/api/business/enrollments', bizCookie);
  assert(bizEnrollments.status === 200, 'Business enrollments');

  // ── 3. Influencer: Ananya ──
  console.log('\n👤 PHASE 3: Influencer Dashboard & Earnings (Ananya)');
  await delay(1000);
  const infCookie = sessions['influencer.ananya@demo.local'];

  const infMe = await get('/api/auth/me', infCookie);
  assert(infMe.status === 200 && infMe.data.actor?.user?.role === 'INFLUENCER', 'Influencer me endpoint');

  const infDash = await get('/api/influencer/dashboard', infCookie);
  assert(infDash.status === 200 && !!infDash.data, 'Influencer dashboard');

  const infEnrollments = await get('/api/influencer/enrollments', infCookie);
  assert(infEnrollments.status === 200, 'Influencer enrollments');

  // Create a payout request (POST-only endpoint)
  const infPayouts = await post('/api/influencer/payouts', {
    amountRupees: 500,
  }, infCookie);
  assert(infPayouts.status === 201 || infPayouts.status === 409, `Influencer payout request → ${infPayouts.status}`);

  // ── 4. Admin ──
  console.log('\n👑 PHASE 4: Admin Overview & Payout Management');
  await delay(1000);
  const adminCookie = sessions['admin@demo.local'];

  const adminDash = await get('/api/admin/overview', adminCookie);
  assert(adminDash.status === 200 && !!adminDash.data, 'Admin overview');

  // Admin settles a pending payout
  const pendingPayouts = adminDash.data?.data?.payouts || [];
  const pendingPayout = pendingPayouts.find((p) => p.status === 'PENDING');
  if (pendingPayout) {
    await delay(600);
    const settleRes = await post(`/api/admin/payouts/${pendingPayout.id}`, {
      action: 'PAY',
      paymentReference: 'UTR-E2E-TEST',
    }, adminCookie);
    assert(settleRes.status === 200, `Admin settle payout → ${settleRes.status}`);
  } else {
    assert(true, 'No pending payouts to settle');
  }

  // ── 5. Log a promo sale (business workflow) ──
  console.log('\n💳 PHASE 5: Log Promo Sale (Business → Influencer Wallet Credit)');
  await delay(1000);
  const saleRes = await post('/api/business/sales', {
    promoCode: 'GLOW-ANANYA',
    quantity: 1,
    grossAmountRupees: 1169,
    orderReference: `E2E-TEST-${Date.now()}`,
    customerNote: 'E2E verification sale',
  }, bizCookie);
  assert(saleRes.status === 200 || saleRes.status === 201, `Log promo sale → ${saleRes.status}`);

  // ── 6. Public marketplace ──
  console.log('\n🛍️ PHASE 6: Public Marketplace (no auth)');
  await delay(1000);
  const pubRes = await fetch(`${BASE}/api/products`, { signal: AbortSignal.timeout(15000) });
  assert(pubRes.ok, `Public products endpoint → ${pubRes.status}`);

  // ── 7. Logout ──
  console.log('\n🚪 PHASE 7: Logout');
  await delay(1000);
  const logoutRes = await fetch(`${BASE}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: bizCookie },
  });
  assert(logoutRes.ok, `Logout → ${logoutRes.status}`);

  // ── Summary ──
  console.log('\n' + '='.repeat(60));
  console.log(`RESULTS: ${passes} passed, ${failures} failed`);
  console.log('='.repeat(60));
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error('SCRIPT ERROR:', err.message);
  process.exit(1);
});
