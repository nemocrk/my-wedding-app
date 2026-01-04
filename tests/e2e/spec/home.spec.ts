import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');
  
  // Verify the page loads
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);

  // Take a screenshot for debugging
  await page.screenshot({ path: 'test-results/homepage.png' });
});
