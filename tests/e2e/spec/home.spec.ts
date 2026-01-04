import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  const url = `http://localhost:8080`;
  await page.goto(url);
  
  // Verify the page loads
  const response = await page.goto(url);
  expect(response?.status()).toBe(200);

  // Take a screenshot for debugging
  await page.screenshot({ path: 'test-results/homepage.png' });
});
