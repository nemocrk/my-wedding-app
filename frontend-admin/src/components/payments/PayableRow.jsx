// frontend-admin/src/components/payments/PayableRow.jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BedDouble, Building2, ChevronDown, ChevronUp,
  Pencil, Plus, Trash2,
} from 'lucide-react';
import PaymentStatusBadge from './PaymentStatusBadge';

// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Safely formats a numeric or string amount as currency.
 * Handles string values like "500.00" that come from DRF DecimalField serialization.
 */
const formatCurrency = (amount, currency = 'EUR') => {
  const numeric = parseFloat(amount);
  if (isNaN(numeric)) return '—';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(numeric);
};

function EntityIcon({ type }) {
  return type === 'room'
    ? <BedDouble size={14} className="text-blue-500" />
    : <Building2 size={14} className="text-purple-500" />;
}

// ── Component ─────────────────────────────────────────────────────────────────
/**
 * PayableRow
 * Renders a single payable (supplier or room) with its payment events.
 *
 * Props:
 *   payable        {object}   — payable item from API
 *   onAddEvent     {function} — (payable) => void
 *   onEditEvent    {function} — (payable, event) => void
 *   onDeleteEvent  {function} — (event) => void
 */
const PayableRow = ({ payable, onAddEvent, onEditEvent, onDeleteEvent }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const hasEvents = payable.events?.length > 0;

  const entityTypeLabel = payable.entity_type === 'room'
    ? t('admin.payments.payables.entity_type_room')
    : t('admin.payments.payables.entity_type_supplier');

  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden mb-3">
      {/* Row header */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 cursor-pointer
          hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setExpanded(v => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setExpanded(v => !v)}
      >
        <EntityIcon type={payable.entity_type} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {payable.entity_name}
          </p>
          <p className="text-xs text-gray-400">{entityTypeLabel}</p>
        </div>

        {/* FIX #146: was payable.total_cost (undefined) → now payable.contract_amount */}
        <div className="text-right mr-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(payable.contract_amount, payable.currency)}
          </p>
          <p className="text-xs text-gray-400">{payable.currency}</p>
        </div>

        <button
          onClick={e => { e.stopPropagation(); onAddEvent(payable); }}
          className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400
            hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          aria-label={t('admin.payments.payables.add_event')}
          title={t('admin.payments.payables.add_event')}
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
              <PaymentStatusBadge status={ev.status} />
              <button
                onClick={() => onEditEvent(payable, ev)}
                className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50
                  dark:hover:bg-indigo-900/30 transition-colors"
                aria-label={t('common.edit')}
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => onDeleteEvent(ev)}
                className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50
                  dark:hover:bg-red-900/30 transition-colors"
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
          {t('admin.payments.events.empty')}
        </div>
      )}
    </div>
  );
};

export default PayableRow;
