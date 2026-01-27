import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../services/api';

describe('API Service', () => {
  beforeEach(() => {
    // Setup global fetch mock
    globalThis.fetch = vi.fn();
    // Mock global event dispatcher
    window.dispatchEvent = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('General', () => {
    it('should export an api object', () => {
      expect(api).toBeDefined();
      expect(typeof api).toBe('object');
    });

    it('should handle API errors gracefully (generic)', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: { get: () => 'application/json' },
        json: async () => ({ error: 'Internal Server Error' })
      });

      await expect(api.fetchInvitations()).rejects.toThrow('Internal Server Error');
      expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
    });
  });

  describe('Invitation Labels', () => {
    it('fetchInvitationLabels calls correct endpoint', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => [] });
      await api.fetchInvitationLabels();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/invitation-labels/'),
        expect.anything()
      );
    });

    it('CRUD operations call correct endpoints', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });

      await api.createInvitationLabel({ name: 'Test' });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/invitation-labels/'),
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Test' }) })
      );

      await api.updateInvitationLabel(1, { name: 'Updated' });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/invitation-labels/1/'),
        expect.objectContaining({ method: 'PUT' })
      );

      await api.deleteInvitationLabel(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/invitation-labels/1/'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Invitations', () => {
    it('fetchInvitations builds query string correctly', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
      await api.fetchInvitations({ status: 'sent', search: 'test', ordering: '-created' });
      
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=sent'), expect.anything()
      );
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=test'), expect.anything()
      );
       expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('ordering=-created'), expect.anything()
      );
    });

    it('CRUD operations call correct endpoints', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });

      await api.getInvitation(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/invitations/1/'), expect.anything());

      await api.createInvitation({ name: 'Inv' });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/invitations/'),
        expect.objectContaining({ method: 'POST' })
      );

      await api.updateInvitation(1, { name: 'InvUp' });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/invitations/1/'),
        expect.objectContaining({ method: 'PUT' })
      );

      await api.deleteInvitation(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/invitations/1/'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('markInvitationAsSent calls correct endpoint', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
      await api.markInvitationAsSent(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/invitations/1/mark-as-sent/'),
        expect.objectContaining({ method: 'POST', body: JSON.stringify({}) })
      );
    });

    it('bulkSendInvitations calls correct endpoint', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
      await api.bulkSendInvitations([1, 2, 3]);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/invitations/bulk-send/'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ invitation_ids: [1, 2, 3] })
        })
      );
    });

    it('bulkManageLabels calls correct endpoint', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
      await api.bulkManageLabels([1], [10], 'add');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/invitations/bulk-labels/'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ invitation_ids: [1], label_ids: [10], action: 'add' })
        })
      );
    });

    it('verifyContact calls correct endpoint', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
      await api.verifyContact(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/invitations/1/'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ contact_verified: 'not_valid' })
        })
      );
    });

    it('generateInvitationLink calls correct endpoint', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
      await api.generateInvitationLink(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/invitations/1/generate_link/'),
        expect.anything()
      );
    });
  });

  describe('Analytics', () => {
    it('getInvitationHeatmaps calls correct endpoint', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
      await api.getInvitationHeatmaps(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/invitations/1/heatmaps/'),
        expect.anything()
      );
    });

    it('getInvitationInteractions calls correct endpoint', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
      await api.getInvitationInteractions(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/invitations/1/interactions/'),
        expect.anything()
      );
    });
  });

  describe('Dashboard', () => {
    it('getDashboardStats calls correct endpoint', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
      await api.getDashboardStats();
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/dashboard/stats/'), expect.anything());
    });

    it('getDynamicDashboardStats handles filters', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
      await api.getDynamicDashboardStats(['filter1', 'filter2']);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/dashboard/dynamic-stats/?filters=filter1,filter2'),
        expect.anything()
      );
    });
  });

  describe('Config & System', () => {
    it('fetchLanguages calls correct endpoint', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => [] });
      await api.fetchLanguages();
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/languages/'), expect.anything());
    });

    it('fetchGoogleFonts calls correct endpoint', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => [] });
      await api.fetchGoogleFonts();
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/google-fonts/'), expect.anything());
    });

    it('getConfig calls correct endpoint', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
      await api.getConfig();
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/config/'), expect.anything());
    });

    it('updateConfig calls correct endpoint', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
      await api.updateConfig({ maintenance: true });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/config/'),
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ maintenance: true }) })
      );
    });
  });

  describe('Configurable Texts', () => {
    it('fetchConfigurableTexts handles lang parameter', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => [] });
      
      await api.fetchConfigurableTexts('it');
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/texts/?lang=it'), expect.anything());

      await api.fetchConfigurableTexts();
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/texts/'), expect.anything());
    });

    it('getConfigurableText calls correct endpoint', async () => {
        globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
        await api.getConfigurableText('home.title', 'en');
        expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/texts/home.title/?lang=en'), expect.anything());
    });

    it('CRUD operations call correct endpoints', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });

      await api.createConfigurableText({ key: 'k' });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/texts/'),
        expect.objectContaining({ method: 'POST' })
      );

      await api.updateConfigurableText('k', { content: 'c' }, 'it');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/texts/k/?lang=it'),
        expect.objectContaining({ method: 'PUT' })
      );

      await api.deleteConfigurableText('k', 'it');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/texts/k/?lang=it'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Accommodations', () => {
    it('CRUD operations call correct endpoints', async () => {
        globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });

        await api.fetchAccommodations();
        expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/accommodations/'), expect.anything());

        await api.createAccommodation({ name: 'Hotel' });
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/accommodations/'),
            expect.objectContaining({ method: 'POST' })
        );

        await api.updateAccommodation(1, { name: 'Hotel 2' });
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/accommodations/1/'),
            expect.objectContaining({ method: 'PUT' })
        );

        await api.deleteAccommodation(1);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/accommodations/1/'),
            expect.objectContaining({ method: 'DELETE' })
        );
    });

    it('triggerAutoAssign calls correct endpoint', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
      await api.triggerAutoAssign(true, 'GREEDY');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/accommodations/auto-assign/'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ reset_previous: true, strategy: 'GREEDY' })
        })
      );
    });

    it('fetchUnassignedInvitations calls correct endpoint', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => [] });
      await api.fetchUnassignedInvitations();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/accommodations/unassigned-invitations/'),
        expect.anything()
      );
    });
  });

  describe('WhatsApp Integration', () => {
    it('status and refresh methods', async () => {
        globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });

        await api.getWhatsAppStatus('groom');
        expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/whatsapp/groom/status/'), expect.anything());

        await api.refreshWhatsAppSession('bride');
        expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/whatsapp/bride/refresh/'), expect.objectContaining({ method: 'POST' }));
    });

    it('session management methods call correct endpoints', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });

      await api.logoutWhatsAppSession('groom');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/whatsapp/groom/logout/'),
        expect.objectContaining({ method: 'POST' })
      );

      await api.sendWhatsAppTest('bride');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/whatsapp/bride/test/'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('WhatsApp Queue', () => {
      it('fetchWhatsAppQueue calls correct endpoint', async () => {
          globalThis.fetch.mockResolvedValue({ ok: true, json: async () => [] });
          await api.fetchWhatsAppQueue();
          expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/whatsapp-queue/'), expect.anything());
      });

      it('enqueueWhatsAppMessage calls correct endpoint', async () => {
          globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
          await api.enqueueWhatsAppMessage({ message: 'test' });
          expect(globalThis.fetch).toHaveBeenCalledWith(
              expect.stringContaining('/whatsapp-queue/'),
              expect.objectContaining({ method: 'POST' })
          );
      });
  });

  describe('WhatsApp Templates', () => {
    it('CRUD operations call correct endpoints', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });

      await api.fetchWhatsAppTemplates();
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/whatsapp-templates/'), expect.anything());

      await api.createWhatsAppTemplate({ name: 't' });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/whatsapp-templates/'),
        expect.objectContaining({ method: 'POST' })
      );

      await api.updateWhatsAppTemplate(1, { name: 't2' });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/whatsapp-templates/1/'),
        expect.objectContaining({ method: 'PUT' })
      );

      await api.deleteWhatsAppTemplate(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/whatsapp-templates/1/'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
