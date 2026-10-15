import { test, expect } from '@playwright/test';

test.describe('CommonVeil Public Site & Role Workspaces', () => {
  test('Landing page loads and displays core brand and navigation', async ({ page }) => {
    await page.goto('/');

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

  test('Role workspace routes enforce wallet requirement before admitting actions', async ({ page }) => {
    // 1. App hub shows wallet required
    await page.goto('/app');
    await expect(page.getByText(/Universal Midnight Session/i)).toBeVisible();
    await expect(page.getByText(/Connect any compatible Midnight wallet once/i)).toBeVisible();

    // 2. Registrar role workspace
    await page.goto('/?role=registrar');
    await expect(page.getByRole('heading', { name: /Registrar Operational Workspace/i })).toBeVisible();
    await expect(page.getByText(/Connect a compatible Midnight wallet to continue/i)).toBeVisible();

    // 3. Certifier role workspace
    await page.goto('/?role=certifier');
    await expect(page.getByRole('heading', { name: /Certifier Operational Workspace/i })).toBeVisible();
    await expect(page.getByText(/Connect a compatible Midnight wallet to continue/i)).toBeVisible();

    // 4. Member role workspace
    await page.goto('/?role=member');
    await expect(page.getByRole('heading', { name: /Member Operational Workspace/i })).toBeVisible();
    await expect(page.getByText(/Connect a compatible Midnight wallet to continue/i)).toBeVisible();
  });

  test('Member workspace rejects invalid recovery file input gracefully', async ({ page }) => {
    await page.goto('/?role=member');
    await expect(page.getByRole('heading', { name: /Member Operational Workspace/i })).toBeVisible();

    // Verify presence of identity actions or backup restore input
    const fileInputs = page.locator('input[type="file"]');
    if (await fileInputs.count() > 0) {
      await fileInputs.first().setInputFiles({
        name: 'invalid.json',
        mimeType: 'application/json',
        buffer: Buffer.from('{"invalid": "data"}'),
      });
      // The page remains interactive and does not crash or unmount
      await expect(page.locator('body')).toBeVisible();
      await expect(page.getByRole('heading', { name: /Member Operational Workspace/i })).toBeVisible();
    }
  });

  test('Static Compact circuit assets are accessible via HTTP with correct binary sizes and status', async ({ request }) => {
    // All 4 circuits: attest, certifyInventory, registerAffectedRelease, registerMember
    const circuits = ['attest', 'certifyInventory', 'registerAffectedRelease', 'registerMember'];

    for (const c of circuits) {
      // Verifier key
      const verifierRes = await request.get(`/keys/${c}.verifier`);
      expect(verifierRes.status()).toBe(200);
      const verifierBuf = await verifierRes.body();
      expect(verifierBuf.length).toBe(2119);

      // Binary ZKIR
      const bzkirRes = await request.get(`/zkir/${c}.bzkir`);
      expect(bzkirRes.status()).toBe(200);
      const bzkirBuf = await bzkirRes.body();
      expect(bzkirBuf.length).toBeGreaterThan(100);

      // Prover key
      const proverRes = await request.get(`/keys/${c}.prover`);
      expect(proverRes.status()).toBe(200);
      const proverBuf = await proverRes.body();
      expect(proverBuf.length).toBeGreaterThan(1000000);
    }
  });
});
