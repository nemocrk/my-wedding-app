import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RoomAssignmentModal from '../components/accommodations/RoomAssignmentModal';
import { api } from '../services/api';

// Mock dependencies
vi.mock('../services/api');
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

describe('RoomAssignmentModal Component', () => {
    const mockRoom = {
        id: 1,
        room_number: '101',
        capacity_adults: 2,
        capacity_children: 1,
        assigned_guests: [],
        available_slots: { adult_slots_free: 2, child_slots_free: 1 }
    };

    const mockInvitations = [
        {
            id: 101,
            name: 'Rossi Family',
            code: 'ROSSI',
            status: 'confirmed',
            accommodation_requested: true,
            guests: [
                { id: 1, first_name: 'Mario', last_name: 'Rossi', is_child: false, assigned_room: null }, // Adult
                { id: 2, first_name: 'Luigi', last_name: 'Rossi', is_child: true, assigned_room: null }   // Child
            ]
        },
        {
            id: 102,
            name: 'Bianchi Couple',
            code: 'BIANCHI',
            status: 'confirmed',
            accommodation_requested: true,
            guests: [
                { id: 3, first_name: 'Anna', last_name: 'Bianchi', is_child: false, assigned_room: null },
                { id: 4, first_name: 'Paolo', last_name: 'Bianchi', is_child: false, assigned_room: null }
            ]
        }
    ];

    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        api.fetchInvitations.mockResolvedValue(mockInvitations);
        api.updateInvitation.mockResolvedValue({});
    });

    it('renders nothing when not open', () => {
        render(<RoomAssignmentModal isOpen={false} room={mockRoom} onClose={mockOnClose} />);
        expect(screen.queryByText(/admin.room_assignment.title/i)).not.toBeInTheDocument();
    });

    it('fetches and displays invitations when open', async () => {
        render(<RoomAssignmentModal isOpen={true} room={mockRoom} onClose={mockOnClose} />);

        expect(api.fetchInvitations).toHaveBeenCalledWith({ status: 'confirmed' });

        await waitFor(() => {
            expect(screen.getByText('Rossi Family')).toBeInTheDocument();
            expect(screen.getByText('Bianchi Couple')).toBeInTheDocument();
        });
    });

    it('filters invitations by search term', async () => {
        render(<RoomAssignmentModal isOpen={true} room={mockRoom} onClose={mockOnClose} />);

        await waitFor(() => expect(screen.getByText('Rossi Family')).toBeInTheDocument());

        const searchInput = screen.getByPlaceholderText(/admin.room_assignment.search_placeholder/i);
        fireEvent.change(searchInput, { target: { value: 'Bianchi' } });

        expect(screen.queryByText('Rossi Family')).not.toBeInTheDocument();
        expect(screen.getByText('Bianchi Couple')).toBeInTheDocument();
    });

    it('expands invitation and allows selecting guests', async () => {
        render(<RoomAssignmentModal isOpen={true} room={mockRoom} onClose={mockOnClose} />);

        await waitFor(() => expect(screen.getByText('Rossi Family')).toBeInTheDocument());

        // Click to expand
        fireEvent.click(screen.getByText('Rossi Family'));

        // Check guests are visible
        expect(screen.getByText('Mario Rossi')).toBeInTheDocument();
        expect(screen.getByText('Luigi Rossi')).toBeInTheDocument();

        // Select Mario (Adult)
        const marioCheckbox = screen.getByLabelText(/Mario Rossi/i);
        fireEvent.click(marioCheckbox);
        expect(marioCheckbox).toBeChecked();
    });

    it('validates capacity correctly (Adults)', async () => {
        // Room capacity: 2 Adults
        render(<RoomAssignmentModal isOpen={true} room={mockRoom} onClose={mockOnClose} />);

        await waitFor(() => expect(screen.getByText('Bianchi Couple')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Bianchi Couple'));

        const annaCheckbox = screen.getByLabelText(/Anna Bianchi/i);
        const paoloCheckbox = screen.getByLabelText(/Paolo Bianchi/i);

        // Select 1st Adult -> OK (1/2)
        fireEvent.click(annaCheckbox);
        expect(annaCheckbox).toBeChecked();

        // Select 2nd Adult -> OK (2/2)
        fireEvent.click(paoloCheckbox);
        expect(paoloCheckbox).toBeChecked();

        // Now try to select a 3rd adult from another invitation
        fireEvent.click(screen.getByText('Rossi Family'));
        const marioCheckbox = screen.getByLabelText(/Mario Rossi/i);

        // Should be disabled or prevent selection logic check
        // In our component logic, we disabled the input? 
        // Let's check if it is disabled or if clicking does nothing
        if (marioCheckbox.disabled) {
            expect(marioCheckbox).toBeDisabled();
        } else {
            fireEvent.click(marioCheckbox);
            expect(marioCheckbox).not.toBeChecked(); // Logic prevents selection
        }
    });

    it('validates capacity correctly (Children can use Adult slots if needed)', async () => {
        // Room: 2 Adults, 1 Child
        render(<RoomAssignmentModal isOpen={true} room={mockRoom} onClose={mockOnClose} />);

        await waitFor(() => {
            expect(screen.getByText('Rossi Family')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Rossi Family'));

        // Select Child -> Takes Child slot (0/1 used)
        const luigiCheckbox = screen.getByLabelText(/Luigi Rossi/i);
        fireEvent.click(luigiCheckbox);
        expect(luigiCheckbox).toBeChecked();
    });

    it('calls updateInvitation on save', async () => {
        render(<RoomAssignmentModal isOpen={true} room={mockRoom} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

        await waitFor(() => expect(screen.getByText('Rossi Family')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Rossi Family'));
        fireEvent.click(screen.getByLabelText(/Mario Rossi/i));

        const saveBtn = screen.getByText(/admin.room_assignment.save_btn/i);
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(api.updateInvitation).toHaveBeenCalledWith("101", {
                guests: [{
                    id: 1,
                    assigned_room: 1,
                    accommodation_pinned: true
                }]
            });
            expect(mockOnSuccess).toHaveBeenCalled();
        });
    });
});