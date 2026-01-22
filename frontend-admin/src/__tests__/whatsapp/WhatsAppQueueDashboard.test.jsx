import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WhatsAppQueueDashboard from '../../components/whatsapp/WhatsAppQueueDashboard';
import { whatsappService } from '../../services/whatsappService';
import { fireEvent, render, screen, waitFor } from '../../test-utils';

// Mock del service
vi.mock('../../services/whatsappService', () => ({
  whatsappService: {
    getQueue: vi.fn(),
    retryFailed: vi.fn(),
    forceSend: vi.fn(),
  },
}));

// Mock hook SSE
vi.mock('../../hooks/useWhatsAppSSE', () => ({
  useWhatsAppSSE: () => ({
    realtimeStatus: {},
    connectionStatus: 'connected',
  }),
}));

describe('WhatsAppQueueDashboard', () => {
  beforeEach(() => {
    whatsappService.getQueue.mockResolvedValue({
      results: [
        {
          id: 1,
          recipient_number: '39333111222',
          session_type: 'groom',
          status: 'pending',
          scheduled_for: '2026-01-06T12:00:00Z',
          attempts: 0,
          error_log: null,
        },
      ],
    });
    whatsappService.retryFailed.mockResolvedValue({ count: 1 });
    whatsappService.forceSend.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders queue and shows one row', async () => {
    render(<WhatsAppQueueDashboard />);

    await waitFor(() => expect(whatsappService.getQueue).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(/Caricamento coda.../i)).not.toBeInTheDocument());
    expect(screen.getAllByText('39333111222').length).toBeGreaterThanOrEqual(1);;
  });

  it('clicking retry calls retryFailed and refreshes', async () => {
    render(<WhatsAppQueueDashboard />);

    await waitFor(() => expect(whatsappService.getQueue).toHaveBeenCalled());

    // Verifica che il bottone esista prima di cliccare
    const retryButton = screen.getByText('Riprova Falliti');
    fireEvent.click(retryButton);

    await waitFor(() => expect(whatsappService.retryFailed).toHaveBeenCalled());
    await waitFor(() => expect(whatsappService.getQueue).toHaveBeenCalledTimes(2));
  });

  it('clicking Send Now calls forceSend', async () => {
    render(<WhatsAppQueueDashboard />);

    await waitFor(() => expect(whatsappService.getQueue).toHaveBeenCalled());

    const sendButton = screen.getAllByTitle("Send Now")[0];
    fireEvent.click(sendButton);

    await waitFor(() => expect(whatsappService.forceSend).toHaveBeenCalledWith(1));
  });

  it('shows empty state when no messages', async () => {
    whatsappService.getQueue.mockResolvedValueOnce({ results: [] });

    render(<WhatsAppQueueDashboard />);

    await waitFor(() => expect(screen.getByText('Nessun messaggio in coda.')).toBeInTheDocument());
  });
});
