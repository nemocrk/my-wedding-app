import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchClient, fetchClientDelete, _internal } from './fetchClient';

describe('fetchClient Module', () => {
  // Setup standard mocks
  beforeEach(() => {
    // Reset global fetch mock
    global.fetch = vi.fn();
    // Reset global dispatchEvent mock
    window.dispatchEvent = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchClient() - Happy Path', () => {
    it('should parse JSON response when status is 200', async () => {
      const mockData = { id: 1, name: 'Test' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => mockData,
      });

      const result = await fetchClient('/api/test');
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith('/api/test', {});
    });

    it('should send correct Content-Type for POST requests', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: true }),
      });

      const payload = { name: 'New Item' };
      await fetchClient('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    });

    it('should handle PUT requests correctly', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ updated: true }),
      });

      await fetchClient('/api/test/1', { method: 'PUT' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/test/1'),
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should pass custom headers', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({}),
      });

      const headers = { 'X-Custom-Header': '123' };
      await fetchClient('/api/test', { headers });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers })
      );
    });
  });

  describe('fetchClient() - Error Handling', () => {
    const errorScenarios = [
      { status: 401, text: 'Unauthorized' },
      { status: 403, text: 'Forbidden' },
      { status: 404, text: 'Not Found' },
      { status: 500, text: 'Internal Server Error' },
    ];

    errorScenarios.forEach(({ status, text }) => {
      it(`should emit api-error event for status ${status}`, async () => {
        global.fetch.mockResolvedValueOnce({
          ok: false,
          status: status,
          statusText: text,
          headers: { get: () => 'application/json' },
          json: async () => ({ detail: `Error ${status}` }),
        });

        await expect(fetchClient('/api/error')).rejects.toThrow();
        
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
        const event = window.dispatchEvent.mock.calls[0][0];
        expect(event.type).toBe('api-error');
        expect(event.detail.status).toBe(status);
        expect(event.detail.message).toContain(`Error ${status}`);
      });
    });

    it('should emit api-error on network failure', async () => {
      const networkError = new Error('Network Error');
      global.fetch.mockRejectedValueOnce(networkError);

      await expect(fetchClient('/api/network-fail')).rejects.toThrow('Impossibile contattare il server');
      
      expect(window.dispatchEvent).toHaveBeenCalled();
      const event = window.dispatchEvent.mock.calls[0][0];
      expect(event.type).toBe('api-error');
      expect(event.detail.originalError).toBe(networkError);
    });

    it('should handle non-JSON error responses with text fallback', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: { get: () => 'text/plain' },
        text: async () => 'Plain text error',
      });

      await expect(fetchClient('/api/text-error')).rejects.toThrow('Plain text error');
      
      expect(window.dispatchEvent).toHaveBeenCalled();
      const event = window.dispatchEvent.mock.calls[0][0];
      expect(event.detail.message).toBe('Plain text error');
    });
  });

  describe('fetchClientDelete()', () => {
    it('should return true for status 204 (No Content)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: { get: () => null },
        text: async () => '',
      });

      const result = await fetchClientDelete('/api/delete/1');
      expect(result).toBe(true);
    });

    it('should return parsed JSON for status 200', async () => {
      const mockResponse = { deleted: true };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => mockResponse,
      });

      const result = await fetchClientDelete('/api/delete/1');
      expect(result).toEqual(mockResponse);
    });

    it('should emit api-error for status 404', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: { get: () => 'application/json' },
        json: async () => ({ detail: 'Not Found' }),
      });

      await expect(fetchClientDelete('/api/delete/999')).rejects.toThrow();
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'api-error' })
      );
    });
  });

  describe('Internal Helpers', () => {
    it('triggerGlobalError should dispatch CustomEvent', () => {
      const error = new Error('Test Error');
      _internal.triggerGlobalError(error);
      
      expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
      const event = window.dispatchEvent.mock.calls[0][0];
      expect(event.type).toBe('api-error');
      expect(event.detail).toBe(error);
    });
  });
});
