import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../__tests__/test-utils';
import WhatsAppQueueDashboard from '../components/whatsapp/WhatsAppQueueDashboard';
import * as waServiceModule from '../services/whatsappService';

// i18n mock
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k) => k }),
}));

// Mock confirm dialog context so tests can control confirmation
const confirmMock = vi.fn();
vi.mock('../contexts/ConfirmDialogContext', () => ({
    // The real context returns the confirm function directly from useConfirm()
    useConfirm: () => confirmMock,
    // Provide a simple provider passthrough for the test wrapper
    ConfirmDialogProvider: ({ children }) => children,
}));

// Mock SSE hook (make connectionStatus mutable for tests)
let _mockConnectionStatus = 'connected';
vi.mock('../hooks/useWhatsAppSSE', () => ({
    useWhatsAppSSE: () => ({ realtimeStatus: {}, connectionStatus: _mockConnectionStatus }),
}));

// Replace QueueTable with a small test stub so we can exercise handlers
vi.mock('../components/whatsapp/QueueTable', () => ({
    default: ({ messages = [], onRetry, onForceSend, onDelete, onEdit }) => {
        return (
            <div data-testid="queue-table">
                {messages[0] && <div data-testid="msg-text">{messages[0].text}</div>}
                <button data-testid="retry" onClick={() => onRetry(messages[0]?.id)}>retry</button>
                <button data-testid="force" onClick={() => onForceSend(messages[0]?.id)}>force</button>
                <button data-testid="delete" onClick={() => onDelete(messages[0]?.id)}>delete</button>
                <button data-testid="edit" onClick={() => onEdit(messages[0])}>edit</button>
            </div>
        );
    },
}));

// Stub EditMessageModal to allow triggering onSave
vi.mock('../components/whatsapp/EditMessageModal', () => ({
    default: ({ isOpen, onClose, message, onSave }) => {
        return isOpen ? (
            <div data-testid="edit-modal">
                <div>{message?.text}</div>
                <button data-testid="save-edit" onClick={() => onSave(message?.id, { text: 'edited' })}>save</button>
                <button data-testid="close-edit" onClick={onClose}>close</button>
            </div>
        ) : null;
    },
}));

const mockMessages = [
    { id: 1, text: 'Hello world', status: 'failed' },
];

beforeEach(() => {
    vi.clearAllMocks();
    // Spy on service methods
    vi.spyOn(waServiceModule.whatsappService, 'getQueue').mockResolvedValue({ results: mockMessages });
    vi.spyOn(waServiceModule.whatsappService, 'retryFailed').mockResolvedValue({});
    vi.spyOn(waServiceModule.whatsappService, 'forceSend').mockResolvedValue({});
    vi.spyOn(waServiceModule.whatsappService, 'deleteMessage').mockResolvedValue({});
    vi.spyOn(waServiceModule.whatsappService, 'updateMessage').mockResolvedValue({});
    // default confirm to true
    confirmMock.mockResolvedValue(true);
});

describe('WhatsAppQueueDashboard - Complete Suite', () => {
    it('shows loading then renders empty message when no messages', async () => {
        waServiceModule.whatsappService.getQueue.mockResolvedValueOnce({ results: [] });
        render(<WhatsAppQueueDashboard />);

        await waitFor(() => {
            expect(screen.getByText('admin.whatsapp.dashboard.empty_queue')).toBeInTheDocument();
        });
    });

    it('renders queue table when messages present', async () => {
        render(<WhatsAppQueueDashboard />);
        await waitFor(() => expect(screen.getByTestId('queue-table')).toBeInTheDocument());
        expect(screen.getByTestId('msg-text')).toHaveTextContent('Hello world');
    });

    it('clicking refresh calls fetchQueue', async () => {
        render(<WhatsAppQueueDashboard />);
        await waitFor(() => expect(screen.getByTestId('queue-table')).toBeInTheDocument());

        // The refresh button has no accessible name in the markup (icon-only),
        // so grab the first button in the header (refresh) reliably.
        const buttons = screen.getAllByRole('button');
        const refresh = buttons[0];
        fireEvent.click(refresh);
        await waitFor(() => expect(waServiceModule.whatsappService.getQueue).toHaveBeenCalled());
    });

    it('retry button triggers retryFailed and refetch', async () => {
        render(<WhatsAppQueueDashboard />);
        await waitFor(() => expect(screen.getByTestId('queue-table')).toBeInTheDocument());

        fireEvent.click(screen.getByTestId('retry'));
        await waitFor(() => {
            expect(waServiceModule.whatsappService.retryFailed).toHaveBeenCalled();
            expect(waServiceModule.whatsappService.getQueue).toHaveBeenCalled();
        });
    });

    it('force send triggers service and refetch', async () => {
        render(<WhatsAppQueueDashboard />);
        await waitFor(() => expect(screen.getByTestId('queue-table')).toBeInTheDocument());

        fireEvent.click(screen.getByTestId('force'));
        await waitFor(() => {
            expect(waServiceModule.whatsappService.forceSend).toHaveBeenCalledWith(1);
            expect(waServiceModule.whatsappService.getQueue).toHaveBeenCalled();
        });
    });

    it('delete triggers confirm and deletes message when confirmed', async () => {
        // confirmMock default resolves true
        render(<WhatsAppQueueDashboard />);
        await waitFor(() => expect(screen.getByTestId('queue-table')).toBeInTheDocument());

        fireEvent.click(screen.getByTestId('delete'));
        await waitFor(() => {
            expect(confirmMock).toHaveBeenCalled();
            expect(waServiceModule.whatsappService.deleteMessage).toHaveBeenCalledWith(1);
        });
    });

    it('edit flow opens modal and saves', async () => {
        render(<WhatsAppQueueDashboard />);
        await waitFor(() => expect(screen.getByTestId('queue-table')).toBeInTheDocument());

        fireEvent.click(screen.getByTestId('edit'));
        await waitFor(() => expect(screen.getByTestId('edit-modal')).toBeInTheDocument());

        // click save in modal which calls onSave -> updateMessage
        fireEvent.click(screen.getByTestId('save-edit'));
        await waitFor(() => {
            expect(waServiceModule.whatsappService.updateMessage).toHaveBeenCalledWith(1, { text: 'edited' });
            expect(waServiceModule.whatsappService.getQueue).toHaveBeenCalled();
        });
    });

    it('shows disconnected indicator when stream not connected', async () => {
        _mockConnectionStatus = 'disconnected';
        render(<WhatsAppQueueDashboard />);
        await waitFor(() => expect(screen.getByTestId('queue-table')).toBeInTheDocument());
        // the small status dot should be red when disconnected
        const statusText = screen.getByText(/admin.whatsapp.dashboard.stream_status/);
        expect(statusText).toBeInTheDocument();
        const dot = statusText.previousSibling;
        expect(dot).toHaveClass('bg-red-500');
        // restore for other tests
        _mockConnectionStatus = 'connected';
    });

    it('shows loading state while fetching', async () => {
        // make getQueue resolve after a short delay so initial render shows loading
        const delayed = new Promise((resolve) => setTimeout(() => resolve({ results: [] }), 50));
        waServiceModule.whatsappService.getQueue.mockImplementationOnce(() => delayed);

        render(<WhatsAppQueueDashboard />);
        // immediately show loading
        expect(screen.getByText('admin.whatsapp.dashboard.loading')).toBeInTheDocument();
        // wait for the fetch to complete and empty state to render
        await waitFor(() => expect(screen.getByText('admin.whatsapp.dashboard.empty_queue')).toBeInTheDocument());
    });
});
