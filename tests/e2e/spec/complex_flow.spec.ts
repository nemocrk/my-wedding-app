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

  test('Complete Admin -> User (Wizard RSVP) -> Admin Assignment Flow', async ({ page, request }) => {
    test.setTimeout(180000); // Allow 3 minutes for full flow (wizard takes longer)

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
                phone_number: `+39 333 ${Math.floor(Math.random() * 1000000)}`,
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
        await page.goto('http://localhost:8080/#/dashboard');
        
        await expect(page.locator('body')).toContainText('In Attesa');
        await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
        await waitForPageReady(page);
        
        await page.screenshot({ path: 'test-results/complex-flow-1-dashboard-initial.png', fullPage: true });

        // 3. USER: Interact with invitations using NEW WIZARD FLOW
        console.log('Simulating User interactions with Wizard RSVP...');
        for (const [index, inv] of invitations.entries()) {
            // Get public link
            const linkData = await api.getInvitationLink(inv.id);
            const publicUrl = linkData.url.replace(':8080', ':80'); 
            
            // Navigate to public link
            await page.goto(publicUrl);
            
            // Wait for envelope animation and content to load
            await expect(page.getByRole('heading', { name: 'Siete Invitati!' })).toBeVisible();
            await waitForPageReady(page);

            // Take screenshot for first user
            if (index === 0) {
                await page.screenshot({ path: 'test-results/complex-flow-2-user-view-landing.png', fullPage: true });
            }

            // Random choice: 90% confirm, 10% decline
            const willConfirm = Math.random() > 0.1;
            
            if (willConfirm) {
                // ===================
                // WIZARD FLOW SIMULATION
                // ===================
                
                // Click RSVP card to open wizard modal
                await page.getByText('RSVP - Conferma Presenza').click();
                
                // Wait for modal to open (Step 1: Guests)
                await expect(page.getByText('Conferma Ospiti')).toBeVisible();
                await page.waitForTimeout(300);

                // STEP 1: GUESTS - Random Edit/Exclude
                const shouldEditGuests = Math.random() > 0.5; // 50% chance
                if (shouldEditGuests) {
                    // Try to edit first guest name
                    const editButtons = await page.locator('button:has-text("✏️")').all();
                    if (editButtons.length > 0) {
                        await editButtons[0].click();
                        await page.waitForTimeout(200);
                        
                        const firstNameInput = page.locator('input[placeholder="Nome"]').first();
                        await firstNameInput.clear();
                        await firstNameInput.fill(`Edited${Math.floor(Math.random() * 100)}`);
                        
                        const saveBtn = page.locator('button:has-text("✓")').first();
                        await saveBtn.click();
                        await page.waitForTimeout(300);
                    }
                }

                // Random exclude one guest (30% chance if multiple guests)
                const shouldExclude = Math.random() > 0.7;
                if (shouldExclude) {
                    const excludeButtons = await page.locator('button:has-text("✕")').all();
                    if (excludeButtons.length > 1) { // Only exclude if multiple guests
                        await excludeButtons[excludeButtons.length - 1].click();
                        await page.waitForTimeout(300);
                    }
                }

                // Next step
                await page.getByText('Avanti →').click();
                await page.waitForTimeout(500);

                // STEP 2: CONTACT - Phone Number (usually pre-filled)
                await expect(page.getByText('Numero di Contatto')).toBeVisible();
                
                // Random: edit phone (20% chance)
                if (Math.random() > 0.8) {
                    const editPhoneBtn = page.locator('button:has-text("✏️")').first();
                    await editPhoneBtn.click();
                    await page.waitForTimeout(200);
                    
                    const phoneInput = page.locator('input[placeholder="+39 333 1234567"]');
                    await phoneInput.fill(`+39 333 ${Math.floor(Math.random() * 9000000) + 1000000}`);
                    
                    const savePhoneBtn = page.locator('button:has-text("✓")').first();
                    await savePhoneBtn.click();
                    await page.waitForTimeout(300);
                }

                await page.getByText('Avanti →').click();
                await page.waitForTimeout(500);

                // STEP 3: TRAVEL - Transport Info
                await expect(page.getByText('Come Viaggerai?')).toBeVisible();
                
                // Random transport choice
                const useFerrry = Math.random() > 0.5;
                if (useFerrry) {
                    await page.getByLabel('Traghetto').click();
                    await page.waitForTimeout(300);
                    
                    // Random car option
                    if (Math.random() > 0.5) {
                        await page.getByLabel('Auto al seguito').click();
                    }
                } else {
                    await page.getByLabel('Aereo').click();
                    await page.waitForTimeout(300);
                    
                    // Random carpool interest
                    if (Math.random() > 0.6) {
                        await page.getByLabel(/Sarebbe carino organizzarmi/).click();
                    }
                }

                // Fill schedule
                const scheduleInput = page.locator('textarea[placeholder*="Partenza"]');
                await scheduleInput.fill(`Arrivo ${Math.floor(Math.random() * 12) + 8}:00, Partenza ${Math.floor(Math.random() * 12) + 8}:00 +1`);

                await page.getByText('Avanti →').click();
                await page.waitForTimeout(500);

                // STEP 4: ACCOMMODATION (if offered)
                // Check if accommodation step is visible
                const accommodationVisible = await page.getByText('Alloggio').isVisible().catch(() => false);
                if (accommodationVisible) {
                    // Random: request accommodation (60% chance)
                    if (Math.random() > 0.4) {
                        await page.getByLabel(/Sì, richiedo l'alloggio/).click();
                    } else {
                        await page.getByLabel(/No, ho già un alloggio/).click();
                    }

                    await page.getByText('Avanti →').click();
                    await page.waitForTimeout(500);
                }

                // STEP 5: FINAL CONFIRMATION
                await expect(page.getByText('Conferma Finale')).toBeVisible();
                
                if (index === 0) {
                    await page.screenshot({ path: 'test-results/complex-flow-2b-user-wizard-final.png', fullPage: true });
                }

                // Submit RSVP
                await page.getByText('✔️ Conferma Presenza').click();
                await page.waitForTimeout(1000); // Wait for API call

                // Wait for success message or modal close
                await page.waitForTimeout(1000);

            } else {
                // DECLINE FLOW (simpler - direct modal or API call)
                // For now, use direct API call for decline (wizard only for confirmed)
                await page.evaluate(async () => {
                    await fetch('/api/public/rsvp/', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ status: 'declined' })
                    });
                });
            }
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
        await page.goto('http://localhost:8080/#/accommodations');
        
        await expect(page.getByRole('heading', { name: 'Gestione Alloggi' })).toBeVisible();
        await waitForPageReady(page);
        
        await page.screenshot({ path: 'test-results/complex-flow-3-accommodations-before.png', fullPage: true });
        
        // Call API directly for assignment
        await api.triggerAutoAssignment();
        
        // Reload page to see results
        await page.reload();
        await expect(page.getByRole('heading', { name: 'Gestione Alloggi' })).toBeVisible();
        await waitForPageReady(page);
        
        await page.screenshot({ path: 'test-results/complex-flow-4-accommodations-after.png', fullPage: true });

        // 6. ADMIN: Verify Results
        await page.goto('http://localhost:8080/#/dashboard');
        
        await expect(page.getByRole('heading', { name: 'Dettaglio Logistica & Costi' })).toBeVisible();
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