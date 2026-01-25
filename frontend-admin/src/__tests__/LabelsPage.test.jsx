import { beforeEach, describe, expect, it, vi } from 'vitest';
import LabelManager from '../pages/LabelManager';
import { api } from '../services/api';
import { fireEvent, render, screen, waitFor } from './test-utils';

// Mock API
vi.mock('../services/api', () => ({
  api: {
    fetchInvitationLabels: vi.fn(),
    createInvitationLabel: vi.fn(),
    updateInvitationLabel: vi.fn(),
    deleteInvitationLabel: vi.fn(),
  }
}));

describe('LabelManager', () => {
  const mockLabels = [
    { id: 1, name: 'VIP', color: '#FF0000' },
    { id: 2, name: 'Family', color: '#00FF00' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchInvitationLabels.mockResolvedValue({ results: mockLabels });
  });

  it('renders labels list correctly', async () => {
    render(<LabelManager />);

    // Check loading/initial render
    expect(screen.getByText('Gestione Etichette')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      const elementsVIP = screen.getAllByText('VIP');
      expect(elementsVIP.length).toBeGreaterThan(0);
      expect(elementsVIP[0]).toBeInTheDocument();
      const elementsFamily = screen.getAllByText('Family');
      expect(elementsFamily.length).toBeGreaterThan(0);
      expect(elementsFamily[0]).toBeInTheDocument();
    });

    expect(api.fetchInvitationLabels).toHaveBeenCalled();
  });

  it('opens create modal and submits new label', async () => {
    api.createInvitationLabel.mockResolvedValue({ data: { id: 3, name: 'Friends', color: '#0000FF' } });
    api.fetchInvitationLabels.mockResolvedValueOnce({ results: mockLabels }).mockResolvedValueOnce({
      results: [...mockLabels, { id: 3, name: 'Friends', color: '#0000FF' }]
    });

    render(<LabelManager />);

    // Open Modal
    const createBtn = screen.getByText('Nuova Etichetta');
    fireEvent.click(createBtn);

    // Fill Form
    const nameInput = screen.getByLabelText(/Nome etichetta/i);
    fireEvent.change(nameInput, { target: { value: 'Friends' } });

    // Submit
    const saveBtn = screen.getByText('Salva');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.createInvitationLabel).toHaveBeenCalledWith({
        name: 'Friends', color: '#3B82F6' // Default color check
      });
    });
  });

  it('handles label deletion', async () => {
    api.deleteInvitationLabel.mockResolvedValue({});
    api.fetchInvitationLabels.mockResolvedValueOnce({ results: mockLabels }).mockResolvedValueOnce({
      results: [mockLabels[0]] // Remove second label
    });

    render(<LabelManager />);

    await waitFor(() => {
      const elementsFamily = screen.getAllByText('Family');
      expect(elementsFamily.length).toBeGreaterThan(0);
      expect(elementsFamily[0]).toBeInTheDocument();
    });
    // Click Delete on second item
    const deleteBtn = screen.getByRole('button', { name: /delete Family/i }); // Assuming button text or title
    fireEvent.click(deleteBtn);
    const deleteBtns = screen.getByText('Elimina'); // Assuming button text or title
    fireEvent.click(deleteBtns);

    expect(api.deleteInvitationLabel).toHaveBeenCalledWith(2);
  });
});
