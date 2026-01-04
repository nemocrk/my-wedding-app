import { test, expect } from '@playwright/test';
import { ApiHelper } from '../utils/api';

test.describe('Concurrency Scenarios', () => {
  let api: ApiHelper;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
  });

  // Inject 'playwright' fixture to create new contexts
  test('Multiple users RSVP simultaneously', async ({ request, playwright }) => {
    // 1. Create multiple invitations
    const userCount = 10;
    const invitations = [];
    
    console.log(`Creating ${userCount} invitations...`);
    for (let i = 0; i < userCount; i++) {
        const inv = await api.createInvitation({
            code: `concurrent-user-${Date.now()}-${i}`,
            name: `Concurrent Family ${i}`,
            status: 'pending',
            accommodation_offered: true,
            guests: [{ first_name: 'User', last_name: `${i}`, is_child: false }]
        });
        invitations.push(inv);
    }

    // 2. Prepare RSVP promises to fire effectively in parallel
    console.log('Firing concurrent RSVPs...');
    
    const rsvpPromises = invitations.map(async (inv) => {
        // Create a FRESH context for each user to simulate isolated sessions (cookies)
        const context = await playwright.request.newContext();
        
        const linkData = await api.getInvitationLink(inv.id);
        const urlObj = new URL(linkData.url);
        const code = urlObj.searchParams.get('code');
        const token = urlObj.searchParams.get('token');

        // Step A: Auth
        // POST to /api/public/auth/ to establish session
        const authResponse = await context.post(`http://localhost:8000/api/public/auth/`, {
            data: { code, token }
        });
        expect(authResponse.ok()).toBeTruthy();

        // Step B: RSVP
        const rsvpResponse = await context.post('http://localhost:8000/api/public/rsvp/', {
            data: {
                status: 'confirmed',
                accommodation_requested: true, // Everyone wants a room to stress test logic
                transfer_requested: false
            }
        });
        
        const ok = rsvpResponse.ok();
        await context.dispose(); // Cleanup

        return { 
            id: inv.id, 
            status: rsvpResponse.status(), 
            ok 
        };
    });

    // 3. Await all
    const results = await Promise.all(rsvpPromises);

    // 4. Verify results
    const successCount = results.filter(r => r.ok).length;
    console.log(`Successful RSVPs: ${successCount}/${userCount}`);
    
    expect(successCount).toBe(userCount);

    // 5. Verify Backend State (Admin side)
    // Check that all 10 are actually confirmed
    for (const inv of invitations) {
        const response = await request.get(`http://localhost:8080/api/admin/invitations/${inv.id}/`);
        expect(response.ok()).toBeTruthy();
        const updatedInv = await response.json();
        
        expect(updatedInv.status).toBe('confirmed');
        expect(updatedInv.accommodation_requested).toBe(true);
    }
  });
});
