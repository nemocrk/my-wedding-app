import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import SendWhatsAppModal from '../components/whatsapp/SendWhatsAppModal';
import * as apiModule from '../services/api';

// --- MOCKS ---
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, params) => key + (params ? JSON.stringify(params) : '') }),
}));

// Mock Lucide icons to avoid rendering issues
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x">X</span>,
  Send: () => <span data-testid="icon-send">Send</span>,
  AlertTriangle: () => <span data-testid="icon-alert">Alert</span>,
  Loader: () => <span data-testid="icon-loader">Loader</span>,
  Smartphone: () => <span data-testid="icon-smartphone">Phone</span>,
}));

const mockRecipients = [
  { id: 1, name: 'Mario Rossi', code: 'MARIO123', phone_number: '333111222', origin: 'groom' },
  { id: 2, name: 'Luigi Verdi', code: 'LUIGI456', phone_number: '333444555', origin: 'bride' },
];

const mockTemplates = [
  { id: 1, name: 'Template 1', content: 'Ciao {name}, ecco il tuo codice: {code}', condition: 'manual', is_active: true },
  { id: 2, name: 'Template Link', content: 'Ciao {name}, link: {link}', condition: 'manual', is_active: true },
  { id: 3, name: 'Auto Template', content: 'Auto msg', condition: 'auto', is_active: true }, // Should be filtered out
  { id: 4, name: 'Inactive Template', content: 'Inactive', condition: 'manual', is_active: false }, // Should be filtered out
];

describe('SendWhatsAppModal', () => {
  let onCloseMock;
  let onSuccessMock;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    onCloseMock = vi.fn();
    onSuccessMock = vi.fn();

    // API Mocks
    vi.spyOn(apiModule.api, 'fetchWhatsAppTemplates').mockResolvedValue(mockTemplates);
    vi.spyOn(apiModule.api, 'generateInvitationLink').mockResolvedValue({ url: 'http://test.com/invitation' });
    vi.spyOn(apiModule.api, 'enqueueWhatsAppMessage').mockResolvedValue({ status: 'queued' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when isOpen is false', () => {
    render(<SendWhatsAppModal isOpen={false} recipients={[]} onClose={onCloseMock} onSuccess={onSuccessMock} />);
    expect(screen.queryByText(/admin.whatsapp.send_modal.title/)).not.toBeInTheDocument();
  });

  it('renders correctly when open and loads templates', async () => {
    render(
      <SendWhatsAppModal
        isOpen={true}
        recipients={mockRecipients}
        onClose={onCloseMock}
        onSuccess={onSuccessMock}
      />
    );

    expect(screen.getByText(/admin.whatsapp.send_modal.title/)).toBeInTheDocument();
    expect(screen.getByText(/Mario Rossi, Luigi Verdi/)).toBeInTheDocument();

    await waitFor(() => {
      expect(apiModule.api.fetchWhatsAppTemplates).toHaveBeenCalled();
    });

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(screen.getByText('Template 1')).toBeInTheDocument();
    expect(screen.getByText('Template Link')).toBeInTheDocument();
  });

  it('handles template selection for multiple recipients', async () => {
    const user = userEvent.setup();
    render(
      <SendWhatsAppModal
        isOpen={true}
        recipients={mockRecipients}
        onClose={onCloseMock}
        onSuccess={onSuccessMock}
      />
    );

    await waitFor(() => expect(screen.getByText('Template 1')).toBeInTheDocument());

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '1');

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('Ciao {name}, ecco il tuo codice: {code}');
  });

  it('handles template selection for SINGLE recipient', async () => {
    const user = userEvent.setup();
    render(
      <SendWhatsAppModal
        isOpen={true}
        recipients={[mockRecipients[0]]}
        onClose={onCloseMock}
        onSuccess={onSuccessMock}
      />
    );

    await waitFor(() => expect(screen.getByText('Template 1')).toBeInTheDocument());

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '1');

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('Ciao Mario Rossi, ecco il tuo codice: MARIO123');
  });

  it('sends messages to multiple recipients successfully', async () => {
    // Setup userEvent with advanceTimers to control async flow
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.useFakeTimers();

    render(
      <SendWhatsAppModal
        isOpen={true}
        recipients={mockRecipients}
        onClose={onCloseMock}
        onSuccess={onSuccessMock}
      />
    );

    // Initial wait for templates (need to advance timers if loading is async/debounced, but here it's just promise resolution)
    // We can use waitFor to let the promise resolve in the fake timer environment
    await waitFor(() => expect(screen.getByText('Template 1')).toBeInTheDocument());

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '1');

    const sendBtn = screen.getByText('admin.whatsapp.send_modal.enqueue_button');
    await user.click(sendBtn);

    // Now we need to let the component re-render to show state 'sending'
    // The state update happens immediately after click handler, but React batching might delay it
    await waitFor(() => {
        expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
    });

    // Check API calls - promises should resolve now
    // Since we are inside fake timers, we might need to tick if there are internal delays
    // but the API calls are mocked promises that resolve immediately on next tick.
    await waitFor(() => {
      expect(apiModule.api.enqueueWhatsAppMessage).toHaveBeenCalledTimes(2);
    });

    expect(apiModule.api.enqueueWhatsAppMessage).toHaveBeenNthCalledWith(1, expect.objectContaining({
      recipient_number: '333111222'
    }));

    expect(apiModule.api.enqueueWhatsAppMessage).toHaveBeenNthCalledWith(2, expect.objectContaining({
      recipient_number: '333444555'
    }));

    // Advance time for the setTimeout(..., 1500)
    act(() => {
        vi.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(onSuccessMock).toHaveBeenCalled();
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it('generates links when {link} placeholder is present', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.useFakeTimers();

    render(
      <SendWhatsAppModal
        isOpen={true}
        recipients={[mockRecipients[0]]}
        onClose={onCloseMock}
        onSuccess={onSuccessMock}
      />
    );

    await waitFor(() => expect(screen.getByText('Template Link')).toBeInTheDocument());

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '2');

    expect(screen.getByRole('textbox')).toHaveValue('Ciao Mario Rossi, link: [LINK_INVITO]');

    const sendBtn = screen.getByText('admin.whatsapp.send_modal.enqueue_button');
    await user.click(sendBtn);

    // Wait for async generation
    await waitFor(() => {
      expect(apiModule.api.generateInvitationLink).toHaveBeenCalledWith(mockRecipients[0].id);
    });

    await waitFor(() => {
       expect(apiModule.api.enqueueWhatsAppMessage).toHaveBeenCalledWith(expect.objectContaining({
        message_body: 'Ciao Mario Rossi, link: http://test.com/invitation'
      }));
    });
  });

  it('handles API errors gracefully during send loop', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.useFakeTimers();

    apiModule.api.enqueueWhatsAppMessage
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce({ status: 'queued' });

    render(
      <SendWhatsAppModal
        isOpen={true}
        recipients={mockRecipients}
        onClose={onCloseMock}
        onSuccess={onSuccessMock}
      />
    );

    await waitFor(() => expect(screen.getByText('Template 1')).toBeInTheDocument());
    
    await user.selectOptions(screen.getByRole('combobox'), '1');
    await user.click(screen.getByText('admin.whatsapp.send_modal.enqueue_button'));

    await waitFor(() => {
      expect(apiModule.api.enqueueWhatsAppMessage).toHaveBeenCalledTimes(2);
    });

    // Verify UI updates for success/failure
    await waitFor(() => {
        expect(screen.getByText('admin.whatsapp.send_modal.sent_count{"count":1}')).toBeInTheDocument();
        expect(screen.getByText('admin.whatsapp.send_modal.failed_count{"count":1}')).toBeInTheDocument();
    });

    // Finish timeout
    act(() => {
        vi.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(onSuccessMock).toHaveBeenCalled();
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it('shows warning when using {link} with many recipients', async () => {
    const user = userEvent.setup();
    const manyRecipients = Array(6).fill(mockRecipients[0]);

    render(
      <SendWhatsAppModal
        isOpen={true}
        recipients={manyRecipients}
        onClose={onCloseMock}
        onSuccess={onSuccessMock}
      />
    );

    await waitFor(() => expect(screen.getByText('Template Link')).toBeInTheDocument());
    await user.selectOptions(screen.getByRole('combobox'), '2');

    expect(screen.getByText(/admin.whatsapp.send_modal.link_warning_1/)).toBeInTheDocument();
  });

  it('handles template loading error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    apiModule.api.fetchWhatsAppTemplates.mockRejectedValue(new Error('Load Failed'));

    render(
      <SendWhatsAppModal
        isOpen={true}
        recipients={mockRecipients}
        onClose={onCloseMock}
        onSuccess={onSuccessMock}
      />
    );

    await waitFor(() => {
      expect(apiModule.api.fetchWhatsAppTemplates).toHaveBeenCalled();
    });

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    
    consoleSpy.mockRestore();
  });
});
