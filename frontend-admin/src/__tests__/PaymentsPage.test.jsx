// frontend-admin/src/__tests__/PaymentsPage.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialogProvider } from '../contexts/ConfirmDialogContext';
import { ToastProvider } from '../contexts/ToastContext';
import PaymentsPage from '../pages/PaymentsPage';
import paymentService from '../services/paymentService';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'it' },
  }),
}));

vi.mock('../services/paymentService', () => ({
  default: {
    getPayables:     vi.fn(),
    getSummary:      vi.fn(),
    deleteEvent:     vi.fn(),
    createEvent:     vi.fn(),
    updateEvent:     vi.fn(),
    getPlatforms:    vi.fn(),
    createPlatform:  vi.fn(),
  },
}));

vi.mock('../components/payments/PaymentKPIBar', () => ({
  default: ({ refreshKey }) => (
    <div data-testid="kpi-bar" data-refresh-key={refreshKey} />
  ),
}));

vi.mock('../components/payments/PayableRow', () => ({
  default: ({ payable, onAddEvent, onEditEvent, onDeleteEvent }) => (
    <div data-testid={`payable-row-${payable.object_id}`}>
      <span>{payable.entity_name}</span>
      <button onClick={() => onAddEvent(payable)}>add</button>
      <button onClick={() => onEditEvent(payable, { id: 99, label: 'ev' })}>edit</button>
      <button onClick={() => onDeleteEvent({ id: 99 })}>delete</button>
    </div>
  ),
}));

vi.mock('../components/payments/PaymentEventModal', () => ({
  default: ({ isOpen, onClose, onSaved, payable, eventToEdit }) =>
    isOpen ? (
      <div data-testid="payment-modal">
        <span data-testid="modal-payable">{payable?.entity_name}</span>
        <span data-testid="modal-event">{eventToEdit?.label ?? 'new'}</span>
        <button onClick={onClose}>close</button>
        <button onClick={onSaved}>saved</button>
      </div>
    ) : null,
}));

// ── Provider wrapper ──────────────────────────────────────────────────────────

const AllTheProviders = ({ children }) => (
  <ToastProvider>
    <ConfirmDialogProvider>
      {children}
    </ConfirmDialogProvider>
  </ToastProvider>
);

const renderPage = () =>
  render(
    <AllTheProviders>
      <PaymentsPage />
    </AllTheProviders>
  );

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PAYABLES = [
  {
    entity_type:      'supplier',
    entity_id:        3,
    entity_name:      'Altro DJ',
    content_type_id:  20,
    object_id:        3,
    contract_amount:  '13000.00',
    currency:         'EUR',
    total_paid:       '0.00',
    total_planned:    '0.00',
    total_remaining:  '13000.00',
    events:           [],
  },
  {
    entity_type:      'room',
    entity_id:        173,
    entity_name:      'ht - Camera 101',
    content_type_id:  15,
    object_id:        173,
    contract_amount:  '500.00',
    currency:         'EUR',
    total_paid:       '0.00',
    total_planned:    '0.00',
    total_remaining:  '500.00',
    events:           [],
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PaymentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paymentService.getPayables.mockResolvedValue(PAYABLES);
    paymentService.getSummary.mockResolvedValue({});
    paymentService.deleteEvent.mockResolvedValue({});
  });

  // ── Loading state ──────────────────────────────────────────────────────────
  it('shows skeleton loaders while fetching', () => {
    paymentService.getPayables.mockReturnValue(new Promise(() => {}));
    renderPage();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  // ── Empty states ───────────────────────────────────────────────────────────
  it('shows empty state when no payables are returned', async () => {
    paymentService.getPayables.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('admin.payments.payables.empty')).toBeInTheDocument();
    });
  });

  it('shows empty state when API returns empty results object', async () => {
    paymentService.getPayables.mockResolvedValue({ results: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('admin.payments.payables.empty')).toBeInTheDocument();
    });
  });

  it('shows empty state on API error', async () => {
    paymentService.getPayables.mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('admin.payments.payables.empty')).toBeInTheDocument();
    });
  });

  // ── Payables list ──────────────────────────────────────────────────────────
  it('renders a PayableRow for each payable', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('payable-row-3')).toBeInTheDocument();
      expect(screen.getByTestId('payable-row-173')).toBeInTheDocument();
    });
    expect(screen.getByText('Altro DJ')).toBeInTheDocument();
    expect(screen.getByText('ht - Camera 101')).toBeInTheDocument();
  });

  it('supports results-wrapped API response', async () => {
    paymentService.getPayables.mockResolvedValue({ results: PAYABLES });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('payable-row-3')).toBeInTheDocument();
    });
  });

  // ── KPI bar ────────────────────────────────────────────────────────────────
  it('renders the KPIBar with initial refreshKey=0', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('kpi-bar')).toBeInTheDocument();
    });
    expect(screen.getByTestId('kpi-bar')).toHaveAttribute('data-refresh-key', '0');
  });

  // ── Refresh ────────────────────────────────────────────────────────────────
  it('increments refreshKey and re-fetches on refresh button click', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('payable-row-3'));

    const refreshBtn = screen.getByRole('button', { name: /common.refresh/i });
    await userEvent.click(refreshBtn);

    await waitFor(() => {
      expect(paymentService.getPayables).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByTestId('kpi-bar')).toHaveAttribute('data-refresh-key', '1');
  });

  // ── Add event modal ────────────────────────────────────────────────────────
  it('opens modal in create mode when add button is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('payable-row-3'));

    const addButtons = screen.getAllByRole('button', { name: 'add' });
    await userEvent.click(addButtons[0]);

    expect(screen.getByTestId('payment-modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-payable')).toHaveTextContent('Altro DJ');
    expect(screen.getByTestId('modal-event')).toHaveTextContent('new');
  });

  // ── Edit event modal ───────────────────────────────────────────────────────
  it('opens modal in edit mode when edit button is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('payable-row-3'));

    const editButtons = screen.getAllByRole('button', { name: 'edit' });
    await userEvent.click(editButtons[0]);

    expect(screen.getByTestId('payment-modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-event')).toHaveTextContent('ev');
  });

  // ── Modal close ────────────────────────────────────────────────────────────
  it('closes modal when onClose is called', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('payable-row-3'));

    await userEvent.click(screen.getAllByRole('button', { name: 'add' })[0]);
    expect(screen.getByTestId('payment-modal')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByTestId('payment-modal')).not.toBeInTheDocument();
  });

  // ── Modal saved ────────────────────────────────────────────────────────────
  it('closes modal and re-fetches when onSaved is called', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('payable-row-3'));

    await userEvent.click(screen.getAllByRole('button', { name: 'add' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'saved' }));

    expect(screen.queryByTestId('payment-modal')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(paymentService.getPayables).toHaveBeenCalledTimes(2);
    });
  });

  // ── Delete event ───────────────────────────────────────────────────────────
  it('calls deleteEvent and refreshes when delete is confirmed', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('payable-row-3'));

    await userEvent.click(screen.getAllByRole('button', { name: 'delete' })[0]);

    // Il vero ConfirmDialogProvider mostra il dialog — confermiamo
    await waitFor(() =>
      expect(screen.getByText('common.confirm_delete')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: 'common.delete' }));

    await waitFor(() => {
      expect(paymentService.deleteEvent).toHaveBeenCalledWith(99);
      expect(paymentService.getPayables).toHaveBeenCalledTimes(2);
    });
  });

  it('does NOT call deleteEvent when confirm is cancelled', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('payable-row-3'));

    await userEvent.click(screen.getAllByRole('button', { name: 'delete' })[0]);

    await waitFor(() =>
      expect(screen.getByText('common.confirm_delete')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));

    await waitFor(() => {
      expect(paymentService.deleteEvent).not.toHaveBeenCalled();
      expect(paymentService.getPayables).toHaveBeenCalledTimes(1);
    });
  });

  it('handles deleteEvent error gracefully without crashing', async () => {
    paymentService.deleteEvent.mockRejectedValue(new Error('Delete failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderPage();
    await waitFor(() => screen.getByTestId('payable-row-3'));

    await userEvent.click(screen.getAllByRole('button', { name: 'delete' })[0]);

    await waitFor(() =>
      expect(screen.getByText('common.confirm_delete')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: 'common.delete' }));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Delete event error:',
        expect.any(Error)
      );
    });
    // La pagina rimane montata
    expect(screen.getByText('admin.payments.page_title')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  // ── Page header ────────────────────────────────────────────────────────────
  it('renders page title and subtitle', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('admin.payments.page_title')).toBeInTheDocument();
      expect(screen.getByText('admin.payments.page_subtitle')).toBeInTheDocument();
    });
  });
});
