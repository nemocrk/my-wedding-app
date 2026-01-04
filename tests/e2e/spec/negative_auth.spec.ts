import { test, expect } from '@playwright/test';
import { ApiHelper } from '../utils/api';

test.describe('Negative Authentication Scenarios', () => {
  let api: ApiHelper;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
  });

  // Capture screenshot on failure automatically
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      const screenshotPath = `test-results/failure-${testInfo.title.replace(/\s+/g, '-').toLowerCase()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot saved to: ${screenshotPath}`);
    }
  });

  test('User cannot access invitation with invalid code', async ({ page }) => {
    const invalidCode = 'INVALID-CODE-123';
    const validToken = 'valid-token'; 
    
    // CORRECTED PORT: 80 (Public Frontend) instead of 8080 (Admin Intranet)
    // The Invitation flow belongs to the User App.
    const url = `http://localhost:80/invitation?code=${invalidCode}&token=${validToken}`;
    
    await page.goto(url);
    
    try {
        await expect(page.getByText('Ops! Qualcosa non va')).toBeVisible({ timeout: 5000 });
    } catch (e) {
        // Force screenshot immediately if this specific expectation fails
        await page.screenshot({ path: 'test-results/debug-invalid-code-fail.png' });
        throw e; // Re-throw to fail test
    }
    
    // Ensure content is NOT visible
    await expect(page.getByText('Benvenuti')).not.toBeVisible();
  });

  test('User cannot access invitation with invalid token', async ({ request, page }) => {
    const inv = await api.createInvitation({
        code: `auth-test-${Date.now()}`,
        name: `Auth Test Family`,
        status: 'pending',
        guests: [{ first_name: 'Test', last_name: 'User', is_child: false }]
    });

    const invalidToken = 'INVALID-TOKEN';
    // CORRECTED PORT: 80
    const url = `http://localhost:80/invitation?code=${inv.code}&token=${invalidToken}`;

    await page.goto(url);

    try {
        await expect(page.getByText('Ops! Qualcosa non va')).toBeVisible();
    } catch (e) {
        await page.screenshot({ path: 'test-results/debug-invalid-token-fail.png' });
        throw e;
    }
  });

  test('User cannot access invitation without parameters', async ({ page }) => {
    // CORRECTED PORT: 80
    await page.goto('http://localhost:80/invitation');

    try {
        await expect(page.getByText('Ops! Qualcosa non va')).toBeVisible();
    } catch (e) {
        await page.screenshot({ path: 'test-results/debug-no-params-fail.png' });
        throw e;
    }
  });
});
