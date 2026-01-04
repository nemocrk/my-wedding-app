import { test, expect } from '@playwright/test';
import { ApiHelper } from '../utils/api';

test.describe('Negative Authentication Scenarios', () => {
  let api: ApiHelper;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
  });

  test('User cannot access invitation with invalid code', async ({ page }) => {
    const invalidCode = 'INVALID-CODE-123';
    const validToken = 'valid-token'; // Token structure depends on backend, but invalid code should fail regardless
    
    // Construct URL manually
    const url = `http://localhost:8080/invitation?code=${invalidCode}&token=${validToken}`;
    
    await page.goto(url);
    
    // Expect Error Message (Modal or Page)
    // Based on InvitationPage.jsx, it shows an error state or modal
    await expect(page.getByText(/Link non valido|Errore|Invito non valido/i)).toBeVisible({ timeout: 5000 });
    
    // Ensure content is NOT visible
    await expect(page.getByText('Benvenuti')).not.toBeVisible();
  });

  test('User cannot access invitation with invalid token', async ({ request, page }) => {
    // First create a valid invitation to get a real code
    const inv = await api.createInvitation({
        code: `auth-test-${Date.now()}`,
        name: `Auth Test Family`,
        status: 'pending',
        guests: [{ first_name: 'Test', last_name: 'User', is_child: false }]
    });

    const invalidToken = 'INVALID-TOKEN';
    const url = `http://localhost:8080/invitation?code=${inv.code}&token=${invalidToken}`;

    await page.goto(url);

    // Expect Error
    await expect(page.getByText(/Link non valido|Errore|Invito non valido/i)).toBeVisible();
  });

  test('User cannot access invitation without parameters', async ({ page }) => {
    await page.goto('http://localhost:8080/invitation');

    // Expect Error regarding missing parameters
    await expect(page.getByText(/Link non valido|Mancano i parametri/i)).toBeVisible();
  });
});
