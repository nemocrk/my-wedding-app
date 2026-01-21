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
      guests: [{ first_name: 'GroomGuest', last_name: 'Confirmed', is_child: false }]
    });
    createdInvitationIds.push(inv1.id);

    // 2. NAVIGATE TO DASHBOARD
    await page.goto('http://localhost:8080/#/dashboard');
    
    // Wait for initial load
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    
    // Wait for data loading to complete
    // Check for specific unique text that confirms Dashboard loaded
    await expect(page.getByText('Panoramica generale dell\'evento')).toBeVisible();

    // 3. VERIFY KPI CARDS (Smoke)
    // Updated selector based on actual DOM snapshot (generic divs instead of specific classes)
    // We look for "Ospiti Confermati" which is a stable text in the first card
    await expect(page.getByText('Ospiti Confermati')).toBeVisible();
    
    // 4. DYNAMIC CHART INTERACTION
    // Check for filter container availability
    const groomFilter = page.getByRole('button', { name: /Sposo|groom/i }).first();
    await expect(groomFilter).toBeVisible();

    // A. Verify Empty State
    await expect(page.getByText(/Seleziona almeno un filtro/i)).toBeVisible();

    // B. Select Single Filter (Groom)
    await groomFilter.click();
    
    // Verify active state
    await expect(groomFilter).toHaveClass(/bg-blue-600/);
    
    // Verify Chart Appears
    // Using a more robust selector for the chart container
    await expect(page.locator('.recharts-responsive-container')).toBeVisible({ timeout: 10000 });

    console.log('Dashboard Analytics complex workflow completed successfully');
  });
});
