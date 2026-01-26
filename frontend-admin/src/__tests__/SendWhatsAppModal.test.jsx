import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
    vi.useFakeTimers();
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

    // Check header
    expect(screen.getByText(/admin.whatsapp.send_modal.title/)).toBeInTheDocument();
    
    // Check recipients list
    expect(screen.getByText(/Mario Rossi, Luigi Verdi/)).toBeInTheDocument();

    // Check template loading
    await waitFor(() => {
      expect(apiModule.api.fetchWhatsAppTemplates).toHaveBeenCalled();
    });

    // Check filtered templates in select (only active manual ones)
    const options = screen.getAllByRole('option');
    // Option 0 is placeholder, + Template 1 + Template Link = 3 options total
    expect(options).toHaveLength(3); 
    expect(screen.getByText('Template 1')).toBeInTheDocument();
    expect(screen.getByText('Template Link')).toBeInTheDocument();
    expect(screen.queryByText('Auto Template')).not.toBeInTheDocument();
  });

  it('handles template selection for multiple recipients (no immediate replacement)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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

    // Textarea should contain raw template content with placeholders
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('Ciao {name}, ecco il tuo codice: {code}');
  });

  it('handles template selection for SINGLE recipient (smart preview)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const singleRecipient = [mockRecipients[0]];
    
    render(
      <SendWhatsAppModal 
        isOpen={true} 
        recipients={singleRecipient} 
        onClose={onCloseMock} 
        onSuccess={onSuccessMock} 
      />
    );

    await waitFor(() => expect(screen.getByText('Template 1')).toBeInTheDocument());

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '1');

    // Textarea should contain REPLACED content
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('Ciao Mario Rossi, ecco il tuo codice: MARIO123');
  });

  it('sends messages to multiple recipients successfully', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <SendWhatsAppModal 
        isOpen={true} 
        recipients={mockRecipients} 
        onClose={onCloseMock} 
        onSuccess={onSuccessMock} 
      />
    );

    await waitFor(() => expect(screen.getByText('Template 1')).toBeInTheDocument());
    
    // Select template
    await user.selectOptions(screen.getByRole('combobox'), '1');
    
    // Click Send
    const sendBtn = screen.getByText('admin.whatsapp.send_modal.enqueue_button');
    await user.click(sendBtn);

    // Should show loader
    expect(screen.getByTestId('icon-loader')).toBeInTheDocument();

    // Verify API calls
    await waitFor(() => {
      // Should call enqueue for each recipient
      expect(apiModule.api.enqueueWhatsAppMessage).toHaveBeenCalledTimes(2);
    });

    // Check first call (Mario - groom)
    expect(apiModule.api.enqueueWhatsAppMessage).toHaveBeenNthCalledWith(1, {
      session_type: 'groom',
      recipient_number: '333111222',
      message_body: 'Ciao Mario Rossi, ecco il tuo codice: MARIO123'
    });

    // Check second call (Luigi - bride)
    expect(apiModule.api.enqueueWhatsAppMessage).toHaveBeenNthCalledWith(2, {
      session_type: 'bride',
      recipient_number: '333444555',
      message_body: 'Ciao Luigi Verdi, ecco il tuo codice: LUIGI456'
    });

    // Wait for success callback (timeout 1500ms in component)
    vi.advanceTimersByTime(2000);
    
    await waitFor(() => {
      expect(onSuccessMock).toHaveBeenCalled();
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it('generates links when {link} placeholder is present', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <SendWhatsAppModal 
        isOpen={true} 
        recipients={[mockRecipients[0]]} 
        onClose={onCloseMock} 
        onSuccess={onSuccessMock} 
      />
    );

    await waitFor(() => expect(screen.getByText('Template Link')).toBeInTheDocument());
    
    // Select template with {link}
    await user.selectOptions(screen.getByRole('combobox'), '2');
    
    // For single recipient, it previews as [LINK_INVITO] without generating yet
    expect(screen.getByRole('textbox')).toHaveValue('Ciao Mario Rossi, link: [LINK_INVITO]');

    // Click Send
    await user.click(screen.getByText('admin.whatsapp.send_modal.enqueue_button'));

    // Verify link generation was called during send process
    await waitFor(() => {
      expect(apiModule.api.generateInvitationLink).toHaveBeenCalledWith(mockRecipients[0].id);
      expect(apiModule.api.enqueueWhatsAppMessage).toHaveBeenCalledWith(expect.objectContaining({
        message_body: 'Ciao Mario Rossi, link: http://test.com/invitation'
      }));
    });
  });

  it('handles API errors gracefully during send loop', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    
    // Make first call fail, second succeed
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

    // Check UI progress counters
    // Success: 1, Failed: 1
    expect(screen.getByText('admin.whatsapp.send_modal.sent_count{"count":1}')).toBeInTheDocument();
    expect(screen.getByText('admin.whatsapp.send_modal.failed_count{"count":1}')).toBeInTheDocument();

    // Should still close after timeout
    vi.advanceTimersByTime(2000);
    await waitFor(() => {
      expect(onSuccessMock).toHaveBeenCalled();
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it('shows warning when using {link} with many recipients', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const manyRecipients = Array(6).fill(mockRecipients[0]); // 6 recipients

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

    // Should show warning because length > 5 and message contains {link}
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

    // Should NOT crash, select should be empty
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1); // Only default placeholder
    
    consoleSpy.mockRestore();
  });
});
