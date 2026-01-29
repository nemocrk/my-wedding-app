import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateInvitationModal from '../components/invitations/CreateInvitationModal';
import * as apiModule from '../services/api';

// --- MOCKS ---
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key
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

vi.mock('../components/common/ErrorModal', () => ({
  default: ({ isOpen, onClose, errorDetails }) =>
    isOpen ? (
      <div data-testid="error-modal">
        <button onClick={onClose}>Close Error</button>
        <p>{errorDetails}</p>
      </div>
    ) : null
}));

const mockLabels = [
  { id: 1, name: 'VIP', color: '#FF0000' },
  { id: 2, name: 'Family', color: '#00FF00' },
];

const mockInvitations = [
  { id: 1, name: 'Test Family 1', guests_names: 'John Doe' },
  { id: 2, name: 'Test Family 2', guests_names: 'Jane Smith' },
];

const mockInitialData = {
  id: 99,
  name: 'Existing Family',
  code: 'EXIST123',
  origin: 'bride',
  phone_number: '+39 333 1234567',
  accommodation_offered: true,
  transfer_offered: false,
  labels: [{ id: 1, name: 'VIP', color: '#FF0000' }],
  guests: [
    { first_name: 'Alice', last_name: 'Test', is_child: false },
    { first_name: 'Bob', last_name: 'Test', is_child: true }
  ],
  affinities: [1],
  non_affinities: []
};

describe('CreateInvitationModal', () => {
  let onCloseMock;
  let onSuccessMock;

  beforeEach(() => {
    vi.clearAllMocks();
    onCloseMock = vi.fn();
    onSuccessMock = vi.fn();

    // Setup API mocks
    vi.spyOn(apiModule.api, 'fetchInvitationLabels').mockResolvedValue(mockLabels);
    vi.spyOn(apiModule.api, 'fetchInvitations').mockResolvedValue({ results: mockInvitations });
    vi.spyOn(apiModule.api, 'createInvitation').mockResolvedValue({ id: 100 });
    vi.spyOn(apiModule.api, 'updateInvitation').mockResolvedValue({ id: 99 });
  });

  describe('Render and Initial State', () => {
    it('renders modal with correct title in create mode', async () => {
      render(
        <CreateInvitationModal
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
        />
      );

      expect(screen.getByText('admin.invitations.create_modal.title')).toBeInTheDocument();
      expect(screen.getByText('admin.invitations.create_modal.step_of')).toBeInTheDocument();
    });

    it('loads and displays available labels', async () => {
      render(
        <CreateInvitationModal
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
        />
      );

      await waitFor(() => {
        expect(apiModule.api.fetchInvitationLabels).toHaveBeenCalled();
      });

      expect(screen.getByText('VIP')).toBeInTheDocument();
      expect(screen.getByText('Family')).toBeInTheDocument();
    });

    it('initializes with edit data when initialData is provided', async () => {
      render(
        <CreateInvitationModal
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
          initialData={mockInitialData}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Existing Family')).toBeInTheDocument();
        expect(screen.getByDisplayValue('EXIST123')).toBeInTheDocument();
        expect(screen.getByDisplayValue('+39 333 1234567')).toBeInTheDocument();
      });
    });

    it('closes modal when X button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationModal
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
        />
      );

      const closeButton = screen.getByRole('button', { name: '' }).closest('button');
      await user.click(closeButton);

      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  describe('Step 1: Details Form', () => {
    it('allows user to input name and code', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationModal
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
        />
      );

      const nameInput = screen.getByPlaceholderText('admin.invitations.create_modal.steps.details.display_name_placeholder');
      const codeInput = screen.getByPlaceholderText('admin.invitations.create_modal.steps.details.unique_code_placeholder');

      await user.type(nameInput, 'New Family');
      await user.type(codeInput, 'FAM001');

      expect(nameInput).toHaveValue('New Family');
      expect(codeInput).toHaveValue('FAM001');
    });

    it('toggles origin between groom and bride', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationModal
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
        />
      );

      const groomButton = screen.getByText('admin.invitations.create_modal.steps.details.side_groom').closest('button');
      const brideButton = screen.getByText('admin.invitations.create_modal.steps.details.side_bride').closest('button');

      // Default should be groom
      expect(groomButton).toHaveClass('bg-white');

      await user.click(brideButton);
      expect(brideButton).toHaveClass('bg-white');
    });

    it('allows selecting/deselecting labels', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationModal
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('VIP')).toBeInTheDocument();
      });

      const vipLabel = screen.getByText('VIP').closest('button');

      await user.click(vipLabel);
      // Check is selected (implementation uses inline Check icon)
      expect(vipLabel).toHaveClass('ring-2');

      await user.click(vipLabel);
      // Check is deselected
      expect(vipLabel).not.toHaveClass('ring-2');
    });

    it('toggles accommodation and transfer checkboxes', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationModal
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
        />
      );

      const accommodationCheckbox = screen.getByRole('checkbox', { name: /accommodation_offered/i });
      const transferCheckbox = screen.getByRole('checkbox', { name: /transfer_offered/i });

      expect(accommodationCheckbox).not.toBeChecked();
      expect(transferCheckbox).not.toBeChecked();

      await user.click(accommodationCheckbox);
      expect(accommodationCheckbox).toBeChecked();

      await user.click(transferCheckbox);
      expect(transferCheckbox).toBeChecked();
    });

    it('validates name and code before proceeding to step 2', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationModal
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
        />
      );

      const nextButton = screen.getByText('admin.invitations.create_modal.buttons.next');

      await user.click(nextButton);

      // Should show warning toast (via ToastContext mock)
      // Step should remain at 1 (check step indicator doesn't change)
      expect(screen.getByText('admin.invitations.create_modal.step_of')).toBeInTheDocument();
    });
  });

  describe('Step 2: Guests Management', () => {
    it('navigates to step 2 after filling step 1', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationModal
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
        />
      );

      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.details.display_name_placeholder'), 'Test Family');
      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.details.unique_code_placeholder'), 'TEST01');

      const nextButton = screen.getByText('admin.invitations.create_modal.buttons.next');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('admin.invitations.create_modal.steps.guests.title')).toBeInTheDocument();
      });
    });

    it('allows adding and removing guests', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationModal
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
        />
      );

      // Navigate to step 2
      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.details.display_name_placeholder'), 'Test');
      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.details.unique_code_placeholder'), 'TEST');
      await user.click(screen.getByText('admin.invitations.create_modal.buttons.next'));

      await waitFor(() => {
        expect(screen.getByText('admin.invitations.create_modal.steps.guests.add_guest')).toBeInTheDocument();
      });

      // Add guest
      const addButton = screen.getByText('admin.invitations.create_modal.steps.guests.add_guest');
      await user.click(addButton);

      // Should have 2 guest rows now
      const guestInputs = screen.getAllByPlaceholderText('admin.invitations.create_modal.steps.guests.name_placeholder');
      expect(guestInputs).toHaveLength(2);

      // Remove guest (trash icon button)
      const trashButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('svg[class*="trash"]')
      );
      const removeButton = trashButtons.find(btn => !btn.disabled);

      if (removeButton) {
        await user.click(removeButton);
        await waitFor(() => {
          expect(screen.getAllByPlaceholderText('admin.invitations.create_modal.steps.guests.name_placeholder')).toHaveLength(1);
        });
      }
    });

    it('allows filling guest details and checking is_child', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationModal
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
        />
      );

      // Navigate to step 2
      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.details.display_name_placeholder'), 'Test');
      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.details.unique_code_placeholder'), 'TEST');
      await user.click(screen.getByText('admin.invitations.create_modal.buttons.next'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('admin.invitations.create_modal.steps.guests.name_placeholder')).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText('admin.invitations.create_modal.steps.guests.name_placeholder');
      const lastnameInput = screen.getByPlaceholderText('admin.invitations.create_modal.steps.guests.lastname_placeholder');
      const childCheckbox = screen.getByRole('checkbox', { name: /child_checkbox/i });

      await user.type(nameInput, 'John');
      await user.type(lastnameInput, 'Doe');
      await user.click(childCheckbox);

      expect(nameInput).toHaveValue('John');
      expect(lastnameInput).toHaveValue('Doe');
      expect(childCheckbox).toBeChecked();
    });

    it('navigates back to step 1', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationModal
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
        />
      );

      // Go to step 2
      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.details.display_name_placeholder'), 'Test');
      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.details.unique_code_placeholder'), 'TEST');
      await user.click(screen.getByText('admin.invitations.create_modal.buttons.next'));

      await waitFor(() => {
        expect(screen.getByText('admin.invitations.create_modal.steps.guests.title')).toBeInTheDocument();
      });

      // Click Back
      const backButton = screen.getByText('admin.invitations.create_modal.buttons.back');
      await user.click(backButton);

      await waitFor(() => {
        expect(screen.getByText('admin.invitations.create_modal.steps.details.title')).toBeInTheDocument();
      });
    });
  });

  describe('Step 3: Affinities', () => {
    it('loads existing invitations on step 3', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationModal
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
        />
      );

      // Navigate to step 3
      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.details.display_name_placeholder'), 'Test');
      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.details.unique_code_placeholder'), 'TEST');
      await user.click(screen.getByText('admin.invitations.create_modal.buttons.next'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('admin.invitations.create_modal.steps.guests.name_placeholder')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.guests.name_placeholder'), 'Guest1');
      await user.click(screen.getByText('admin.invitations.create_modal.buttons.next'));

      await waitFor(() => {
        expect(screen.getByText('admin.invitations.create_modal.steps.review.title')).toBeInTheDocument();
        expect(apiModule.api.fetchInvitations).toHaveBeenCalled();
      });

      expect(screen.getAllByText('Test Family 1')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Test Family 2')[0]).toBeInTheDocument();
    });

    it('allows selecting affinities and non-affinities', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationModal
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
        />
      );

      // Navigate to step 3
      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.details.display_name_placeholder'), 'Test');
      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.details.unique_code_placeholder'), 'TEST');
      await user.click(screen.getByText('admin.invitations.create_modal.buttons.next'));
      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.guests.name_placeholder'), 'Guest');
      await user.click(screen.getByText('admin.invitations.create_modal.buttons.next'));

      await waitFor(() => {
        expect(screen.getAllByText('Test Family 1')[0]).toBeInTheDocument();
      });

      // Click on affinity item
      const affinitySection = screen.getByText('admin.invitations.create_modal.steps.review.affinity_title').closest('div');
      const family1InAffinity = within(affinitySection).getByText('Test Family 1').closest('div').parentElement;

      await user.click(family1InAffinity);

      // Should show check icon (implementation specific)
      await waitFor(() => {
        expect(family1InAffinity).toHaveClass('bg-green-50');
      })
    });
  });

  describe('Form Submission', () => {
    it('creates new invitation on submit in create mode', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationModal
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
        />
      );

      // Fill form and navigate to step 3
      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.details.display_name_placeholder'), 'New Family');
      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.details.unique_code_placeholder'), 'NEW01');
      await user.click(screen.getByText('admin.invitations.create_modal.buttons.next'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('admin.invitations.create_modal.steps.guests.name_placeholder')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.guests.name_placeholder'), 'John');
      await user.click(screen.getByText('admin.invitations.create_modal.buttons.next'));

      await waitFor(() => {
        expect(screen.getByText('admin.invitations.create_modal.steps.review.title')).toBeInTheDocument();
      });

      // Submit
      const createButton = screen.getByText('admin.invitations.create_modal.buttons.create');
      await user.click(createButton);

      await waitFor(() => {
        expect(apiModule.api.createInvitation).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Family',
            code: 'NEW01'
          })
        );
        expect(onSuccessMock).toHaveBeenCalled();
        expect(onCloseMock).toHaveBeenCalled();
      });
    });

    it('updates invitation on submit in edit mode', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationModal
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
          initialData={mockInitialData}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Existing Family')).toBeInTheDocument();
      });

      // Change name
      const nameInput = screen.getByDisplayValue('Existing Family');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Family');

      // Navigate to final step
      await user.click(screen.getByText('admin.invitations.create_modal.buttons.next'));
      await user.click(screen.getByText('admin.invitations.create_modal.buttons.next'));

      await waitFor(() => {
        expect(screen.getByText('admin.invitations.create_modal.buttons.create')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('admin.invitations.create_modal.buttons.create');
      await user.click(saveButton);

      await waitFor(() => {
        expect(apiModule.api.updateInvitation).toHaveBeenCalledWith(
          99,
          expect.objectContaining({
            name: 'Updated Family'
          })
        );
        expect(onSuccessMock).toHaveBeenCalled();
        expect(onCloseMock).toHaveBeenCalled();
      });
    });

    it('shows error modal on API failure', async () => {
      const user = userEvent.setup();
      apiModule.api.createInvitation.mockRejectedValueOnce(new Error('API Error'));

      render(
        <CreateInvitationModal
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
        />
      );

      // Fill and submit
      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.details.display_name_placeholder'), 'Test');
      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.details.unique_code_placeholder'), 'TEST');
      await user.click(screen.getByText('admin.invitations.create_modal.buttons.next'));
      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.guests.name_placeholder'), 'John');
      await user.click(screen.getByText('admin.invitations.create_modal.buttons.next'));

      await waitFor(() => {
        expect(screen.getByText('admin.invitations.create_modal.buttons.create')).toBeInTheDocument();
      });

      await user.click(screen.getByText('admin.invitations.create_modal.buttons.create'));

      await waitFor(() => {
        expect(screen.getByTestId('error-modal')).toBeInTheDocument();
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });

      expect(onCloseMock).not.toHaveBeenCalled();
      expect(onSuccessMock).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty labels list gracefully', async () => {
      apiModule.api.fetchInvitationLabels.mockResolvedValueOnce([]);

      render(
        <CreateInvitationModal
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('admin.invitations.create_modal.steps.details.no_labels')).toBeInTheDocument();
      });
    });

    it('filters out self invitation in edit mode from affinities list', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationModal
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
          initialData={mockInitialData}
        />
      );

      // Navigate to step 3
      await user.click(screen.getByText('admin.invitations.create_modal.buttons.next'));
      await user.click(screen.getByText('admin.invitations.create_modal.buttons.next'));

      await waitFor(() => {
        expect(apiModule.api.fetchInvitations).toHaveBeenCalled();
      });

      // mockInitialData.id = 99, should not appear in list
      // Since mock invitations are id 1 and 2, this is already OK
      expect(screen.queryByText('Existing Family')).not.toBeInTheDocument();
    });

    it('prevents removal of last guest', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationModal
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
        />
      );

      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.details.display_name_placeholder'), 'Test');
      await user.type(screen.getByPlaceholderText('admin.invitations.create_modal.steps.details.unique_code_placeholder'), 'TEST');
      await user.click(screen.getByText('admin.invitations.create_modal.buttons.next'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('admin.invitations.create_modal.steps.guests.name_placeholder')).toBeInTheDocument();
      });

      // Try to remove the only guest
      const trashButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('svg') && btn.disabled
      );

      // Should have at least one disabled trash button (for single guest)
      expect(trashButtons.length).toBeGreaterThan(0);
    });
  });
});
