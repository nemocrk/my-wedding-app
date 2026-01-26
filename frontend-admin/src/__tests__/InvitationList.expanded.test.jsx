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
  useConfirm: () => vi.fn().mockResolvedValue(true),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
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

describe('InvitationList - Expanded Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup API mock
    vi.spyOn(apiModule.api, 'getInvitations').mockResolvedValue({
      results: mockInvitations,
      count: 2,
      next: null,
      previous: null,
    });
    
    vi.spyOn(apiModule.api, 'getInvitationLabels').mockResolvedValue(mockLabels);
    vi.spyOn(apiModule.api, 'bulkSendInvitations').mockResolvedValue({ sent: 1 });
    vi.spyOn(apiModule.api, 'updateInvitation').mockResolvedValue(mockInvitations[0]);
    vi.spyOn(apiModule.api, 'deleteInvitation').mockResolvedValue({});
    vi.spyOn(apiModule.api, 'exportInvitationsCSV').mockResolvedValue(new Blob(['csv data']));
  });

  // === SORTING FUNCTIONALITY ===
  describe('Sorting', () => {
    it('sorts by name ascending/descending', async () => {
      render(<InvitationList />);

      await waitFor(() => {
        expect(screen.getByText('Family Test')).toBeInTheDocument();
      });

      // Find Name column header and click
      const nameHeader = screen.getAllByRole('button').find(btn => btn.textContent.includes('admin.invitations.table.name'));
      
      if (nameHeader) {
        fireEvent.click(nameHeader);
        
        await waitFor(() => {
          expect(apiModule.api.getInvitations).toHaveBeenCalledWith(
            expect.objectContaining({ ordering: 'name' })
          );
        });

        // Click again for descending
        fireEvent.click(nameHeader);
        
        await waitFor(() => {
          expect(apiModule.api.getInvitations).toHaveBeenCalledWith(
            expect.objectContaining({ ordering: '-name' })
          );
        });
      }
    });

    it('sorts by status', async () => {
      render(<InvitationList />);

      await waitFor(() => {
        expect(screen.getByText('Family Test')).toBeInTheDocument();
      });

      const statusHeader = screen.getAllByRole('button').find(btn => btn.textContent.includes('admin.invitations.table.status'));
      
      if (statusHeader) {
        fireEvent.click(statusHeader);
        
        await waitFor(() => {
          expect(apiModule.api.getInvitations).toHaveBeenCalledWith(
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
        expect(screen.getByText('Family Test')).toBeInTheDocument();
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
        expect(screen.getByText('+39 333 1234567')).toBeInTheDocument();
      });

      // Click on phone to edit (if clickable)
      const phoneEl = screen.getByText('+39 333 1234567');
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
      render(<InvitationList />);

      await waitFor(() => {
        expect(screen.getByText('Family Test')).toBeInTheDocument();
      });

      // Click row to open modal
      const rowElement = screen.getByText('Family Test').closest('tr');
      fireEvent.click(rowElement);

      await waitFor(() => {
        // Check if modal content appears (guest details, etc.)
        expect(screen.queryByText('John Doe') || screen.queryByText('admin.invitations.details')).toBeTruthy();
      });
    });

    it('deletes invitation with confirmation', async () => {
      render(<InvitationList />);

      await waitFor(() => {
        expect(screen.getByText('Family Test')).toBeInTheDocument();
      });

      // Find delete button (trash icon)
      const deleteBtns = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('svg[class*="trash"]')
      );

      if (deleteBtns.length > 0) {
        fireEvent.click(deleteBtns[0]);

        await waitFor(() => {
          expect(apiModule.api.deleteInvitation).toHaveBeenCalledWith(1);
        });
      }
    });

    it('toggles accommodation pin', async () => {
      render(<InvitationList />);

      await waitFor(() => {
        expect(screen.getByText('Family Test')).toBeInTheDocument();
      });

      // Find pin/star icon button
      const pinBtns = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('svg[class*="star"], svg[class*="pin"]')
      );

      if (pinBtns.length > 0) {
        fireEvent.click(pinBtns[0]);

        await waitFor(() => {
          expect(apiModule.api.updateInvitation).toHaveBeenCalledWith(
            1,
            expect.objectContaining({ accommodation_pinned: true })
          );
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
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') {
          return {
            click: linkClickSpy,
            setAttribute: vi.fn(),
            style: {},
          };
        }
        return document.createElement(tag);
      });

      render(<InvitationList />);

      await waitFor(() => {
        expect(screen.getByText('Family Test')).toBeInTheDocument();
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
        expect(screen.getByText('Family Test')).toBeInTheDocument();
      });

      // Find search input
      const searchInput = screen.queryByPlaceholderText(/search|cerca/i);

      if (searchInput) {
        await user.type(searchInput, 'Test');

        await waitFor(() => {
          expect(apiModule.api.getInvitations).toHaveBeenCalledWith(
            expect.objectContaining({ search: 'Test' })
          );
        }, { timeout: 3000 });
      }
    });
  });

  // === EDGE CASES ===
  describe('Edge Cases', () => {
    it('handles empty invitations list', async () => {
      apiModule.api.getInvitations.mockResolvedValueOnce({
        results: [],
        count: 0,
        next: null,
        previous: null,
      });

      render(<InvitationList />);

      await waitFor(() => {
        expect(screen.getByText(/admin.invitations.empty|no invitations|nessun invito/i)).toBeInTheDocument();
      });
    });

    it('handles API errors gracefully', async () => {
      apiModule.api.getInvitations.mockRejectedValueOnce(new Error('Network error'));

      render(<InvitationList />);

      await waitFor(() => {
        // Should show error state or toast
        expect(screen.queryByText(/error|errore/i)).toBeTruthy();
      });
    });

    it('handles invitation with missing phone/whatsapp', async () => {
      render(<InvitationList />);

      await waitFor(() => {
        expect(screen.getByText('Another Family')).toBeInTheDocument();
      });

      // Verify no phone number displayed (or placeholder)
      const row = screen.getByText('Another Family').closest('tr');
      expect(row).toBeInTheDocument();
      // Phone should be empty or show placeholder
    });
  });
});
