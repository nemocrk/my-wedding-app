import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { whatsappService } from './whatsappService';
import { fetchClient, fetchClientDelete } from './fetchClient';

// Mock dependency modules
vi.mock('./fetchClient', () => ({
  fetchClient: vi.fn(),
  fetchClientDelete: vi.fn(),
}));

const API_BASE_URL = 'api/admin';

describe('whatsappService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Queue Management APIs', () => {
    it('getQueue() calls correct URL without params', async () => {
      await whatsappService.getQueue();
      expect(fetchClient).toHaveBeenCalledWith(`${API_BASE_URL}/whatsapp-queue/`);
    });

    it('getQueue() serializes query parameters correctly', async () => {
      const params = { page: 1, status: 'failed' };
      await whatsappService.getQueue(params);
      expect(fetchClient).toHaveBeenCalledWith(
        `${API_BASE_URL}/whatsapp-queue/?page=1&status=failed`
      );
    });

    it('updateMessage() sends PATCH request with correct body', async () => {
      const id = 123;
      const data = { status: 'pending' };
      
      await whatsappService.updateMessage(id, data);
      
      expect(fetchClient).toHaveBeenCalledWith(
        `${API_BASE_URL}/whatsapp-queue/${id}/`,
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      );
    });

    it('deleteMessage() calls fetchClientDelete with correct URL', async () => {
      const id = 456;
      await whatsappService.deleteMessage(id);
      
      expect(fetchClientDelete).toHaveBeenCalledWith(
        `${API_BASE_URL}/whatsapp-queue/${id}/`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('retryFailed() sends POST to correct endpoint', async () => {
      await whatsappService.retryFailed();
      
      expect(fetchClient).toHaveBeenCalledWith(
        `${API_BASE_URL}/whatsapp-queue/retry-failed/`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('forceSend() sends POST to correct endpoint', async () => {
      const id = 789;
      await whatsappService.forceSend(id);
      
      expect(fetchClient).toHaveBeenCalledWith(
        `${API_BASE_URL}/whatsapp-queue/${id}/force-send/`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('getEvents() calls correct URL with query param', async () => {
      const queueId = 101;
      await whatsappService.getEvents(queueId);
      
      expect(fetchClient).toHaveBeenCalledWith(
        `${API_BASE_URL}/whatsapp-events/?queue_message=${queueId}`
      );
    });
  });

  describe('Session Management APIs', () => {
    it('getStatus() constructs URL with sessionType', async () => {
      await whatsappService.getStatus('groom');
      expect(fetchClient).toHaveBeenCalledWith(
        `${API_BASE_URL}/whatsapp/groom/status/`
      );
    });

    it('logout() sends POST to correct session endpoint', async () => {
      await whatsappService.logout('bride');
      
      expect(fetchClient).toHaveBeenCalledWith(
        `${API_BASE_URL}/whatsapp/bride/logout/`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('refresh() sends POST to correct session endpoint', async () => {
      await whatsappService.refresh('groom');
      
      expect(fetchClient).toHaveBeenCalledWith(
        `${API_BASE_URL}/whatsapp/groom/refresh/`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  describe('Error Propagation', () => {
    it('should propagate errors from fetchClient', async () => {
      const mockError = new Error('API Error');
      fetchClient.mockRejectedValueOnce(mockError);

      await expect(whatsappService.getQueue()).rejects.toThrow('API Error');
    });
  });
});
