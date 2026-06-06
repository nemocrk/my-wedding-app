// frontend-admin/src/pages/PaymentsPage.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, RefreshCw, X } from 'lucide-react';
import paymentService from '../services/paymentService';
import PaymentKPIBar from '../components/payments/PaymentKPIBar';
import PaymentEventModal from '../components/payments/PaymentEventModal';
import PayableRow from '../components/payments/PayableRow';
import { useConfirm } from '../contexts/ConfirmDialogContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Calcola lo stato aggregato di un payable a partire dagli eventi.
 * Non esiste un campo status sul payable stesso — viene derivato.
 *
 * @returns {'unpaid'|'partial'|'paid'}
 */
const getPayableStatus = (payable) => {
  const events = payable.events ?? [];
  if (events.length === 0) return 'unpaid';
  const paid = events
    .filter(e => e.status === 'paid')
    .reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);
  const total = parseFloat(payable.contract_amount || 0);
  if (paid <= 0) return 'unpaid';
  if (paid >= total) return 'paid';
  return 'partial';
};

const EMPTY_FILTERS = { entityType: 'all', status: 'all', dateFrom: '', dateTo: '' };

// ── FilterBar ─────────────────────────────────────────────────────────────────

function FilterBar({ filters, onChange, onReset, hasActiveFilters, t }) {
  const entityTypeOptions = [
    { value: 'all',      label: t('admin.payments.filters.entity_type_all') },
    { value: 'supplier', label: t('admin.payments.payables.entity_type_supplier') },
    { value: 'room',     label: t('admin.payments.payables.entity_type_room') },
  ];

  const statusOptions = [
    { value: 'all',     label: t('admin.payments.filters.status_all') },
    { value: 'unpaid',  label: t('admin.payments.filters.status_unpaid') },
    { value: 'partial', label: t('admin.payments.filters.status_partial') },
    { value: 'paid',    label: t('admin.payments.filters.status_paid') },
  ];

  const selectClass =
    'text-sm rounded-lg border border-gray-200 dark:border-gray-700 ' +
    'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 ' +
    'px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors';

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Filtro tipo entità */}
      <select
        value={filters.entityType}
        onChange={e => onChange({ ...filters, entityType: e.target.value })}
        className={selectClass}
        aria-label={t('admin.payments.filters.entity_type_label')}
      >
        {entityTypeOptions.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Filtro stato */}
      <select
        value={filters.status}
        onChange={e => onChange({ ...filters, status: e.target.value })}
        className={selectClass}
        aria-label={t('admin.payments.filters.status_label')}
      >
        {statusOptions.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Range date — da */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-400 whitespace-nowrap">
          {t('admin.payments.filters.date_from')}
        </label>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={e => onChange({ ...filters, dateFrom: e.target.value })}
          className={selectClass}
          aria-label={t('admin.payments.filters.date_from')}
        />
      </div>

      {/* Range date — a */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-400 whitespace-nowrap">
          {t('admin.payments.filters.date_to')}
        </label>
        <input
          type="date"
          value={filters.dateTo}
          onChange={e => onChange({ ...filters, dateTo: e.target.value })}
          className={selectClass}
          aria-label={t('admin.payments.filters.date_to')}
        />
      </div>

      {/* Reset — visibile solo se almeno un filtro attivo */}
      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400
            hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          <X size={12} />
          {t('admin.payments.filters.reset')}
        </button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const { t } = useTranslation();
  const { confirm } = useConfirm();
  const [refreshKey, setRefreshKey] = useState(0);
  const [payables, setPayables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState(null);
  const [eventToEdit, setEventToEdit] = useState(null);

  // Filters state
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    setLoading(true);
    paymentService.getPayables()
      .then(data => setPayables(data?.results ?? data ?? []))
      .catch(() => setPayables([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  // ── Filtri client-side ────────────────────────────────────────────────────
  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS),
    [filters]
  );

  const filteredPayables = useMemo(() => {
    return payables.filter(p => {
      // Filtro tipo entità
      if (filters.entityType !== 'all' && p.entity_type !== filters.entityType) return false;

      // Filtro stato (calcolato dagli eventi)
      if (filters.status !== 'all' && getPayableStatus(p) !== filters.status) return false;

      // Filtro range date — include il payable se almeno un evento cade nel range
      if (filters.dateFrom || filters.dateTo) {
        const events = p.events ?? [];
        const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
        const to = filters.dateTo ? new Date(filters.dateTo) : null;
        const hasMatchingEvent = events.some(ev => {
          if (!ev.payment_date) return false;
          const d = new Date(ev.payment_date);
          if (from && d < from) return false;
          if (to && d > to) return false;
          return true;
        });
        if (!hasMatchingEvent) return false;
      }

      return true;
    });
  }, [payables, filters]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAddEvent = (payable) => {
    setSelectedPayable(payable);
    setEventToEdit(null);
    setModalOpen(true);
  };

  const handleEditEvent = (payable, ev) => {
    setSelectedPayable(payable);
    setEventToEdit(ev);
    setModalOpen(true);
  };

  const handleDeleteEvent = async (ev) => {
    const ok = await confirm({
      title: t('common.confirm_delete'),
      message: t('admin.payments.modal.delete_confirm'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      isDangerous: true,
    });
    if (!ok) return;
    try {
      await paymentService.deleteEvent(ev.id);
      refresh();
    } catch (err) {
      console.error('Delete event error:', err);
    }
  };

  const handleModalSaved = () => {
    setModalOpen(false);
    refresh();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <CreditCard size={22} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('admin.payments.page_title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('admin.payments.page_subtitle')}
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700
            text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw size={15} />
          {t('common.refresh')}
        </button>
      </div>

      {/* KPI Bar */}
      <PaymentKPIBar refreshKey={refreshKey} />

      {/* Payables section */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          {t('admin.payments.payables.title')}
        </h2>

        {/* FilterBar — non mostrata durante il loading */}
        {!loading && (
          <FilterBar
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters(EMPTY_FILTERS)}
            hasActiveFilters={hasActiveFilters}
            t={t}
          />
        )}

        {loading ? (
          <div className="space-y-3">
            {[14, 20, 16].map((h, i) => (
              <div
                key={i}
                className={`h-${h} bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse`}
              />
            ))}
          </div>
        ) : filteredPayables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <CreditCard size={40} className="mb-3 opacity-40" />
            <p className="text-sm">
              {hasActiveFilters
                ? t('admin.payments.filters.no_results')
                : t('admin.payments.payables.empty')}
            </p>
            <p className="text-xs mt-1">
              {hasActiveFilters
                ? t('admin.payments.filters.no_results_subtitle')
                : t('admin.payments.payables.empty_subtitle')}
            </p>
            {hasActiveFilters && (
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="mt-4 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {t('admin.payments.filters.reset')}
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Contatore risultati filtrati */}
            {hasActiveFilters && (
              <p className="text-xs text-gray-400 mb-3">
                {filteredPayables.length} / {payables.length}{' '}
                {t('admin.payments.filters.results_count')}
              </p>
            )}
            {filteredPayables.map(p => (
              <PayableRow
                key={`${p.entity_type}-${p.object_id}`}
                payable={p}
                onAddEvent={handleAddEvent}
                onEditEvent={handleEditEvent}
                onDeleteEvent={handleDeleteEvent}
              />
            ))}
          </div>
        )}
      </div>

      {/* Payment Event Modal */}
      <PaymentEventModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleModalSaved}
        payable={selectedPayable}
        eventToEdit={eventToEdit}
      />
    </div>
  );
}
