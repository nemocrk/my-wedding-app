import { beforeEach, describe, expect, test, vi } from 'vitest';


import * as api from '../api';

// Helper to mock fetch
const mockFetch = (response, status = 200, ok = true) => {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
    headers: new Headers(),
  });
};

const mockFetchFail = (error) => {
  return vi.fn().mockRejectedValue(error);
};

describe('API Service', () => {
  const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = mockFetch({});
    dispatchEventSpy.mockClear();
    sessionStorage.clear();
  });

  test('fetchWithCredentials success', async () => {
    const data = { success: true };
    globalThis.fetch = mockFetch(data);

    const result = await api.fetchWithCredentials('test-url');
    expect(result).toEqual(data);
    expect(globalThis.fetch).toHaveBeenCalledWith('test-url', expect.objectContaining({
      credentials: 'include'
    }));
  });

  test('fetchWithCredentials HTTP error (400)', async () => {
    const errorData = { message: 'Bad Request' };
    globalThis.fetch = mockFetch(errorData, 400, false);

    await expect(api.fetchWithCredentials('test-url')).rejects.toThrow('Bad Request');

    // Check globalThis error dispatch
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    const event = dispatchEventSpy.mock.calls[0][0];
    expect(event.type).toBe('api-error');
    expect(event.detail.message).toContain('Bad Request');
  });

  test('fetchWithCredentials HTTP error generic (500)', async () => {
    // Mock catch on json()
    const mockRes = {
      ok: false,
      status: 500,
      json: () => Promise.reject('JSON Parse Error')
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockRes);

    await expect(api.fetchWithCredentials('test-url')).rejects.toThrow('HTTP 500');
    expect(dispatchEventSpy).toHaveBeenCalled();
  });

  test('fetchWithCredentials Network Error', async () => {
    const netErr = new Error('Network Error');
    globalThis.fetch = mockFetchFail(netErr);

    await expect(api.fetchWithCredentials('test-url')).rejects.toThrow('Errore di connessione al server.');
    expect(dispatchEventSpy).toHaveBeenCalled(); // Should trigger handled error
  });

  test('fetchWithCredentials prevents double handling', async () => {
    // Force a handled error
    const handledErr = new Error('Handled');
    handledErr.isHandled = true;

    globalThis.fetch = vi.fn().mockImplementation(() => {
      throw handledErr;
    });

    await expect(api.fetchWithCredentials('test')).rejects.toThrow('Handled');
    expect(dispatchEventSpy).not.toHaveBeenCalled();
  });

  test('authenticateInvitation calls correct endpoint', async () => {
    await api.authenticateInvitation('ABC', 'TOKEN');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ code: 'ABC', token: 'TOKEN' })
      })
    );
  });

  test('submitRSVP sends correct payload with session', async () => {
    sessionStorage.setItem('wedding_analytics_sid', 'sess_123');
    await api.submitRSVP('confirmed', true, false, { note: 'Hi' });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/rsvp/'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"session_id":"sess_123"')
      })
    );
  });

  test('fetchLanguages calls correct endpoint', async () => {
    await api.fetchLanguages();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/languages/'),
      expect.anything());
  });
});
