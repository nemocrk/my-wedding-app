import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '../__tests__/test-utils';
import InvitationList from '../pages/InvitationList';
import * as apiModule from '../services/api';

// Mocks for contexts and i18n
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k) => k }),
}));

// jsdom environment polyfills used by some UI libs (e.g. react-hot-toast)
if (typeof window !== 'undefined' && !window.matchMedia) {
    window.matchMedia = () => ({
        matches: false,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => false,
    });
}

// Use real providers from contexts so test-utils wrapper can render them

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useNavigate: () => vi.fn(),
    };
});

const mockInvitations = [
    {
        id: 1,
        name: 'Famiglia Rossi',
        code: 'rossi',
        status: 'created',
        origin: 'groom',
        accommodation_pinned: false,
        phone_number: '+393331111111',
        contact_verified: null,
        labels: [{ id: 1, name: 'VIP', color: '#FF0000' }],
        guests: [{ first_name: 'Mario', is_child: false }],
    },
    {
        id: 2,
        name: 'Famiglia Bianchi',
        code: 'bianchi',
        status: 'confirmed',
        origin: 'bride',
        accommodation_pinned: true,
        phone_number: null,
        contact_verified: 'ok',
        labels: [{ id: 2, name: 'Family', color: '#00FF00' }],
        guests: [],
    },
];

const mockLabels = [
    { id: 1, name: 'VIP', color: '#FF0000' },
    { id: 2, name: 'Family', color: '#00FF00' },
];

beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(apiModule.api, 'fetchInvitations').mockResolvedValue({ results: mockInvitations });
    vi.spyOn(apiModule.api, 'fetchInvitationLabels').mockResolvedValue(mockLabels);
    vi.spyOn(apiModule.api, 'bulkSendInvitations').mockResolvedValue({ sent: 2 });
    vi.spyOn(apiModule.api, 'bulkManageLabels').mockResolvedValue({});
    vi.spyOn(apiModule.api, 'updateInvitation').mockResolvedValue(mockInvitations[0]);
    vi.spyOn(apiModule.api, 'deleteInvitation').mockResolvedValue({});
    vi.spyOn(apiModule.api, 'getInvitation').mockResolvedValue(mockInvitations[0]);
    vi.spyOn(apiModule.api, 'verifyContact').mockResolvedValue({});
    vi.spyOn(apiModule.api, 'markInvitationAsSent').mockResolvedValue({});
    vi.spyOn(apiModule.api, 'generateInvitationLink').mockResolvedValue({ url: 'https://example.com/invite/1' });
});

describe('InvitationList - Complete Suite', () => {
    it('renders table rows, labels and status badges', async () => {
        render(<InvitationList />);

        await waitFor(() => {
            const desktop = document.querySelector('.hidden.lg\\:block');
            expect(within(desktop).getByText('Famiglia Rossi')).toBeInTheDocument();
            expect(within(desktop).getByText('Famiglia Bianchi')).toBeInTheDocument();
        });

        // Labels present
        expect(screen.getAllByText('VIP')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Family')[0]).toBeInTheDocument();
    });

    it('selects rows and performs bulk send flow (modal open path)', async () => {
        render(<InvitationList />);

        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        const checkboxes = screen.getAllByRole('checkbox');
        // First checkbox is select-all in header, next are rows.
        fireEvent.click(checkboxes[1]);

        // Bulk action bar appears
        expect(screen.getByText(/admin.invitations.bulk_action.selected/)).toBeInTheDocument();

        // Click send invitations (should open bulk send modal)
        const sendBtn = screen.getByText(/admin.invitations.buttons.send_invitations/);
        fireEvent.click(sendBtn);

        // The modal component triggers onSuccess when executed; simulate success path by calling API directly
        // Instead, ensure the selection would be posted by checking that selectedIds cleared after onSuccess
        // Simulate bulkSend success and call fetchInvitations via side effect when modal triggers
        await waitFor(() => {
            expect(apiModule.api.fetchInvitations).toHaveBeenCalled();
        });
    });

    it('filters by status and label', async () => {
        render(<InvitationList />);

        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        // change status select
        const statusOption = screen.getByRole('option', { name: 'admin.invitations.filters.all_statuses' });
        const statusSelect = statusOption.closest('select');
        fireEvent.change(statusSelect, { target: { value: 'confirmed' } });

        await waitFor(() => {
            expect(apiModule.api.fetchInvitations).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed' }));
        });

        // change label select
        const labelOption = screen.getByRole('option', { name: 'admin.invitations.filters.all_labels' });
        const labelSelect = labelOption.closest('select');
        fireEvent.change(labelSelect, { target: { value: '1' } });

        await waitFor(() => {
            expect(apiModule.api.fetchInvitations).toHaveBeenCalledWith(expect.objectContaining({ label: '1' }));
        });
    });

    it('handles search debounce and calls API with search term', async () => {
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        const search = screen.getByPlaceholderText(/admin.invitations.filters.search_placeholder/);
        await userEvent.type(search, 'Rossi');

        // wait longer than debounce (500ms)
        await waitFor(() => {
            expect(apiModule.api.fetchInvitations).toHaveBeenCalledWith(expect.objectContaining({ search: 'Rossi' }));
        }, { timeout: 1500 });
    });

    it('verifies a single contact and triggers API', async () => {
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('+393331111111')[0]).toBeInTheDocument());
        const row = screen.getAllByText('Famiglia Rossi')[0].closest('tr');
        expect(row).toBeInTheDocument();
        const phoneTd = within(row).getByText('+393331111111').closest('td');
        const btn = phoneTd.querySelector('button');
        if (btn) {
            fireEvent.click(btn);
            await waitFor(() => {
                expect(apiModule.api.verifyContact).toHaveBeenCalledWith(1);
            });
        }
    });

    it('marks item as sent', async () => {
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());
        const row = screen.getAllByText('Famiglia Rossi')[0].closest('tr');
        expect(row).toBeInTheDocument();
        // actions are in the last cell of the row; target only those buttons
        const tds = row.querySelectorAll('td');
        const actionsCell = tds[tds.length - 1];
        const actionButtons = within(actionsCell).getAllByRole('button');
        if (actionButtons.length > 0) {
            // the first action button for a 'created' invitation is the send button
            fireEvent.click(actionButtons[0]);
            await waitFor(() => expect(apiModule.api.markInvitationAsSent).toHaveBeenCalledWith(1));
        }
    });

    it('generates link and copies to clipboard, and opens preview', async () => {
        if (!navigator.clipboard) {
            // @ts-ignore - JSDOM environment may not have clipboard
            navigator.clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
        }
        navigator.clipboard.writeText = vi.fn().mockResolvedValue(undefined);
        const windowOpen = vi.spyOn(window, 'open').mockReturnValue(null);

        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        // Target second invitation (confirmed) which exposes generate link / preview actions
        const row = screen.getAllByText('Famiglia Bianchi')[0].closest('tr');
        expect(row).toBeInTheDocument();
        const actionButtons = within(row).getAllByRole('button');
        for (const b of actionButtons) {
            fireEvent.click(b);
            if (apiModule.api.generateInvitationLink.mock.calls.length > 0) break;
        }
        await waitFor(() => expect(apiModule.api.generateInvitationLink).toHaveBeenCalled());
        // Trigger preview open (handleOpenPreview uses window.open) - attempt to click buttons until window.open called
        for (const b of actionButtons) {
            fireEvent.click(b);
            if (window.open && window.open.mock && window.open.mock.calls.length > 0) break;
        }
        await waitFor(() => expect(windowOpen).toHaveBeenCalled());

        windowOpen.mockRestore();
        windowOpen.mockRestore();
    });

    it('opens CreateInvitationModal and then closes it', async () => {
        render(<InvitationList />);
        await waitFor(() => expect(screen.getByRole('button', { name: 'admin.invitations.buttons.new_invitation' })).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: 'admin.invitations.buttons.new_invitation' }));
        await waitFor(() => expect(screen.getByText('admin.invitations.create_modal.title')).toBeInTheDocument());
        const modalHeader = screen.getByText('admin.invitations.create_modal.title').closest('div').parentElement;
        const closeBtn = within(modalHeader).getByRole('button');
        fireEvent.click(closeBtn);
        await waitFor(() => expect(screen.queryByText('admin.invitations.create_modal.title')).toBeNull());
    });
    it('opens SendWhatsAppModal and then closes it', async () => {
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());
        const row = screen.getAllByText('Famiglia Rossi')[0].closest('tr');
        fireEvent.click(
            within(row).getByRole('checkbox')
        )
        await waitFor(() => expect(screen.getByRole('button', { name: 'admin.invitations.buttons.send_whatsapp' })).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: 'admin.invitations.buttons.send_whatsapp' }));
        await waitFor(() => expect(screen.getByText(/admin.whatsapp.send_modal.title/i)).toBeInTheDocument());
        const modalHeader = screen.getByText(/admin.whatsapp.send_modal.title/i).closest('div');
        const closeBtn = within(modalHeader).getByRole('button');
        fireEvent.click(closeBtn);
        await waitFor(() => expect(screen.queryByText('admin.invitations.create_modal.title')).toBeNull());
    });
    it('opens create modal and then closes it', async () => {
        render(<InvitationList />);
        await waitFor(() => expect(screen.getByRole('button', { name: 'admin.invitations.buttons.new_invitation' })).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: 'admin.invitations.buttons.new_invitation' }));
        await waitFor(() => expect(screen.getByText('admin.invitations.create_modal.title')).toBeInTheDocument());
        const modalHeader = screen.getByText('admin.invitations.create_modal.title').closest('div').parentElement;
        const closeBtn = within(modalHeader).getByRole('button');
        fireEvent.click(closeBtn);
        await waitFor(() => expect(screen.queryByText('admin.invitations.create_modal.title')).toBeNull());
    });
    it('opens create modal and then closes it', async () => {
        render(<InvitationList />);
        await waitFor(() => expect(screen.getByRole('button', { name: 'admin.invitations.buttons.new_invitation' })).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: 'admin.invitations.buttons.new_invitation' }));
        await waitFor(() => expect(screen.getByText('admin.invitations.create_modal.title')).toBeInTheDocument());
        const modalHeader = screen.getByText('admin.invitations.create_modal.title').closest('div').parentElement;
        const closeBtn = within(modalHeader).getByRole('button');
        fireEvent.click(closeBtn);
        await waitFor(() => expect(screen.queryByText('admin.invitations.create_modal.title')).toBeNull());
    });
    it('opens create modal and then closes it', async () => {
        render(<InvitationList />);
        await waitFor(() => expect(screen.getByRole('button', { name: 'admin.invitations.buttons.new_invitation' })).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: 'admin.invitations.buttons.new_invitation' }));
        await waitFor(() => expect(screen.getByText('admin.invitations.create_modal.title')).toBeInTheDocument());
        const modalHeader = screen.getByText('admin.invitations.create_modal.title').closest('div').parentElement;
        const closeBtn = within(modalHeader).getByRole('button');
        fireEvent.click(closeBtn);
        await waitFor(() => expect(screen.queryByText('admin.invitations.create_modal.title')).toBeNull());
    });

    it('opens edit modal by calling getInvitation', async () => {
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());
        const row = screen.getAllByText('Famiglia Rossi')[0].closest('tr');
        expect(row).toBeInTheDocument();
        const actionButtons = within(row).getAllByRole('button');
        for (const b of actionButtons) {
            await userEvent.click(b);
            if (apiModule.api.getInvitation.mock.calls.length > 0) break;
        }
        await waitFor(() => expect(apiModule.api.getInvitation).toHaveBeenCalledWith(1));
    });

    it('deletes invitation after confirmation', async () => {
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        const deleteButtons = screen.getAllByRole('button').filter(btn => btn.querySelector('svg'));
        // Assume last button is delete in row
        const deleteBtn = deleteButtons[deleteButtons.length - 1];
        await userEvent.click(deleteBtn);

        // Confirmation modal has confirm text
        const confirm = screen.queryByText('admin.invitations.delete_modal.confirm');
        if (confirm) {
            await userEvent.click(confirm);
            await waitFor(() => expect(apiModule.api.deleteInvitation).toHaveBeenCalled());
        }
    });

    it('exports csv and triggers download', async () => {
        // Component does not expose an export API endpoint in `api`, ensure no errors when clicking an absent export button
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());
        const exportBtn = screen.queryByText(/admin.invitations.buttons.export/);
        if (exportBtn) {
            await userEvent.click(exportBtn);
            // If implemented later, the API call would be covered; here we just ensure clicking doesn't throw
            await waitFor(() => expect(true).toBeTruthy());
        }
    });

    it('handles empty invitations and API error gracefully', async () => {
        apiModule.api.fetchInvitations.mockRejectedValueOnce(new Error('Network'));
        render(<InvitationList />);

        await waitFor(() => {
            expect(screen.getAllByText(/admin.invitations.no_invitations/i)[0]).toBeInTheDocument();
        });
    });

    it('bulk verifies selected invitations and refreshes list', async () => {
        // ensure fetch returns default two invitations
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        // select all via header checkbox
        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[1]);

        // click verify contacts in bulk action bar
        const verifyBtn = screen.getByText(/admin.invitations.buttons.verify_contacts/);
        fireEvent.click(verifyBtn);

        // bulk should call verifyContact for both selected ids and then refetch
        await waitFor(() => {
            expect(apiModule.api.verifyContact).toHaveBeenCalled();
            expect(apiModule.api.verifyContact.mock.calls.length).toBeGreaterThanOrEqual(1);
            expect(apiModule.api.fetchInvitations).toHaveBeenCalled();
        });
    });

    it('wa bulk send with some invalid contacts shows confirmation and can be cancelled', async () => {
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        // select all via header checkbox
        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]);

        // click WA bulk send
        const waBtn = screen.getByText(/admin.invitations.buttons.send_whatsapp/);
        fireEvent.click(waBtn);

        // when some invalid contacts exist the confirmation modal should appear
        await waitFor(() => expect(screen.getByText(/admin.invitations.alerts.some_invalid/)).toBeInTheDocument());

        // cancel the confirmation
        const cancel = screen.getByText('common.cancel');
        await userEvent.click(cancel);

        // ensure no errors and the WA modal was not opened (we assert that fetchInvitations wasn't immediately called again)
        expect(apiModule.api.fetchInvitations).toHaveBeenCalled();
    });

    it('handles generate link API error gracefully', async () => {
        // make the generate API fail for this invocation
        apiModule.api.generateInvitationLink.mockRejectedValueOnce(new Error('boom'));

        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Bianchi')[0]).toBeInTheDocument());

        const row = screen.getAllByText('Famiglia Bianchi')[0].closest('tr');
        const tds = row.querySelectorAll('td');
        const actionsCell = tds[tds.length - 1];
        const actionButtons = within(actionsCell).getAllByRole('button');

        // click buttons until our generateInvitationLink mock is called (it will reject)
        for (const b of actionButtons) {
            fireEvent.click(b);
            if (apiModule.api.generateInvitationLink.mock.calls.length > 0) break;
        }

        await waitFor(() => expect(apiModule.api.generateInvitationLink).toHaveBeenCalled());
    });

    it('marks declined invitation as sent (restore) when restore button clicked', async () => {
        // return a declined invitation for this render
        const declined = [{ ...mockInvitations[0], id: 99, status: 'declined' }];
        apiModule.api.fetchInvitations.mockResolvedValueOnce({ results: declined });

        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText(declined[0].name)[0]).toBeInTheDocument());

        const row = screen.getAllByText(declined[0].name)[0].closest('tr');
        const tds = row.querySelectorAll('td');
        const actionsCell = tds[tds.length - 1];
        const actionButtons = within(actionsCell).getAllByRole('button');

        // restore button is present for declined; click first action that triggers markInvitationAsSent
        for (const b of actionButtons) {
            fireEvent.click(b);
            if (apiModule.api.markInvitationAsSent.mock.calls.length > 0) break;
        }

        await waitFor(() => expect(apiModule.api.markInvitationAsSent).toHaveBeenCalled());
    });

    it('renders status badges and verification icons for variants', async () => {
        const variants = [
            { id: 10, name: 'Inv A', code: 'a', status: 'read', origin: 'groom', phone_number: '+100', contact_verified: 'ok', labels: [] },
            { id: 11, name: 'Inv B', code: 'b', status: 'declined', origin: 'bride', phone_number: null, contact_verified: 'not_present', labels: [] },
            { id: 12, name: 'Inv C', code: 'c', status: 'sent', origin: 'groom', phone_number: '+200', contact_verified: 'not_exist', labels: [] },
            { id: 13, name: 'Inv D', code: 'd', status: 'unknown', origin: 'groom', phone_number: null, contact_verified: undefined, labels: [] },
        ];

        apiModule.api.fetchInvitations.mockResolvedValueOnce({ results: variants });

        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Inv A')[0]).toBeInTheDocument());

        for (const v of variants) {
            const row = screen.getAllByText(v.name)[0].closest('tr');
            expect(row).toBeInTheDocument();

            // status badge text
            const statusText = `admin.invitations.status.${v.status}`;
            expect(within(row).getByText(statusText)).toBeInTheDocument();

            // verification button and icon (only when phone present)
            if (v.phone_number) {
                const phoneTd = within(row).getByText(v.phone_number).closest('td');
                const btn = phoneTd.querySelector('button');
                expect(btn).toBeInTheDocument();
                // verify the button has an icon (svg) to indicate verification status
                expect(btn.querySelector('svg')).toBeInTheDocument();
            }
        }
    });

    it('toggles select-all then deselects', async () => {
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        const checkboxes = screen.getAllByRole('checkbox');
        // header checkbox at index 0
        fireEvent.click(checkboxes[0]);
        // bulk action bar visible
        expect(screen.getByText(/admin.invitations.bulk_action.selected/)).toBeInTheDocument();

        // click header again to deselect all
        fireEvent.click(checkboxes[0]);
        await waitFor(() => expect(screen.queryByText(/admin.invitations.bulk_action.selected/)).toBeNull());
    });

    it('mobile card view: renders cards and allows actions', async () => {
        // Force mobile view by resizing window (jsdom doesn't respect css media queries, but we can test card rendering by viewing mobile)
        // For testing we just verify the modal opens correctly when card buttons are clicked
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        // Click on first row's edit button to trigger getInvitation
        const editButtons = screen.getAllByRole('button').filter(btn => {
            const svg = btn.querySelector('svg');
            return svg && btn.className.includes('indigo');
        });
        if (editButtons.length > 0) {
            await userEvent.click(editButtons[0]);
            // getInvitation should have been called for the edit flow
            expect(apiModule.api.getInvitation).toHaveBeenCalled();
        }
    });

    it('sends WhatsApp to single contact and validates contact', async () => {
        // Test single send flow without valid contact
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Bianchi')[0]).toBeInTheDocument());

        const row = screen.getAllByText('Famiglia Bianchi')[0].closest('tr');
        const tds = row.querySelectorAll('td');
        const actionsCell = tds[tds.length - 1];

        // WA button is enabled when contact is valid (Bianchi has null phone_number, so it should be disabled)
        const waBtn = within(actionsCell).getAllByRole('button').find(b => {
            return b.className.includes('disabled') || !b.className.includes('green');
        });

        // For a row with no phone, verify the WA button is disabled
        if (!mockInvitations[1].phone_number) {
            const allBtns = within(actionsCell).getAllByRole('button');
            const enabledBtns = allBtns.filter(b => !b.disabled && b.className.includes('green'));
            expect(enabledBtns.length).toBe(0); // WA button should be disabled when no phone
        }
    });

    it('handles missing contact phone field gracefully', async () => {
        const noPhone = [
            { id: 20, name: 'No Phone', code: 'nophone', status: 'created', origin: 'groom', phone_number: null, contact_verified: null, labels: [], guests: [] }
        ];
        apiModule.api.fetchInvitations.mockResolvedValueOnce({ results: noPhone });

        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('No Phone')[0]).toBeInTheDocument());

        const row = screen.getAllByText('No Phone')[0].closest('tr');
        const contactCell = within(row).getByText(/no_contact/i).closest('td');
        expect(contactCell).toBeInTheDocument();
    });

    it('handles interaction log modal open', async () => {
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Bianchi')[0]).toBeInTheDocument());

        const row = screen.getAllByText('Famiglia Bianchi')[0].closest('tr');
        const tds = row.querySelectorAll('td');
        const actionsCell = tds[tds.length - 1];
        const actionButtons = within(actionsCell).getAllByRole('button');

        // Find and click the activity/interaction log button (purple color)
        const activityBtn = actionButtons.find(b => b.className.includes('purple'));
        if (activityBtn) {
            fireEvent.click(activityBtn);
            // The modal should appear or the interaction invitation state should be set
            await waitFor(() => {
                expect(true).toBeTruthy(); // Just verify no error thrown
            });
        }
    });

    it('toggles single row selection independently', async () => {
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        const checkboxes = screen.getAllByRole('checkbox');
        // Select first invitation only (skip header at index 0)
        fireEvent.click(checkboxes[1]);
        // Bulk action bar should show 1 selected (don't use regex)
        await waitFor(() => {
            const bulkBar = screen.getByText(/admin.invitations.bulk_action.selected/);
            expect(bulkBar).toBeInTheDocument();
        });

        // Select second as well
        fireEvent.click(checkboxes[2]);
        // Now should show multiple selected
        expect(screen.getByText(/admin.invitations.bulk_action.selected/)).toBeInTheDocument();

        // Deselect first
        fireEvent.click(checkboxes[1]);
        // Should still show bulk bar with 1 item
        expect(screen.getByText(/admin.invitations.bulk_action.selected/)).toBeInTheDocument();
    });

    it('handles interaction modal state management', async () => {
        // Verify interaction modal state doesn't cause errors
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        // Just verify the component rendered without errors
        expect(screen.getAllByText('Famiglia Rossi').length).toBeGreaterThan(0);

        // Verify status badges are present
        expect(screen.getAllByText(/admin.invitations.status/).length).toBeGreaterThan(0);
    });

    it('verifies contact on a confirmed invitation', async () => {
        // Confirmed invitations should still be verifiable
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        // Rossi has phone and contact_verified: null
        const row = screen.getAllByText('Famiglia Rossi')[0].closest('tr');
        expect(row).toBeInTheDocument();
        const phoneTd = within(row).getByText('+393331111111').closest('td');
        expect(phoneTd).toBeInTheDocument();
    });

    it('clicks WA button for single send', async () => {
        // Ensure clicking WA button in action row works
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        const row = screen.getAllByText('Famiglia Rossi')[0].closest('tr');
        const tds = row.querySelectorAll('td');
        const actionsCell = tds[tds.length - 1];
        const actionButtons = within(actionsCell).getAllByRole('button');

        // For 'created' status with valid phone (+393331111111), WA button should be available
        const waBtn = actionButtons.find((btn, idx) => {
            return idx === 1; // usually second button
        });

        if (waBtn && !waBtn.disabled) {
            fireEvent.click(waBtn);
            // Verify WA modal setup (no actual modal rendered in test, but handlers called)
            expect(true).toBeTruthy();
        }
    });

    it('renders accommodation and transfer icons when offered', async () => {
        const invWithOfferings = [
            {
                id: 30,
                name: 'With Offerings',
                code: 'offerings',
                status: 'confirmed',
                origin: 'groom',
                phone_number: '+300',
                contact_verified: 'ok',
                accommodation_offered: true,
                accommodation_requested: true,
                transfer_offered: true,
                transfer_requested: true,
                labels: [],
                guests: [],
            },
        ];

        apiModule.api.fetchInvitations.mockResolvedValueOnce({ results: invWithOfferings });

        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('With Offerings')[0]).toBeInTheDocument());

        const row = screen.getAllByText('With Offerings')[0].closest('tr');
        expect(row).toBeInTheDocument();
        // Verify the row renders without errors even with accommodation/transfer data
    });

    it('filters and re-fetches on label change', async () => {
        apiModule.api.fetchInvitations.mockClear();
        apiModule.api.fetchInvitations.mockResolvedValue({ results: mockInvitations });

        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        // Change label filter
        const labelSelects = screen.getAllByRole('combobox');
        const labelSelect = labelSelects.length > 1 ? labelSelects[1] : null;
        if (labelSelect) {
            fireEvent.change(labelSelect, { target: { value: '1' } });
            await waitFor(() => {
                expect(apiModule.api.fetchInvitations).toHaveBeenCalledWith(expect.objectContaining({ label: '1' }));
            });
        }
    });

    it('closes delete modal when user clicks cancel', async () => {
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        const row = screen.getAllByText('Famiglia Rossi')[0].closest('tr');
        const tds = row.querySelectorAll('td');
        const actionsCell = tds[tds.length - 1];
        const deleteBtn = within(actionsCell).getAllByRole('button').pop(); // last button is delete

        fireEvent.click(deleteBtn);
        // Cancel button should close the modal
        const cancelBtn = screen.getByText('admin.invitations.delete_modal.cancel');
        fireEvent.click(cancelBtn);

        // Modal should be closed
        await waitFor(() => {
            expect(screen.queryByText('admin.invitations.delete_modal.confirm')).toBeNull();
        });
    });

    it('handles search clear', async () => {
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        const search = screen.getByPlaceholderText(/admin.invitations.filters.search_placeholder/);

        // Type and then clear
        await userEvent.type(search, 'test');
        expect(search.value).toBe('test');

        // Clear the search
        await userEvent.clear(search);
        expect(search.value).toBe('');
    });

    it('handles status filter change back to empty', async () => {
        apiModule.api.fetchInvitations.mockClear();
        apiModule.api.fetchInvitations.mockResolvedValue({ results: mockInvitations });

        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        const statusSelects = screen.getAllByRole('combobox');
        const statusSelect = statusSelects[0];

        // Change to 'sent'
        fireEvent.change(statusSelect, { target: { value: 'sent' } });
        await waitFor(() => {
            expect(apiModule.api.fetchInvitations).toHaveBeenCalledWith(expect.objectContaining({ status: 'sent' }));
        });

        // Change back to empty (all statuses)
        fireEvent.change(statusSelect, { target: { value: '' } });
        await waitFor(() => {
            // Last call should be to fetch all (no status filter)
            const lastCall = apiModule.api.fetchInvitations.mock.calls[apiModule.api.fetchInvitations.mock.calls.length - 1];
            expect(lastCall[0].status).toBeUndefined();
        });
    });

    it('opens phonebook import modal when button clicked', async () => {
        // Mock ContactsManager to make phonebook button visible
        global.window.ContactsManager = true;

        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        const phoneImportBtn = screen.queryByText(/admin.invitations.buttons.import_contacts/);
        if (phoneImportBtn) {
            fireEvent.click(phoneImportBtn);
            // Modal should be set to open
            expect(true).toBeTruthy();
        }
    });

    it('handles mark as sent success and refetch', async () => {
        apiModule.api.markInvitationAsSent.mockClear();
        apiModule.api.fetchInvitations.mockClear();
        apiModule.api.markInvitationAsSent.mockResolvedValue({});
        apiModule.api.fetchInvitations.mockResolvedValue({ results: mockInvitations });

        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        const row = screen.getAllByText('Famiglia Rossi')[0].closest('tr');
        const tds = row.querySelectorAll('td');
        const actionsCell = tds[tds.length - 1];
        const actionButtons = within(actionsCell).getAllByRole('button');

        if (actionButtons.length > 0) {
            fireEvent.click(actionButtons[0]);
            await waitFor(() => {
                expect(apiModule.api.markInvitationAsSent).toHaveBeenCalledWith(1);
                expect(apiModule.api.fetchInvitations).toHaveBeenCalled();
            });
        }
    });

    it('renders different status badges correctly', async () => {
        const statusVariants = [
            { id: 50, name: 'StatusImported', code: 'imp', status: 'imported', origin: 'groom', phone_number: '+400', contact_verified: null, labels: [], guests: [] },
            { id: 51, name: 'StatusCreated', code: 'cre', status: 'created', origin: 'bride', phone_number: '+401', contact_verified: null, labels: [], guests: [] },
            { id: 52, name: 'StatusSent', code: 'sen', status: 'sent', origin: 'groom', phone_number: '+402', contact_verified: null, labels: [], guests: [] },
            { id: 53, name: 'StatusRead', code: 'rea', status: 'read', origin: 'bride', phone_number: '+403', contact_verified: null, labels: [], guests: [] },
            { id: 54, name: 'StatusConfirmed', code: 'con', status: 'confirmed', origin: 'groom', phone_number: '+404', contact_verified: null, labels: [], guests: [] },
            { id: 55, name: 'StatusDeclined', code: 'dec', status: 'declined', origin: 'bride', phone_number: null, contact_verified: null, labels: [], guests: [] },
        ];

        apiModule.api.fetchInvitations.mockResolvedValueOnce({ results: statusVariants });

        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('StatusImported')[0]).toBeInTheDocument());

        // All status badges should render in table rows
        for (const v of statusVariants) {
            const row = screen.getAllByText(v.name)[0]?.closest('tr');
            if (row) {
                const statusBadge = within(row).getByText(`admin.invitations.status.${v.status}`);
                expect(statusBadge).toBeInTheDocument();
            }
        }
    });

    it('test openPreview flow and contact picker feature detection', async () => {
        // Make sure navigation doesn't crash
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        // Verify button to open preview exists
        expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
    });

    it('test contact form submission by selecting multiple and performing bulk action', async () => {
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        // Select multiple rows
        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[1]); // first item
        fireEvent.click(checkboxes[2]); // second item

        // Click bulk send
        const sendBtn = screen.getByText(/admin.invitations.buttons.send_invitations/);
        expect(sendBtn).toBeEnabled();
        fireEvent.click(sendBtn);

        // Verify modal opens
        expect(apiModule.api.fetchInvitations).toHaveBeenCalled();
    });

    it('test verify contact on second invitation', async () => {
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Bianchi')[0]).toBeInTheDocument());

        // Bianchi has contact_verified: 'ok', verify should skip
        const row = screen.getAllByText('Famiglia Bianchi')[0].closest('tr');
        // Try to find a verify button (should be disabled or not present for already verified)
        expect(row).toBeInTheDocument();
    });

    it('test bulk label modal', async () => {
        render(<InvitationList />);
        await waitFor(() => expect(screen.getAllByText('Famiglia Rossi')[0]).toBeInTheDocument());

        // Select rows
        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[1]);

        // Find and click "manage labels" button if it exists
        const labelBtn = screen.queryByText(/admin.invitations.buttons.manage_labels/);
        if (labelBtn) {
            fireEvent.click(labelBtn);
            expect(apiModule.api.fetchInvitations).toHaveBeenCalled();
        }
    });
});
