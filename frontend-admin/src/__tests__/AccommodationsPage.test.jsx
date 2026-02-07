import { beforeEach, describe, expect, it, vi } from 'vitest';
import AccommodationsPage from '../pages/AccommodationsPage';
import { api } from '../services/api';
import { fireEvent, render, screen, waitFor } from './test-utils';

// Mock child components to isolate page logic testing
vi.mock('../components/accommodations/AccommodationList', () => ({
  default: ({ accommodations, onEdit, onDelete, onTogglePin }) => (
    <div data-testid="accommodation-list">
      {accommodations.map(acc => (
        <div key={acc.id} data-testid={`acc-item-${acc.id}`}>
          <span>{acc.name}</span>
          <button onClick={() => onEdit(acc)}>Edit</button>
          <button onClick={() => onDelete(acc.id)}>Delete</button>
          {/* Mock pin toggle interaction */}
          <button onClick={() => onTogglePin(101, { id: 999 }, true)}>Pin Invite 101</button>
        </div>
      ))}
    </div >
  )
}));

vi.mock('../components/accommodations/CreateAccommodationModal', () => ({
  default: ({ isOpen, onSave, onClose }) => isOpen ? (
    <div data-testid="create-modal">
      <button onClick={() => onSave({ name: 'New Hotel' })}>Save New</button>
      <button onClick={() => onClose()}>Close</button>
    </div>
  ) : null
}));

vi.mock('../components/accommodations/EditAccommodationModal', () => ({
  default: ({ isOpen, onSave, onClose }) => isOpen ? (
    <div data-testid="edit-modal">
      <button onClick={() => onSave(1, { name: 'Updated Hotel' })}>Save Edit</button>
      <button onClick={() => onClose()}>Close</button>
    </div>
  ) : null
}));

vi.mock('../components/accommodations/AutoAssignStrategyModal', () => ({
  default: ({ isOpen, onSuccess, onClose }) => isOpen ? (
    <div data-testid="strategy-modal">
      <button onClick={() => onSuccess({ assigned_guests: 5 })}>Run Strategy</button>
      <button onClick={() => onClose()}>Close</button>
    </div>
  ) : null
}));

vi.mock('../services/api', () => ({
  api: {
    fetchAccommodations: vi.fn(),
    fetchUnassignedInvitations: vi.fn(),
    createAccommodation: vi.fn(),
    updateAccommodation: vi.fn(),
    deleteAccommodation: vi.fn(),
    updateInvitation: vi.fn(),
    pinPersonInInvitation: vi.fn(),
  }
}));


describe('AccommodationsPage', () => {
  const mockAccommodations = [
    { id: 1, name: 'Grand Hotel', rooms: [] }
  ];
  const mockUnassigned = [
    { id: 10, name: 'Unassigned Family', adults_count: 2, children_count: 0 }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchAccommodations.mockResolvedValue(mockAccommodations);
    api.fetchUnassignedInvitations.mockResolvedValue(mockUnassigned);
  });

  it('renders page and fetches initial data', async () => {
    render(<AccommodationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Gestione Alloggi')).toBeInTheDocument();
      expect(screen.getByText('Grand Hotel')).toBeInTheDocument();
      expect(screen.getByText(/1 inviti senza alloggio assegnato/)).toBeInTheDocument();
    });
  });

  it('opens create modal and handles creation', async () => {
    render(<AccommodationsPage />);

    // Open Modal
    const createBtn = screen.getByText('Nuovo Alloggio');
    fireEvent.click(createBtn);

    await waitFor(() => screen.getByTestId('create-modal'));

    fireEvent.click(screen.getByText('Close'));

    fireEvent.click(createBtn);

    await waitFor(() => screen.getByTestId('create-modal'));

    // Save
    api.createAccommodation.mockResolvedValue({});
    api.fetchAccommodations.mockResolvedValue([...mockAccommodations, { id: 2, name: 'New Hotel' }]); // Refresh mock

    fireEvent.click(screen.getByText('Save New'));

    await waitFor(() => {
      expect(api.createAccommodation).toHaveBeenCalledWith({ name: 'New Hotel' });
      expect(screen.getByText('Alloggio creato con successo')).toBeInTheDocument();
    });
  });

  it('handles edit workflow', async () => {
    render(<AccommodationsPage />);
    await waitFor(() => screen.getByTestId('acc-item-1'));

    // Click Edit in child component
    fireEvent.click(screen.getByText('Edit'));

    await waitFor(() => screen.getByTestId('edit-modal'));


    fireEvent.click(screen.getByText('Close'));

    fireEvent.click(screen.getByText('Edit'));

    await waitFor(() => screen.getByTestId('edit-modal'));

    // Save Edit
    api.updateAccommodation.mockResolvedValue({});
    fireEvent.click(screen.getByText('Save Edit'));

    await waitFor(() => {
      expect(api.updateAccommodation).toHaveBeenCalledWith(1, { name: 'Updated Hotel' });
      expect(screen.getByText(/Alloggio aggiornato con successo/i)).toBeInTheDocument(); // Default text if key missing in mock
    });
  });

  it('handles delete workflow with confirm dialog', async () => {
    render(<AccommodationsPage />);
    await waitFor(() => screen.getByTestId('acc-item-1'));

    api.deleteAccommodation.mockResolvedValue({});

    // Click delete button
    fireEvent.click(screen.getByText('Delete'));

    // Wait for ConfirmDialog to appear
    await waitFor(() => {
      expect(screen.getByText('Elimina')).toBeInTheDocument(); // Confirm button in dialog
    });

    // Click confirm in dialog
    fireEvent.click(screen.getByText('Elimina'));

    await waitFor(() => {
      expect(api.deleteAccommodation).toHaveBeenCalledWith(1);
      expect(screen.getByText('Alloggio eliminato')).toBeInTheDocument();
    });
  });

  it('handles pin toggling', async () => {
    render(<AccommodationsPage />);
    await waitFor(() => screen.getByTestId('acc-item-1'));

    api.pinPersonInInvitation.mockResolvedValue({});

    // Trigger pin via mocked list component
    fireEvent.click(screen.getByText('Pin Invite 101'));

    await waitFor(() => {
      expect(api.pinPersonInInvitation).toHaveBeenCalledWith(101, { guest_id: 999, pin_status: true });
      expect(screen.getByText(/Assegnazione bloccata/i)).toBeInTheDocument();
    });
  });

  it('runs auto-assign strategy', async () => {
    render(<AccommodationsPage />);

    // Open Strategy Modal
    fireEvent.click(screen.getByText('Assegnazione Automatica'));
    await waitFor(() => screen.getByTestId('strategy-modal'));

    fireEvent.click(screen.getByText('Close'));

    fireEvent.click(screen.getByText('Assegnazione Automatica'));
    await waitFor(() => screen.getByTestId('strategy-modal'));
    // Run
    fireEvent.click(screen.getByText('Run Strategy'));

    await waitFor(() => {
      expect(screen.getByText('5 ospiti assegnati automaticamente')).toBeInTheDocument();
      // Should trigger data refresh
      expect(api.fetchAccommodations).toHaveBeenCalledTimes(2); // Initial + After Strategy
    });
  });
});
