import { test, expect } from '@playwright/test';

test.describe('CommonVeil Public Site & Role Workspaces', () => {
  test('Landing page loads and displays core brand and navigation', async ({ page }) => {
    await page.goto('/');

    // Check title and key UI elements
    await expect(page).toHaveTitle(/CommonVeil/i);
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();

    // Verify role cards or app entry links exist
    const appLinks = page.locator('a[href*="/app"], a[href*="role="]');
    expect(await appLinks.count()).toBeGreaterThan(0);
  });

  test('Documentation page loads and renders markdown structure', async ({ page }) => {
    await page.goto('/docs');
    await expect(page).toHaveTitle(/CommonVeil/i);
    await expect(page.getByRole('heading', { name: 'Architecture' })).toBeVisible();
  });

  test('Evidence page loads and displays audit summary', async ({ page }) => {
    await page.goto('/evidence');
    await expect(page).toHaveTitle(/CommonVeil/i);
    await expect(page.getByRole('heading', { name: /Positive-path protocol/i })).toBeVisible();
  });

  test('Role workspace routes render expected entry screens without crash', async ({ page }) => {
    // 1. App hub
    await page.goto('/app');
    await expect(page.locator('body')).toBeVisible();

    // 2. Registrar role
    await page.goto('/?role=registrar');
    await expect(page.locator('body')).toBeVisible();

    // 3. Certifier role
    await page.goto('/?role=certifier');
    await expect(page.locator('body')).toBeVisible();

    // 4. Member role
    await page.goto('/?role=member');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Static Compact circuit assets are accessible via HTTP with correct status', async ({ request }) => {
    // Check that keys and bzkir endpoints respond correctly and not 404
    const verifierRes = await request.get('/keys/attest.verifier');
    expect(verifierRes.status()).toBe(200);

    const bzkirRes = await request.get('/zkir/attest.bzkir');
    expect(bzkirRes.status()).toBe(200);

    const certifyRes = await request.get('/keys/certifyInventory.verifier');
    expect(certifyRes.status()).toBe(200);
  });
});
