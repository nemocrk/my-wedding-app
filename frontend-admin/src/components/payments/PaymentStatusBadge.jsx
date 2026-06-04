// frontend-admin/src/components/payments/PaymentStatusBadge.jsx
import { useTranslation } from 'react-i18next';

const STATUS_STYLES = {
  paid:      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  planned:   'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  cancelled: 'bg-red-100   text-red-800   dark:bg-red-900/30   dark:text-red-300',
};

/**
 * PaymentStatusBadge
 * Renders a coloured pill for a PaymentEvent status.
 *
 * Props:
 *   status  {string}  — 'paid' | 'planned' | 'cancelled'
 */
const PaymentStatusBadge = ({ status }) => {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {t(`admin.payments.events.status_${status}`, { defaultValue: status })}
    </span>
  );
};

export default PaymentStatusBadge;
