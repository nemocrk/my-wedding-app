// frontend-admin/src/__tests__/PaymentsPage.test.jsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConfirmDialogProvider } from '../contexts/ConfirmDialogContext';
import { ToastProvider } from '../contexts/ToastContext';
import PaymentsPage from '../pages/PaymentsPage';
import paymentService from '../services/paymentService';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../services/paymentService', () => ({
  default: {
    getPayables: vi.fn(),
    deleteEvent: vi.fn(),
  },
}));

vi.mock('../components/payments/PaymentKPIBar', () => ({
  default: ({ refreshKey }) => (
    <div data-testid="kpi-bar" data-refresh-key={refreshKey}>KPIBar</div>
  ),
}));

vi.mock('../components/payments/PayableRow', () => ({
  default: ({ payable, onAddEvent, onEditEvent, onDeleteEvent }) => (
    <div data-testid={`payable-row-${payable.object_id}`}>
      <span>{payable.entity_name}</span>
      <button onClick={() => onAddEvent(payable)}>add-event</button>
      <button onClick={() => onEditEvent(payable, { id: 99, label: 'Test' })}>edit-event</button>
      <button onClick={() => onDeleteEvent({ id: 99 })}>delete-event</button>
    </div>
  ),
}));

vi.mock('../components/payments/PaymentEventModal', () => ({
  default: ({ isOpen, onClose, onSaved, payable, eventToEdit }) =>
    isOpen ? (
      <div data-testid="payment-modal">
        <span data-testid="modal-mode">{eventToEdit ? 'edit' : 'create'}</span>
        <span data-testid="modal-payable">{payable?.entity_name}</span>
        <button onClick={onClose}>modal-close</button>
        <button onClick={onSaved}>modal-saved</button>
      </div>
    ) : null,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
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

const makePayable = (id, name, entityType = 'supplier') => ({
  object_id: id,
  entity_type: entityType,
  entity_name: name,
  contract_amount: '1000.00',
  events: [],
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PaymentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paymentService.getPayables.mockResolvedValue([]);
    paymentService.deleteEvent.mockResolvedValue({});
  });

  it('renders page title and subtitle', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('admin.payments.page_title')).toBeInTheDocument();
      expect(screen.getByText('admin.payments.page_subtitle')).toBeInTheDocument();
    });
  });

  it('shows skeleton loaders while fetching', () => {
    // getPayables non risolve subito — verifichiamo lo stato loading
    paymentService.getPayables.mockReturnValue(new Promise(() => {}));
    renderPage();
    // Con loading=true vengono renderizzati 3 div animate-pulse
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

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

  it('renders a PayableRow for each payable', async () => {
    paymentService.getPayables.mockResolvedValue([
      makePayable(1, 'Fotografo'),
      makePayable(2, 'Catering'),
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('payable-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('payable-row-2')).toBeInTheDocument();
    });
  });

  it('supports results-wrapped API response', async () => {
    paymentService.getPayables.mockResolvedValue({
      results: [makePayable(5, 'Fiorista')],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('payable-row-5')).toBeInTheDocument();
    });
  });

  it('renders the KPIBar with initial refreshKey=0', async () => {
    renderPage();
    await waitFor(() => {
      const bar = screen.getByTestId('kpi-bar');
      expect(bar).toBeInTheDocument();
      expect(bar.getAttribute('data-refresh-key')).toBe('0');
    });
  });

  it('increments refreshKey and re-fetches on refresh button click', async () => {
    renderPage();
    await waitFor(() => screen.getByText('common.refresh'));

    fireEvent.click(screen.getByText('common.refresh'));

    await waitFor(() => {
      expect(paymentService.getPayables).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('kpi-bar').getAttribute('data-refresh-key')).toBe('1');
    });
  });

  it('opens modal in create mode when add button is clicked', async () => {
    paymentService.getPayables.mockResolvedValue([makePayable(1, 'Fotografo')]);
    renderPage();
    await screen.findByTestId('payable-row-1');

    fireEvent.click(screen.getByText('add-event'));

    expect(screen.getByTestId('payment-modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-mode').textContent).toBe('create');
    expect(screen.getByTestId('modal-payable').textContent).toBe('Fotografo');
  });

  it('opens modal in edit mode when edit button is clicked', async () => {
    paymentService.getPayables.mockResolvedValue([makePayable(1, 'Fotografo')]);
    renderPage();
    await screen.findByTestId('payable-row-1');

    fireEvent.click(screen.getByText('edit-event'));

    expect(screen.getByTestId('payment-modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-mode').textContent).toBe('edit');
  });

  it('closes modal when onClose is called', async () => {
    paymentService.getPayables.mockResolvedValue([makePayable(1, 'Fotografo')]);
    renderPage();
    await screen.findByTestId('payable-row-1');

    fireEvent.click(screen.getByText('add-event'));
    expect(screen.getByTestId('payment-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('modal-close'));
    expect(screen.queryByTestId('payment-modal')).not.toBeInTheDocument();
  });

  it('closes modal and re-fetches when onSaved is called', async () => {
    paymentService.getPayables.mockResolvedValue([makePayable(1, 'Fotografo')]);
    renderPage();
    await screen.findByTestId('payable-row-1');

    fireEvent.click(screen.getByText('add-event'));
    fireEvent.click(screen.getByText('modal-saved'));

    await waitFor(() => {
      expect(screen.queryByTestId('payment-modal')).not.toBeInTheDocument();
      expect(paymentService.getPayables).toHaveBeenCalledTimes(2);
    });
  });

  it('calls deleteEvent and refreshes when delete is confirmed', async () => {
    paymentService.getPayables.mockResolvedValue([makePayable(1, 'Fotografo')]);
    renderPage();
    await screen.findByTestId('payable-row-1');

    fireEvent.click(screen.getByText('delete-event'));

    // Il ConfirmDialog appare — confermiamo
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
    paymentService.getPayables.mockResolvedValue([makePayable(1, 'Fotografo')]);
    renderPage();
    await screen.findByTestId('payable-row-1');

    fireEvent.click(screen.getByText('delete-event'));

    await waitFor(() =>
      expect(screen.getByText('common.confirm_delete')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));

    await waitFor(() => {
      expect(paymentService.deleteEvent).not.toHaveBeenCalled();
    });
  });

  it('handles deleteEvent error gracefully without crashing', async () => {
    paymentService.getPayables.mockResolvedValue([makePayable(1, 'Fotografo')]);
    paymentService.deleteEvent.mockRejectedValue(new Error('Server error'));
    renderPage();
    await screen.findByTestId('payable-row-1');

    fireEvent.click(screen.getByText('delete-event'));

    await waitFor(() =>
      expect(screen.getByText('common.confirm_delete')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: 'common.delete' }));

    // Non deve crashare — la pagina rimane montata
    await waitFor(() => {
      expect(screen.getByText('admin.payments.page_title')).toBeInTheDocument();
    });
  });
});
