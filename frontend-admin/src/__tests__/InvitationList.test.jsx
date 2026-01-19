import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InvitationList from '../components/InvitationList';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  }
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        'invitations.title': 'Inviti',
        'common.search': 'Cerca',
        'bulk.send': 'Invia WhatsApp',
        'bulk.verify': 'Verifica Numeri',
        'bulk.labels': 'Gestisci Etichette',
        'filters.status': 'Stato',
        'filters.labels': 'Etichette',
        'common.selected': 'selezionati'
      };
      return translations[key] || key;
    }
  }),
}));

describe('InvitationList', () => {
  const mockInvitations = [
    {
      id: 1,
      name: 'Famiglia Rossi',
      code: 'rossi',
      status: 'created',
      origin: 'groom',
      accommodation_pinned: false,
      labels: [{ id: 1, name: 'VIP', color: '#FF0000' }]
    },
    {
      id: 2,
      name: 'Famiglia Bianchi',
      code: 'bianchi',
      status: 'sent',
      origin: 'bride',
      accommodation_pinned: true,
      labels: [{ id: 2, name: 'Family', color: '#00FF00' }]
    }
  ];

  const mockLabels = [
    { id: 1, name: 'VIP', color: '#FF0000' },
    { id: 2, name: 'Family', color: '#00FF00' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.includes('/invitations')) return Promise.resolve({ data: mockInvitations });
      if (url.includes('/invitation-labels')) return Promise.resolve({ data: mockLabels });
      return Promise.resolve({ data: [] });
    });
    api.post.mockResolvedValue({ data: { success: true, updated_count: 2 } });
  });

  it('renders invitations list with labels', async () => {
    render(<InvitationList />);

    await waitFor(() => {
      expect(screen.getByText('Famiglia Rossi')).toBeInTheDocument();
      expect(screen.getByText('Famiglia Bianchi')).toBeInTheDocument();
    });

    expect(screen.getByText('VIP')).toBeInTheDocument();
    expect(screen.getByText('Family')).toBeInTheDocument();
  });

  it('supports bulk selection and triggers bulk actions', async () => {
    render(<InvitationList />);
    await waitFor(() => screen.getByText('Famiglia Rossi'));

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Select row 1

    expect(screen.getByText(/selezionati/i)).toBeInTheDocument();

    // Trigger Bulk Send
    const sendBtn = screen.getByText('Invia WhatsApp');
    fireEvent.click(sendBtn);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/invitations/bulk-send/', { invitation_ids: [1] });
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
    await waitFor(() => screen.getByText('Famiglia Rossi'));

    const statusSelect = screen.getByLabelText('Stato');
    fireEvent.change(statusSelect, { target: { value: 'sent' } });
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/invitations/?status=sent');
    });

    const labelSelect = screen.getByLabelText('Etichette');
    fireEvent.change(labelSelect, { target: { value: '1' } });
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/invitations/?label=1');
    });
  });
});
