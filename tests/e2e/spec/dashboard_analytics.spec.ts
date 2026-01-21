import { test, expect } from '@playwright/test';
import { ApiHelper } from '../utils/api';

test.describe('Dashboard Analytics & Dynamic Charts', () => {
  let api: ApiHelper;
  const createdInvitationIds: number[] = [];

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
  });

  test.afterEach(async () => {
    // Cleanup
    console.log('Cleaning up dashboard test data...');
    for (const id of createdInvitationIds) {
      await api.deleteInvitation(id);
    }
  });

  test('Complex Dashboard Workflow: Filters and Charts', async ({ page }) => {
    test.setTimeout(60000);

    // 1. SEED DATA
    console.log('Seeding data for dashboard analytics...');
    
    // Groom Guest - Confirmed
    const inv1 = await api.createInvitation({
      code: `dash-groom-conf-${Date.now()}`,
      name: 'Groom Confirmed',
      status: 'confirmed',
      guests: [{ first_name: 'GroomGuest', last_name: 'Confirmed', is_child: false, origin: 'groom' }]
    });
    createdInvitationIds.push(inv1.id);

    // Bride Guest - Confirmed
    const inv2 = await api.createInvitation({
      code: `dash-bride-conf-${Date.now()}`,
      name: 'Bride Confirmed',
      status: 'confirmed',
      guests: [{ first_name: 'BrideGuest', last_name: 'Confirmed', is_child: false, origin: 'bride' }]
    });
    createdInvitationIds.push(inv2.id);

    // Groom Guest - Pending
    const inv3 = await api.createInvitation({
      code: `dash-groom-pend-${Date.now()}`,
      name: 'Groom Pending',
      status: 'sent', // Sent = Pending response
      guests: [{ first_name: 'GroomGuest', last_name: 'Pending', is_child: false, origin: 'groom' }]
    });
    createdInvitationIds.push(inv3.id);

    // 2. NAVIGATE TO DASHBOARD
    await page.goto('http://localhost:8080/#/dashboard');
    
    // Wait for initial load
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Caricamento dati...')).not.toBeVisible();

    // 3. VERIFY KPI CARDS (Smoke)
    // We expect to see "Totale" guests. Since we just created 3, the number should be >= 3.
    // Exact number check is hard due to other tests/db state, so we check for existence of cards.
    await expect(page.locator('.bg-white.p-6.rounded-lg.shadow-md').first()).toBeVisible();

    // 4. DYNAMIC CHART INTERACTION (Complex Workflow)
    const chartSection = page.locator('text=Analisi Ospiti').first(); // Adjust selector based on actual text
    // If specific text isn't stable, look for the chart container
    const chartContainer = page.locator('.recharts-responsive-container');
    
    // Wait for filters to load
    // Filters should be buttons like "Sposo", "Sposa", "Confermati", "In Attesa" (mapped from BE)
    // Assuming backend returns 'groom' mapped to 'Sposo' or similar, or raw keys.
    // Based on previous tests, it might be raw keys if i18n isn't fully applied to keys yet, 
    // but typically UI shows translated. Let's look for button elements in the filter area.
    
    // Check for "Sposo" or "groom" filter button
    // The previous unit tests used mock data with 'groom', 'bride'. 
    // Real app might use 'groom'/'bride' as keys.
    const groomFilter = page.getByRole('button', { name: /Sposo|groom/i }).first();
    await expect(groomFilter).toBeVisible();

    // A. Verify Empty State
    // "Seleziona almeno un filtro" should be visible if no default filter is selected
    // Note: Unit tests showed this text.
    await expect(page.getByText(/Seleziona almeno un filtro/i)).toBeVisible();

    // B. Select Single Filter (Groom)
    await groomFilter.click();
    
    // Verify active state (usually distinct background color)
    // Tailwind 'bg-blue-600' class was used in unit tests for active state
    await expect(groomFilter).toHaveClass(/bg-blue-600/);
    
    // Verify Chart Appears
    await expect(page.locator('.recharts-surface')).toBeVisible();

    // C. Select Second Filter (Confirmed)
    const confirmedFilter = page.getByRole('button', { name: /Confermati|confirmed/i }).first();
    await confirmedFilter.click();
    
    // Verify both active
    await expect(groomFilter).toHaveClass(/bg-blue-600/);
    await expect(confirmedFilter).toHaveClass(/bg-blue-600/);

    // D. Deselect Groom
    await groomFilter.click();
    await expect(groomFilter).not.toHaveClass(/bg-blue-600/); // Should lose active class
    await expect(groomFilter).toHaveClass(/bg-gray-100/); // Back to inactive

    // Chart should still be visible because "Confirmed" is still selected
    await expect(page.locator('.recharts-surface')).toBeVisible();

    // E. Deselect All
    await confirmedFilter.click();
    await expect(page.getByText(/Seleziona almeno un filtro/i)).toBeVisible();
    await expect(page.locator('.recharts-surface')).not.toBeVisible();

    console.log('Dashboard Analytics complex workflow completed successfully');
  });
});
