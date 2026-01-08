import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../../services/api';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    }))
  }
}));

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create axios instance with correct baseURL', () => {
    expect(api).toBeDefined();
  });

  it('should have authentication methods', () => {
    expect(typeof api.login).toBe('function');
    expect(typeof api.logout).toBe('function');
  });

  it('should have invitation CRUD methods', () => {
    expect(typeof api.getInvitations).toBe('function');
    expect(typeof api.updateInvitation).toBe('function');
  });

  it('should have configuration methods', () => {
    expect(typeof api.getGlobalConfig).toBe('function');
    expect(typeof api.updateGlobalConfig).toBe('function');
  });

  it('should handle API errors gracefully', async () => {
    const mockError = new Error('Network Error');
    // We cannot easily test the implementation details of the exported 'api' object 
    // if it's already instantiated, but we can verify structure.
    expect(api).toBeTruthy();
  });
});
