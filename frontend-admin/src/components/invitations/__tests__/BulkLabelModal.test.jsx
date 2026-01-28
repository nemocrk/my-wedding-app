import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../../services/api';
import BulkLabelModal from '../BulkLabelModal';

// Mock dependencies
vi.mock('../../../services/api', () => ({
  api: {
    fetchInvitationLabels: vi.fn(),
    bulkManageLabels: vi.fn(),
  }
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (key === 'admin.invitations.bulk_labels.subtitle') return `Selected ${options?.count}`;
      return key;
    },
  }),
}));

describe('BulkLabelModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const selectedIds = [1, 2, 3];
  const mockLabels = [
    { id: 101, name: 'VIP', color: '#000000' },
    { id: 102, name: 'Family', color: '#ff0000' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when open is false', () => {
    render(<BulkLabelModal open={false} onClose={mockOnClose} selectedIds={selectedIds} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders and fetches labels when opened', async () => {
    api.fetchInvitationLabels.mockResolvedValue(mockLabels);

    render(<BulkLabelModal open={true} onClose={mockOnClose} selectedIds={selectedIds} />);

    expect(api.fetchInvitationLabels).toHaveBeenCalled();
    expect(await screen.findByText('admin.invitations.bulk_labels.title')).toBeInTheDocument();
    expect(screen.getByText('Selected 3')).toBeInTheDocument();

    // Check labels are rendered
    expect(await screen.findByText('VIP')).toBeInTheDocument();
    expect(screen.getByText('Family')).toBeInTheDocument();
  });

  it('allows selecting labels and toggling selection', async () => {
    api.fetchInvitationLabels.mockResolvedValue(mockLabels);
    const user = userEvent.setup();

    render(<BulkLabelModal open={true} onClose={mockOnClose} selectedIds={selectedIds} />);

    const vipButton = await screen.findByText('VIP');

    // Select
    await user.click(vipButton);
    // Visual check (class or icon check might be fragile, but state update allows submit)
    const confirmBtn = screen.getByText('common.confirm');
    expect(confirmBtn).not.toBeDisabled();

    // Deselect
    await user.click(vipButton);
    expect(confirmBtn).toBeDisabled();
  });

  it('allows changing action type', async () => {
    api.fetchInvitationLabels.mockResolvedValue(mockLabels);
    const user = userEvent.setup();

    render(<BulkLabelModal open={true} onClose={mockOnClose} selectedIds={selectedIds} />);

    // Default is 'add'
    await waitFor(() => {
      expect(screen.getByLabelText('admin.invitations.bulk_labels.action_add')).toBeChecked();
    });

    // Change to remove
    const removeRadio = screen.getByLabelText('admin.invitations.bulk_labels.action_remove');
    await user.click(removeRadio);
    expect(removeRadio).toBeChecked();
  });

  it('submits correctly', async () => {
    api.fetchInvitationLabels.mockResolvedValue(mockLabels);
    api.bulkManageLabels.mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<BulkLabelModal open={true} onClose={mockOnClose} selectedIds={selectedIds} onSuccess={mockOnSuccess} />);

    // Select label
    const vipButton = await screen.findByText('VIP');
    await user.click(vipButton);

    // Submit
    const confirmBtn = screen.getByText('common.confirm');
    await user.click(confirmBtn);

    expect(api.bulkManageLabels).toHaveBeenCalledWith(selectedIds, [101], 'add');
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles submission error', async () => {
    api.fetchInvitationLabels.mockResolvedValue(mockLabels);
    api.bulkManageLabels.mockRejectedValue(new Error('Update failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    const user = userEvent.setup();

    render(<BulkLabelModal open={true} onClose={mockOnClose} selectedIds={selectedIds} />);

    const vipButton = await screen.findByText('VIP');
    await user.click(vipButton);

    const confirmBtn = screen.getByText('common.confirm');
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error bulk updating labels:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
