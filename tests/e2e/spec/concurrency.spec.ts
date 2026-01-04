import { test, expect } from '@playwright/test';
import { ApiHelper } from '../utils/api';

test.describe('Concurrency Scenarios', () => {
  let api: ApiHelper;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
  });

  test('Multiple users RSVP simultaneously', async ({ request }) => {
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
        // We simulate the API call directly to test backend concurrency handling
        // Playwright runs in Node, so Promise.all will send requests in parallel (mostly)
        
        // Simulating the exact payload the frontend sends
        const rsvpPayload = {
            status: 'confirmed',
            accommodation_requested: true, // Everyone wants a room to stress test logic
            transfer_requested: false
        };

        // We need to use the public API endpoint: /api/public/rsvp/
        // But first we need to "authenticate" (establish session) for each user.
        // In a real browser test, we'd open N pages/contexts. 
        // For pure concurrency load testing, API context is lighter and faster.
        
        const context = await request.newContext();
        
        // 2a. Auth (GET to valid link sets cookies)
        // Note: Using the internal API helper might use admin auth. 
        // We want to simulate PUBLIC user flow.
        // Backend usually expects session cookie.
        
        // Let's use the public auth endpoint directly if available or mimic the link visit.
        // Based on backend, GET /api/public/invitation/?code=X&token=Y sets the session.
        
        const linkData = await api.getInvitationLink(inv.id);
        const urlObj = new URL(linkData.url);
        const code = urlObj.searchParams.get('code');
        const token = urlObj.searchParams.get('token');

        // Step A: Auth
        const authResponse = await context.get(`http://localhost:8000/api/public/invitation/?code=${code}&token=${token}`);
        expect(authResponse.ok()).toBeTruthy();

        // Step B: RSVP
        const rsvpResponse = await context.post('http://localhost:8000/api/public/rsvp/', {
            data: rsvpPayload
        });
        
        return { 
            id: inv.id, 
            status: rsvpResponse.status(), 
            ok: rsvpResponse.ok() 
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
        const updatedInv = await api.getInvitation(inv.id);
        expect(updatedInv.status).toBe('confirmed');
        expect(updatedInv.accommodation_requested).toBe(true);
    }
  });
});
