import { beforeEach, describe, expect, it, vi } from 'vitest';
import InvitationList from '../pages/InvitationList';
import { fireEvent, render, screen, waitFor, within } from '../test-utils';

describe('InvitationList', () => {
  const mockInvitations = [
    {
      id: 1,
      name: 'Famiglia Rossi',
      code: 'rossi',
      status: 'created',
      origin: 'groom',
      accommodation_pinned: false,
      phone_number: '3333333333',
      labels: [{ id: 1, name: 'VIP', color: '#FF0000' }]
    },
    {
      id: 2,
      name: 'Famiglia Bianchi',
      code: 'bianchi',
      status: 'sent',
      origin: 'bride',
      accommodation_pinned: true,
      phone_number: '3333333333',
      labels: [{ id: 2, name: 'Family', color: '#00FF00' }]
    }
  ];

  const mockLabels = [
    { id: 1, name: 'VIP', color: '#FF0000' },
    { id: 2, name: 'Family', color: '#00FF00' },
  ];

  globalThis.fetch = vi.fn((url, options = {}) => {
    const method = options.method?.toUpperCase() || 'GET';

    // Prepariamo una risposta di successo standard
    const createResponse = (data) => Promise.resolve({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(data),
    });

    // Logica di routing del mock
    if (url.includes('/invitations')) {
      // Caso specifico: POST bulk-send
      if (method === 'POST' && url.includes('/bulk-send/')) {
        return createResponse({ success: true, sent: 5 });
      }
      // Caso generale: GET invitations
      return createResponse({ results: mockInvitations });
    }

    if (url.includes('/invitation-labels')) {
      return createResponse(mockLabels); // Ritorna l'array di etichette
    }

    // Fallback di default (array vuoto)
    return createResponse({ results: [] });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders invitations list with labels', async () => {
    render(<InvitationList />);

    await waitFor(() => {
      const desktopContainer = document.querySelector('.hidden.lg\\:block');
      expect(within(desktopContainer).getByText('Famiglia Rossi', { selector: 'div:not(.lg\\:hidden) *' })).toBeInTheDocument();
      expect(within(desktopContainer).getByText('Famiglia Bianchi')).toBeInTheDocument();
    });

    const elementsVIP = screen.getAllByText('VIP');
    expect(elementsVIP.length).toBeGreaterThan(0);
    expect(elementsVIP[0]).toBeInTheDocument();
    const elementsFamily = screen.getAllByText('Family');
    expect(elementsFamily.length).toBeGreaterThan(0);
    expect(elementsFamily[0]).toBeInTheDocument();
  });

  it('supports bulk selection and triggers bulk actions', async () => {
    render(<InvitationList />);
    await waitFor(() => {
      const desktopContainer = document.querySelector('.hidden.lg\\:block');
      expect(within(desktopContainer).getByText('Famiglia Rossi', { selector: 'div:not(.lg\\:hidden) *' })).toBeInTheDocument();
      expect(within(desktopContainer).getByText('Famiglia Bianchi')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Select row 1

    expect(screen.getByText(/selezionati/i)).toBeInTheDocument();

    // Trigger Bulk Send
    const sendBtn1 = screen.getByText('Invia Inviti');
    fireEvent.click(sendBtn1);
    const sendBtn2 = screen.getByText('Conferma Invio');
    fireEvent.click(sendBtn2);
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "api/admin/invitations/bulk-send/", // URL completo come da log
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          // Il body deve essere una stringa JSON, non un oggetto
          body: JSON.stringify({ invitation_ids: [1] }),
        })
      );
    });

    // Reset selection (assuming automatic or manual - simplifying for test)
    // Here we verify other actions exist/call APIs if buttons are present
    // Assuming buttons exist for Verify and Labels based on issue description

    // Trigger Bulk Verify (if button exists)
    // const verifyBtn = screen.queryByText('Verifica Numeri');
    // if (verifyBtn) {
    //   fireEvent.click(verifyBtn);
    //   expect(api.post).toHaveBeenCalledWith('/invitations/bulk-verify/', { invitation_ids: [1] });
    // }
  });

  it('applies filters by status and label', async () => {
    render(<InvitationList />);
    await waitFor(() => {
      const desktopContainer = document.querySelector('.hidden.lg\\:block');
      expect(within(desktopContainer).getByText('Famiglia Rossi', { selector: 'div:not(.lg\\:hidden) *' })).toBeInTheDocument();
      expect(within(desktopContainer).getByText('Famiglia Bianchi')).toBeInTheDocument();
    });
    // Trova l'opzione specifica
    const statusOption = screen.getByRole('option', { name: 'Tutti gli stati' });
    // Risali alla select (il "combobox" genitore)
    const statusSelect = statusOption.closest('select');

    fireEvent.change(statusSelect, { target: { value: 'sent' } });
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('api/admin/invitations/?status=sent', {});
    });

    fireEvent.change(statusSelect, { target: { value: '' } });

    // Trova l'opzione specifica
    const labelOption = screen.getByRole('option', { name: 'Tutte le etichette' });
    // Risali alla select (il "combobox" genitore)
    const labelSelect = labelOption.closest('select');
    fireEvent.change(labelSelect, { target: { value: '1' } });
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('api/admin/invitations/?label=1', {});
    });
  });
});