import { test, expect } from '@playwright/test';
import { ApiHelper } from '../utils/api';

const generateRandomGuests = () => {
  const count = Math.floor(Math.random() * 5) + 1; // 1-5 guests
  const guests = [];
  for (let i = 0; i < count; i++) {
    guests.push({
      first_name: `Guest${Math.floor(Math.random() * 1000)}`,
      last_name: `TestFamily`,
      is_child: Math.random() < 0.3, // 30% chance of being child
      dietary_requirements: Math.random() < 0.2 ? 'Vegetarian' : ''
    });
  }
  return guests;
};

const generateRandomRoomConfig = () => {
    const rooms = [];
    const roomCount = Math.floor(Math.random() * 5) + 1; // 1-5 rooms
    for (let i = 0; i < roomCount; i++) {
        rooms.push({
            room_number: `10${i}`,
            capacity_adults: Math.floor(Math.random() * 3) + 1, // 1-3
            capacity_children: Math.floor(Math.random() * 2) // 0-1
        });
    }
    return rooms;
}

/**
 * Helper to wait for page to be fully rendered before screenshot
 */
const waitForPageReady = async (page: any) => {
  // Wait for network to be idle (no more than 2 connections for 500ms)
  await page.waitForLoadState('networkidle');
  // Additional small delay for animations/transitions
  await page.waitForTimeout(500);
};

test.describe('Complex Wedding Flow', () => {
  let api: ApiHelper;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await waitForPageReady(page);
      const screenshotPath = `test-results/failure-${testInfo.title.replace(/\s+/g, '-').toLowerCase()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot saved to: ${screenshotPath}`);
    }
  });

  test('Complete Admin -> User -> Admin Assignment Flow', async ({ page, request }) => {
    test.setTimeout(120000); // Allow 2 minutes for full flow

    const createdInvitationIds: number[] = [];
    const createdAccommodationIds: number[] = [];

    try {
        // 1. ADMIN: Generate 10 invitations
        const invitations = [];
        console.log('Generating 10 invitations...');
        for (let i = 0; i < 10; i++) {
            const inv = await api.createInvitation({
                code: `family-${Date.now()}-${i}`,
                name: `Famiglia Test ${i}`,
                accommodation_offered: true,
                transfer_offered: true,
                status: 'created',
                guests: generateRandomGuests()
            });
            invitations.push(inv);
            createdInvitationIds.push(inv.id);
        }
        expect(invitations.length).toBe(10);

        // 2. ADMIN: Verify Dashboard (via UI or API)
        // Using UI for Admin verification
        await page.goto('http://localhost:8080/dashboard');
        
        // Wait for dashboard to fully render
        await expect(page.locator('body')).toContainText('In Attesa');
        await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
        await waitForPageReady(page);
        
        await page.screenshot({ path: 'test-results/complex-flow-1-dashboard-initial.png', fullPage: true });

        // 3. USER: Interact with invitations
        console.log('Simulating User interactions...');
        for (const [index, inv] of invitations.entries()) {
            // Get public link
            const linkData = await api.getInvitationLink(inv.id);
            
            // Fix: ensure public port 80
            const publicUrl = linkData.url.replace(':8080', ':80'); 
            
            // Navigate to public link
            await page.goto(publicUrl);
            
            // Wait for envelope animation and content to load
            await expect(page.getByRole('heading', { name: 'Siete Invitati!' })).toBeVisible();
            await waitForPageReady(page);

            // Take screenshot only for the first user interaction to avoid clutter
            if (index === 0) {
                await page.screenshot({ path: 'test-results/complex-flow-2-user-view.png', fullPage: true });
            }

            // Random choices
            const status = Math.random() > 0.1 ? 'confirmed' : 'declined'; // 90% confirm
            const accReq = Math.random() > 0.5;
            const transReq = Math.random() > 0.5;

            // Use Public API to simulate user action (session based)
            await page.evaluate(async (data) => {
                await fetch('/api/public/rsvp/', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
            }, { status, accommodation_requested: accReq, transfer_requested: transReq });
        }

        // 4. ADMIN: Add 10 Accommodations
        console.log('Adding 10 accommodations...');
        for (let i = 0; i < 10; i++) {
            const acc = await api.createAccommodation({
                name: `Hotel Random ${i}`,
                address: `Via Roma ${i}`,
                rooms: generateRandomRoomConfig()
            });
            createdAccommodationIds.push(acc.id);
        }

        // 5. ADMIN: Auto Assignment
        console.log('Triggering Auto Assignment...');
        await page.goto('http://localhost:8080/accommodations');
        
        // Wait for accommodations page to render
        await expect(page.getByRole('heading', { name: 'Gestione Alloggi' })).toBeVisible();
        await waitForPageReady(page);
        
        await page.screenshot({ path: 'test-results/complex-flow-3-accommodations-before.png', fullPage: true });
        
        // WORKAROUND: Call API directly
        await api.triggerAutoAssignment();
        
        // Reload page to see results and wait for new data
        await page.reload();
        await expect(page.getByRole('heading', { name: 'Gestione Alloggi' })).toBeVisible();
        await waitForPageReady(page);
        
        await page.screenshot({ path: 'test-results/complex-flow-4-accommodations-after.png', fullPage: true });

        // 6. ADMIN: Verify Results
        // Check Dashboard again
        await page.goto('http://localhost:8080/dashboard');
        
        // Wait for dashboard to refresh with new data
        await expect(page.getByText('Alloggi')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
        await waitForPageReady(page);
        
        await page.screenshot({ path: 'test-results/complex-flow-5-dashboard-final.png', fullPage: true });

    } finally {
        // CLEANUP
        console.log('Cleaning up data...');
        for (const id of createdInvitationIds) {
            await api.deleteInvitation(id);
        }
        for (const id of createdAccommodationIds) {
            await api.deleteAccommodation(id);
        }
    }
  });
});
