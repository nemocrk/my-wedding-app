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
    
    // Check call (Base URL might depend on ENV, but path should end with...)
    expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/public/languages/'),
        expect.any(Object)
    );
  });

  test('validateCode performs POST', async () => {
    global.fetch.mockReturnValue(mockResponse({ valid: true }));
    
    await api.validateCode('ABC', 'TOKEN');

    expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/public/auth/'),
        expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ code: 'ABC', token: 'TOKEN' })
        })
    );
  });

  test('submitRSVP sends correct payload', async () => {
      global.fetch.mockReturnValue(mockResponse({ success: true }));
      const payload = { status: 'confirmed' };
      
      await api.submitRSVP(payload);
      
      expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/public/rsvp/'),
          expect.objectContaining({
              method: 'POST',
              body: JSON.stringify(payload)
          })
      );
  });
  
  // Add more tests for logInteraction, fetchTexts etc.
  test('logInteraction handles metadata', async () => {
      global.fetch.mockReturnValue(mockResponse({ logged: true }));
      
      await api.logInteraction('test_event', { foo: 'bar' });
      
      expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/public/log-interaction/'),
          expect.objectContaining({
              method: 'POST',
              body: JSON.stringify({ event_type: 'test_event', metadata: { foo: 'bar' } })
          })
      );
  });
});
