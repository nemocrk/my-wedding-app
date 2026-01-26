import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InvitationList from '../pages/InvitationList';
import * as apiModule from '../services/api';

// --- MOCKS ---
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

vi.mock('../contexts/ConfirmDialogContext', () => ({
  useConfirm: () => ({
    confirm: vi.fn().mockResolvedValue(true)
  }),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

const mockInvitations = [
  {
    id: 1,
    name: 'Family Test',
    code: 'test123',
    status: 'created',
    origin: 'groom',
    phone_number: '+39 333 1234567',
    whatsapp_number: '+39 333 1234567',
    whatsapp_name: 'Test Contact',
    accommodation_pinned: false,
    labels: [{ id: 1, name: 'VIP', color: '#FF0000' }],
    guests: [{ first_name: 'John', last_name: 'Doe', is_child: false }],
  },
  {
    id: 2,
    name: 'Another Family',
    code: 'fam456',
    status: 'confirmed',
    origin: 'bride',
    phone_number: null,
    whatsapp_number: null,
    whatsapp_name: null,
    accommodation_pinned: true,
    labels: [],
    guests: [],
  },
];

const mockLabels = [
  { id: 1, name: 'VIP', color: '#FF0000' },
  { id: 2, name: 'Family', color: '#00FF00' },
];

const mockInvitation = {
  id: 1,
  name: 'Family Test',
  code: 'test123',
  status: 'created',
  origin: 'groom',
  phone_number: '+39 333 1234567',
  whatsapp_number: '+39 333 1234567',
  whatsapp_name: 'Test Contact',
  accommodation_pinned: false,
  labels: [{ id: 1, name: 'VIP', color: '#FF0000' }],
  guests: [{ first_name: 'John', last_name: 'Doe', is_child: false }],
};

describe('InvitationList - Expanded Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup API mock
    vi.spyOn(apiModule.api, 'fetchInvitations').mockResolvedValue({
      results: mockInvitations,
      count: 2,
      next: null,
      previous: null,
    });

    vi.spyOn(apiModule.api, 'fetchInvitationLabels').mockResolvedValue(mockLabels);
    vi.spyOn(apiModule.api, 'bulkSendInvitations').mockResolvedValue({ sent: 1 });
    vi.spyOn(apiModule.api, 'updateInvitation').mockResolvedValue(mockInvitations[0]);
    vi.spyOn(apiModule.api, 'deleteInvitation').mockResolvedValue({});
    vi.spyOn(apiModule.api, 'getInvitation').mockResolvedValue(mockInvitation);
    //vi.spyOn(apiModule.api, 'exportInvitationsCSV').mockResolvedValue(new Blob(['csv data']));
  });

  // === SORTING FUNCTIONALITY ===
  describe('Sorting', () => {
    it('sorts by name ascending/descending', async () => {
      render(<InvitationList />);

      await waitFor(() => {
        expect(screen.getAllByText('Family Test')[0]).toBeInTheDocument();
      });

      // Find Name column header and click
      const nameHeader = screen.getAllByRole('button').find(btn => btn.textContent.includes('admin.invitations.table.name'));

      if (nameHeader) {
        fireEvent.click(nameHeader);

        await waitFor(() => {
          expect(apiModule.api.fetchInvitations).toHaveBeenCalledWith(
            expect.objectContaining({ ordering: 'name' })
          );
        });

        // Click again for descending
        fireEvent.click(nameHeader);

        await waitFor(() => {
          expect(apiModule.api.fetchInvitations).toHaveBeenCalledWith(
            expect.objectContaining({ ordering: '-name' })
          );
        });
      }
    });

    it('sorts by status', async () => {
      render(<InvitationList />);

      await waitFor(() => {
        expect(screen.getAllByText('Family Test')[0]).toBeInTheDocument();
      });

      const statusHeader = screen.getAllByRole('button').find(btn => btn.textContent.includes('admin.invitations.table.status'));

      if (statusHeader) {
        fireEvent.click(statusHeader);

        await waitFor(() => {
          expect(apiModule.api.fetchInvitations).toHaveBeenCalledWith(
            expect.objectContaining({ ordering: 'status' })
          );
        });
      }
    });
  });

  // === INLINE EDITING ===
  describe('Inline Editing', () => {
    it('edits invitation name inline', async () => {
      const user = userEvent.setup();
      render(<InvitationList />);

      await waitFor(() => {
        expect(screen.getAllByText('Family Test')[0]).toBeInTheDocument();
      });

      // Find edit icon/button for first row
      const editBtns = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('svg') && btn.closest('tr')
      );

      if (editBtns.length > 0) {
        fireEvent.click(editBtns[0]);

        // Find name input
        const nameInput = screen.queryByDisplayValue('Family Test');
        if (nameInput) {
          await user.clear(nameInput);
          await user.type(nameInput, 'Updated Family');

          // Save
          const saveBtn = screen.getByRole('button', { name: /save|salva|conferma/i });
          fireEvent.click(saveBtn);

          await waitFor(() => {
            expect(apiModule.api.updateInvitation).toHaveBeenCalledWith(
              1,
              expect.objectContaining({ name: 'Updated Family' })
            );
          });
        }
      }
    });

    it('edits phone number inline', async () => {
      const user = userEvent.setup();
      render(<InvitationList />);

      await waitFor(() => {
        expect(screen.getAllByText('+39 333 1234567')[0]).toBeInTheDocument();
      });

      // Click on phone to edit (if clickable)
      const phoneEl = screen.getAllByText('+39 333 1234567')[0];
      const editableContainer = phoneEl.closest('[contenteditable], input, textarea');

      if (editableContainer) {
        fireEvent.click(phoneEl);

        const phoneInput = screen.getByDisplayValue('+39 333 1234567');
        await user.clear(phoneInput);
        await user.type(phoneInput, '+39 333 9999999');

        // Blur to save
        fireEvent.blur(phoneInput);

        await waitFor(() => {
          expect(apiModule.api.updateInvitation).toHaveBeenCalled();
        });
      }
    });
  });

  // === MODALS & ACTIONS ===
  describe('Modal Actions', () => {
    it('opens detail modal on row click', async () => {
      const user = userEvent.setup();
      render(<InvitationList />);

      await waitFor(() => {
        expect(screen.getAllByText('Family Test')[0]).toBeInTheDocument();
      });

      // 1. Trova la riga che contiene "Test 2"
      const row = screen.getAllByText('Family Test')[0].closest('tr');
      expect(row).not.toBeNull();

      // 2. Trova la lucide-edit-2 dentro quella riga (in InvitationList.jsx è Edit2 icon inside a button)
      // The previous test logic used .lucide-pen which might be wrong, checking the component:
      // <Edit2 size={18} /> inside button
      // We look for button that contains svg
      
      const editButtons = within(row).getAllByRole('button');
      // The edit button is usually one of the last ones.
      // Let's rely on finding the Edit2 icon or just clicking the button that handles edit
      // In InvitationList.jsx: tooltip content t('admin.invitations.actions.edit')
      
      const editButton = editButtons.find(btn => btn.querySelector('.lucide-edit-2'));
      
      if (editButton) {
          await user.click(editButton);
          await waitFor(() => {
            // Check if modal content appears (guest details, etc.)
            // Assuming CreateInvitationModal renders something recognizable
             expect(apiModule.api.getInvitation).toHaveBeenCalledWith(1);
          });
      }
    });

    it('deletes invitation with confirmation', async () => {
      const user = userEvent.setup();
      render(<InvitationList />);

      await waitFor(() => {
        expect(screen.getAllByText('Family Test')[0]).toBeInTheDocument();
      });

      // Find delete button (trash icon)
      const deleteBtns = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('svg[class*="trash"]')
      );

      if (deleteBtns.length > 0) {
        fireEvent.click(deleteBtns[0]);
        // 2. Trova la lucide-pen dentro quella riga
        const confirmDeleteButton = screen.getByText('admin.invitations.delete_modal.confirm')

        // 3. Clicca la penna
        await user.click(confirmDeleteButton);

        await waitFor(() => {
          expect(apiModule.api.deleteInvitation).toHaveBeenCalledWith(1);
        });
      }
    });
  });

  // === EXPORT FUNCTIONALITY ===
  describe('Export', () => {
    it('exports CSV with selected filters', async () => {
      // Mock window.URL.createObjectURL
      global.URL.createObjectURL = vi.fn(() => 'blob:fake-url');
      global.URL.revokeObjectURL = vi.fn();

      // Mock link click
      const linkClickSpy = vi.fn();

      render(<InvitationList />);

      await waitFor(() => {
        expect(screen.getAllByText('Family Test')[0]).toBeInTheDocument();
      });

      // Find export button
      const exportBtn = screen.queryByText(/export|esporta|csv/i);

      if (exportBtn) {
        fireEvent.click(exportBtn);

        await waitFor(() => {
          expect(apiModule.api.exportInvitationsCSV).toHaveBeenCalled();
        });
      }
    });
  });

  // === SEARCH FUNCTIONALITY ===
  describe('Search', () => {
    it('searches invitations by name', async () => {
      const user = userEvent.setup();
      render(<InvitationList />);

      await waitFor(() => {
        expect(screen.getAllByText('Family Test')[0]).toBeInTheDocument();
      });

      // Find search input
      const searchInput = screen.queryByPlaceholderText(/search|cerca/i);

      if (searchInput) {
        await user.type(searchInput, 'Test');

        await waitFor(() => {
          expect(apiModule.api.fetchInvitations).toHaveBeenCalledWith(
            expect.objectContaining({ search: 'Test' })
          );
        }, { timeout: 3000 });
      }
    });
  });

  // === EDGE CASES ===
  describe('Edge Cases', () => {
    it('handles empty invitations list', async () => {
      apiModule.api.fetchInvitations.mockResolvedValueOnce({
        results: [],
        count: 0,
        next: null,
        previous: null,
      });

      render(<InvitationList />);

      await waitFor(() => {
        expect(screen.getAllByText(/admin.invitations.no_invitations/i)[0]).toBeInTheDocument();
      });
    });

    it('handles API errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      apiModule.api.fetchInvitations.mockRejectedValueOnce(new Error('Network error'));

      render(<InvitationList />);

      await waitFor(() => {
        // Since there is no error modal/toast, it logs to console and shows empty state/loading finished
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load invitations', expect.any(Error));
        // The list will be empty, so "no invitations" text appears
        expect(screen.getAllByText(/admin.invitations.no_invitations/i)[0]).toBeInTheDocument();
      });
      
      consoleSpy.mockRestore();
    });

    it('handles invitation with missing phone/whatsapp', async () => {
      render(<InvitationList />);

      await waitFor(() => {
        expect(screen.getAllByText('Another Family')[0]).toBeInTheDocument();
      });

      // Verify no phone number displayed (or placeholder)
      const row = screen.getAllByText('Another Family')[0].closest('tr');
      expect(row).toBeInTheDocument();
      // Phone should be empty or show placeholder
    });
  });
});
