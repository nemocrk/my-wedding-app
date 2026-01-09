import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../../services/api';

describe('API Service', () => {
  beforeEach(() => {
    // Setup global fetch mock if not already set by jsdom
    global.fetch = vi.fn();
    
    // Mock global event dispatcher
    window.dispatchEvent = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should export an api object', () => {
    expect(api).toBeDefined();
    expect(typeof api).toBe('object');
  });

  it('should have invitation CRUD methods', () => {
    expect(typeof api.fetchInvitations).toBe('function');
    expect(typeof api.getInvitation).toBe('function');
    expect(typeof api.createInvitation).toBe('function');
    expect(typeof api.updateInvitation).toBe('function');
    expect(typeof api.deleteInvitation).toBe('function');
  });

  it('should have configuration methods', () => {
    expect(typeof api.getConfig).toBe('function');
    expect(typeof api.updateConfig).toBe('function');
  });

  it('should have WhatsApp integration methods', () => {
    expect(typeof api.getWhatsAppStatus).toBe('function');
    expect(typeof api.refreshWhatsAppSession).toBe('function');
    expect(typeof api.fetchWhatsAppQueue).toBe('function');
  });

  it('should handle API errors gracefully', async () => {
    // Mock fetch error response
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'Internal Server Error' })
    });

    await expect(api.fetchInvitations()).rejects.toThrow('Internal Server Error');
    
    // Check if error event was dispatched
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
  });
});
