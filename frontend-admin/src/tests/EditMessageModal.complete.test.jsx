import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../__tests__/test-utils';
import EditMessageModal from '../components/whatsapp/EditMessageModal';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k) => k }),
}));

vi.mock('lucide-react', () => ({
    X: ({ onClick, ...props }) => <button {...props} onClick={onClick} data-testid="close-btn">X</button>,
    Save: () => <span>Save</span>,
}));

describe('EditMessageModal - Complete Suite', () => {
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();
    const mockMessage = {
        id: '123',
        session_type: 'groom',
        message_body: 'Test message',
        recipient_number: '+393331111111',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does not render when isOpen is false', () => {
        render(
            <EditMessageModal
                isOpen={false}
                onClose={mockOnClose}
                message={mockMessage}
                onSave={mockOnSave}
            />
        );

        expect(screen.queryByText('admin.whatsapp.edit_modal.title')).not.toBeInTheDocument();
    });

    it('renders modal when isOpen is true', () => {
        render(
            <EditMessageModal
                isOpen={true}
                onClose={mockOnClose}
                message={mockMessage}
                onSave={mockOnSave}
            />
        );

        expect(screen.getByText('admin.whatsapp.edit_modal.title')).toBeInTheDocument();
    });

    it('displays recipient number', () => {
        render(
            <EditMessageModal
                isOpen={true}
                onClose={mockOnClose}
                message={mockMessage}
                onSave={mockOnSave}
            />
        );

        expect(screen.getByText('+393331111111')).toBeInTheDocument();
    });

    it('closes modal when X button is clicked', async () => {
        render(
            <EditMessageModal
                isOpen={true}
                onClose={mockOnClose}
                message={mockMessage}
                onSave={mockOnSave}
            />
        );

        const closeBtn = screen.getByTestId('close-btn');
        fireEvent.click(closeBtn);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes modal when overlay is clicked', async () => {
        const { container } = render(
            <EditMessageModal
                isOpen={true}
                onClose={mockOnClose}
                message={mockMessage}
                onSave={mockOnSave}
            />
        );

        const overlay = container.querySelector('[aria-hidden="true"]');
        fireEvent.click(overlay);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it('initializes form with message data', async () => {
        render(
            <EditMessageModal
                isOpen={true}
                onClose={mockOnClose}
                message={mockMessage}
                onSave={mockOnSave}
            />
        );

        await waitFor(() => {
            const sessionSelect = screen.getByRole('combobox', { name: /admin.whatsapp.edit_modal.session/i });
            expect(sessionSelect).toHaveValue('groom');
        });
    });

    it('updates session_type when select changes', async () => {
        render(
            <EditMessageModal
                isOpen={true}
                onClose={mockOnClose}
                message={mockMessage}
                onSave={mockOnSave}
            />
        );

        const sessionSelect = screen.getByRole('combobox', { name: /admin.whatsapp.edit_modal.session/i });
        await userEvent.selectOptions(sessionSelect, 'bride');

        expect(sessionSelect).toHaveValue('bride');
    });

    it('updates message content when textarea changes', async () => {
        render(
            <EditMessageModal
                isOpen={true}
                onClose={mockOnClose}
                message={mockMessage}
                onSave={mockOnSave}
            />
        );

        const textarea = screen.getByRole('textbox', { name: /admin.whatsapp.edit_modal.content/i });
        await userEvent.clear(textarea);
        await userEvent.type(textarea, 'Updated message');

        expect(textarea).toHaveValue('Updated message');
    });

    it('calls onSave with message id and updated data when form is submitted', async () => {
        render(
            <EditMessageModal
                isOpen={true}
                onClose={mockOnClose}
                message={mockMessage}
                onSave={mockOnSave}
            />
        );

        const textarea = screen.getByRole('textbox', { name: /admin.whatsapp.edit_modal.content/i });
        await userEvent.clear(textarea);
        await userEvent.type(textarea, 'New content');

        const submitBtn = screen.getByRole('button', { name: /save|submit/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(
                '123',
                expect.objectContaining({
                    session_type: 'groom',
                    message_body: 'New content',
                })
            );
        });
    });

    it('handles message with default values', () => {
        const minimalMessage = {
            id: '456',
            recipient_number: '+393332222222',
        };

        render(
            <EditMessageModal
                isOpen={true}
                onClose={mockOnClose}
                message={minimalMessage}
                onSave={mockOnSave}
            />
        );

        const sessionSelect = screen.getByRole('combobox', { name: /admin.whatsapp.edit_modal.session/i });
        expect(sessionSelect).toHaveValue('groom');
    });

    it('changes session type and saves with new value', async () => {
        render(
            <EditMessageModal
                isOpen={true}
                onClose={mockOnClose}
                message={mockMessage}
                onSave={mockOnSave}
            />
        );

        const sessionSelect = screen.getByRole('combobox', { name: /admin.whatsapp.edit_modal.session/i });
        await userEvent.selectOptions(sessionSelect, 'bride');

        const submitBtn = screen.getByRole('button', { name: /admin.whatsapp.edit_modal.save|save|submit/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(
                '123',
                expect.objectContaining({
                    session_type: 'bride',
                    message_body: 'Test message',
                })
            );
        });
    });

    it('displays recipient, session, and content labels', () => {
        render(
            <EditMessageModal
                isOpen={true}
                onClose={mockOnClose}
                message={mockMessage}
                onSave={mockOnSave}
            />
        );

        expect(screen.getByText('admin.whatsapp.edit_modal.recipient')).toBeInTheDocument();
        expect(screen.getByText('admin.whatsapp.edit_modal.session')).toBeInTheDocument();
        expect(screen.getByText('admin.whatsapp.edit_modal.content')).toBeInTheDocument();
    });

    it('has groom and bride options in session select', () => {
        render(
            <EditMessageModal
                isOpen={true}
                onClose={mockOnClose}
                message={mockMessage}
                onSave={mockOnSave}
            />
        );

        const options = screen.getAllByRole('option');
        expect(options.length).toBeGreaterThanOrEqual(2);
    });
});
