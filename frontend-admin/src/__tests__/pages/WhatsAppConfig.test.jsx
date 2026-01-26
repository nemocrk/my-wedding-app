import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WhatsAppConfig from '../../pages/WhatsAppConfig';
import * as apiService from '../../services/api';

// --- MOCKS ---
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

vi.mock('../../contexts/ConfirmDialogContext', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../../components/whatsapp/WhatsAppQueueDashboard', () => ({
  default: () => <div data-testid="queue-dashboard">Queue Dashboard</div>,
}));

vi.mock('../../services/api', () => ({
  api: {
    getWhatsAppStatus: vi.fn(),
    fetchWhatsAppTemplates: vi.fn(),
    refreshWhatsAppSession: vi.fn(),
    logoutWhatsAppSession: vi.fn(),
    sendWhatsAppTest: vi.fn(),
    createWhatsAppTemplate: vi.fn(),
    updateWhatsAppTemplate: vi.fn(),
    deleteWhatsAppTemplate: vi.fn(),
  },
}));

const mockGroomStatus = {
  state: 'connected',
  profile: { pushName: 'Groom', id: '123@c.us' },
  last_check: new Date().toISOString(),
};

const mockBrideStatus = {
  state: 'disconnected',
  last_check: new Date().toISOString(),
};

const mockTemplates = [
  {
    id: 1,
    name: 'Welcome Template',
    condition: 'manual',
    content: 'Hello {name}!',
    is_active: true,
  },
  {
    id: 2,
    name: 'Confirmation Template',
    condition: 'status_change',
    trigger_status: 'confirmed',
    content: 'Thanks for confirming!',
    is_active: false,
  },
];

describe('WhatsAppConfig - Basic Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiService.api.getWhatsAppStatus.mockResolvedValue(mockGroomStatus);
    apiService.api.fetchWhatsAppTemplates.mockResolvedValue({ results: mockTemplates });
  });

  // === TAB 1: CONNECTION ===
  describe('Connection Tab', () => {
    it('renders connection status cards on mount', async () => {
      apiService.api.getWhatsAppStatus
        .mockResolvedValueOnce(mockGroomStatus)
        .mockResolvedValueOnce(mockBrideStatus);

      render(<WhatsAppConfig />);

      await waitFor(() => {
        expect(screen.getByText('admin.whatsapp_config.connection.groom_account')).toBeInTheDocument();
        expect(screen.getByText('admin.whatsapp_config.connection.bride_account')).toBeInTheDocument();
      });

      // Verify connected status
      expect(screen.getByText('admin.whatsapp_config.connection.status.connected')).toBeInTheDocument();
      
      // Verify disconnected status
      expect(screen.getByText('admin.whatsapp_config.connection.status.disconnected')).toBeInTheDocument();
    });

    it('displays profile info for connected account', async () => {
      apiService.api.getWhatsAppStatus.mockResolvedValue(mockGroomStatus);

      render(<WhatsAppConfig />);

      await waitFor(() => {
        expect(screen.getByText('Groom')).toBeInTheDocument();
        expect(screen.getByText('123')).toBeInTheDocument();
      });
    });

    it('handles refresh/connect action', async () => {
      apiService.api.getWhatsAppStatus.mockResolvedValue(mockBrideStatus);
      apiService.api.refreshWhatsAppSession.mockResolvedValue({
        state: 'waiting_qr',
        qr_code: 'data:image/png;base64,FAKE_QR',
      });

      render(<WhatsAppConfig />);

      await waitFor(() => {
        expect(screen.getByText('admin.whatsapp_config.connection.bride_account')).toBeInTheDocument();
      });

      // Click connect button for bride
      const connectBtns = screen.getAllByText('admin.whatsapp_config.connection.buttons.connect_account');
      fireEvent.click(connectBtns[1]); // Second is bride (assuming groom is first)

      await waitFor(() => {
        expect(apiService.api.refreshWhatsAppSession).toHaveBeenCalledWith('bride');
      });
    });

    it('handles test message action', async () => {
      apiService.api.getWhatsAppStatus.mockResolvedValue(mockGroomStatus);
      apiService.api.sendWhatsAppTest.mockResolvedValue({ recipient: '123456789' });

      render(<WhatsAppConfig />);

      await waitFor(() => {
        expect(screen.getByText('Groom')).toBeInTheDocument();
      });

      // Click send test button
      const testBtn = screen.getByText('admin.whatsapp_config.connection.buttons.send_test');
      fireEvent.click(testBtn);

      await waitFor(() => {
        expect(apiService.api.sendWhatsAppTest).toHaveBeenCalledWith('groom');
      });
    });

    it('handles logout action with confirmation', async () => {
      apiService.api.getWhatsAppStatus.mockResolvedValue(mockGroomStatus);
      apiService.api.logoutWhatsAppSession.mockResolvedValue({});

      render(<WhatsAppConfig />);

      await waitFor(() => {
        expect(screen.getByText('Groom')).toBeInTheDocument();
      });

      // Find and click logout button (icon-only button)
      const logoutBtns = screen.getAllByRole('button');
      const logoutBtn = logoutBtns.find(btn => btn.querySelector('svg[class*="lucide-log-out"]'));
      
      fireEvent.click(logoutBtn);

      await waitFor(() => {
        expect(apiService.api.logoutWhatsAppSession).toHaveBeenCalledWith('groom');
      });
    });
  });

  // === TAB 2: TEMPLATES ===
  describe('Templates Tab', () => {
    it('switches to templates tab and fetches data', async () => {
      render(<WhatsAppConfig />);

      const templatesTab = screen.getByText('admin.whatsapp_config.tabs.templates');
      fireEvent.click(templatesTab);

      await waitFor(() => {
        expect(apiService.api.fetchWhatsAppTemplates).toHaveBeenCalled();
      });

      expect(screen.getByText('admin.whatsapp_config.templates.title')).toBeInTheDocument();
    });

    it('renders template list', async () => {
      render(<WhatsAppConfig />);

      fireEvent.click(screen.getByText('admin.whatsapp_config.tabs.templates'));

      await waitFor(() => {
        expect(screen.getByText('Welcome Template')).toBeInTheDocument();
        expect(screen.getByText('Confirmation Template')).toBeInTheDocument();
      });
    });

    it('opens create template modal', async () => {
      render(<WhatsAppConfig />);

      fireEvent.click(screen.getByText('admin.whatsapp_config.tabs.templates'));

      await waitFor(() => {
        const createBtn = screen.getByText('admin.whatsapp_config.templates.new_template');
        fireEvent.click(createBtn);
      });

      expect(screen.getByText('admin.whatsapp_config.templates.modal.title_create')).toBeInTheDocument();
    });

    it('creates new template', async () => {
      apiService.api.createWhatsAppTemplate.mockResolvedValue({ id: 3 });

      render(<WhatsAppConfig />);

      fireEvent.click(screen.getByText('admin.whatsapp_config.tabs.templates'));

      await waitFor(() => {
        fireEvent.click(screen.getByText('admin.whatsapp_config.templates.new_template'));
      });

      // Fill form
      const nameInput = screen.getByPlaceholderText('admin.whatsapp_config.templates.modal.fields.name_placeholder');
      fireEvent.change(nameInput, { target: { value: 'New Template' } });

      const contentInput = screen.getByPlaceholderText('admin.whatsapp_config.templates.modal.fields.content_placeholder');
      fireEvent.change(contentInput, { target: { value: 'Content here' } });

      // Submit
      const saveBtn = screen.getByText('admin.whatsapp_config.templates.modal.buttons.save');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(apiService.api.createWhatsAppTemplate).toHaveBeenCalledWith({
          name: 'New Template',
          condition: 'manual',
          trigger_status: '',
          content: 'Content here',
          is_active: true,
        });
      });
    });

    it('inserts placeholder into template content', async () => {
      render(<WhatsAppConfig />);

      fireEvent.click(screen.getByText('admin.whatsapp_config.tabs.templates'));

      await waitFor(() => {
        fireEvent.click(screen.getByText('admin.whatsapp_config.templates.new_template'));
      });

      // Click placeholder button
      const namePlaceholderBtn = screen.getByText('admin.whatsapp_config.templates.modal.placeholders.name');
      fireEvent.click(namePlaceholderBtn);

      const contentInput = screen.getByPlaceholderText('admin.whatsapp_config.templates.modal.fields.content_placeholder');
      expect(contentInput.value).toBe('{name}');
    });

    it('opens edit template modal with pre-filled data', async () => {
      render(<WhatsAppConfig />);

      fireEvent.click(screen.getByText('admin.whatsapp_config.tabs.templates'));

      await waitFor(() => {
        expect(screen.getByText('Welcome Template')).toBeInTheDocument();
      });

      // Find edit button for first template
      const templateCards = screen.getAllByRole('button', { name: '' });
      const editBtn = templateCards.find(btn => btn.querySelector('svg[class*="lucide-edit"]'));
      
      fireEvent.click(editBtn);

      await waitFor(() => {
        expect(screen.getByText('admin.whatsapp_config.templates.modal.title_edit')).toBeInTheDocument();
        const nameInput = screen.getByDisplayValue('Welcome Template');
        expect(nameInput).toBeInTheDocument();
      });
    });

    it('deletes template with confirmation', async () => {
      apiService.api.deleteWhatsAppTemplate.mockResolvedValue({});

      render(<WhatsAppConfig />);

      fireEvent.click(screen.getByText('admin.whatsapp_config.tabs.templates'));

      await waitFor(() => {
        expect(screen.getByText('Welcome Template')).toBeInTheDocument();
      });

      // Find delete button
      const templateCards = screen.getAllByRole('button', { name: '' });
      const deleteBtn = templateCards.find(btn => btn.querySelector('svg[class*="lucide-trash"]'));
      
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(apiService.api.deleteWhatsAppTemplate).toHaveBeenCalledWith(1);
      });
    });
  });

  // === EDGE CASES ===
  describe('Edge Cases', () => {
    it('handles API error on status fetch', async () => {
      apiService.api.getWhatsAppStatus.mockRejectedValue(new Error('Network error'));

      render(<WhatsAppConfig />);

      await waitFor(() => {
        // Should show error state
        expect(screen.getByText('admin.whatsapp_config.connection.status.error')).toBeInTheDocument();
      });
    });

    it('shows empty state for templates', async () => {
      apiService.api.fetchWhatsAppTemplates.mockResolvedValue({ results: [] });

      render(<WhatsAppConfig />);

      fireEvent.click(screen.getByText('admin.whatsapp_config.tabs.templates'));

      await waitFor(() => {
        expect(screen.getByText('admin.whatsapp_config.templates.no_templates')).toBeInTheDocument();
      });
    });

    it('handles template creation with status_change condition', async () => {
      render(<WhatsAppConfig />);

      fireEvent.click(screen.getByText('admin.whatsapp_config.tabs.templates'));

      await waitFor(() => {
        fireEvent.click(screen.getByText('admin.whatsapp_config.templates.new_template'));
      });

      // Change to status_change
      const typeSelect = screen.getByDisplayValue('admin.whatsapp_config.templates.modal.fields.type_manual');
      fireEvent.change(typeSelect, { target: { value: 'status_change' } });

      // Trigger status field should appear
      await waitFor(() => {
        expect(screen.getByText('admin.whatsapp_config.templates.modal.fields.trigger_status')).toBeInTheDocument();
      });
    });
  });
});
