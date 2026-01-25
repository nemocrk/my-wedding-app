import { vi } from 'vitest';
import * as api from '../services/api';

describe('API Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn();
  });

  const mockResponse = (data, status = 200) => {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    });
  };

  test('fetchLanguages calls correct endpoint', async () => {
    global.fetch.mockReturnValue(mockResponse([{ code: 'it' }]));
    
    await api.fetchLanguages();
    
    // Check call (loose matching for headers/credentials which are implementation details)
    expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api/public/languages/'),
        expect.anything()
    );
  });

  test('validateCode performs POST', async () => {
    global.fetch.mockReturnValue(mockResponse({ valid: true }));
    
    await api.authenticateInvitation('ABC', 'TOKEN'); // CORRECT FUNCTION NAME

    expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api/public/auth/'),
        expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ code: 'ABC', token: 'TOKEN' })
        })
    );
  });

  test('submitRSVP sends correct payload', async () => {
      global.fetch.mockReturnValue(mockResponse({ success: true }));
      const payload = { status: 'confirmed' };
      
      // Pass arguments correctly matching signature: status, acc, transfer, extra
      await api.submitRSVP('confirmed', false, false, {});
      
      expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('api/public/rsvp/'),
          expect.objectContaining({
              method: 'POST',
              body: expect.stringContaining('"status":"confirmed"')
          })
      );
  });
  
  // logInteraction is NOT exported by api.js, it's internal to analytics usually
  // checking file content: it seems logInteraction is NOT in the downloaded file
  // Removing test for non-existent function
});
