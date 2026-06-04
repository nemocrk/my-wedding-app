// frontend-admin/src/services/api.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './api.js';

// ── Mock fetchClient ────────────────────────────────────────────────────────
vi.mock('./fetchClient.js', () => ({
  fetchClient: vi.fn(),
  fetchClientDelete: vi.fn(),
}));

import { fetchClient, fetchClientDelete } from './fetchClient.js';

beforeEach(() => {
  vi.clearAllMocks();
  fetchClient.mockResolvedValue({});
  fetchClientDelete.mockResolvedValue({});
});

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT PLATFORMS  (lines ~223-250)
// ═══════════════════════════════════════════════════════════════════════════
describe('api — Payment Platforms', () => {
  it('fetchPaymentPlatforms calls GET payment-platforms/', async () => {
    await api.fetchPaymentPlatforms();
    expect(fetchClient).toHaveBeenCalledWith('api/admin/payment-platforms/');
  });

  it('createPaymentPlatform calls POST with body', async () => {
    const data = { name: 'Bonifico' };
    await api.createPaymentPlatform(data);
    expect(fetchClient).toHaveBeenCalledWith(
      'api/admin/payment-platforms/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(data),
      })
    );
  });

  it('updatePaymentPlatform calls PUT on correct id', async () => {
    const data = { name: 'PayPal' };
    await api.updatePaymentPlatform(7, data);
    expect(fetchClient).toHaveBeenCalledWith(
      'api/admin/payment-platforms/7/',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify(data) })
    );
  });

  it('deletePaymentPlatform calls DELETE on correct id', async () => {
    await api.deletePaymentPlatform(7);
    expect(fetchClientDelete).toHaveBeenCalledWith(
      'api/admin/payment-platforms/7/',
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT EVENTS  (lines ~252-295)
// ═══════════════════════════════════════════════════════════════════════════
describe('api — Payment Events', () => {
  it('fetchPaymentEvents with no filters calls base URL', async () => {
    await api.fetchPaymentEvents();
    expect(fetchClient).toHaveBeenCalledWith('api/admin/payment-events/');
  });

  it('fetchPaymentEvents with content_type_id filter appends query param', async () => {
    await api.fetchPaymentEvents({ content_type_id: 15 });
    expect(fetchClient).toHaveBeenCalledWith(
      'api/admin/payment-events/?content_type_id=15'
    );
  });

  it('fetchPaymentEvents with object_id filter appends query param', async () => {
    await api.fetchPaymentEvents({ object_id: 3 });
    expect(fetchClient).toHaveBeenCalledWith(
      'api/admin/payment-events/?object_id=3'
    );
  });

  it('fetchPaymentEvents with status filter appends query param', async () => {
    await api.fetchPaymentEvents({ status: 'paid' });
    expect(fetchClient).toHaveBeenCalledWith(
      'api/admin/payment-events/?status=paid'
    );
  });

  it('fetchPaymentEvents with platform filter appends query param', async () => {
    await api.fetchPaymentEvents({ platform: 2 });
    expect(fetchClient).toHaveBeenCalledWith(
      'api/admin/payment-events/?platform=2'
    );
  });

  it('fetchPaymentEvents combines multiple filters', async () => {
    await api.fetchPaymentEvents({ content_type_id: 15, object_id: 173, status: 'planned' });
    const url = fetchClient.mock.calls[0][0];
    expect(url).toContain('content_type_id=15');
    expect(url).toContain('object_id=173');
    expect(url).toContain('status=planned');
  });

  it('createPaymentEvent calls POST with body', async () => {
    const data = {
      label: 'Acconto', amount: 500, currency: 'EUR',
      payment_date: '2026-07-01', status: 'planned',
      content_type: 15, object_id: 173, platform: null,
    };
    await api.createPaymentEvent(data);
    expect(fetchClient).toHaveBeenCalledWith(
      'api/admin/payment-events/',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(data) })
    );
  });

  it('updatePaymentEvent calls PATCH on correct id', async () => {
    const data = { status: 'paid' };
    await api.updatePaymentEvent(42, data);
    expect(fetchClient).toHaveBeenCalledWith(
      'api/admin/payment-events/42/',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify(data) })
    );
  });

  it('deletePaymentEvent calls DELETE on correct id', async () => {
    await api.deletePaymentEvent(42);
    expect(fetchClientDelete).toHaveBeenCalledWith(
      'api/admin/payment-events/42/',
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT SUMMARY & PAYABLES  (lines ~297-310)
// ═══════════════════════════════════════════════════════════════════════════
describe('api — Payment Summary & Payables', () => {
  it('getPaymentSummary calls summary endpoint', async () => {
    await api.getPaymentSummary();
    expect(fetchClient).toHaveBeenCalledWith(
      'api/admin/payment-events/summary/'
    );
  });

  it('getPayablesList calls payables endpoint', async () => {
    await api.getPayablesList();
    expect(fetchClient).toHaveBeenCalledWith(
      'api/admin/payment-events/payables/'
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WHATSAPP INTEGRATION  (lines ~312-338)
// ═══════════════════════════════════════════════════════════════════════════
describe('api — WhatsApp Integration', () => {
  it('getWhatsAppStatus calls correct URL for type', async () => {
    await api.getWhatsAppStatus('personal');
    expect(fetchClient).toHaveBeenCalledWith(
      'api/admin/whatsapp/personal/status/'
    );
  });

  it('refreshWhatsAppSession calls POST on refresh endpoint', async () => {
    await api.refreshWhatsAppSession('business');
    expect(fetchClient).toHaveBeenCalledWith(
      'api/admin/whatsapp/business/refresh/',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('logoutWhatsAppSession calls POST on logout endpoint', async () => {
    await api.logoutWhatsAppSession('personal');
    expect(fetchClient).toHaveBeenCalledWith(
      'api/admin/whatsapp/personal/logout/',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('sendWhatsAppTest calls POST on test endpoint', async () => {
    await api.sendWhatsAppTest('personal');
    expect(fetchClient).toHaveBeenCalledWith(
      'api/admin/whatsapp/personal/test/',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('fetchWhatsAppQueue calls GET queue endpoint', async () => {
    await api.fetchWhatsAppQueue();
    expect(fetchClient).toHaveBeenCalledWith('api/admin/whatsapp-queue/');
  });

  it('enqueueWhatsAppMessage calls POST with body', async () => {
    const data = { invitation_id: 1, message: 'Ciao!' };
    await api.enqueueWhatsAppMessage(data);
    expect(fetchClient).toHaveBeenCalledWith(
      'api/admin/whatsapp-queue/',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(data) })
    );
  });

  it('fetchWhatsAppTemplates calls GET templates endpoint', async () => {
    await api.fetchWhatsAppTemplates();
    expect(fetchClient).toHaveBeenCalledWith('api/admin/whatsapp-templates/');
  });

  it('createWhatsAppTemplate calls POST with body', async () => {
    const data = { name: 'Reminder', body: 'Ciao {{name}}' };
    await api.createWhatsAppTemplate(data);
    expect(fetchClient).toHaveBeenCalledWith(
      'api/admin/whatsapp-templates/',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(data) })
    );
  });

  it('updateWhatsAppTemplate calls PUT on correct id', async () => {
    const data = { body: 'Updated body' };
    await api.updateWhatsAppTemplate(5, data);
    expect(fetchClient).toHaveBeenCalledWith(
      'api/admin/whatsapp-templates/5/',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify(data) })
    );
  });

  it('deleteWhatsAppTemplate calls DELETE on correct id', async () => {
    await api.deleteWhatsAppTemplate(5);
    expect(fetchClientDelete).toHaveBeenCalledWith(
      'api/admin/whatsapp-templates/5/',
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
