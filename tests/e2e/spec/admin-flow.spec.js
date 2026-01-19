const { test, expect } = require('@playwright/test');

test.describe('Admin Flow: Labels, Bulk Actions & Pinning', () => {
  
  test.beforeEach(async ({ page }) => {
    // Mock authentication or use a global setup if configured
    // For now assuming direct access or mock login for local dev env
    await page.goto('/dashboard');
    // If login needed:
    // await page.fill('input[name="username"]', 'admin');
    // await page.fill('input[name="password"]', 'password');
    // await page.click('button[type="submit"]');
  });

  test('Create Label, Assign to Invitation, and Filter', async ({ page }) => {
    // 1. Navigate to Labels Page
    await page.getByRole('link', { name: /etichette/i }).click();
    await expect(page).toHaveURL(/.*\/labels/);

    // 2. Create "VIP" Label
    await page.getByRole('button', { name: /nuova etichetta/i }).click();
    await page.getByPlaceholder(/nome etichetta/i).fill('VIP Test');
    await page.locator('input[type="color"]').fill('#ff0000');
    await page.getByRole('button', { name: /salva/i }).click();

    // Verify creation
    await expect(page.getByText('VIP Test')).toBeVisible();

    // 3. Navigate to Invitations List
    await page.getByRole('link', { name: /inviti/i }).click();
    
    // 4. Assign Label (assuming there's at least one invitation)
    // Select first invitation checkbox
    await page.locator('input[type="checkbox"]').first().check();
    
    // Bulk Action: Apply Label
    await expect(page.getByText(/selezionati/i)).toBeVisible();
    await page.getByRole('button', { name: /gestisci etichette/i }).click(); // Adjust name if needed
    
    // In modal, select VIP Test
    await page.getByLabel('VIP Test').check(); 
    await page.getByRole('button', { name: /applica/i }).click();

    // 5. Verify Label on row
    await expect(page.locator('.badge').filter({ hasText: 'VIP Test' }).first()).toBeVisible();

    // 6. Filter by Label
    await page.getByLabel(/etichette/i).selectOption({ label: 'VIP Test' });
    // Should still see the row
    await expect(page.locator('.badge').filter({ hasText: 'VIP Test' }).first()).toBeVisible();
  });

  test('Pin Accommodation Assignment', async ({ page }) => {
    // 1. Navigate to Accommodations
    await page.getByRole('link', { name: /alloggi/i }).click();

    // 2. Find an invitation in a room (assuming test data exists)
    // Click pin button for first guest
    const pinButton = page.locator('button[aria-label="pin-invitation"]').first();
    
    // Check initial state (unpinned) - verify icon style or aria-pressed if applicable
    // Click to Pin
    await pinButton.click();

    // Verify success toast/message
    await expect(page.getByText(/assegnazione bloccata/i)).toBeVisible();

    // Verify visual change (e.g. lock icon)
    // await expect(page.locator('.lucide-lock')).toBeVisible(); 
  });

});
