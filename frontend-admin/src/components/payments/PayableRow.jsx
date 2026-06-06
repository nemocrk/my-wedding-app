// frontend-admin/src/components/payments/PayableRow.jsx
import {
  BedDouble, Building2, ChevronDown, ChevronUp,
  Pencil, Plus, Trash2, UtensilsCrossed,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

// ── EntityIcon ────────────────────────────────────────────────────────────────
/**
 * Renders the correct icon based on entity_type.
 * Supports: 'room', 'supplier', 'meal'
 */
function EntityIcon({ type }) {
  if (type === 'room') return <BedDouble size={14} className="text-blue-500" />;
  if (type === 'meal') return <UtensilsCrossed size={14} className="text-orange-500" />;
  return <Building2 size={14} className="text-purple-500" />;
}

// ── MealDetails ───────────────────────────────────────────────────────────────
/**
 * Sub-row showing meal-specific fields (adults, children, unit costs).
 * Rendered only when entity_type === 'meal' and the payable is expanded.
 */
function MealDetails({ payable, t }) {
  const rows = [
    {
      key: 'adults',
      label: t('admin.payments.payables.meal_adults'),
      count: payable.meta.adults_count,
      unit: payable.meta.price_adult,
      currency: payable.currency,
    },
    {
      key: 'children',
      label: t('admin.payments.payables.meal_children'),
      count: payable.meta.children_count,
      unit: payable.meta.price_child,
      currency: payable.currency,
    },
  ].filter(r => r.count !== undefined && r.count !== null);

  if (rows.length === 0) return null;

  return (
    <div className="px-4 py-2 bg-orange-50/60 dark:bg-orange-900/10 border-b border-orange-100 dark:border-orange-900/30">
      <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-1.5 uppercase tracking-wide">
        {t('admin.payments.payables.meal_breakdown')}
      </p>
      <div className="flex flex-wrap gap-4">
        {rows.map(r => (
          <div key={r.key} className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-800 dark:text-gray-200">{r.count}</span>
            {' '}{r.label}
            {r.unit !== undefined && r.unit !== null && (
              <span className="ml-1 text-gray-400">
                × {formatCurrency(r.unit, r.currency)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
/**
 * PayableRow
 * Renders a single payable (supplier, room or meal) with its payment events.
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

  const entityTypeLabel = (() => {
    if (payable.entity_type === 'room') return t('admin.payments.payables.entity_type_room');
    if (payable.entity_type === 'meal') return t('admin.payments.payables.entity_type_meal');
    return t('admin.payments.payables.entity_type_supplier');
  })();

  const isMeal = payable.entity_type === 'meal';
  const hasMealDetails = isMeal && (
    payable.meta.adults_count !== undefined ||
    payable.meta.children_count !== undefined
  );

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
            {payable.name + (payable.meta.supplier_type !== undefined ? " - " + payable.meta.supplier_type : "")}
          </p>
          <p className="text-xs text-gray-400">{entityTypeLabel}</p>
        </div>

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

        {(hasEvents || hasMealDetails) && (
          expanded
            ? <ChevronUp size={16} className="text-gray-400" />
            : <ChevronDown size={16} className="text-gray-400" />
        )}
      </div>

      {/* Meal breakdown — visible when expanded and entity_type === 'meal' */}
      {expanded && hasMealDetails && (
        <MealDetails payable={payable} t={t} />
      )}

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
