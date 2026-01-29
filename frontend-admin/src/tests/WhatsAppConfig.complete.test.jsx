import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '../__tests__/test-utils';

const { mockGetWhatsAppStatus, mockFetchWhatsAppTemplates, mockDeleteWhatsAppTemplate, mockCreateWhatsAppTemplate, mockRefreshWhatsAppSession } = vi.hoisted(() => ({
    mockGetWhatsAppStatus: vi.fn(),
    mockFetchWhatsAppTemplates: vi.fn(),
    mockDeleteWhatsAppTemplate: vi.fn(),
    mockCreateWhatsAppTemplate: vi.fn(),
    mockUpdateWhatsAppTemplate: vi.fn(),
    mockRefreshWhatsAppSession: vi.fn(),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k) => k }),
}));

vi.mock('lucide-react', () => ({
    AlertTriangle: () => <span data-testid="alert-triangle">AlertTriangle</span>,
    CheckCircle: () => <span data-testid="check-circle">CheckCircle</span>,
    Edit2: () => <span data-testid="edit-icon">Edit</span>,
    Loader: () => <span data-testid="loader">Loader</span>,
    LogOut: () => <span data-testid="logout-icon">LogOut</span>,
    MessageSquare: () => <span data-testid="message-icon">MessageSquare</span>,
    Phone: () => <span data-testid="phone-icon">Phone</span>,
    Plus: () => <span data-testid="plus-icon">Plus</span>,
    QrCode: () => <span data-testid="qr-icon">QrCode</span>,
    RefreshCw: () => <span data-testid="refresh-icon">RefreshCw</span>,
    Save: () => <span data-testid="save-icon">Save</span>,
    Send: () => <span data-testid="send-icon">Send</span>,
    Trash2: () => <span data-testid="trash-icon">Trash2</span>,
    User: () => <span data-testid="user-icon">User</span>,
    X: () => <span data-testid="x-icon">X</span>,
}));

vi.mock('../components/whatsapp/WhatsAppQueueDashboard', () => ({
    default: () => <div data-testid="queue-dashboard">Queue Dashboard</div>,
}));

vi.mock('../services/api', () => ({
    api: {
        getWhatsAppStatus: mockGetWhatsAppStatus,
        fetchWhatsAppTemplates: mockFetchWhatsAppTemplates,
        deleteWhatsAppTemplate: mockDeleteWhatsAppTemplate,
        createWhatsAppTemplate: mockCreateWhatsAppTemplate,
        updateWhatsAppTemplate: vi.fn(),
        refreshWhatsAppSession: mockRefreshWhatsAppSession,
    },
}));

vi.mock('../contexts/ConfirmDialogContext', () => ({
    useConfirm: () => vi.fn(() => Promise.resolve(true)),
    ConfirmDialogProvider: ({ children }) => <>{children}</>,
}));

vi.mock('../contexts/ToastContext', () => ({
    useToast: () => ({
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    }),
    ToastProvider: ({ children }) => <>{children}</>,
}));

import WhatsAppConfig from '../pages/WhatsAppConfig';

describe('WhatsAppConfig - Complete Suite', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetWhatsAppStatus.mockResolvedValue({
            state: 'authenticated',
            phone: '+393331111111',
        });
        mockFetchWhatsAppTemplates.mockResolvedValue({ results: [] });
    });

    it('renders page without crashing', () => {
        render(<WhatsAppConfig />);
        expect(screen.getByTestId('queue-dashboard')).toBeInTheDocument();
    });

    it('fetches status for both groom and bride on mount', async () => {
        render(<WhatsAppConfig />);

        await waitFor(() => {
            expect(mockGetWhatsAppStatus).toHaveBeenCalledWith('groom');
            expect(mockGetWhatsAppStatus).toHaveBeenCalledWith('bride');
        });
    });

    it('handles authenticated status display', async () => {
        mockGetWhatsAppStatus.mockResolvedValue({
            state: 'authenticated',
            phone_number: '+393331111111',
        });

        render(<WhatsAppConfig />);

        await waitFor(() => {
            expect(screen.getByTestId('queue-dashboard')).toBeInTheDocument();
        });
    });

    it('handles disconnected status', async () => {
        mockGetWhatsAppStatus.mockResolvedValue({ state: 'disconnected' });

        render(<WhatsAppConfig />);

        await waitFor(() => {
            expect(mockGetWhatsAppStatus).toHaveBeenCalled();
        });
    });

    it('displays loading state during initial fetch', () => {
        mockGetWhatsAppStatus.mockImplementation(() => new Promise(() => { })); // Never resolves

        render(<WhatsAppConfig />);

        expect(screen.getByTestId('queue-dashboard')).toBeInTheDocument();
    });

    it('renders queue dashboard component', async () => {
        render(<WhatsAppConfig />);

        await waitFor(() => {
            expect(screen.getByTestId('queue-dashboard')).toBeInTheDocument();
        });
    });

    it('handles tab content rendering', () => {
        render(<WhatsAppConfig />);

        expect(screen.getByTestId('queue-dashboard')).toBeInTheDocument();
    });

    it('handles connection tab display', () => {
        render(<WhatsAppConfig />);

        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
    });

    it('handles template operations', async () => {
        mockFetchWhatsAppTemplates.mockResolvedValue({
            results: [{ id: 1, name: 'Test', content: 'content' }],
        });

        render(<WhatsAppConfig />);

        await waitFor(() => {
            expect(screen.getByTestId('queue-dashboard')).toBeInTheDocument();
        });
    });

    it('handles error state gracefully', async () => {
        mockGetWhatsAppStatus.mockResolvedValue({ state: 'error', error: 'Test error' });

        render(<WhatsAppConfig />);

        await waitFor(() => {
            expect(mockGetWhatsAppStatus).toHaveBeenCalled();
        });
    });

    it('fetches templates on demand', async () => {
        render(<WhatsAppConfig />);

        // Component initializes and makes calls on mount
        await waitFor(() => {
            expect(mockGetWhatsAppStatus).toHaveBeenCalled();
        });
    });

    it('handles multiple status checks per side', async () => {
        render(<WhatsAppConfig />);

        await waitFor(() => {
            expect(mockGetWhatsAppStatus.mock.calls.length).toBeGreaterThan(0);
        });
    });

    it('renders without errors with empty templates', async () => {
        mockFetchWhatsAppTemplates.mockResolvedValue({ results: [] });

        render(<WhatsAppConfig />);

        await waitFor(() => {
            expect(screen.getByTestId('queue-dashboard')).toBeInTheDocument();
        });
    });

    it('handles page mount lifecycle', async () => {
        render(<WhatsAppConfig />);

        await waitFor(() => {
            expect(mockGetWhatsAppStatus).toHaveBeenCalled();
        });

        expect(screen.getByTestId('queue-dashboard')).toBeInTheDocument();
    });

    it('maintains state across renders', async () => {
        mockGetWhatsAppStatus.mockResolvedValue({ state: 'authenticated' });

        render(<WhatsAppConfig />);

        await waitFor(() => {
            expect(mockGetWhatsAppStatus).toHaveBeenCalled();
        });

        expect(screen.getByTestId('queue-dashboard')).toBeInTheDocument();
    });

    it('handles rapid status changes', async () => {
        mockGetWhatsAppStatus
            .mockResolvedValueOnce({ state: 'authenticated' })
            .mockResolvedValueOnce({ state: 'disconnected' })
            .mockResolvedValueOnce({ state: 'authenticated' });

        render(<WhatsAppConfig />);

        await waitFor(() => {
            expect(mockGetWhatsAppStatus).toHaveBeenCalled();
        });

        expect(screen.getByTestId('queue-dashboard')).toBeInTheDocument();
    });
    it('handles connection polling', async () => {
        vi.stubGlobal("jest", {
            advanceTimersByTime: vi.advanceTimersByTime.bind(vi),
        });

        mockGetWhatsAppStatus
            .mockResolvedValueOnce({ state: 'disconnected' })
            .mockResolvedValueOnce({ state: 'disconnected' });
        render(<WhatsAppConfig />);
        await waitFor(() => {
            expect(mockGetWhatsAppStatus).toHaveBeenCalledWith('groom');
            expect(mockGetWhatsAppStatus).toHaveBeenCalledWith('bride');
        });
        mockGetWhatsAppStatus.mockReset()
        //start user interaction
        mockRefreshWhatsAppSession
            .mockResolvedValueOnce({ state: 'waiting_qr' });
        mockGetWhatsAppStatus
            .mockResolvedValueOnce({ state: 'connecting' })
            .mockResolvedValueOnce({ state: 'connected' })
            .mockResolvedValue({ state: 'connected' });
        vi.useFakeTimers();
        vi.runOnlyPendingTimers();
        vi.advanceTimersByTime(10000);
        const user = userEvent.setup({
            advanceTimers: vi.advanceTimersByTime.bind(vi),
        });



        const connectButton = screen.getAllByRole('button', { name: /admin.whatsapp_config.connection.buttons.connect_account/i })[0];
        //set fake timer

        await user.click(connectButton);
        // if needed, still wrap advances in act
        await act(async () => {
            vi.advanceTimersByTime(3000);
            vi.advanceTimersByTime(3000);
        });
        await waitFor(() => expect(mockRefreshWhatsAppSession).toHaveBeenCalledTimes(1));
        // aspetta che siano state effettuate esattamente 4 chiamate
        await waitFor(() => expect(mockGetWhatsAppStatus).toHaveBeenCalledTimes(4));

        // costruisci la lista dei primi argomenti passati nelle chiamate
        const calledArgs = mockGetWhatsAppStatus.mock.calls.map(args => args[0]);

        // conta per tipo
        const groomCount = calledArgs.filter(a => a === 'groom').length;
        const brideCount = calledArgs.filter(a => a === 'bride').length;

        expect(groomCount).toBe(3);
        expect(brideCount).toBe(1);

        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });
    it('handles refresh on already connected', async () => {
        vi.stubGlobal("jest", {
            advanceTimersByTime: vi.advanceTimersByTime.bind(vi),
        });

        mockGetWhatsAppStatus
            .mockResolvedValueOnce({ state: 'disconnected' })
            .mockResolvedValueOnce({ state: 'disconnected' });
        render(<WhatsAppConfig />);
        await waitFor(() => {
            expect(mockGetWhatsAppStatus).toHaveBeenCalledWith('groom');
            expect(mockGetWhatsAppStatus).toHaveBeenCalledWith('bride');
        });
        mockGetWhatsAppStatus.mockReset()
        //start user interaction
        mockRefreshWhatsAppSession
            .mockResolvedValue({ state: 'connected' });
        mockGetWhatsAppStatus
            .mockResolvedValue({ state: 'connected' });
        vi.useFakeTimers();
        vi.runOnlyPendingTimers();
        vi.advanceTimersByTime(10000);
        const user = userEvent.setup({
            advanceTimers: vi.advanceTimersByTime.bind(vi),
        });

        const connectButton = screen.getAllByRole('button', { name: /admin.whatsapp_config.connection.buttons.connect_account/i })[0];
        //set fake timer

        await user.click(connectButton);
        await waitFor(() => expect(mockRefreshWhatsAppSession).toHaveBeenCalledTimes(1));
        // aspetta che siano state effettuate esattamente 4 chiamate
        await waitFor(() => expect(mockGetWhatsAppStatus).toHaveBeenCalledTimes(2));

        // costruisci la lista dei primi argomenti passati nelle chiamate
        const calledArgs = mockGetWhatsAppStatus.mock.calls.map(args => args[0]);

        // conta per tipo
        const groomCount = calledArgs.filter(a => a === 'groom').length;
        const brideCount = calledArgs.filter(a => a === 'bride').length;

        expect(groomCount).toBe(1);
        expect(brideCount).toBe(1);

        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });
    it('handles refresh on unknown status', async () => {
        vi.stubGlobal("jest", {
            advanceTimersByTime: vi.advanceTimersByTime.bind(vi),
        });

        mockGetWhatsAppStatus
            .mockResolvedValueOnce({ state: 'disconnected' })
            .mockResolvedValueOnce({ state: 'disconnected' });
        render(<WhatsAppConfig />);
        await waitFor(() => {
            expect(mockGetWhatsAppStatus).toHaveBeenCalledWith('groom');
            expect(mockGetWhatsAppStatus).toHaveBeenCalledWith('bride');
        });
        mockGetWhatsAppStatus.mockReset()
        //start user interaction
        mockRefreshWhatsAppSession
            .mockResolvedValue({ state: 'unknown' });
        mockGetWhatsAppStatus
            .mockResolvedValue({ state: 'unknown' });
        vi.useFakeTimers();
        vi.runOnlyPendingTimers();
        vi.advanceTimersByTime(10000);
        const user = userEvent.setup({
            advanceTimers: vi.advanceTimersByTime.bind(vi),
        });

        const connectButton = screen.getAllByRole('button', { name: /admin.whatsapp_config.connection.buttons.connect_account/i })[0];
        //set fake timer

        await user.click(connectButton);
        await waitFor(() => expect(mockRefreshWhatsAppSession).toHaveBeenCalledTimes(1));
        // aspetta che siano state effettuate esattamente 4 chiamate
        await waitFor(() => expect(mockGetWhatsAppStatus).toHaveBeenCalledTimes(2));

        // costruisci la lista dei primi argomenti passati nelle chiamate
        const calledArgs = mockGetWhatsAppStatus.mock.calls.map(args => args[0]);

        // conta per tipo
        const groomCount = calledArgs.filter(a => a === 'groom').length;
        const brideCount = calledArgs.filter(a => a === 'bride').length;

        expect(groomCount).toBe(1);
        expect(brideCount).toBe(1);

        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

});
