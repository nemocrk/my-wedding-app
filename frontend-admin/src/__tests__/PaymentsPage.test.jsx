// frontend-admin/src/__tests__/PaymentsPage.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
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
    getPayables:    vi.fn(),
    getSummary:     vi.fn(),
    deleteEvent:    vi.fn(),
    createEvent:    vi.fn(),
    updateEvent:    vi.fn(),
    getPlatforms:   vi.fn(),
    createPlatform: vi.fn(),
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
    entity_type:     'supplier',
    entity_id:       3,
    entity_name:     'Altro DJ',
    content_type_id: 20,
    object_id:       3,
    contract_amount: '13000.00',
    currency:        'EUR',
    total_paid:      '0.00',
    total_planned:   '0.00',
    total_remaining: '13000.00',
    events:          [],
  },
  {
    entity_type:     'room',
    entity_id:       173,
    entity_name:     'ht - Camera 101',
    content_type_id: 15,
    object_id:       173,
    contract_amount: '500.00',
    currency:        'EUR',
    total_paid:      '0.00',
    total_planned:   '0.00',
    total_remaining: '500.00',
    events:          [],
  },
];

/**
 * Payable con eventi per testare getPayableStatus (righe 20-28) e filtri data (166-176).
 * - partial: paid 500 su 1000
 * - paid: paid 1000 su 1000
 */
const PAYABLES_WITH_EVENTS = [
  {
    entity_type:     'supplier',
    entity_id:       1,
    entity_name:     'Fotografo',
    content_type_id: 20,
    object_id:       1,
    contract_amount: '1000.00',
    currency:        'EUR',
    total_paid:      '1000.00',
    total_planned:   '0.00',
    total_remaining: '0.00',
    events: [
      { id: 10, status: 'paid', amount: '1000.00', payment_date: '2026-06-01' },
    ],
  },
  {
    entity_type:     'supplier',
    entity_id:       2,
    entity_name:     'Catering',
    content_type_id: 20,
    object_id:       2,
    contract_amount: '2000.00',
    currency:        'EUR',
    total_paid:      '500.00',
    total_planned:   '1500.00',
    total_remaining: '1500.00',
    events: [
      { id: 11, status: 'paid',    amount: '500.00',  payment_date: '2026-05-01' },
      { id: 12, status: 'planned', amount: '1500.00', payment_date: '2026-09-01' },
    ],
  },
  {
    entity_type:     'room',
    entity_id:       5,
    entity_name:     'Camera 5',
    content_type_id: 15,
    object_id:       5,
    contract_amount: '300.00',
    currency:        'EUR',
    total_paid:      '0.00',
    total_planned:   '0.00',
    total_remaining: '300.00',
    events:          [],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Attende che la FilterBar sia visibile (appare solo dopo il loading). */
const waitForFilterBar = () =>
  waitFor(() =>
    expect(
      screen.getByRole('combobox', { name: 'admin.payments.filters.entity_type_label' })
    ).toBeInTheDocument()
  );

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
    await waitFor(() =>
      expect(screen.getByText('admin.payments.payables.empty')).toBeInTheDocument()
    );
  });

  it('shows empty state when API returns empty results object', async () => {
    paymentService.getPayables.mockResolvedValue({ results: [] });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('admin.payments.payables.empty')).toBeInTheDocument()
    );
  });

  it('shows empty state on API error', async () => {
    paymentService.getPayables.mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('admin.payments.payables.empty')).toBeInTheDocument()
    );
  });

  // ── Payables list ───────────────────────────────────────────────────────────
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
    await waitFor(() =>
      expect(screen.getByTestId('payable-row-3')).toBeInTheDocument()
    );
  });

  // ── KPI bar ────────────────────────────────────────────────────────────────
  it('renders the KPIBar with initial refreshKey=0', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('kpi-bar')).toBeInTheDocument()
    );
    expect(screen.getByTestId('kpi-bar')).toHaveAttribute('data-refresh-key', '0');
  });

  // ── Refresh ────────────────────────────────────────────────────────────────
  it('increments refreshKey and re-fetches on refresh button click', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('payable-row-3'));
    await userEvent.click(screen.getByRole('button', { name: /common.refresh/i }));
    await waitFor(() =>
      expect(paymentService.getPayables).toHaveBeenCalledTimes(2)
    );
    expect(screen.getByTestId('kpi-bar')).toHaveAttribute('data-refresh-key', '1');
  });

  // ── Add event modal ────────────────────────────────────────────────────────
  it('opens modal in create mode when add button is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('payable-row-3'));
    await userEvent.click(screen.getAllByRole('button', { name: 'add' })[0]);
    expect(screen.getByTestId('payment-modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-payable')).toHaveTextContent('Altro DJ');
    expect(screen.getByTestId('modal-event')).toHaveTextContent('new');
  });

  // ── Edit event modal ───────────────────────────────────────────────────────
  it('opens modal in edit mode when edit button is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('payable-row-3'));
    await userEvent.click(screen.getAllByRole('button', { name: 'edit' })[0]);
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
    await waitFor(() =>
      expect(paymentService.getPayables).toHaveBeenCalledTimes(2)
    );
  });

  // ── Delete event ───────────────────────────────────────────────────────────
  it('calls deleteEvent and refreshes when delete is confirmed', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('payable-row-3'));
    await userEvent.click(screen.getAllByRole('button', { name: 'delete' })[0]);
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
    await waitFor(() =>
      expect(consoleSpy).toHaveBeenCalledWith('Delete event error:', expect.any(Error))
    );
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

  // ── FilterBar — entity type (riga 59) ──────────────────────────────────────────
  it('FilterBar: filters by entity type supplier', async () => {
    renderPage();
    await waitForFilterBar();

    const entitySelect = screen.getByRole('combobox', {
      name: 'admin.payments.filters.entity_type_label',
    });
    fireEvent.change(entitySelect, { target: { value: 'supplier' } });

    await waitFor(() => {
      expect(screen.getByTestId('payable-row-3')).toBeInTheDocument();   // supplier
      expect(screen.queryByTestId('payable-row-173')).not.toBeInTheDocument(); // room esclusa
    });
  });

  it('FilterBar: filters by entity type room', async () => {
    renderPage();
    await waitForFilterBar();

    fireEvent.change(
      screen.getByRole('combobox', { name: 'admin.payments.filters.entity_type_label' }),
      { target: { value: 'room' } }
    );

    await waitFor(() => {
      expect(screen.queryByTestId('payable-row-3')).not.toBeInTheDocument();  // supplier escluso
      expect(screen.getByTestId('payable-row-173')).toBeInTheDocument();       // room inclusa
    });
  });

  // ── FilterBar — status (riga 71) — copre getPayableStatus (righe 20-28) ──────
  it('FilterBar: filters by status=unpaid shows only payables with no paid events', async () => {
    paymentService.getPayables.mockResolvedValue(PAYABLES_WITH_EVENTS);
    renderPage();
    await waitForFilterBar();

    fireEvent.change(
      screen.getByRole('combobox', { name: 'admin.payments.filters.status_label' }),
      { target: { value: 'unpaid' } }
    );

    await waitFor(() => {
      // Camera 5: events=[] → unpaid ✓
      expect(screen.getByTestId('payable-row-5')).toBeInTheDocument();
      // Fotografo: fully paid → escluso
      expect(screen.queryByTestId('payable-row-1')).not.toBeInTheDocument();
      // Catering: partial → escluso
      expect(screen.queryByTestId('payable-row-2')).not.toBeInTheDocument();
    });
  });

  it('FilterBar: filters by status=partial', async () => {
    paymentService.getPayables.mockResolvedValue(PAYABLES_WITH_EVENTS);
    renderPage();
    await waitForFilterBar();

    fireEvent.change(
      screen.getByRole('combobox', { name: 'admin.payments.filters.status_label' }),
      { target: { value: 'partial' } }
    );

    await waitFor(() => {
      expect(screen.getByTestId('payable-row-2')).toBeInTheDocument();         // Catering: partial ✓
      expect(screen.queryByTestId('payable-row-1')).not.toBeInTheDocument();   // paid → escluso
      expect(screen.queryByTestId('payable-row-5')).not.toBeInTheDocument();   // unpaid → escluso
    });
  });

  it('FilterBar: filters by status=paid', async () => {
    paymentService.getPayables.mockResolvedValue(PAYABLES_WITH_EVENTS);
    renderPage();
    await waitForFilterBar();

    fireEvent.change(
      screen.getByRole('combobox', { name: 'admin.payments.filters.status_label' }),
      { target: { value: 'paid' } }
    );

    await waitFor(() => {
      expect(screen.getByTestId('payable-row-1')).toBeInTheDocument();         // Fotografo: paid ✓
      expect(screen.queryByTestId('payable-row-2')).not.toBeInTheDocument();   // partial → escluso
      expect(screen.queryByTestId('payable-row-5')).not.toBeInTheDocument();   // unpaid → escluso
    });
  });

  // ── FilterBar — dateFrom / dateTo (righe 88-102, 166-176) ────────────────
  it('FilterBar: filters by dateFrom includes payables with events on/after date', async () => {
    paymentService.getPayables.mockResolvedValue(PAYABLES_WITH_EVENTS);
    renderPage();
    await waitForFilterBar();

    // dateFrom=2026-06-01: solo Fotografo (2026-06-01) e Catering planned (2026-09-01)
    fireEvent.change(
      screen.getByRole('textbox', { hidden: true, name: 'admin.payments.filters.date_from' }) ||
      screen.getByLabelText('admin.payments.filters.date_from'),
      { target: { value: '2026-06-01' } }
    );

    await waitFor(() => {
      expect(screen.getByTestId('payable-row-1')).toBeInTheDocument();       // evento 2026-06-01 ✓
      expect(screen.getByTestId('payable-row-2')).toBeInTheDocument();       // evento 2026-09-01 ✓
      expect(screen.queryByTestId('payable-row-5')).not.toBeInTheDocument(); // nessun evento → escluso
    });
  });

  it('FilterBar: filters by dateTo excludes events after date', async () => {
    paymentService.getPayables.mockResolvedValue(PAYABLES_WITH_EVENTS);
    renderPage();
    await waitForFilterBar();

    // dateTo=2026-05-31: solo Catering paid (2026-05-01)
    fireEvent.change(
      screen.getByLabelText('admin.payments.filters.date_to'),
      { target: { value: '2026-05-31' } }
    );

    await waitFor(() => {
      expect(screen.getByTestId('payable-row-2')).toBeInTheDocument();       // evento 2026-05-01 ✓
      expect(screen.queryByTestId('payable-row-1')).not.toBeInTheDocument(); // evento 2026-06-01 > 05-31
      expect(screen.queryByTestId('payable-row-5')).not.toBeInTheDocument(); // nessun evento
    });
  });

  it('FilterBar: dateFrom + dateTo range — only matching events', async () => {
    paymentService.getPayables.mockResolvedValue(PAYABLES_WITH_EVENTS);
    renderPage();
    await waitForFilterBar();

    fireEvent.change(
      screen.getByLabelText('admin.payments.filters.date_from'),
      { target: { value: '2026-05-01' } }
    );
    fireEvent.change(
      screen.getByLabelText('admin.payments.filters.date_to'),
      { target: { value: '2026-06-30' } }
    );

    await waitFor(() => {
      expect(screen.getByTestId('payable-row-1')).toBeInTheDocument();       // 2026-06-01 ✓
      expect(screen.getByTestId('payable-row-2')).toBeInTheDocument();       // 2026-05-01 ✓
      expect(screen.queryByTestId('payable-row-5')).not.toBeInTheDocument(); // nessun evento
    });
  });

  // ── FilterBar — reset (righe 98-102) ───────────────────────────────────────
  it('FilterBar: reset button clears active filters and shows all payables', async () => {
    renderPage();
    await waitForFilterBar();

    // Attiva filtro supplier → nasconde la room
    fireEvent.change(
      screen.getByRole('combobox', { name: 'admin.payments.filters.entity_type_label' }),
      { target: { value: 'supplier' } }
    );
    await waitFor(() =>
      expect(screen.queryByTestId('payable-row-173')).not.toBeInTheDocument()
    );

    // Il bottone reset appare solo con filtri attivi
    const resetBtn = screen.getByText('admin.payments.filters.reset');
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);

    // Dopo il reset entrambi i payable sono visibili
    await waitFor(() => {
      expect(screen.getByTestId('payable-row-3')).toBeInTheDocument();
      expect(screen.getByTestId('payable-row-173')).toBeInTheDocument();
    });
  });

  // ── Risultati filtrati: contatore (riga 260) ─────────────────────────────────
  it('shows filtered results counter when a filter is active', async () => {
    renderPage();
    await waitForFilterBar();

    // Filtro supplier → 1 su 2
    fireEvent.change(
      screen.getByRole('combobox', { name: 'admin.payments.filters.entity_type_label' }),
      { target: { value: 'supplier' } }
    );

    await waitFor(() => {
      // Contatore "1 / 2 admin.payments.filters.results_count"
      expect(
        screen.getByText((content) =>
          content.includes('1') && content.includes('2') &&
          content.includes('admin.payments.filters.results_count')
        )
      ).toBeInTheDocument();
    });
  });

  // ── Empty state filtrato (riga 290) ────────────────────────────────────────
  it('shows filtered empty state and reset link when filter matches nothing', async () => {
    renderPage();
    await waitForFilterBar();

    // Filtro status=paid su payables senza eventi → nessun risultato
    fireEvent.change(
      screen.getByRole('combobox', { name: 'admin.payments.filters.status_label' }),
      { target: { value: 'paid' } }
    );

    await waitFor(() => {
      expect(screen.getByText('admin.payments.filters.no_results')).toBeInTheDocument();
    });

    // Il bottone reset inline nell’empty state (riga 290)
    const resetLink = screen.getByRole('button', { name: 'admin.payments.filters.reset' });
    expect(resetLink).toBeInTheDocument();
    fireEvent.click(resetLink);

    // Dopo il reset tornano i payable normali
    await waitFor(() =>
      expect(screen.getByTestId('payable-row-3')).toBeInTheDocument()
    );
  });
});
