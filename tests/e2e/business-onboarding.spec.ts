import { expect, test } from '@playwright/test';

const runSuffix = Date.now().toString().slice(-6);

test('Business Onboarding E2E (VLS-210): Register -> KYC Wizard & Branch/Staff -> Create Service -> Availability Slot & Overlap Guard', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const brandName = `Prana Studio ${runSuffix}`;
  const email = `biz.onboard.${runSuffix}@demo.local`;

  // 1. Register as Business
  await page.goto('/register?role=BUSINESS');
  await page.getByLabel(/Brand \/ Business Name/i).fill(brandName);
  await page.getByLabel(/Brand URL slug/i).fill(`prana-${runSuffix}`);
  await page.getByLabel(/City/i).fill('Bhubaneswar');
  await page.getByLabel(/Email address/i).fill(email);
  await page.getByLabel(/^Password/i).fill('DemoPass123!');
  await page.getByRole('button', { name: /Create Business Account/i }).click();
  await page.waitForURL((u) => u.pathname === '/business/dashboard');

  // 2. Complete Business KYC Wizard & Branch/Staff Manager
  await page.goto('/business/kyc');
  await expect(page.getByRole('heading', { name: /Business KYC & Branch Manager/i })).toBeVisible();

  await page.getByLabel(/Registered Business \/ Brand Name/i).fill(brandName);
  await page.getByLabel(/GSTIN/i).fill('21ABCDE1234F1Z5');
  await page.getByLabel(/Business PAN/i).fill('ABCDE1234F');
  await page.getByLabel(/Primary City/i).fill('Bhubaneswar');
  await page.getByLabel(/Registered Address/i).fill('Plot 42, Saheed Nagar, Bhubaneswar');
  await page.getByRole('button', { name: /Continue to Documents/i }).click();

  await page.getByRole('button', { name: /Review & Confirm/i }).click();
  await expect(page.getByText(`Brand Name: ${brandName}`)).toBeVisible();
  await page.getByRole('button', { name: /Submit KYC for Verification/i }).click();
  await expect(page.getByText(/KYC package submitted for verification/i).first()).toBeVisible();

  // Add branch & staff member
  await page.getByPlaceholder('Branch name').fill('Patia Wellness Hub');
  await page.getByPlaceholder('City').fill('Bhubaneswar');
  await page.getByRole('button', { name: /Add Branch/i }).click();
  await expect(page.getByText('Patia Wellness Hub').first()).toBeVisible();

  await page.getByPlaceholder('Staff full name').fill('Suresh Patnaik');
  await page.getByRole('button', { name: /Add Staff/i }).click();
  await expect(page.getByText('Suresh Patnaik').first()).toBeVisible();

  // 3. Create Service on /business/services
  await page.goto('/business/services');
  await page.getByRole('button', { name: /Create Service/i }).click();
  const serviceTitle = `Botanical Facial ${runSuffix}`;
  await page.getByLabel(/Service Title/i).fill(serviceTitle);
  await page.getByLabel(/Price \(INR\)/i).fill('1499');
  await page.getByLabel(/Slot Capacity/i).fill('4');
  await page
    .getByLabel(/Description/i)
    .fill('60-minute botanical skin rejuvenation ritual with organic serums.');
  await page.getByRole('button', { name: /Save Service/i }).click();
  await expect(page.getByText(serviceTitle).first()).toBeVisible();

  // 4. Manage Availability & Verify Overlap Guard on /business/availability
  await page.goto('/business/availability');
  await expect(
    page.getByRole('heading', { name: /Availability Calendar & Slots/i })
  ).toBeVisible();

  const futureDate = '2026-12-28';
  await page.getByLabel(/^Date$/i).fill(futureDate);
  await page.getByLabel(/Start \(IST\)/i).fill('10:00');
  await page.getByLabel(/End \(IST\)/i).fill('11:00');
  await page.getByLabel(/^Capacity$/i).fill('4');
  await page.getByRole('button', { name: /Add Slot/i }).click();
  await expect(page.getByText(/10:00 – 11:00 IST/i).first()).toBeVisible();

  // Overlapping slot must be rejected
  await page.getByLabel(/Start \(IST\)/i).fill('10:30');
  await page.getByLabel(/End \(IST\)/i).fill('11:30');
  await page.getByRole('button', { name: /Add Slot/i }).click();
  await expect(
    page.getByText(/Overlapping slot detected for this date and service/i).first()
  ).toBeVisible();
});
