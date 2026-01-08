import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WhatsAppQueueDashboard from '../../components/whatsapp/WhatsAppQueueDashboard';

// Mock del service
jest.mock('../../services/whatsappService', () => ({
  whatsappService: {
    getQueue: jest.fn(),
    retryFailed: jest.fn(),
    forceSend: jest.fn(),
  },
}));

// Mock hook SSE
jest.mock('../../hooks/useWhatsAppSSE', () => ({
  useWhatsAppSSE: () => ({
    realtimeStatus: {},
    connectionStatus: 'connected',
  }),
}));

import { whatsappService } from '../../services/whatsappService';

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
  jest.clearAllMocks();
});

test('renders queue and shows one row', async () => {
  render(<WhatsAppQueueDashboard />);

  await waitFor(() => expect(whatsappService.getQueue).toHaveBeenCalled());
  expect(screen.getByText('39333111222')).toBeInTheDocument();
});

test('clicking retry calls retryFailed and refreshes', async () => {
  render(<WhatsAppQueueDashboard />);

  await waitFor(() => expect(whatsappService.getQueue).toHaveBeenCalled());

  fireEvent.click(screen.getByText('Riprova Falliti'));

  await waitFor(() => expect(whatsappService.retryFailed).toHaveBeenCalled());
  await waitFor(() => expect(whatsappService.getQueue).toHaveBeenCalledTimes(2));
});

test('clicking Send Now calls forceSend', async () => {
  render(<WhatsAppQueueDashboard />);

  await waitFor(() => expect(whatsappService.getQueue).toHaveBeenCalled());

  fireEvent.click(screen.getByText('Send Now'));

  await waitFor(() => expect(whatsappService.forceSend).toHaveBeenCalledWith(1));
});

test('shows empty state when no messages', async () => {
  whatsappService.getQueue.mockResolvedValueOnce({ results: [] });
  
  render(<WhatsAppQueueDashboard />);

  await waitFor(() => expect(screen.getByText('Nessun messaggio in coda.')).toBeInTheDocument());
});
