import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CreditCard, RefreshCw, Plus, ChevronDown, ChevronUp,
  Building2, BedDouble, Pencil, Trash2, Loader2
} from 'lucide-react';
import paymentService from '../services/paymentService';
import PaymentKPIBar from '../components/payments/PaymentKPIBar';
import PaymentEventModal from '../components/payments/PaymentEventModal';

// ── Status badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  paid:      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  planned:   'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  cancelled: 'bg-red-100   text-red-800   dark:bg-red-900/30   dark:text-red-300',
};

function StatusBadge({ status, t }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600' }`}>
      {t(`payments.status.${status}`, { defaultValue: status })}
    </span>
  );
}

// ── Entity icon ───────────────────────────────────────────────────────────────
function EntityIcon({ type }) {
  return type === 'room'
    ? <BedDouble size={14} className="text-blue-500" />
    : <Building2 size={14} className="text-purple-500" />;
}

// ── Currency formatter ────────────────────────────────────────────────────────
function formatCurrency(amount, currency = 'EUR') {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
}

// ── Payable row ───────────────────────────────────────────────────────────────
function PayableRow({ payable, t, onAddEvent, onEditEvent, onDeleteEvent }) {
  const [expanded, setExpanded] = useState(false);
  const hasEvents = payable.events?.length > 0;

  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden mb-3">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setExpanded(v => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setExpanded(v => !v)}
      >
        <EntityIcon type={payable.entity_type} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{payable.entity_name}</p>
          <p className="text-xs text-gray-400">
            {t(`payments.entity_type.${payable.entity_type}`, { defaultValue: payable.entity_type })}
          </p>
        </div>
        <div className="text-right mr-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(payable.total_cost, payable.currency)}
          </p>
          <p className="text-xs text-gray-400">{payable.currency}</p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onAddEvent(payable); }}
          className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400
            hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          aria-label={t('payments.add_event')}
          title={t('payments.add_event')}
        >
          <Plus size={14} />
        </button>
        {hasEvents && (
          expanded
            ? <ChevronUp size={16} className="text-gray-400" />
            : <ChevronDown size={16} className="text-gray-400" />
        )}
      </div>

      {/* Events list */}
      {expanded && hasEvents && (
        <div className="divide-y divide-gray-50 dark:divide-gray-800 bg-gray-50 dark:bg-gray-800/50">
          {payable.events.map(ev => (
            <div key={ev.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{ev.label}</p>
                <p className="text-xs text-gray-400">{ev.payment_date ?? '—'}</p>
              </div>
              <p className="text-sm font-medium text-gray-800 dark:text-white mr-2">
                {formatCurrency(ev.amount, ev.currency)}
              </p>
              <StatusBadge status={ev.status} t={t} />
              <button
                onClick={() => onEditEvent(payable, ev)}
                className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                aria-label={t('common.edit')}
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => onDeleteEvent(ev)}
                className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                aria-label={t('common.delete')}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {expanded && !hasEvents && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-400 italic">
          {t('payments.no_events_for_entity')}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [payables, setPayables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState(null);
  const [eventToEdit, setEventToEdit] = useState(null);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // Load payables
  useEffect(() => {
    setLoading(true);
    paymentService.getPayables()
      .then(data => setPayables(data?.results ?? data ?? []))
      .catch(() => setPayables([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

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
    if (!window.confirm(t('common.confirm_delete'))) return;
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <CreditCard size={22} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('payments.title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('payments.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700
            text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw size={15} />
          {t('common.loading') === t('common.loading') ? 'Aggiorna' : 'Refresh'}
        </button>
      </div>

      {/* KPI Bar */}
      <PaymentKPIBar refreshKey={refreshKey} />

      {/* Payables section */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          {t('payments.payables_title')}
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : payables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <CreditCard size={40} className="mb-3 opacity-40" />
            <p className="text-sm">{t('payments.no_payables')}</p>
          </div>
        ) : (
          <div>
            {payables.map(p => (
              <PayableRow
                key={`${p.entity_type}-${p.object_id}`}
                payable={p}
                t={t}
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
